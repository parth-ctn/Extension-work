import { createRoot } from "react-dom/client";
import { ChatWidget } from "../components/chat/ChatWidget.jsx";
// Load processed CSS assets (compiled by bundler) and fetch their text for Shadow DOM
import chatCssUrl from "./chat-widget.css?url";
import extensionChatCssUrl from "../styles/extension-chat.css?url";
// URLs to CSS assets for shadow DOM styling
import katexCssUrl from "katex/dist/katex.min.css?url";
import hljsCssUrl from "highlight.js/styles/github.min.css?url";
 
const HOST_ID = "webmap-chat-root";
const MOUNT_NODE_ID = "webmap-chat-app";
 
let rootInstance = null;
let cssText = null;
let ensuringStylesPromise = null;
 
function markChatMounted() {
  if (typeof window === "undefined") {
    return;
  }
  window.__webmapChatLoaded = true;
  window.dispatchEvent(new CustomEvent("webmap:chat-mounted"));
}
 
function markChatUnmounted() {
  if (typeof window === "undefined") {
    return;
  }
  window.__webmapChatLoaded = false;
  window.dispatchEvent(new CustomEvent("webmap:chat-unmounted"));
}
 
// MEMORY OPTIMIZATION: Load CSS once and cache it (from processed CSS assets)
async function loadCssOnce() {
  if (cssText !== null) return cssText;
 
  const appendCssText = async (current, href) => {
    if (!href) {
      return current;
    }
    try {
      const resolved =
        typeof chrome !== "undefined" &&
        chrome.runtime &&
        typeof chrome.runtime.getURL === "function"
          ? chrome.runtime.getURL(href)
          : href;
      const resp = await fetch(resolved);
      if (resp?.ok) {
        const text = await resp.text();
        if (text) {
          return current ? `${current}\n\n${text}` : text;
        }
      }
    } catch {
      // Swallow fetch errors so we can try fallbacks.
    }
    return current;
  };
 
  let combined = "";
  const primarySources = [chatCssUrl, extensionChatCssUrl].filter(Boolean);
  for (const src of primarySources) {
    combined = await appendCssText(combined, src);
  }
 
  // No fallback needed as we're using imported CSS URLs from src
  // If the primary sources fail, the widget will render without styling
  // and a warning will be logged
 
  if (!combined) {
    console.warn(
      "[Webmap] Failed to fetch chat styles; widget may render without styling."
    );
  }
 
  // Strip any @import rules (e.g., Google Fonts) to avoid CSP/network issues
  if (combined) {
    try {
      combined = combined.replace(/@import[^;]+;\s*/g, "");
    } catch {}
  }
 
  cssText = combined;
  return cssText;
}
 
function injectFontFace(shadowRoot) {
  if (shadowRoot.querySelector("style[data-webmap-fonts]")) return;
  const toUrl = (p) => {
    try {
      return chrome?.runtime?.getURL ? chrome.runtime.getURL(p) : p;
    } catch {
      return p;
    }
  };
  const fontCss = `@font-face {\n  font-family: 'Poppins';\n  src: url('${toUrl("fonts/Poppins-Regular.woff2")}') format('woff2');\n  font-weight: 400;\n  font-style: normal;\n  font-display: swap;\n}\n@font-face {\n  font-family: 'Poppins';\n  src: url('${toUrl("fonts/Poppins-Medium.woff2")}') format('woff2');\n  font-weight: 500;\n  font-style: normal;\n  font-display: swap;\n}\n@font-face {\n  font-family: 'Poppins';\n  src: url('${toUrl("fonts/Poppins-SemiBold.woff2")}') format('woff2');\n  font-weight: 600;\n  font-style: normal;\n  font-display: swap;\n}`;
  const styleTag = document.createElement("style");
  styleTag.setAttribute("data-webmap-fonts", "true");
  styleTag.textContent = fontCss;
  shadowRoot.appendChild(styleTag);
}
 
