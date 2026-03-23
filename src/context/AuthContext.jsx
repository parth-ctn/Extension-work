import { useEffect, useMemo, useReducer } from "react";
import { AuthContext } from "./authContext.js";
import { STORAGE_KEYS } from "../constants/storageKeys.js";
import { clearAll, getRaw, setRaw, writeExtensionStorage } from "../utils/storage.js";
import { usersService } from "../api/usersService.js";
import { clearExtensionAuthState, writeExtensionAuthState, writeExtensionVisitorIdentity } from "../utils/extensionState.js";
import { getDeviceFingerprint } from "../utils/deviceFingerprint.js";

const initialState = {
  status: "checking",
  user: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case "AUTHENTICATED":
      return { status: "authenticated", user: action.payload };
    case "UNAUTHENTICATED":
      return { status: "unauthenticated", user: null };
    case "CHECKING":
      return { status: "checking", user: null };
    default:
      return state;
  }
}

function publishAuthenticatedState(user, { accessToken, refreshToken } = {}) {
  writeExtensionAuthState({
    isAuthenticated: true,
    user,
    accessToken: accessToken ?? getRaw(STORAGE_KEYS.ACCESS_TOKEN) ?? null,
    refreshToken: refreshToken ?? getRaw(STORAGE_KEYS.REFRESH_TOKEN) ?? null,
  });
}

