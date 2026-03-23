import { useEffect, useState } from "react";
import { EXTENSION_STORAGE_KEYS } from "../../constants/extension.js";
import { STORAGE_KEYS } from "../../constants/storageKeys.js";

const { AUTH_STATE } = EXTENSION_STORAGE_KEYS;

function extractAccessToken(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ) {
        const parsed = JSON.parse(trimmed);
        return extractAccessToken(parsed) ?? trimmed;
      }
    } catch {
      // ignore JSON parse errors
    }
    return trimmed;
  }
  if (typeof value === "object") {
    const candidates = [
      value.access,
      value.access_token,
      value.token,
      value.id_token,
      value.jwt,
      value.key,
      value.accessToken,
      value.accessTokenValue,
      value.tokens,
    ];
    for (const candidate of candidates) {
      const resolved = extractAccessToken(candidate);
      if (resolved) return resolved;
    }
    return null;
  }
  return null;
}

function extractRefreshToken(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      if (
        (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
        (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
        (trimmed.startsWith('"') && trimmed.endsWith('"'))
      ) {
        const parsed = JSON.parse(trimmed);
        return extractRefreshToken(parsed) ?? trimmed;
      }
    } catch {
      // ignore JSON parse errors
    }
    return trimmed;
  }
  if (typeof value === "object") {
    const candidates = [
      value.refresh,
      value.refresh_token,
      value.refreshToken,
      value["refresh-token"],
      value.tokens,
    ];
    for (const candidate of candidates) {
      const resolved = extractRefreshToken(candidate);
      if (resolved) return resolved;
    }
    return null;
  }
  return null;
}

function readAuthState() {
  return new Promise((resolve) => {
    if (typeof chrome === "undefined" || !chrome?.storage?.local) {
      resolve(null);
      return;
    }

    try {
      const extraKeys = [
        STORAGE_KEYS.ACCESS_TOKEN,
        STORAGE_KEYS.REFRESH_TOKEN,
        "access_token",
        "accessToken",
        "token",
        "tokens",
        "refresh_token",
        "refreshToken",
        "refresh",
      ];
      chrome.storage.local.get([AUTH_STATE, ...extraKeys], (result) => {
        if (chrome.runtime?.lastError) {
          console.warn("Unable to read auth state", chrome.runtime.lastError);
          resolve(null);
          return;
        }
        const base = result?.[AUTH_STATE] ?? null;
        const merged =
          base && typeof base === "object"
            ? { ...base }
            : { isAuthenticated: false, user: null };
        if (!merged.accessToken) {
          merged.accessToken =
            result?.[STORAGE_KEYS.ACCESS_TOKEN] ??
            result?.access_token ??
            result?.accessToken ??
            result?.token ??
            result?.tokens ??
            null;
        }
        if (!merged.refreshToken) {
          merged.refreshToken =
            result?.[STORAGE_KEYS.REFRESH_TOKEN] ??
            result?.refresh_token ??
            result?.refreshToken ??
            result?.refresh ??
            null;
        }
        resolve(merged);
      });
    } catch (error) {
      console.warn("Auth state lookup failed", error);
      resolve(null);
    }
  });
}

function normaliseAuthState(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      isAuthenticated: false,
      user: null,
      accessToken: null,
      refreshToken: null,
    };
  }
  return {
    isAuthenticated: Boolean(raw.isAuthenticated),
    user: raw.user ?? null,
    accessToken:
      extractAccessToken(raw.accessToken) ??
      extractAccessToken(raw.tokens) ??
      extractAccessToken(raw.token) ??
      extractAccessToken(raw.access_token) ??
      null,
    refreshToken:
      extractRefreshToken(raw.refreshToken) ??
      extractRefreshToken(raw.refresh_token) ??
      extractRefreshToken(raw.tokens?.refresh) ??
      extractRefreshToken(raw.tokens) ??
      null,
  };
}

export function useExtensionAuthState() {
  const [state, setState] = useState({
    isAuthenticated: false,
    user: null,
    accessToken: null,
    refreshToken: null,
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const applyState = (raw) => {
      if (!isMounted) {
        return;
      }
      setState(normaliseAuthState(raw));
      setIsReady(true);
    };

    readAuthState()
      .then(applyState)
      .catch((error) => {
        console.warn("Auth state initialisation failed", error);
        if (!isMounted) {
          return;
        }
        setState(normaliseAuthState(null));
        setIsReady(true);
      });

    if (typeof chrome !== "undefined" && chrome?.storage?.onChanged) {
      const handleChange = (changes, areaName) => {
        if (areaName !== "local" || !(AUTH_STATE in changes)) {
          return;
        }
        if (!isMounted) {
          return;
        }
        const next = changes[AUTH_STATE].newValue ?? null;
        setState(normaliseAuthState(next));
        setIsReady(true);
      };

      chrome.storage.onChanged.addListener(handleChange);

      return () => {
        isMounted = false;
        chrome.storage.onChanged.removeListener(handleChange);
      };
    }

    return () => {
      isMounted = false;
    };
  }, []);

  return { ...state, isReady };
}
