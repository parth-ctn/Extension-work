import { createContext } from "react";

export const SettingsContext = createContext({
  embeddingModel: "text-embedding-3-large",
  isOpenAI: true,
  setEmbeddingModel: () => {},
});