async function createUserIfNeeded(visitorId, requestId, userUuid) {
  if (!visitorId) return;

  try {
    // Generate default request IDs if not provided
    let pathRequestId = requestId;
    let sitemapRequestId = requestId;
    let spiderRequestId = requestId;

    // If we don't have request IDs, generate them
    if (!requestId) {
      try {
        const fingerprint = await getDeviceFingerprint("auth");
        pathRequestId = fingerprint?.requestId;
        sitemapRequestId = fingerprint?.requestId;
        spiderRequestId = fingerprint?.requestId;
      } catch (error) {
        console.warn("Failed to generate device fingerprint for createUser", error);
        // Use visitor ID as fallback for request IDs
        pathRequestId = visitorId;
        sitemapRequestId = visitorId;
        spiderRequestId = visitorId;
      }
    }

    const createPayload = {
      visitor_id: visitorId,
      path_request_id: pathRequestId || visitorId,
      sitemap_request_id: sitemapRequestId || visitorId,
      spider_request_id: spiderRequestId || visitorId,
      ...(userUuid && { user_uuid: userUuid }),
    };

    const result = await usersService.createUser(createPayload);
    console.log("User created successfully:", result);
    return result;
  } catch (error) {
    console.warn("Failed to create user request:", error);
    // Don't throw error to avoid breaking the auth flow
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const token = getRaw(STORAGE_KEYS.ACCESS_TOKEN);
    const refreshToken = getRaw(STORAGE_KEYS.REFRESH_TOKEN);
    if (token) {
      const user = {
        uuid: getRaw(STORAGE_KEYS.USER_UUID),
        username: getRaw(STORAGE_KEYS.USER_USERNAME),
        firstName: getRaw(STORAGE_KEYS.USER_FIRST_NAME),
        plan: getRaw(STORAGE_KEYS.USER_PLAN),
      };
      dispatch({ type: "AUTHENTICATED", payload: user });
      publishAuthenticatedState(user, { accessToken: token, refreshToken });
      // Mirror tokens into extension storage for content scripts
      try {
        writeExtensionStorage(STORAGE_KEYS.ACCESS_TOKEN, token);
      } catch {}
      if (refreshToken) {
        try {
          writeExtensionStorage(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
        } catch {}
      }

      // Also sync visitor identity to extension storage on mount
      const visitorId = getRaw(STORAGE_KEYS.VISITOR_ID);
      const requestId = getRaw(STORAGE_KEYS.REQUEST_ID);
      if (visitorId) {
        writeExtensionVisitorIdentity({
          visitorId,
          requestId,
        });
      }
    } else {
      dispatch({ type: "UNAUTHENTICATED" });
      clearExtensionAuthState();
    }
  }, []);

  const value = useMemo(
    () => ({
      status: state.status,
      user: state.user,
      isAuthenticated: state.status === "authenticated",
      setSession: async ({
        tokens,
        user_uuid,
        username,
        first_name,
        plan,
        visitor_id,
        visitorId,
        request_id,
        requestId,
      }) => {
        // Resolve access token from various possible payload shapes
        const resolveAccessToken = (t) => {
          if (!t) return null;
          if (typeof t === "string") return t;
          if (typeof t === "object") {
            const candidates = [
              t.access,
              t.access_token,
              t.token,
              t.id_token,
              t.jwt,
              t.key,
              t.accessToken,
              t.accessTokenValue,
              t.tokens,
            ];
            for (const candidate of candidates) {
              const resolved = resolveAccessToken(candidate);
              if (resolved) return resolved;
            }
            return null;
          }
          return null;
        };
        const resolveRefreshToken = (t) => {
          if (!t) return null;
          if (typeof t === "string") return t;
          if (typeof t === "object") {
            const candidates = [
              t.refresh,
              t.refresh_token,
              t.refreshToken,
              t["refresh-token"],
              t.tokens,
            ];
            for (const candidate of candidates) {
              const resolved = resolveRefreshToken(candidate);
              if (resolved) return resolved;
            }
            return null;
          }
          return null;
        };

        const accessToken = resolveAccessToken(tokens);
        const refreshToken = resolveRefreshToken(tokens);
        if (accessToken) {
          // Store raw token to avoid accidental double-encoding
          setRaw(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
          try {
            writeExtensionStorage(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
          } catch {}
        }
        if (refreshToken) {
          setRaw(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
          try {
            writeExtensionStorage(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
          } catch {}
        }
        if (user_uuid) {
          setRaw(STORAGE_KEYS.USER_UUID, user_uuid);
        }
        if (username) {
          setRaw(STORAGE_KEYS.USER_USERNAME, username);
        }
        if (first_name) {
          setRaw(STORAGE_KEYS.USER_FIRST_NAME, first_name);
        }
        if (plan) {
          setRaw(STORAGE_KEYS.USER_PLAN, plan);
        }
        const previousVisitorId = getRaw(STORAGE_KEYS.VISITOR_ID);
        const previousRequestId = getRaw(STORAGE_KEYS.REQUEST_ID);

        const resolvedVisitorId = visitor_id ?? visitorId ?? null;
        const resolvedRequestId = request_id ?? requestId ?? null;

        let finalVisitorId = resolvedVisitorId ?? previousVisitorId ?? null;
        let finalRequestId = resolvedRequestId ?? previousRequestId ?? null;

        setRaw(STORAGE_KEYS.VISITOR_ID, finalVisitorId ?? undefined);
        setRaw(STORAGE_KEYS.REQUEST_ID, finalRequestId ?? undefined);
        setRaw(STORAGE_KEYS.FORM_DATA, undefined);
        setRaw(STORAGE_KEYS.AUTH_STEP, undefined);

        // Store visitor identity in extension storage for content script access
        writeExtensionVisitorIdentity({
          visitorId: finalVisitorId,
          requestId: finalRequestId,
        });

        const user = {
          uuid: user_uuid ?? null,
          username: username ?? null,
          firstName: first_name ?? null,
          plan: plan ?? null,
        };
        dispatch({ type: "AUTHENTICATED", payload: user });
        publishAuthenticatedState(user, { accessToken, refreshToken });

        if (finalVisitorId) {
          await createUserIfNeeded(finalVisitorId, finalRequestId, user_uuid);
        } else {
          try {
            const fingerprint = await getDeviceFingerprint("auth");
            if (fingerprint?.visitorId) {
              finalVisitorId = fingerprint.visitorId;
              finalRequestId = fingerprint.requestId ?? finalRequestId ?? fingerprint.visitorId ?? null;

              setRaw(STORAGE_KEYS.VISITOR_ID, finalVisitorId ?? undefined);
              setRaw(STORAGE_KEYS.REQUEST_ID, finalRequestId ?? undefined);
              writeExtensionVisitorIdentity({
                visitorId: finalVisitorId,
                requestId: finalRequestId,
              });
              await createUserIfNeeded(finalVisitorId, finalRequestId, user_uuid);
            }
          } catch (error) {
            console.warn("Failed to create user with generated fingerprint", error);
          }
        }
      },
      logout: async ({ visitorId: externalVisitorId, domain } = {}) => {
        const userUuid = getRaw(STORAGE_KEYS.USER_UUID);
        const storedVisitorId = getRaw(STORAGE_KEYS.VISITOR_ID);
        try {
          await usersService.closeAllTask({
            ...(userUuid ? { user_uuid: userUuid } : {}),
            ...(externalVisitorId ? { visitor_id: externalVisitorId } : {}),
            ...(!externalVisitorId && storedVisitorId
              ? { visitor_id: storedVisitorId }
              : {}),
            ...(domain ? { domain } : {}),
          });
        } catch (error) {
          console.warn("Failed to close user tasks on logout", error);
        }
        clearAll();
        clearExtensionAuthState();
        dispatch({ type: "UNAUTHENTICATED" });
      },
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
