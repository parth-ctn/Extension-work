import { EXTENSION_STORAGE_KEYS } from "../constants/extension.js";
import { STORAGE_KEYS } from "../constants/storageKeys.js";
import { getRaw, readExtensionStorage } from "../utils/storage.js";

const API_BASE_URL = normalizeBase(import.meta.env.VITE_API_BASE_URL);
const SCRAPER_BASE_URL = normalizeBase(import.meta.env.VITE_API_SCRAPER_URL);
const KNOWLEDGE_BASE_URL = normalizeBase(import.meta.env.VITE_API_KNOWLEDGE_URL);

const BASE_ALIAS = {
  auth: API_BASE_URL,
  scraper: SCRAPER_BASE_URL,
  knowledge: KNOWLEDGE_BASE_URL,
};

const ACCESS_TOKEN_STORAGE_KEYS = [
  STORAGE_KEYS.ACCESS_TOKEN,
  "access_token",
  "accessToken",
  "token",
  "tokens",
];

function isJsonString(value) {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  const first = trimmed[0];
  const last = trimmed[trimmed.length - 1];
  return (
    (first === "{" && last === "}") ||
    (first === "[" && last === "]") ||
    (first === '"' && last === '"')
  );
}

function normalizeTokenString(value) {
  if (typeof value !== "string") return null;
  let trimmed = value.trim();
  if (!trimmed) return null;
  if (/^bearer\s+/i.test(trimmed)) {
    trimmed = trimmed.replace(/^bearer\s+/i, "").trim();
  }
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  return trimmed || null;
}

function extractAccessToken(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = normalizeTokenString(value);
    if (!trimmed) return null;
    if (isJsonString(trimmed)) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractAccessToken(parsed) ?? trimmed;
      } catch {
        return trimmed;
      }
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

async function resolveAccessToken() {
  const raw = getRaw(STORAGE_KEYS.ACCESS_TOKEN);
  const localToken = extractAccessToken(raw);
  if (localToken) return localToken;

  try {
    const authState = await readExtensionStorage(EXTENSION_STORAGE_KEYS.AUTH_STATE);
    const fromAuth =
      extractAccessToken(authState?.accessToken) ??
      extractAccessToken(authState?.tokens) ??
      extractAccessToken(authState?.token) ??
      extractAccessToken(authState?.access_token) ??
      extractAccessToken(authState?.user?.tokens) ??
      extractAccessToken(authState?.user?.token) ??
      extractAccessToken(authState?.user?.access_token);
    if (fromAuth) return fromAuth;
  } catch {}

  for (const key of ACCESS_TOKEN_STORAGE_KEYS) {
    try {
      const stored = await readExtensionStorage(key);
      const resolved = extractAccessToken(stored) ?? extractAccessToken(stored?.token);
      if (resolved) return resolved;
    } catch {}
  }

  return null;
}

function normalizeBase(raw) {
  if (!raw) return "";
  return raw.replace(/\/$/, "");
}

function buildUrl(path, base) {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const trimmedPath = path.replace(/^\//, "");
  const baseUrl = resolveBase(base);

  if (!baseUrl) {
    throw new Error(
      base
        ? `API base \"${base}\" is not configured`
        : "VITE_API_BASE_URL is not configured"
    );
  }

  return `${baseUrl}/${trimmedPath}`;
}

function resolveBase(base) {
  if (!base || base === "auth") {
    return BASE_ALIAS.auth;
  }

  if (typeof base === "string" && /^https?:\/\//i.test(base)) {
    return base.replace(/\/$/, "");
  }

  if (base in BASE_ALIAS) {
    return BASE_ALIAS[base];
  }

  throw new Error(`Unknown API base alias: ${String(base)}`);
}

function extractErrorMessage(payload, fallback) {
  if (!payload) return fallback;
  // common backends: message | detail | error | errors[] | data.message
  if (typeof payload.message === "string" && payload.message) return payload.message;
  if (typeof payload.detail === "string" && payload.detail) return payload.detail;
  if (typeof payload.error === "string" && payload.error) return payload.error;
  if (Array.isArray(payload.errors) && payload.errors.length) {
    const first = payload.errors[0];
    if (typeof first === "string") return first;
    if (first && typeof first.message === "string") return first.message;
  }
  if (payload.data && typeof payload.data.message === "string") return payload.data.message;
  if (typeof payload.raw === "string" && payload.raw) return payload.raw;
  return fallback;
}

async function request(
  path,
  {
    method = "GET",
    body,
    headers = {},
    auth = false,
    signal,
    requestInit,
    base,
    timeoutMs = 60000,
  } = {}
) {
  const url = buildUrl(path, base);
  const finalHeaders = new Headers(headers);
  const hasBody = body !== undefined && body !== null;

  if (hasBody && !finalHeaders.has("Content-Type")) {
    finalHeaders.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = await resolveAccessToken();
    if (token) {
      finalHeaders.set("Authorization", `Bearer ${token}`);
    }
  }

  // Compose AbortController for timeout + caller signal
  const controller = new AbortController();
  if (signal) {
    try {
      signal.addEventListener("abort", () => controller.abort(signal.reason), { once: true });
    } catch {}
  }
  let didTimeout = false;
  const timeoutId = timeoutMs
    ? setTimeout(() => {
        didTimeout = true;
        try { controller.abort(); } catch {}
      }, timeoutMs)
    : null;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: finalHeaders,
      body:
        hasBody && finalHeaders.get("Content-Type") === "application/json"
          ? JSON.stringify(body)
          : body,
      signal: controller.signal,
      ...requestInit,
    });
  } catch (err) {
    const error = new Error(err?.message || "Network request failed");
    error.status = 0;
    error.payload = null;
    if (err?.name === "AbortError") {
      error.message = didTimeout ? "Request timed out" : "Request aborted";
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorPayload = await safeJson(response);
    const message = extractErrorMessage(
      errorPayload,
      response.statusText || `Request failed with status ${response.status}`
    );
    const error = new Error(message);
    error.status = response.status;
    error.payload = errorPayload;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return safeJson(response);
}

async function safeJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export function get(path, options = {}) {
  return request(path, { ...options, method: "GET" });
}

export function post(path, body, options = {}) {
  return request(path, { ...options, method: "POST", body });
}

export function put(path, body, options = {}) {
  return request(path, { ...options, method: "PUT", body });
}

export function del(path, options = {}) {
  return request(path, { ...options, method: "DELETE" });
}
