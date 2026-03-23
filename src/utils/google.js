const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_SCOPES = "openid email profile";

// Generate a random nonce for security
function generateNonce() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

// Avoid calling chrome.identity at module scope to keep this file safe in content scripts.

export async function startGoogleOAuth() {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("Google client ID is not configured.");
  }

  const chromeIdentity = globalThis.chrome?.identity;
  if (!chromeIdentity?.launchWebAuthFlow) {
    throw new Error(
      "chromeIdentity.launchWebAuthFlow is not available in this context."
    );
  }

  const redirectUri = chromeIdentity.getRedirectURL();
  const nonce = generateNonce();

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  authUrl.searchParams.set("response_type", "id_token");
  authUrl.searchParams.set("scope", GOOGLE_SCOPES);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("nonce", nonce);

  const resultUrl = await new Promise((resolve, reject) => {
    chromeIdentity.launchWebAuthFlow(
      { url: authUrl.toString(), interactive: true },
      (responseUrl) => {
        const chromeRuntime = globalThis.chrome?.runtime;
        if (chromeRuntime?.lastError) {
          reject(new Error(chromeRuntime.lastError.message));
          return;
        }
        if (!responseUrl) {
          reject(
            new Error(
              "No response from Google OAuth. User may have cancelled or access was blocked."
            )
          );
          return;
        }
        resolve(responseUrl);
      }
    );
  });

  const url = new URL(resultUrl);

  // Check for error in the response
  const params = new URLSearchParams(url.search);
  const hashParams = new URLSearchParams(url.hash.replace("#", ""));

  const error = params.get("error") || hashParams.get("error");
  if (error) {
    const errorDescription =
      params.get("error_description") ||
      hashParams.get("error_description") ||
      "Unknown error";
    throw new Error(`Google OAuth error: ${error} - ${errorDescription}`);
  }

  const idToken = hashParams.get("id_token");
  if (!idToken) {
    throw new Error(
      "Google OAuth did not return an ID token. Please check your OAuth configuration in Google Cloud Console."
    );
  }

  return idToken;
}

// Acquire an OAuth access token for Google APIs (Drive)
// (reverted) No Google Drive OAuth token helper; we only use Google Sign-In above
