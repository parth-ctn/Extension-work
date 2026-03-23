import { get, post } from "./httpClient.js";

function withQuery(path, params) {
  const searchParams = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry !== undefined && entry !== null) {
          searchParams.append(key, entry);
        }
      });
      return;
    }
    searchParams.set(key, value);
  });

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

export const knowledgeBaseService = {
  processKnowledgeBase: (payload, options) =>
    post("chatbot/extension-agent/knowledge-base/", payload, {
      base: "knowledge",
      auth: true,
      ...(options ?? {}),
    }),

  getKnowledgeHistory: (params, options) =>
    get(withQuery("chatbot/knowledge-history/", params), {
      base: "knowledge",
      auth: true,
      ...(options ?? {}),
    }),

  getLlmScanHistory: (params, options) =>
    get(withQuery("markdown-history/", params), {
      base: "scraper",
      auth: true,
      ...(options ?? {}),
    }),

  getChatHistory: (params, options) =>
    get(withQuery("chatbot/extension-agent/chatbot-history/", params), {
      base: "knowledge",
      auth: true,
      ...(options ?? {}),
    }),

  getChatSessions: (params, options) =>
    get(withQuery("chatbot/extension-agent/chatbot-session/", params), {
      base: "knowledge",
      auth: true,
      ...(options ?? {}),
    }),

  releaseCollection: (payload, options) =>
    post("chatbot/release-collection/", payload, {
      base: "knowledge",
      auth: true,
      ...(options ?? {}),
    }),
};
