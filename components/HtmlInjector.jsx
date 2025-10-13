"use client";
import React, { useEffect, useRef, useState } from "react";

export default function HtmlInjector({ src }) {
  const [html, setHtml] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();

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

    function onError(e) {
      try {
        const msg = e && e.message ? e.message : String(e);
        pushError(msg);
        console.error('HtmlInjector captured error:', e);
      } catch (err) {
        // ignore
      }
    }

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', (ev) => onError(ev.reason));

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

        // Set body HTML (will not execute scripts)
        setHtml(doc.body.innerHTML || "");

        // After DOM update, inject scripts in the original order and wait for external scripts to load
        // Use a short timeout to allow React to flush innerHTML
        setTimeout(async () => {
          const scripts = [...doc.querySelectorAll("script")];

          // Helper to avoid duplicates
          const hasScript = (src) => !!document.querySelector(`script[src="${src}"]`);

          // Process scripts sequentially in document order
          for (const s of scripts) {
            const srcAttr = s.getAttribute("src");
            if (srcAttr) {
              if (hasScript(srcAttr)) {
                // If script already present, wait a tick
                await new Promise((r) => setTimeout(r, 10));
                continue;
              }

              await new Promise((resolve) => {
                const script = document.createElement("script");
                script.src = srcAttr;
                if (s.type) script.type = s.type;
                script.async = false;
                script.onload = () => resolve();
                script.onerror = () => resolve();
                document.body.appendChild(script);
              });
            } else {
              // Inline: execute immediately in order
              const inline = document.createElement("script");
              if (s.type) inline.type = s.type;
              inline.text = s.textContent || "";
              document.body.appendChild(inline);
            }
          }

          // Some scripts listen for DOMContentLoaded; since we're injecting after initial load,
          // re-dispatch the event so handlers execute.
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
