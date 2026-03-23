(function bootstrapWebmapLoader() {
  if (window.top !== window) {
    return;
  }

  if (window.__webmapLoaderAttached) {
    return;
  }
  window.__webmapLoaderAttached = true;

  const runtime = chrome?.runtime;
  const storage = chrome?.storage?.local;

  if (!runtime?.getURL || !storage) {
    console.warn(
      "[Webmap] chrome.runtime API unavailable; chat widget disabled."
    );
    return;
  }

  const AUTH_STATE_KEY = "webmapAuthState";
  const STYLE_ID = "webmap-bootstrap-style";
  const BUTTON_ID = "webmap-bootstrap-button";
  const CHAT_MOUNT_EVENT = "webmap:chat-mounted";
  const CHAT_UNMOUNT_EVENT = "webmap:chat-unmounted";

  const iconUrl = runtime.getURL("assets/icons/webmap-logo.svg");

  let authEnabled = false;
  let loading = false;
  let buttonEl = null;
  let styleEl = null;

  function ensureStyle() {
    if (styleEl) {
      return;
    }
    styleEl = document.createElement("style");
    styleEl.id = STYLE_ID;
    styleEl.textContent = `
      #${BUTTON_ID} {
        position: fixed;
        bottom: 24px;
        right: 0;
        width: 66px;
        height: 74px;
        padding: 0;
        margin: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 20px 0 0 20px;
        border: 1px solid rgba(15, 23, 42, 0.08);
        border-right: none;
        background: #ffffff;
        box-shadow: -12px 16px 32px rgba(15, 23, 42, 0.18);
        overflow: hidden;
        cursor: pointer;
        transition: box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease;
        z-index: 2147483646;
      }

      #${BUTTON_ID}:hover,
      #${BUTTON_ID}:focus-visible {
        box-shadow: -18px 20px 40px rgba(15, 23, 42, 0.25);
        border-color: rgba(15, 23, 42, 0.16);
        background: #f5f7fa;
      }

      #${BUTTON_ID}:focus-visible {
        outline: 2px solid #2563eb;
        outline-offset: 2px;
      }

      #${BUTTON_ID}::after {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: 20px 0 0 20px;
        box-shadow: inset 0 0 0 0 rgba(37, 99, 235, 0.25);
        transition: box-shadow 0.25s ease;
        pointer-events: none;
      }

      #${BUTTON_ID}:hover::after,
      #${BUTTON_ID}:focus-visible::after,
      #${BUTTON_ID}.webmap-loading::after {
        box-shadow: inset 0 0 0 2px rgba(37, 99, 235, 0.35);
      }

      #${BUTTON_ID} .wm-chat-launcher__icon {
        width: 30px;
        height: 30px;
        object-fit: contain;
        filter: drop-shadow(0 2px 4px rgba(15, 23, 42, 0.35));
        transition: transform 0.25s ease, opacity 0.15s ease;
      }

      #${BUTTON_ID}:hover .wm-chat-launcher__icon,
      #${BUTTON_ID}:focus-visible .wm-chat-launcher__icon {
        transform: scale(1.02);
      }

      #${BUTTON_ID}.webmap-loading {
        cursor: wait;
      }

      #${BUTTON_ID}.webmap-loading .wm-chat-launcher__icon {
        opacity: 0;
      }

      #${BUTTON_ID}.webmap-loading::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 26px;
        height: 26px;
        margin-top: -13px;
        margin-left: -13px;
        border-radius: 50%;
        border: 3px solid rgba(37, 99, 235, 0.25);
        border-top-color: #2563eb;
        background: transparent;
        animation: webmap-spin 0.8s linear infinite;
      }

      @keyframes webmap-spin {
        to {
          transform: rotate(360deg);
        }
      }
    `;
    document.head.appendChild(styleEl);
  }

  function setLoadingState(next) {
    loading = next;
    if (!buttonEl) {
      return;
    }
    if (next) {
      buttonEl.classList.add("webmap-loading");
    } else {
      buttonEl.classList.remove("webmap-loading");
    }
  }

  function destroyButton() {
    if (buttonEl) {
      buttonEl.removeEventListener("click", handleButtonClick);
      buttonEl.remove();
      buttonEl = null;
    }
    if (styleEl && !authEnabled) {
      styleEl.remove();
      styleEl = null;
    }
  }

  function handleChatMounted() {
    window.__webmapChatLoaded = true;
    setLoadingState(false);
    destroyButton();
    if (styleEl) {
      styleEl.remove();
      styleEl = null;
    }
  }

  function handleChatUnmounted() {
    window.__webmapChatLoaded = false;
    setLoadingState(false);
    if (authEnabled) {
      createButton();
    }
  }

  function handleButtonClick() {
    if (loading) {
      return;
    }

    if (window.__webmapChatLoaded) {
      window.dispatchEvent(new CustomEvent("webmap:chat-open"));
      return;
    }

    setLoadingState(true);
    try {
      // Try direct dynamic import first (fast path when allowed)
      window.__webmapBootstrapAction = "open";
      const moduleUrl = runtime.getURL("content.js");
      import(moduleUrl)
        .then(() => {
          // content script mounted itself
          setTimeout(() => setLoadingState(false), 50);
        })
        .catch((firstErr) => {
          console.warn(
            "[Webmap] Dynamic import failed, trying background injection…",
            firstErr?.message || firstErr
          );
          // Fallback to background-driven injection
          chrome.runtime.sendMessage({ type: "webmap/inject" }, (resp) => {
            const err = chrome.runtime.lastError;
            if (err || resp?.ok === false) {
              console.error(
                "[Webmap] Injection via background failed:",
                err?.message || resp?.error
              );
              console.error("[Webmap] Failed to load chat widget", firstErr);
              setLoadingState(false);
              return;
            }
            setTimeout(() => setLoadingState(false), 100);
          });
        });
    } catch (error) {
      console.error(
        "[Webmap] Unexpected error bootstrapping chat widget",
        error
      );
      setLoadingState(false);
    }
  }

  function createButton() {
    if (!authEnabled || buttonEl || window.__webmapChatLoaded) {
      return;
    }

    const attach = () => {
      if (!authEnabled || buttonEl || window.__webmapChatLoaded) {
        return;
      }
      ensureStyle();
      const button = document.createElement("button");
      button.type = "button";
      button.id = BUTTON_ID;
      button.className = "wm-chat-launcher webmap-bootstrap-launcher";
      button.setAttribute("aria-label", "Open Webmap chat");
      const icon = document.createElement("img");
      icon.src = iconUrl;
      icon.alt = "Webmap";
      icon.className = "wm-chat-launcher__icon";
      button.appendChild(icon);
      button.addEventListener("click", handleButtonClick);
      document.body.appendChild(button);
      buttonEl = button;
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", attach, { once: true });
    } else {
      attach();
    }
  }

  function applyAuthState(rawState) {
    const next = Boolean(rawState && rawState.isAuthenticated);
    if (next === authEnabled) {
      return;
    }
    authEnabled = next;

    if (authEnabled) {
      createButton();
    } else {
      destroyButton();
      setLoadingState(false);
    }
  }

  function handleStorageChange(changes, areaName) {
    if (areaName !== "local" || !(AUTH_STATE_KEY in changes)) {
      return;
    }
    applyAuthState(changes[AUTH_STATE_KEY].newValue);
  }

  window.addEventListener(CHAT_MOUNT_EVENT, handleChatMounted);
  window.addEventListener(CHAT_UNMOUNT_EVENT, handleChatUnmounted);

  chrome.storage.onChanged.addListener(handleStorageChange);

  window.addEventListener("unload", () => {
    window.removeEventListener(CHAT_MOUNT_EVENT, handleChatMounted);
    window.removeEventListener(CHAT_UNMOUNT_EVENT, handleChatUnmounted);
    chrome.storage.onChanged.removeListener(handleStorageChange);
  });

  chrome.storage.local.get([AUTH_STATE_KEY], (result) => {
    applyAuthState(result?.[AUTH_STATE_KEY]);
  });
})();
