import { get } from "./httpClient.js";

function withQuery(path, params) {
  const searchParams = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    searchParams.set(key, value);
  });

  const query = searchParams.toString();
  return query ? `${path}?${query}` : path;
}

export const extensionAgentService = {
  getExtensionAgents: (params, options) =>
    get(
      withQuery(
        "https://knowledge-base.blockverse.tech/chatbot/extension-agent/list/",
        params
      ),
      {
        base: "knowledge",
        auth: true,
        ...(options ?? {}),
      }
    ),

  getKbDomainList: (params, options) =>
    get(
      withQuery("chatbot/extension-agent/kb-domain-list/", params),
      {
        base: "knowledge",
        auth: true,
        ...(options ?? {}),
      }
    ),
};
