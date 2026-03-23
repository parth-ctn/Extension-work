import { STORAGE_KEYS } from "../constants/storageKeys.js";
import {
  getJSON,
  readExtensionStorage,
  setJSON,
  writeExtensionStorage,
} from "./storage.js";

const STORAGE_KEY = STORAGE_KEYS.HTML_SELECTION_PREFERENCE;

function normalizeStore(value) {
  if (!value || typeof value !== "object") return {};
  return { ...value };
}

function normalizeEntry(entry, userUuid) {
  if (typeof entry === "boolean") {
    return { cleaned_html: entry, user_uuid: userUuid };
  }
  if (entry && typeof entry === "object" && typeof entry.cleaned_html === "boolean") {
    return {
      cleaned_html: Boolean(entry.cleaned_html),
      user_uuid: entry.user_uuid ?? userUuid,
      updated_at: entry.updated_at ?? entry.updatedAt ?? undefined,
    };
  }
  return null;
}

async function readStore() {
  try {
    const data = await readExtensionStorage(STORAGE_KEY);
    if (data && typeof data === "object") {
      return normalizeStore(data);
    }
  } catch (error) {
    console.warn("[htmlSelectionPreference] Failed to read extension storage", error);
  }

  try {
    const fallback = getJSON(STORAGE_KEY, null);
    if (fallback && typeof fallback === "object") {
      return normalizeStore(fallback);
    }
  } catch (error) {
    console.warn("[htmlSelectionPreference] Failed to read local storage", error);
  }

  return {};
}

export async function readStoredHtmlSelection(userUuid) {
  if (!userUuid) return null;
  const store = await readStore();
  const entry = normalizeEntry(store?.[userUuid], userUuid);
  return entry;
}

export async function writeStoredHtmlSelection(userUuid, cleanedHtml) {
  if (!userUuid) return null;
  const store = await readStore();
  const nextStore = {
    ...store,
    [userUuid]: {
      cleaned_html: Boolean(cleanedHtml),
      user_uuid: userUuid,
      updated_at: Date.now(),
    },
  };

  try {
    await writeExtensionStorage(STORAGE_KEY, nextStore);
  } catch (error) {
    console.warn("[htmlSelectionPreference] Failed to write extension storage", error);
  }

  try {
    setJSON(STORAGE_KEY, nextStore);
  } catch (error) {
    console.warn("[htmlSelectionPreference] Failed to write local storage", error);
  }

  return nextStore[userUuid];
}
