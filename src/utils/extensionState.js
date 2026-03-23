import { EXTENSION_STORAGE_KEYS } from "../constants/extension.js";

const { AUTH_STATE, VISITOR_IDENTITY } = EXTENSION_STORAGE_KEYS;

function getStorage() {
  if (typeof chrome === "undefined" || !chrome?.storage?.local) {
    return null;
  }
  return chrome.storage.local;
}

export function writeExtensionAuthState(payload) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.set({ [AUTH_STATE]: payload });
  } catch (error) {
    console.warn("Failed to publish auth state to extension storage", error);
  }
}

export function writeExtensionVisitorIdentity(payload) {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.set({ [VISITOR_IDENTITY]: payload });
  } catch (error) {
    console.warn("Failed to publish visitor identity to extension storage", error);
  }
}

export function readExtensionVisitorIdentity() {
  return new Promise((resolve) => {
    const storage = getStorage();
    if (!storage) {
      resolve(null);
      return;
    }

    try {
      storage.get([VISITOR_IDENTITY], (result) => {
        if (chrome.runtime?.lastError) {
          console.warn("Unable to read visitor identity", chrome.runtime.lastError);
          resolve(null);
          return;
        }
        resolve(result?.[VISITOR_IDENTITY] ?? null);
      });
    } catch (error) {
      console.warn("Visitor identity lookup failed", error);
      resolve(null);
    }
  });
}

export function clearExtensionAuthState() {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.remove([AUTH_STATE, VISITOR_IDENTITY]);
  } catch (error) {
    console.warn("Failed to clear auth state from extension storage", error);
  }
}
