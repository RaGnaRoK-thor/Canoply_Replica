"use client";
import React, { useEffect, useRef, useState } from "react";

export default function HtmlInjector({ src }) {
  const [html, setHtml] = useState("");
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const controller = new AbortController();

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

          // Load external scripts sequentially in the order they appear
          for (const s of scripts) {
            const srcAttr = s.getAttribute("src");
            if (srcAttr) {
              if (hasScript(srcAttr)) {
                // If script already present, wait for it to be ready if possible
                await new Promise((r) => setTimeout(r, 10));
                continue;
              }

              await new Promise((resolve) => {
                const script = document.createElement("script");
                script.src = srcAttr;
                if (s.type) script.type = s.type;
                script.async = false;
                // Resolve on load or error to avoid blocking indefinitely
                script.onload = () => resolve();
                script.onerror = () => resolve();
                document.body.appendChild(script);
              });
            }
          }

          // After external scripts loaded, append inline scripts in order
          for (const s of scripts) {
            const srcAttr = s.getAttribute("src");
            if (!srcAttr) {
              const inline = document.createElement("script");
              if (s.type) inline.type = s.type;
              inline.text = s.textContent || "";
              document.body.appendChild(inline);
            }
          }
        }, 50);
      } catch (err) {
        // ignore abort or fetch errors
        if (err.name !== "AbortError") console.error(err);
      }
    }

    load();

    return () => {
      mountedRef.current = false;
      controller.abort();
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
