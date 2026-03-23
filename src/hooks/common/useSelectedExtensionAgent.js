import { useCallback, useEffect, useRef, useState } from "react";
import { STORAGE_KEYS } from "../../constants/storageKeys.js";
import { readExtensionStorage } from "../../utils/storage.js";

const LOG_PREFIX = "[useSelectedExtensionAgent]";

function normalizeExtensionId(raw) {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function useSelectedExtensionAgent({ pollIntervalMs = 2000 } = {}) {
  const [selectedExtensionId, setSelectedExtensionId] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const lastKnownIdRef = useRef(null);

  const applyId = useCallback((next) => {
    const normalized = normalizeExtensionId(next);
    if (normalized !== lastKnownIdRef.current) {
      lastKnownIdRef.current = normalized;
      setSelectedExtensionId(normalized);
    }
    setIsHydrated(true);
    return normalized;
  }, []);

  const hydrate = useCallback(async () => {
    try {
      const value = await readExtensionStorage(
        STORAGE_KEYS.SELECTED_EXTENSION_ID
      );
      return applyId(value);
    } catch (error) {
      console.warn(`${LOG_PREFIX} Failed to hydrate selected agent`, error);
      setIsHydrated(true);
      return lastKnownIdRef.current;
    }
  }, [applyId]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome?.storage?.onChanged) {
      return undefined;
    }

    const handler = (changes, areaName) => {
      if (areaName !== "local") return;
      if (!changes?.[STORAGE_KEYS.SELECTED_EXTENSION_ID]) return;
      hydrate();
    };

    chrome.storage.onChanged.addListener(handler);
    return () => {
      try {
        chrome.storage.onChanged.removeListener(handler);
      } catch {}
    };
  }, [hydrate]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleStorage = (event) => {
      if (
        event.key === STORAGE_KEYS.SELECTED_EXTENSION_ID &&
        event.newValue !== event.oldValue
      ) {
        hydrate();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [hydrate]);

  useEffect(() => {
    if (!pollIntervalMs || pollIntervalMs <= 0) return undefined;
    const id = setInterval(() => {
      hydrate();
    }, pollIntervalMs);
    return () => clearInterval(id);
  }, [hydrate, pollIntervalMs]);

  return {
    selectedExtensionId,
    isHydrated,
    refreshSelectedExtensionId: hydrate,
  };
}

