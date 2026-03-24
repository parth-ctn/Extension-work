import browser from "webextension-polyfill";
import { createCorsHandler } from "./cors.js";

const corsHandler = createCorsHandler();

browser.runtime.onInstalled.addListener(() => {
  console.log("[Webmap] Extension installed");
  corsHandler.init().catch((error) => {
    console.error("[Webmap] Failed to initialize CORS handler on install:", error);
  });
});

// Enable CORS header patching for downloads and API fetches
corsHandler.init().catch((error) => {
  console.error("[Webmap] Failed to initialize CORS handler:", error);
});

// MEMORY OPTIMIZATION: Clean up large HTML captures periodically
// HTML captures can be 200KB-2MB each and accumulate over time
browser.runtime.onStartup.addListener(async () => {
  try {
    // Clean up old HTML captures on browser startup to free memory
    const result = await browser.storage.local.get(["WEBMAP_CAPTURED_HTML"]);
    if (result.WEBMAP_CAPTURED_HTML) {
      const capturedAt = result.WEBMAP_CAPTURED_HTML.capturedAt;
      const ageInHours = capturedAt
        ? (Date.now() - new Date(capturedAt).getTime()) / (1000 * 60 * 60)
        : Infinity;

      // Remove captures older than 1 hour
      if (ageInHours > 1) {
        await browser.storage.local.remove(["WEBMAP_CAPTURED_HTML"]);
        console.log("[Webmap] Cleaned up old HTML capture");
      }
    }

    // Re-apply CORS rules on cold start
    await corsHandler.init();
  } catch (error) {
    console.warn("[Webmap] Failed to clean up storage:", error);
  }
});

// MEMORY OPTIMIZATION: Limit storage size by removing old captures
browser.storage.onChanged.addListener(async (changes, areaName) => {
  if (areaName === "local" && changes.WEBMAP_CAPTURED_HTML) {
    const newValue = changes.WEBMAP_CAPTURED_HTML.newValue;
    if (newValue?.htmlContent) {
      const sizeInMB = new Blob([newValue.htmlContent]).size / (1024 * 1024);
      console.log(`[Webmap] HTML capture size: ${sizeInMB.toFixed(2)}MB`);

      // Warn if capture is unexpectedly large
      if (sizeInMB > 5) {
        console.warn(
          "[Webmap] HTML capture is very large:",
          sizeInMB.toFixed(2),
          "MB"
        );
      }
    }
  }
});

// (reverted) No background OAuth for Google Drive; HTML fallback is used instead
// On-demand content script injection fallback + CORS debug endpoints
browser.runtime.onMessage.addListener(async (message, sender) => {
  console.log("[Webmap] Received message:", message?.type);
  try {
    if (message?.type === "webmap/inject") {
      const tabId = sender?.tab?.id;
      if (!tabId) return;
      await browser.scripting.executeScript({
        target: { tabId },
        files: ["content.js"],
      });
      return { ok: true };
    }

    if (message?.type === "webmap/capture-tab") {
      try {
        console.log("[Webmap] Capturing tab...");
        const dataUrl = await browser.tabs.captureVisibleTab(null, { format: "png" });
        console.log("[Webmap] Tab captured successfully");
        return { ok: true, dataUrl };
      } catch (err) {
        console.error("[Webmap] Capture error:", err);
        return { ok: false, error: err.message || String(err) };
      }
    }

    if (message?.type === "webmap/cors-status") {
      return { ok: true, status: corsHandler.getStatus() };
    }

    if (message?.type === "webmap/cors-toggle") {
      const enabled = await corsHandler.toggle();
      return { ok: true, enabled, status: corsHandler.getStatus() };
    }
  } catch (e) {
    console.warn("[Webmap] Background message handler error:", e?.message || e);
    return { ok: false, error: e?.message || String(e) };
  }
});
