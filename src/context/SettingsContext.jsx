import { useEffect, useMemo, useState } from "react";
import { SettingsContext } from "./settingsContext.js";
import { STORAGE_KEYS } from "../constants/storageKeys.js";
import {
  setJSON,
  getJSON,
  writeExtensionStorage,
  readExtensionStorage,
} from "../utils/storage.js";

const EMBEDDING_MODELS = {
  OPENAI: "text-embedding-3-large",
  PARAPHRASE: "paraphrase-multilingual-MiniLM-L12-v2",
};

export function SettingsProvider({ children }) {
  // Initialize from localStorage, default to OpenAI
  const [embeddingModel, setEmbeddingModelState] = useState(() => {
    try {
      const stored = getJSON(STORAGE_KEYS.EMBEDDING_MODEL);
      if (stored && Object.values(EMBEDDING_MODELS).includes(stored)) {
        return stored;
      }
    } catch (error) {
      console.warn("[SettingsProvider] Failed to load embedding model from storage", error);
    }
    return EMBEDDING_MODELS.OPENAI;
  });

  // Calculate isOpenAI based on the current model
  const isOpenAI = embeddingModel === EMBEDDING_MODELS.OPENAI;

  // Hydrate from extension storage if available (content scripts cannot see localStorage)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const storedModel = await readExtensionStorage(STORAGE_KEYS.EMBEDDING_MODEL);
        const storedFlag = await readExtensionStorage(STORAGE_KEYS.IS_OPENAI);

        if (cancelled) return;

        if (storedModel && Object.values(EMBEDDING_MODELS).includes(storedModel)) {
          setEmbeddingModelState(storedModel);
          return;
        }

        if (typeof storedFlag === "boolean") {
          setEmbeddingModelState(
            storedFlag ? EMBEDDING_MODELS.OPENAI : EMBEDDING_MODELS.PARAPHRASE
          );
        }
      } catch (error) {
        console.warn("[SettingsProvider] Failed to hydrate settings from extension storage", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Persist to both localStorage and extension storage whenever embeddingModel changes
  useEffect(() => {
    try {
      setJSON(STORAGE_KEYS.EMBEDDING_MODEL, embeddingModel);
      setJSON(STORAGE_KEYS.IS_OPENAI, isOpenAI);
      console.log("[SettingsProvider] Settings updated", {
        embeddingModel,
        isOpenAI,
      });
    } catch (error) {
      console.warn("[SettingsProvider] Failed to persist settings", error);
    }

    (async () => {
      try {
        await writeExtensionStorage(STORAGE_KEYS.EMBEDDING_MODEL, embeddingModel);
        await writeExtensionStorage(STORAGE_KEYS.IS_OPENAI, isOpenAI);
      } catch (error) {
        console.warn("[SettingsProvider] Failed to persist settings to extension storage", error);
      }
    })();
  }, [embeddingModel, isOpenAI]);

  const value = useMemo(
    () => ({
      embeddingModel,
      isOpenAI,
      setEmbeddingModel: (newModel) => {
        if (Object.values(EMBEDDING_MODELS).includes(newModel)) {
          setEmbeddingModelState(newModel);
        } else {
          console.warn("[SettingsProvider] Invalid embedding model:", newModel);
        }
      },
      EMBEDDING_MODELS,
    }),
    [embeddingModel, isOpenAI]
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}
