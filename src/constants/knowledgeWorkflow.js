export const KNOWLEDGE_DOMAIN = "WEBMAP-EXTENSION";

export const LLM_POLL_CONFIG = {
  initialDelay: 5000,
  maxDelay: 20000,
  maxAttempts: 30,
  backoffFactor: 1.6,
};

export const KNOWLEDGE_POLL_CONFIG = {
  initialDelay: 5000,
  maxDelay: 30000,
  maxAttempts: 90,
  backoffFactor: 1.5,
};

export const CHAT_PING_INTERVAL_MS = 30000;
