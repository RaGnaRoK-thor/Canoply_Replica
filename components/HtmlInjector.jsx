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

        // After DOM update, inject scripts in order
        // Use setTimeout to ensure React flushed the innerHTML
        setTimeout(() => {
          const scripts = [...doc.querySelectorAll("script")];
          scripts.forEach((s) => {
            const srcAttr = s.getAttribute("src");
            if (srcAttr) {
              // avoid duplicate script tags
              if (!document.querySelector(`script[src="${srcAttr}"]`)) {
                const script = document.createElement("script");
                script.src = srcAttr;
                // preserve attributes
                if (s.type) script.type = s.type;
                script.async = false;
                document.body.appendChild(script);
              }
            } else {
              // inline script
              const inline = document.createElement("script");
              if (s.type) inline.type = s.type;
              inline.text = s.textContent || "";
              document.body.appendChild(inline);
            }
          });
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
