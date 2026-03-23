import { post } from "./httpClient.js";

export const toolService = {
  processToolLlm: (payload, options) =>
    post("tool-llm/", payload, {
      base: "scraper",
      auth: true,
      ...(options ?? {}),
    }),
};
