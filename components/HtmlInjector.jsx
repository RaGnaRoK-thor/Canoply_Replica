"use client";
import React, { useEffect, useRef, useState } from "react";

export default function HtmlInjector({ src }) {
  const [html, setHtml] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    // Avoid AbortController to prevent AbortError during React dev double-invoke
    // Use mountedRef to ignore results after unmount

    // Setup runtime error overlay
    let overlay;
    function ensureOverlay() {
      if (overlay) return overlay;
      overlay = document.createElement('div');
      overlay.id = 'html-injector-errors';
      overlay.style.position = 'fixed';
      overlay.style.right = '12px';
      overlay.style.bottom = '12px';
      overlay.style.zIndex = '99999';
      overlay.style.maxWidth = '420px';
      overlay.style.fontFamily = 'monospace';
      overlay.style.fontSize = '12px';
      overlay.style.background = 'rgba(0,0,0,0.75)';
      overlay.style.color = '#fff';
      overlay.style.padding = '10px';
      overlay.style.borderRadius = '6px';
      overlay.style.pointerEvents = 'auto';
      overlay.style.maxHeight = '40vh';
      overlay.style.overflow = 'auto';
      overlay.style.boxShadow = '0 6px 24px rgba(0,0,0,0.5)';
      overlay.innerHTML = '<strong>Runtime errors</strong><div id="html-injector-errors-list"></div>';
      document.body.appendChild(overlay);
      return overlay;
    }

    function pushError(msg) {
      const ov = ensureOverlay();
      const list = ov.querySelector('#html-injector-errors-list');
      const el = document.createElement('div');
      el.style.marginTop = '8px';
      el.textContent = msg;
      list.prepend(el);
    }

    function isAbortErrorPayload(e) {
      try {
        if (!e) return false;
        if (e && typeof e === 'string' && e.toLowerCase().includes('abort')) return true;
        if (e && e.message && typeof e.message === 'string' && e.message.toLowerCase().includes('abort')) return true;
        if (e && e.name && e.name === 'AbortError') return true;
        return false;
      } catch (err) {
        return false;
      }
    }

    function onError(e) {
      try {
        if (isAbortErrorPayload(e)) return; // ignore expected aborts
        const msg = e && e.message ? e.message : String(e);
        pushError(msg);
        console.error('HtmlInjector captured error:', e);
      } catch (err) {
        // ignore
      }
    }

    window.addEventListener('error', (ev) => {
      // Event object from window.error carries message in ev.message
      if (isAbortErrorPayload(ev)) return;
      onError(ev.error || ev.message || ev);
    });

    window.addEventListener('unhandledrejection', (ev) => {
      if (isAbortErrorPayload(ev.reason)) return;
      onError(ev.reason);
    });

    // Ensure minimal vendor stubs to avoid ReferenceErrors when CDN fails
    function ensureVendorStubs() {
      if (typeof window.gsap === 'undefined') {
        window.gsap = {
          timeline: () => ({ fromTo: () => {}, timeScale: () => {}, progress: () => {}, set: () => {}, add: () => {}, utils: { clamp: (a, b, c) => Math.max(a, Math.min(b, c)) } }),
          registerPlugin: () => {},
          ticker: { add: () => {}, lagSmoothing: () => {} },
        };
        pushError('Fallback: gsap stub injected');
      }
      if (typeof window.SplitText === 'undefined') {
        window.SplitText = { create: () => ({ words: [] }) };
        pushError('Fallback: SplitText stub injected');
      }
      if (typeof window.ScrollTrigger === 'undefined') {
        window.ScrollTrigger = { create: () => ({}) };
        pushError('Fallback: ScrollTrigger stub injected');
      }
      if (typeof window.Lenis === 'undefined' && typeof window.Lenis !== 'function') {
        // Lenis isn't required to run; stub minimal
        window.Lenis = function () { return { on: () => {}, raf: () => {} }; };
        pushError('Fallback: Lenis stub injected');
      }
      if (typeof window.$ === 'undefined' && typeof window.jQuery === 'undefined') {
        window.$ = window.jQuery = function () {
          return {
            each: () => {},
            on: () => {},
            find: () => ({ first: () => ({ height: () => 0, width: () => 0 }) }),
            addClass: () => {},
            removeClass: () => {},
          };
        };
        pushError('Fallback: jQuery stub injected');
      }
    }

    ensureVendorStubs();

    async function load() {
      try {
        const res = await fetch(src, { signal: controller.signal });
        if (!res.ok) return;
        const text = await res.text();
        if (!mountedRef.current) return;

        const parser = new DOMParser();
        const doc = parser.parseFromString(text, "text/html");

        // Inject styles/links into head (avoid duplicates)
        const headNodes = [...doc.querySelectorAll("link[rel=stylesheet], style")];
        headNodes.forEach((node) => {
          if (node.tagName === "LINK") {
            const href = node.getAttribute("href");
            if (!href) return;
            if (!document.querySelector(`link[href="${href}"]`)) {
              const link = document.createElement("link");
              link.rel = "stylesheet";
              link.href = href;
              document.head.appendChild(link);
            }
          } else if (node.tagName === "STYLE") {
            const content = node.textContent || "";
            if (!document.head.querySelector(`style[data-injected][data-hash='${hashCode(content)}']`)) {
              const style = document.createElement("style");
              style.setAttribute("data-injected", "true");
              style.setAttribute("data-hash", hashCode(content));
              style.textContent = content;
              document.head.appendChild(style);
            }
          }
        });

        // Remove script tags from doc.body to avoid automatic duplicates and set the body HTML
        const scriptNodes = [...doc.querySelectorAll('script')];
        scriptNodes.forEach((s) => s.parentNode && s.parentNode.removeChild(s));
        const safeBody = doc.body.innerHTML || "";
        setHtml(safeBody);

        // After DOM update, inject scripts with vendor libraries prioritized and inline scripts deduplicated
        // Use a short timeout to allow React to flush innerHTML
        setTimeout(async () => {
          const scripts = [...doc.querySelectorAll("script")];

          const external = scripts.filter((s) => !!s.getAttribute("src"));
          const inline = scripts.filter((s) => !s.getAttribute("src"));

          const hasScript = (src) => !!document.querySelector(`script[src="${src}"]`);

          // Prioritize known vendor libs that many inline scripts depend on
          const priorityPatterns = [
            /jquery/i,
            /gsap(\.min)?\.js|gsap\//i,
            /ScrollTrigger/i,
            /SplitText/i,
            /InertiaPlugin/i,
            /lenis/i,
            /webflow/i,
          ];

          const prioritized = [];
          const remaining = [...external];

          priorityPatterns.forEach((pat) => {
            for (let i = 0; i < remaining.length; i++) {
              const s = remaining[i];
              const src = s.getAttribute("src") || "";
              if (pat.test(src)) {
                prioritized.push(s);
                remaining.splice(i, 1);
                i--;
              }
            }
          });

          const orderedExternals = [...prioritized, ...remaining];

          // Load external scripts sequentially so dependencies are available
          for (const s of orderedExternals) {
            const srcAttr = s.getAttribute("src");
            if (!srcAttr) continue;
            if (hasScript(srcAttr)) {
              // already injected elsewhere
              await new Promise((r) => setTimeout(r, 10));
              continue;
            }

            await new Promise((resolve) => {
              const script = document.createElement("script");
              script.src = srcAttr;
              if (s.type) script.type = s.type;
              script.async = false;
              script.onload = () => resolve();
              script.onerror = () => {
                pushError(`Failed to load script: ${srcAttr}`);
                resolve();
              };
              document.body.appendChild(script);
            });
          }

          // Inject inline scripts but avoid executing duplicates by hashing content
          for (const s of inline) {
            const content = s.textContent || "";
            if (!content.trim()) continue;
            const h = hashCode(content);
            if (document.querySelector(`script[data-injected-hash="${h}"]`)) continue;
            const inlineEl = document.createElement("script");
            if (s.type) inlineEl.type = s.type;
            inlineEl.setAttribute("data-injected-hash", h);
            inlineEl.text = content;
            document.body.appendChild(inlineEl);
          }

          // Re-dispatch DOMContentLoaded for handlers that expect it
          try {
            document.dispatchEvent(new Event("DOMContentLoaded", { bubbles: true, cancelable: true }));
          } catch (e) {
            /* ignore */
          }

          // Also dispatch a custom event for any scripts expecting readiness
          window.dispatchEvent(new CustomEvent("HtmlInjected", { detail: { src } }));
        }, 50);
      } catch (err) {
        // ignore abort or fetch errors
        if (err.name !== "AbortError") {
          console.error(err);
          pushError(err.message || String(err));
        }
      }
    }

    load();

    return () => {
      mountedRef.current = false;
      controller.abort();
      window.removeEventListener('error', onError);
    };
  }, [src]);

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return String(hash);
}
