import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChatLauncher } from "./ChatLauncher.jsx";
import { ChatPanel } from "./panel/ChatPanel.jsx";
import { useExtensionAuthState } from "../../hooks/chat/useExtensionAuthState.js";
import { useKnowledgeWorkflow } from "../../hooks/chat/useKnowledgeWorkflow.js";
import { useSelectedExtensionAgent } from "../../hooks/common/useSelectedExtensionAgent.js";
import { useHtmlSelectionPreference } from "../../hooks/common/useHtmlSelectionPreference.js";
import {
  captureRenderedHtml,
  generateHtmlFilename,
} from "../../utils/htmlCapture.js";
import { writeExtensionStorage } from "../../utils/storage.js";
import { STORAGE_KEYS } from "../../constants/storageKeys.js";

function getAssetUrl(relativePath) {
  if (typeof chrome !== "undefined" && chrome?.runtime?.getURL) {
    return chrome.runtime.getURL(relativePath);
  }
  return relativePath;
}

function consumeBootstrapAction() {
  if (typeof window === "undefined") {
    return false;
  }
  const shouldOpen = window.__webmapBootstrapAction === "open";
  if (shouldOpen) {
    delete window.__webmapBootstrapAction;
  }
  return shouldOpen;
}

export function ChatWidget({ onReady } = {}) {
  const {
    isAuthenticated,
    user,
    accessToken,
    refreshToken,
    isReady: authReady,
  } = useExtensionAuthState();
  const { selectedExtensionId } = useSelectedExtensionAgent();
  const workflow = useKnowledgeWorkflow({
    user,
    selectedExtensionId,
    accessToken,
    refreshToken,
  });
  const htmlSelection = useHtmlSelectionPreference(user?.uuid, {
    accessToken,
    refreshToken,
  });
  const [isOpen, setIsOpen] = useState(false);

  const bootstrapOpenRequestRef = useRef(null);
  const pendingBootstrapCaptureRef = useRef(false);
  const ignoreNavUntilRef = useRef(0);

  const lastLocationRef = useRef(
    typeof window !== "undefined" ? window.location.href : ""
  );

  if (bootstrapOpenRequestRef.current === null) {
    const shouldBootstrapOpen = consumeBootstrapAction();
    bootstrapOpenRequestRef.current = shouldBootstrapOpen;
    pendingBootstrapCaptureRef.current = shouldBootstrapOpen;
  }

  const logoUrl = useMemo(
    () => getAssetUrl("assets/icons/webmap-logo.svg"),
    []
  );

  const capturePageSnapshot = useCallback(async () => {
    try {
      const currentUrl = window.location.href;
      const pageTitle = document.title;
      const htmlContent = captureRenderedHtml();
      const filename = generateHtmlFilename(currentUrl, pageTitle);

      await writeExtensionStorage(STORAGE_KEYS.CAPTURED_HTML, {
        htmlContent,
        filename,
        url: currentUrl,
        title: pageTitle,
        capturedAt: new Date().toISOString(),
      });

      console.log("HTML captured and stored successfully", {
        contentLength: htmlContent.length,
        filename,
      });
    } catch (error) {
      console.error("Failed to capture HTML:", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const win = window;

    if (!win.__webmapHistoryPatched) {
      const wrapHistoryMethod = (method) => {
        const original = history?.[method];
        if (typeof original !== "function") {
          return;
        }
        const wrapped = function (...args) {
          const result = original.apply(this, args);
          try {
            win.dispatchEvent(new Event("webmap:navigation"));
          } catch (error) {
            console.warn("[Webmap] navigation event dispatch failed", error);
          }
          return result;
        };
        try {
          Object.defineProperty(wrapped, "__webmapOriginal", {
            value: original,
          });
        } catch (error) {
          // ignore defineProperty errors
        }
        history[method] = wrapped;
      };

      wrapHistoryMethod("pushState");
      wrapHistoryMethod("replaceState");
      win.__webmapHistoryPatched = true;
    }

    const handleLocationChange = () => {
      if (Date.now() < (ignoreNavUntilRef.current || 0)) {
        return;
      }
      const nextUrl = win.location.href;
      if (nextUrl === lastLocationRef.current) {
        return;
      }
      lastLocationRef.current = nextUrl;
      bootstrapOpenRequestRef.current = false;
      pendingBootstrapCaptureRef.current = false;
      setIsOpen(false);
      workflow.resetWorkflow();
    };

    const events = ["popstate", "hashchange", "webmap:navigation"];
    events.forEach((event) =>
      win.addEventListener(event, handleLocationChange)
    );

    const urlSyncTimer = win.setInterval(() => {
      if (win.location.href !== lastLocationRef.current) {
        handleLocationChange();
      }
    }, 1500);

    return () => {
      events.forEach((event) =>
        win.removeEventListener(event, handleLocationChange)
      );
      win.clearInterval(urlSyncTimer);
    };
  }, [setIsOpen, workflow.resetWorkflow]);

  useEffect(() => {
    if (!onReady) {
      return;
    }
    onReady();
  }, [onReady]);

  useEffect(() => {
    if (pendingBootstrapCaptureRef.current && isOpen) {
      pendingBootstrapCaptureRef.current = false;
      void capturePageSnapshot();
    }
  }, [capturePageSnapshot, isOpen]);

  useEffect(() => {
    if (!authReady || !isAuthenticated) {
      return;
    }
    if (!bootstrapOpenRequestRef.current) {
      return;
    }
    bootstrapOpenRequestRef.current = false;
    const openChat = () => setIsOpen(true);
    if (typeof window !== "undefined" && window.requestAnimationFrame) {
      window.requestAnimationFrame(openChat);
    } else {
      openChat();
    }
  }, [authReady, isAuthenticated]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }
    const handleOpen = () => {
      setIsOpen(true);
      // Reconnect socket when panel opens via event
      if (workflow.handlePanelOpen) {
        workflow.handlePanelOpen();
      }
    };
    const handleClose = () => {
      // Close socket when panel closes via event
      if (workflow.handlePanelClose) {
        workflow.handlePanelClose();
      }
      setIsOpen(false);
    };
    const handleToggle = () => {
      setIsOpen((prevIsOpen) => {
        if (!prevIsOpen) {
          // Opening panel
          if (workflow.handlePanelOpen) {
            workflow.handlePanelOpen();
          }
        } else {
          // Closing panel
          if (workflow.handlePanelClose) {
            workflow.handlePanelClose();
          }
        }
        return !prevIsOpen;
      });
    };
    window.addEventListener("webmap:chat-open", handleOpen);
    window.addEventListener("webmap:chat-close", handleClose);
    window.addEventListener("webmap:chat-toggle", handleToggle);
    return () => {
      window.removeEventListener("webmap:chat-open", handleOpen);
      window.removeEventListener("webmap:chat-close", handleClose);
      window.removeEventListener("webmap:chat-toggle", handleToggle);
    };
  }, [workflow]);

  useEffect(() => {
    if (!authReady) {
      return;
    }
    if (!isAuthenticated) {
      setIsOpen(false);
      workflow.resetWorkflow();
    }
  }, [authReady, isAuthenticated, workflow]);

  useEffect(() => {
    if (!authReady) {
      return;
    }
    if (!isAuthenticated && isOpen) {
      setIsOpen(false);
    }
  }, [authReady, isAuthenticated, isOpen]);

  const handleToggle = useCallback(async () => {
    if (!isOpen) {
      ignoreNavUntilRef.current = Date.now() + 700;
      await capturePageSnapshot();
      // Reconnect socket when panel opens
      if (workflow.handlePanelOpen) {
        workflow.handlePanelOpen();
      }
    } else {
      // Close socket when panel closes
      if (workflow.handlePanelClose) {
        workflow.handlePanelClose();
      }
    }
    setIsOpen((value) => !value);
  }, [capturePageSnapshot, isOpen, workflow]);

  const handleClose = useCallback(() => {
    // Close socket when panel closes
    if (workflow.handlePanelClose) {
      workflow.handlePanelClose();
    }
    setIsOpen(false);
  }, [workflow]);


  const handleHtmlPreferenceToggle = useCallback(async () => {
    if (!user?.uuid) return;
    const nextValue = !Boolean(htmlSelection.preference);
    try {
      await htmlSelection.setPreference(nextValue);
    } catch (error) {
      console.warn("[ChatWidget] Failed to update HTML preference", error);
    }
  }, [htmlSelection, user?.uuid]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <ChatLauncher logoUrl={logoUrl} isOpen={isOpen} onToggle={handleToggle} />
      <ChatPanel
        logoUrl={logoUrl}
        isOpen={isOpen}
        user={user}
        accessToken={accessToken}
        refreshToken={refreshToken}
        onClose={handleClose}
        state={workflow.state}
        htmlPreference={Boolean(htmlSelection.preference)}
        isHtmlPreferenceLoading={htmlSelection.isLoading}
        isHtmlPreferenceSaving={htmlSelection.isSaving}
        onToggleHtmlPreference={handleHtmlPreferenceToggle}
        startKnowledgeChat={workflow.startKnowledgeChat}
        startExistingKbChat={workflow.startChatForExistingKb}
        sendMessage={workflow.sendMessage}
        createNewChat={workflow.createNewChatSession}
        switchSession={workflow.switchSession}
        resetWorkflow={workflow.resetWorkflow}
      />
    </>
  );
}
