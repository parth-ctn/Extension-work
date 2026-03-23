import { get, post, put } from "./httpClient.js";
import { STORAGE_KEYS } from "../constants/storageKeys.js";
import { EXTENSION_STORAGE_KEYS } from "../constants/extension.js";
import {
  getRaw,
  setRaw,
  readExtensionStorage,
  writeExtensionStorage,
} from "../utils/storage.js";

const { AUTH_STATE } = EXTENSION_STORAGE_KEYS;

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

function extractRefreshToken(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = normalizeTokenString(value);
    if (!trimmed) return null;
    if (isJsonString(trimmed)) {
      try {
        const parsed = JSON.parse(trimmed);
        return extractRefreshToken(parsed) ?? trimmed;
      } catch {
        return trimmed;
      }
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

async function resolveAccessToken(accessToken) {
  const direct = extractAccessToken(accessToken);
  if (direct) return direct;

  try {
    const authState = await readExtensionStorage(AUTH_STATE);
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

  const extraKeys = ["access_token", "accessToken", "token", "tokens"];
  for (const key of extraKeys) {
    try {
      const stored = await readExtensionStorage(key);
      const fromKey = extractAccessToken(stored);
      if (fromKey) return fromKey;
    } catch {}
  }

  try {
    const stored = await readExtensionStorage(STORAGE_KEYS.ACCESS_TOKEN);
    const fromStorage = extractAccessToken(stored) ?? extractAccessToken(stored?.token);
    if (fromStorage) return fromStorage;
  } catch {}

  if (isExtensionOrigin()) {
    const raw = getRaw(STORAGE_KEYS.ACCESS_TOKEN);
    const fromLocal = extractAccessToken(raw) ?? extractAccessToken(raw?.token);
    if (fromLocal) return fromLocal;
    for (const key of extraKeys) {
      const candidate = getRaw(key);
      const fromKey = extractAccessToken(candidate);
      if (fromKey) return fromKey;
    }
  }

  return null;
}

async function resolveRefreshToken(refreshToken) {
  const direct = extractRefreshToken(refreshToken);
  if (direct) return direct;

  try {
    const authState = await readExtensionStorage(AUTH_STATE);
    const fromAuth =
      extractRefreshToken(authState?.refreshToken) ??
      extractRefreshToken(authState?.refresh_token) ??
      extractRefreshToken(authState?.tokens?.refresh) ??
      extractRefreshToken(authState?.tokens) ??
      extractRefreshToken(authState?.user?.refreshToken);
    if (fromAuth) return fromAuth;
  } catch {}

  const extraKeys = ["refresh_token", "refreshToken", "refresh"];
  for (const key of extraKeys) {
    try {
      const stored = await readExtensionStorage(key);
      const fromKey = extractRefreshToken(stored);
      if (fromKey) return fromKey;
    } catch {}
  }

  try {
    const stored = await readExtensionStorage(STORAGE_KEYS.REFRESH_TOKEN);
    const fromStorage = extractRefreshToken(stored);
    if (fromStorage) return fromStorage;
  } catch {}

  if (isExtensionOrigin()) {
    const raw = getRaw(STORAGE_KEYS.REFRESH_TOKEN);
    const fromLocal = extractRefreshToken(raw);
    if (fromLocal) return fromLocal;
    for (const key of extraKeys) {
      const candidate = getRaw(key);
      const fromKey = extractRefreshToken(candidate);
      if (fromKey) return fromKey;
    }
  }

  return null;
}

async function buildAuthHeaders(
  headers,
  accessToken,
  { allowStored = true, logLabel } = {}
) {
  const finalHeaders = new Headers(headers || {});
  if (!finalHeaders.has("Authorization")) {
    const token = allowStored
      ? await resolveAccessToken(accessToken)
      : extractAccessToken(accessToken);
    if (logLabel) {
      console.log(`[scrapperService] ${logLabel} resolved access token`, token);
    }
    if (token) {
      finalHeaders.set("Authorization", `Bearer ${token}`);
    }
  } else if (logLabel) {
    console.log(
      `[scrapperService] ${logLabel} using provided Authorization`,
      finalHeaders.get("Authorization")
    );
  }
  return finalHeaders;
}

function isExtensionOrigin() {
  try {
    return typeof window !== "undefined" && window.location?.protocol === "chrome-extension:";
  } catch {
    return false;
  }
}

async function updateAuthStateTokens({ accessToken, refreshToken }) {
  try {
    const authState = await readExtensionStorage(AUTH_STATE);
    if (!authState || typeof authState !== "object") return;
    const next = { ...authState };
    if (accessToken) next.accessToken = accessToken;
    if (refreshToken) next.refreshToken = refreshToken;
    await writeExtensionStorage(AUTH_STATE, next);
  } catch {}
}

async function logTokenSources(logLabel) {
  if (!logLabel) return;
  try {
    const authState = await readExtensionStorage(AUTH_STATE);
    console.log(`[scrapperService] ${logLabel} auth state`, authState);
  } catch (error) {
    console.log(
      `[scrapperService] ${logLabel} auth state read failed`,
      error
    );
  }
  try {
    const storedAccess = await readExtensionStorage(STORAGE_KEYS.ACCESS_TOKEN);
    console.log(
      `[scrapperService] ${logLabel} storage access-token`,
      storedAccess
    );
  } catch (error) {
    console.log(
      `[scrapperService] ${logLabel} storage access-token read failed`,
      error
    );
  }
  try {
    const storedRefresh = await readExtensionStorage(STORAGE_KEYS.REFRESH_TOKEN);
    console.log(
      `[scrapperService] ${logLabel} storage refresh-token`,
      storedRefresh
    );
  } catch (error) {
    console.log(
      `[scrapperService] ${logLabel} storage refresh-token read failed`,
      error
    );
  }
  if (isExtensionOrigin()) {
    console.log(
      `[scrapperService] ${logLabel} local access-token`,
      getRaw(STORAGE_KEYS.ACCESS_TOKEN)
    );
    console.log(
      `[scrapperService] ${logLabel} local refresh-token`,
      getRaw(STORAGE_KEYS.REFRESH_TOKEN)
    );
  }
}

async function storeTokens({ accessToken, refreshToken }) {
  if (accessToken) {
    try {
      await writeExtensionStorage(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    } catch {}
    if (isExtensionOrigin()) {
      setRaw(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
    }
  }

  if (refreshToken) {
    try {
      await writeExtensionStorage(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    } catch {}
    if (isExtensionOrigin()) {
      setRaw(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
  }

  if (accessToken || refreshToken) {
    await updateAuthStateTokens({ accessToken, refreshToken });
  }
}

async function refreshAccessToken(refreshToken) {
  const resolved = await resolveRefreshToken(refreshToken);
  if (!resolved) return null;

  const payload = {
    refresh: resolved,
    refresh_token: resolved,
    "refresh-token": resolved,
  };

  const response = await post(
    "https://scrapper-api.blockverse.tech/auth/token/refresh/",
    payload,
    { auth: false }
  );

  const nextAccess =
    extractAccessToken(response?.access) ??
    extractAccessToken(response?.access_token) ??
    extractAccessToken(response?.token) ??
    extractAccessToken(response?.tokens) ??
    extractAccessToken(response);
  const nextRefresh =
    extractRefreshToken(response?.refresh) ??
    extractRefreshToken(response?.refresh_token) ??
    extractRefreshToken(response?.tokens) ??
    null;

  await storeTokens({ accessToken: nextAccess, refreshToken: nextRefresh });

  return nextAccess;
}

async function requestWithRefresh(
  requestFn,
  { accessToken, refreshToken, headers, logLabel } = {}
) {
  if (logLabel) {
    await logTokenSources(logLabel);
  }
  const resolvedAccess = await resolveAccessToken(accessToken);
  const resolvedRefresh = await resolveRefreshToken(refreshToken);
  if (logLabel) {
    console.log(
      `[scrapperService] ${logLabel} access token input`,
      accessToken
    );
    console.log(
      `[scrapperService] ${logLabel} access token resolved`,
      resolvedAccess
    );
    console.log(
      `[scrapperService] ${logLabel} refresh token input`,
      refreshToken
    );
    console.log(
      `[scrapperService] ${logLabel} refresh token resolved`,
      resolvedRefresh
    );
  }

  const authHeaders = await buildAuthHeaders(headers, resolvedAccess, {
    allowStored: false,
    logLabel,
  });
  if (logLabel) {
    try {
      console.log(
        `[scrapperService] ${logLabel} request headers`,
        Object.fromEntries(authHeaders.entries())
      );
    } catch {
      console.log(`[scrapperService] ${logLabel} request headers`, authHeaders);
    }
  }
  try {
    return await requestFn(authHeaders);
  } catch (error) {
    if (error?.status !== 401) {
      throw error;
    }
    const newToken = await refreshAccessToken(resolvedRefresh);
    if (logLabel) {
      console.log(
        `[scrapperService] ${logLabel} refreshed access token`,
        newToken
      );
    }
    if (!newToken) {
      throw error;
    }
    const retryHeaders = await buildAuthHeaders(headers, newToken, {
      allowStored: false,
      logLabel,
    });
    return await requestFn(retryHeaders);
  }
}

export const scrapperService = {
  /**
   * Get presigned upload URLs from scrapper API for file upload to S3
   * @param {Object} payload - Contains file_names, file_sizes, user_uuid/visitor_id
   * @returns {Promise} Response with upload URLs and batch_id
   */
  getPresignedUploadUrl: async (payload, options) => {
    const { accessToken, refreshToken, headers, logLabel, ...rest } = options ?? {};
    return requestWithRefresh(
      (authHeaders) =>
        post("get-presigned-upload-url/", payload, {
          base: "scraper",
          auth: false,
          headers: authHeaders,
          ...rest,
        }),
      { accessToken, refreshToken, headers, logLabel }
    );
  },

  /**
   * Upload file to S3 using presigned URL
   * @param {string} url - Presigned S3 URL
   * @param {File|Blob} file - File to upload
   * @param {string} contentType - MIME type of the file
   * @returns {Promise} Upload response
   */
  uploadToS3: async (url, file, contentType) => {
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: file,
    });

    if (!response.ok) {
      throw new Error(`S3 upload failed: ${response.statusText}`);
    }

    return response;
  },

  /**
   * Upload markdown metadata after S3 file upload
   * @param {Object} payload - Contains batch_id, visitor_id, title, note, etc.
   * @returns {Promise} Response with processing status
   */
  uploadMarkdown: async (payload, options) => {
    const { accessToken, refreshToken, headers, logLabel, ...rest } = options ?? {};
    return requestWithRefresh(
      (authHeaders) =>
        post("upload-markdown/", payload, {
          base: "scraper",
          auth: false,
          headers: authHeaders,
          ...rest,
        }),
      { accessToken, refreshToken, headers, logLabel }
    );
  },

  /**
   * Check if an existing HTML capture is available for a given URL/user
   * @param {Object} payload - { link_url: string, user_uuid?: string }
   * @returns {Promise<{batch_id: string|null, document_url: string|null}>}
   */
  viewExistingHtml: async (payload, options) => {
    const { accessToken, refreshToken, headers, logLabel, ...rest } = options ?? {};
    return requestWithRefresh(
      (authHeaders) =>
        post("view-existing-html/", payload, {
          base: "scraper",
          auth: false,
          headers: authHeaders,
          ...rest,
        }),
      { accessToken, refreshToken, headers, logLabel }
    );
  },

  /**
   * Retrieve the last HTML selection preference (cleaned vs original)
   * @param {string} userUuid
   */
  getHtmlSelectionPreference: async (userUuid, options) => {
    const { accessToken, refreshToken, headers, logLabel, ...rest } = options ?? {};
    return requestWithRefresh(
      (authHeaders) =>
        get(`last-html-selection/?user_uuid=${encodeURIComponent(userUuid)}`, {
          base: "scraper",
          auth: false,
          headers: authHeaders,
          ...rest,
        }),
      { accessToken, refreshToken, headers, logLabel }
    );
  },

  /**
   * Update the HTML selection preference
   * @param {{ user_uuid: string, cleaned_html: boolean }} payload
   */
  updateHtmlSelectionPreference: async (payload, options) => {
    const { accessToken, refreshToken, headers, logLabel, ...rest } = options ?? {};
    return requestWithRefresh(
      (authHeaders) =>
        put("last-html-selection/", payload, {
          base: "scraper",
          auth: false,
          headers: authHeaders,
          ...rest,
        }),
      { accessToken, refreshToken, headers, logLabel }
    );
  },
};