function injectGlobalFontFace() {
  try {
    const head = document.head || document.documentElement;
    if (!head) return;
    if (head.querySelector("style[data-webmap-fonts-global]")) return;
    const toUrl = (p) => {
      try {
        return chrome?.runtime?.getURL ? chrome.runtime.getURL(p) : p;
      } catch {
        return p;
      }
    };
    const css = `@font-face {\n  font-family: 'Poppins';\n  src: url('${toUrl("fonts/Poppins-Regular.woff2")}') format('woff2');\n  font-weight: 400;\n  font-style: normal;\n  font-display: swap;\n}\n@font-face {\n  font-family: 'Poppins';\n  src: url('${toUrl("fonts/Poppins-Medium.woff2")}') format('woff2');\n  font-weight: 500;\n  font-style: normal;\n  font-display: swap;\n}\n@font-face {\n  font-family: 'Poppins';\n  src: url('${toUrl("fonts/Poppins-SemiBold.woff2")}') format('woff2');\n  font-weight: 600;\n  font-style: normal;\n  font-display: swap;\n}`;
    const style = document.createElement("style");
    style.setAttribute("data-webmap-fonts-global", "true");
    style.textContent = css;
    head.appendChild(style);
  } catch {}
}
 
async function applyStyles(shadowRoot) {
  // Ensure fonts are registered inside the Shadow DOM
  injectFontFace(shadowRoot);
  // Also register globally to maximize compatibility
  injectGlobalFontFace();
 
  // Prefer link-based CSS for reliability; fall back to inline style text
  const ensureLink = (href, attr, fallbackHref) => {
    const exists = shadowRoot.querySelector(`link[${attr}]`);
    if (exists) return exists;
    let finalHref = href;
    if (!finalHref && fallbackHref) finalHref = fallbackHref;
    if (!finalHref) return null;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    try {
      link.href = chrome.runtime?.getURL ? chrome.runtime.getURL(finalHref) : finalHref;
    } catch {
      link.href = finalHref;
    }
    link.setAttribute(attr, "true");
    shadowRoot.appendChild(link);
    return link;
  };
 
  // Attach main widget styles via <link>
  try { ensureLink(chatCssUrl, "data-webmap-chat-css", "content/chat-widget.css"); } catch {}
  try { ensureLink(extensionChatCssUrl, "data-webmap-ext-css", null); } catch {}
 
  // Fallback: if no link and no inline style yet, inject combined CSS text
  if (!shadowRoot.querySelector("style[data-webmap-chat]") &&
      !shadowRoot.querySelector("link[data-webmap-chat-css]")) {
    const combined = await loadCssOnce();
    if (combined) {
      const styleTag = document.createElement("style");
      styleTag.setAttribute("data-webmap-chat", "true");
      styleTag.textContent = combined;
      shadowRoot.appendChild(styleTag);
    }
  }
 
  // Also include KaTeX + highlight.js styles inside the shadow root as links
  try {
    ensureLink(katexCssUrl, "data-webmap-katex");
  } catch {}
  try {
    ensureLink(hljsCssUrl, "data-webmap-hljs");
  } catch {}
}
 
async function ensureMountNode() {
  let host = document.getElementById(HOST_ID);
 
  if (!host) {
    host = document.createElement("div");
    host.id = HOST_ID;
    if (host.style) {
      host.style.all = "initial";
      host.style.display = "contents";
    }
    document.body.appendChild(host);
  }
 
  const shadowRoot = host.shadowRoot ?? host.attachShadow({ mode: "open" });
 
  ensuringStylesPromise = ensuringStylesPromise ?? applyStyles(shadowRoot);
  try {
    await ensuringStylesPromise;
  } finally {
    ensuringStylesPromise = null;
  }
 
  let mountNode = shadowRoot.getElementById(MOUNT_NODE_ID);
 
  if (!mountNode) {
    mountNode = document.createElement("div");
    mountNode.id = MOUNT_NODE_ID;
    try {
      mountNode.style.fontFamily = "'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
    } catch {}
    shadowRoot.appendChild(mountNode);
  }
 
  return mountNode;
}
 
export async function mountChat() {
  if (rootInstance) {
    markChatMounted();
    return;
  }
 
  const mountNode = await ensureMountNode();
  rootInstance = createRoot(mountNode);
  rootInstance.render(<ChatWidget onReady={markChatMounted} />);
}
 
export function unmountChat() {
  if (!rootInstance) {
    return;
  }
  rootInstance.unmount();
  rootInstance = null;
  markChatUnmounted();
}
 
// MEMORY OPTIMIZATION: Only mount when page is fully loaded to reduce initial memory spike
const mountOnce = () => {
  void mountChat();
};
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mountOnce, { once: true });
} else {
  mountOnce();
}
 
 