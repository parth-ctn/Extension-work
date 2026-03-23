import { useEffect, useMemo, useState, useCallback } from "react";
import { extensionAgentService } from "../../../api/extensionAgentService.js";
import { scrapperService } from "../../../api/scrapperService.js";
import {
  readExtensionStorage,
  writeExtensionStorage,
  getRaw,
} from "../../../utils/storage.js";
import { STORAGE_KEYS } from "../../../constants/storageKeys.js";
import {
  captureRenderedHtml,
  generateHtmlFilename,
} from "../../../utils/htmlCapture.js";
import {
  removeAdsOnlyFromHtml,
  cleanHtmlString,
} from "../../../utils/htmlCleaner.js";
import {
  ensureNonEmptyBody,
  hasNonEmptyBody,
} from "../../../utils/htmlEnsure.js";
import { areBodiesEqual } from "../../../utils/htmlCompare.js";

function fmtDate(iso) {
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "";
    return d.toLocaleString();
  } catch {
    return "";
  }
}

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateForCard(iso) {
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "";
    const now = new Date();
    if (isSameDay(d, now)) {
      return d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

function normalizeFullUrlNoTrailing(url) {
  try {
    const u = new URL(url);
    return u.href.replace(/\/$/, "");
  } catch {
    return String(url ?? "").replace(/\/$/, "");
  }
}

export function KbList({
  user,
  userUuid,
  userName,
  accessToken,
  refreshToken,
  onCreateNewKb,
  onSelectKb,
  onCompared,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kbs, setKbs] = useState([]);
  const [comparison, setComparison] = useState("pending"); // none|same|changed|pending
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");

  const currentUrl = useMemo(
    () => (typeof window !== "undefined" ? window.location.href : ""),
    []
  );
  const linkUrl = useMemo(
    () => normalizeFullUrlNoTrailing(currentUrl),
    [currentUrl]
  );

  const compareHtml = useCallback(async () => {
    try {
      const stored =
        (await readExtensionStorage(STORAGE_KEYS.CAPTURED_HTML)) || null;
      let sourceHtml = stored?.htmlContent || null;
      const pageTitle =
        stored?.title ||
        (typeof document !== "undefined" ? document.title : "");
      if (!sourceHtml) {
        const raw = captureRenderedHtml();
        const fallback = ensureNonEmptyBody(
          removeAdsOnlyFromHtml(raw),
          raw,
          pageTitle
        );
        const filename = generateHtmlFilename(currentUrl, pageTitle);
        await writeExtensionStorage(STORAGE_KEYS.CAPTURED_HTML, {
          htmlContent: fallback,
          filename,
          url: currentUrl,
          title: pageTitle,
          capturedAt: new Date().toISOString(),
        });
        sourceHtml = fallback;
      }

      const payload = {
        link_url: linkUrl,
        ...(userUuid ? { user_uuid: userUuid } : {}),
      };
      const existing = await scrapperService.viewExistingHtml(payload, {
        timeoutMs: 15000,
        accessToken,
        refreshToken,
        logLabel: "view-existing-html",
      });

      const documentUrl = existing?.document_url ?? null;
      const wasCleaned = Boolean(existing?.cleaned_html);
      if (!documentUrl) {
        setComparison("none");
        onCompared?.("none");
        return;
      }

      const resp = await fetch(documentUrl);
      if (!resp.ok)
        throw new Error(`Failed to fetch stored HTML: ${resp.status}`);
      const previousHtmlRaw = await resp.text();
      let prepared = wasCleaned
        ? cleanHtmlString(sourceHtml)
        : removeAdsOnlyFromHtml(sourceHtml);
      prepared = ensureNonEmptyBody(prepared, sourceHtml, pageTitle);

      let previousPrepared = wasCleaned
        ? cleanHtmlString(previousHtmlRaw)
        : removeAdsOnlyFromHtml(previousHtmlRaw);
      previousPrepared = ensureNonEmptyBody(
        previousPrepared,
        previousHtmlRaw,
        pageTitle
      );

      const same = areBodiesEqual(previousPrepared, prepared);
      setComparison(same ? "same" : "changed");
      onCompared?.(same ? "same" : "changed");
    } catch (e) {
      console.warn("[Webmap] HTML comparison failed:", e?.message || e);
      setComparison("none");
      onCompared?.("none");
    }
  }, [accessToken, refreshToken, currentUrl, onCompared, userUuid, linkUrl]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = {
          user_uuid: userUuid ?? "",
          link_url: linkUrl,
        };
        const resp = await extensionAgentService.getKbDomainList(params);
        if (cancelled) return;
        const list = Array.isArray(resp?.data)
          ? resp.data
          : Array.isArray(resp)
          ? resp
          : [];
        setKbs(list);
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Failed to load knowledge bases");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [linkUrl, userUuid]);

  useEffect(() => {
    compareHtml();
  }, [compareHtml]);

  // Load username and first name for greeting
  useEffect(() => {
    // Load username (for fallback)
    // 1) From props if provided
    if (userName || user?.username) {
      setUsername(userName || user?.username || "");
    } else {
      // 2) From localStorage (raw string)
      const fromLocal = getRaw(STORAGE_KEYS.USER_USERNAME);
      if (fromLocal && typeof fromLocal === "string") {
        setUsername(fromLocal);
      } else {
        // 3) Fallback: from extension storage (async, if running in extension context)
        (async () => {
          try {
            const stored = await readExtensionStorage(
              STORAGE_KEYS.USER_USERNAME
            );
            if (stored && typeof stored === "string") {
              setUsername(stored);
            }
          } catch {}
        })();
      }
    }

    // Load first name (for greeting display)
    if (user?.firstName) {
      setFirstName(user.firstName);
    } else {
      // Try localStorage raw
      const fromLocal = getRaw(STORAGE_KEYS.USER_FIRST_NAME);
      if (fromLocal && typeof fromLocal === "string") {
        setFirstName(fromLocal);
      } else {
        // Finally, try extension storage
        (async () => {
          try {
            const stored = await readExtensionStorage(
              STORAGE_KEYS.USER_FIRST_NAME
            );
            if (stored && typeof stored === "string") {
              setFirstName(stored);
            }
          } catch {}
        })();
      }
    }
  }, [userName, user]);

  // Render based on comparison state
  if (loading || comparison === "pending") {
    return (
      <div className="start-session-section first-screen">
        <div className="session-box">
          <svg
            width="59"
            height="59"
            viewBox="0 0 59 59"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="59" height="59" rx="29.5" fill="#5D5FEF" />
            <path
              d="M31.5103 51.2928C24.8183 32.6933 27.6338 15.362 29.8781 9.02126C23.1454 8.38718 12.7402 14.5165 12.7402 26.3526C12.7402 35.8214 19.405 41.0067 22.7373 42.4159C21.0371 41.4998 17.3919 38.0196 16.4126 31.4251C15.1885 23.1822 20.2891 19.3778 23.3494 17.8983C22.3293 26.1412 24.3695 35.2296 26.0017 39.4567C27.6338 43.684 27.8379 44.1066 31.5103 51.2928Z"
              fill="white"
            />
            <path
              d="M30.4825 33.0326C26.7211 33.0326 23.672 29.8738 23.672 25.9772C23.672 22.0807 26.7211 18.9219 30.4825 18.9219C34.2438 18.9219 37.293 22.0807 37.293 25.9772C37.293 29.8738 34.2438 33.0326 30.4825 33.0326Z"
              fill="white"
            />
            <path
              d="M27.1706 26.3047H25.2432C25.3038 27.4009 25.6774 28.4357 26.3195 29.298C26.6806 29.0867 27.0861 28.9055 27.5241 28.7578C27.3157 28.0034 27.1945 27.1705 27.1706 26.3047Z"
              fill="#3B3EE4"
            />
            <path
              d="M27.1706 25.6574C27.1945 24.7916 27.3157 23.9586 27.5241 23.2043C27.0861 23.0565 26.6807 22.8754 26.3195 22.6641C25.6774 23.5263 25.3038 24.5612 25.2432 25.6574H27.1706Z"
              fill="#3B3EE4"
            />
            <path
              d="M28.6278 22.06C28.5113 22.283 28.406 22.522 28.3125 22.7746C28.8954 22.9189 29.5261 23.0051 30.1773 23.0257V20.5781C29.604 20.714 29.0627 21.2281 28.6278 22.06Z"
              fill="#3B3EE4"
            />
            <path
              d="M30.7891 20.5781V23.0257C31.4403 23.005 32.071 22.9188 32.6539 22.7746C32.5603 22.522 32.4551 22.2829 32.3386 22.06C31.9037 21.2281 31.3624 20.714 30.7891 20.5781Z"
              fill="#3B3EE4"
            />
            <path
              d="M32.8483 23.3906C32.2036 23.5548 31.5066 23.652 30.7891 23.6736V25.6701H33.1775C33.154 24.8623 33.0413 24.0882 32.8483 23.3906Z"
              fill="#3B3EE4"
            />
            <path
              d="M27.7199 29.3516C27.3651 29.4712 27.0348 29.6145 26.7363 29.7794C26.7492 29.793 26.7619 29.8068 26.7749 29.8204C27.3209 30.386 27.9662 30.8112 28.6699 31.0794C28.4602 30.8299 28.2651 30.5348 28.0883 30.1966C27.9508 29.9336 27.8279 29.6506 27.7199 29.3516Z"
              fill="#3B3EE4"
            />
            <path
              d="M33.2479 22.6028C33.6026 22.4831 33.9329 22.3398 34.2314 22.175C34.2185 22.1613 34.2058 22.1475 34.1928 22.134C33.6468 21.5684 33.0015 21.1431 32.2979 20.875C32.5075 21.1244 32.7026 21.4195 32.8794 21.7578C33.0169 22.0208 33.1398 22.3037 33.2479 22.6028Z"
              fill="#3B3EE4"
            />
            <path
              d="M33.7929 26.3047C33.769 27.1705 33.6479 28.0034 33.4395 28.7578C33.8775 28.9055 34.2829 29.0867 34.644 29.298C35.2861 28.4358 35.6597 27.4009 35.7203 26.3047L33.7929 26.3047Z"
              fill="#3B3EE4"
            />
            <path
              d="M33.2479 29.3516C33.1399 29.6506 33.0169 29.9335 32.8795 30.1966C32.7026 30.5348 32.5076 30.8299 32.2979 31.0793C33.0015 30.8112 33.6468 30.386 34.1928 29.8203C34.2058 29.8068 34.2185 29.793 34.2314 29.7794C33.9329 29.6145 33.6026 29.4712 33.2479 29.3516Z"
              fill="#3B3EE4"
            />
            <path
              d="M27.7198 22.6028C27.8278 22.3037 27.9508 22.0208 28.0883 21.7578C28.2651 21.4195 28.4601 21.1244 28.6699 20.875C27.9662 21.1431 27.3209 21.5684 26.7749 22.134C26.7619 22.1475 26.7492 22.1613 26.7363 22.175C27.0348 22.3398 27.3651 22.4831 27.7198 22.6028Z"
              fill="#3B3EE4"
            />
            <path
              d="M33.4395 23.2043C33.6479 23.9586 33.769 24.7915 33.7929 25.6574H35.7203C35.6597 24.5612 35.2861 23.5263 34.644 22.6641C34.2829 22.8753 33.8775 23.0565 33.4395 23.2043Z"
              fill="#3B3EE4"
            />
            <path
              d="M30.1795 25.6701V23.6736C29.462 23.652 28.7649 23.5547 28.1202 23.3906C27.9272 24.0882 27.8145 24.8622 27.791 25.6701H30.1795Z"
              fill="#3B3EE4"
            />
            <path
              d="M30.7891 26.3047V28.3012C31.5065 28.3228 32.2036 28.4201 32.8483 28.5842C33.0413 27.8866 33.154 27.1126 33.1775 26.3047L30.7891 26.3047Z"
              fill="#3B3EE4"
            />
            <path
              d="M32.3386 29.8954C32.4551 29.6724 32.5604 29.4334 32.6539 29.1808C32.071 29.0365 31.4403 28.9503 30.7891 28.9297V31.3772C31.3624 31.2414 31.9037 30.7273 32.3386 29.8954Z"
              fill="#3B3EE4"
            />
            <path
              d="M30.1773 31.3772V28.9297C29.5261 28.9503 28.8954 29.0365 28.3125 29.1808C28.4061 29.4333 28.5113 29.6724 28.6278 29.8954C29.0627 30.7273 29.604 31.2414 30.1773 31.3772Z"
              fill="#3B3EE4"
            />
            <path
              d="M30.1795 26.3047H27.791C27.8145 27.1126 27.9272 27.8866 28.1202 28.5842C28.7649 28.4201 29.462 28.3228 30.1795 28.3012V26.3047Z"
              fill="#3B3EE4"
            />
            <path
              d="M33.9712 9.78125C37.426 10.8929 40.4228 13.1692 42.4854 16.2481C44.5479 19.327 45.5576 23.0318 45.3541 26.7736C45.1504 30.5153 43.7454 34.0791 41.3618 36.8984C38.9785 39.7176 35.7536 41.6308 32.2001 42.3331L31.5391 38.7443C34.3199 38.1948 36.8436 36.6977 38.7088 34.4914C40.5742 32.2851 41.6737 29.4962 41.8331 26.568C41.9923 23.6398 41.2021 20.7405 39.5881 18.331C37.9741 15.9215 35.6288 14.1402 32.9252 13.2702L33.9712 9.78125Z"
              fill="white"
            />
          </svg>
          <h3>Knowledge Bases</h3>
          <h4>Checking your page…</h4>
        </div>
      </div>
    );
  }

  // SCREEN 1.a: No KB Found (comparison === "none")
  if (comparison === "none") {
    return (
      <div className="start-session-section first-screen">
        <div className="session-box">
          <svg
            width="59"
            height="59"
            viewBox="0 0 59 59"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect width="59" height="59" rx="29.5" fill="#5D5FEF" />
            <path
              d="M31.5103 51.2928C24.8183 32.6933 27.6338 15.362 29.8781 9.02126C23.1454 8.38718 12.7402 14.5165 12.7402 26.3526C12.7402 35.8214 19.405 41.0067 22.7373 42.4159C21.0371 41.4998 17.3919 38.0196 16.4126 31.4251C15.1885 23.1822 20.2891 19.3778 23.3494 17.8983C22.3293 26.1412 24.3695 35.2296 26.0017 39.4567C27.6338 43.684 27.8379 44.1066 31.5103 51.2928Z"
              fill="white"
            />
            <path
              d="M30.4825 33.0326C26.7211 33.0326 23.672 29.8738 23.672 25.9772C23.672 22.0807 26.7211 18.9219 30.4825 18.9219C34.2438 18.9219 37.293 22.0807 37.293 25.9772C37.293 29.8738 34.2438 33.0326 30.4825 33.0326Z"
              fill="white"
            />
            <path
              d="M27.1706 26.3047H25.2432C25.3038 27.4009 25.6774 28.4357 26.3195 29.298C26.6806 29.0867 27.0861 28.9055 27.5241 28.7578C27.3157 28.0034 27.1945 27.1705 27.1706 26.3047Z"
              fill="#3B3EE4"
            />
            <path
              d="M27.1706 25.6574C27.1945 24.7916 27.3157 23.9586 27.5241 23.2043C27.0861 23.0565 26.6807 22.8754 26.3195 22.6641C25.6774 23.5263 25.3038 24.5612 25.2432 25.6574H27.1706Z"
              fill="#3B3EE4"
            />
            <path
              d="M28.6278 22.06C28.5113 22.283 28.406 22.522 28.3125 22.7746C28.8954 22.9189 29.5261 23.0051 30.1773 23.0257V20.5781C29.604 20.714 29.0627 21.2281 28.6278 22.06Z"
              fill="#3B3EE4"
            />
            <path
              d="M30.7891 20.5781V23.0257C31.4403 23.005 32.071 22.9188 32.6539 22.7746C32.5603 22.522 32.4551 22.2829 32.3386 22.06C31.9037 21.2281 31.3624 20.714 30.7891 20.5781Z"
              fill="#3B3EE4"
            />
            <path
              d="M32.8483 23.3906C32.2036 23.5548 31.5066 23.652 30.7891 23.6736V25.6701H33.1775C33.154 24.8623 33.0413 24.0882 32.8483 23.3906Z"
              fill="#3B3EE4"
            />
            <path
              d="M27.7199 29.3516C27.3651 29.4712 27.0348 29.6145 26.7363 29.7794C26.7492 29.793 26.7619 29.8068 26.7749 29.8204C27.3209 30.386 27.9662 30.8112 28.6699 31.0794C28.4602 30.8299 28.2651 30.5348 28.0883 30.1966C27.9508 29.9336 27.8279 29.6506 27.7199 29.3516Z"
              fill="#3B3EE4"
            />
            <path
              d="M33.2479 22.6028C33.6026 22.4831 33.9329 22.3398 34.2314 22.175C34.2185 22.1613 34.2058 22.1475 34.1928 22.134C33.6468 21.5684 33.0015 21.1431 32.2979 20.875C32.5075 21.1244 32.7026 21.4195 32.8794 21.7578C33.0169 22.0208 33.1398 22.3037 33.2479 22.6028Z"
              fill="#3B3EE4"
            />
            <path
              d="M33.7929 26.3047C33.769 27.1705 33.6479 28.0034 33.4395 28.7578C33.8775 28.9055 34.2829 29.0867 34.644 29.298C35.2861 28.4358 35.6597 27.4009 35.7203 26.3047L33.7929 26.3047Z"
              fill="#3B3EE4"
            />
            <path
              d="M33.2479 29.3516C33.1399 29.6506 33.0169 29.9335 32.8795 30.1966C32.7026 30.5348 32.5076 30.8299 32.2979 31.0793C33.0015 30.8112 33.6468 30.386 34.1928 29.8203C34.2058 29.8068 34.2185 29.793 34.2314 29.7794C33.9329 29.6145 33.6026 29.4712 33.2479 29.3516Z"
              fill="#3B3EE4"
            />
            <path
              d="M27.7198 22.6028C27.8278 22.3037 27.9508 22.0208 28.0883 21.7578C28.2651 21.4195 28.4601 21.1244 28.6699 20.875C27.9662 21.1431 27.3209 21.5684 26.7749 22.134C26.7619 22.1475 26.7492 22.1613 26.7363 22.175C27.0348 22.3398 27.3651 22.4831 27.7198 22.6028Z"
              fill="#3B3EE4"
            />
            <path
              d="M33.4395 23.2043C33.6479 23.9586 33.769 24.7915 33.7929 25.6574H35.7203C35.6597 24.5612 35.2861 23.5263 34.644 22.6641C34.2829 22.8753 33.8775 23.0565 33.4395 23.2043Z"
              fill="#3B3EE4"
            />
            <path
              d="M30.1795 25.6701V23.6736C29.462 23.652 28.7649 23.5547 28.1202 23.3906C27.9272 24.0882 27.8145 24.8622 27.791 25.6701H30.1795Z"
              fill="#3B3EE4"
            />
            <path
              d="M30.7891 26.3047V28.3012C31.5065 28.3228 32.2036 28.4201 32.8483 28.5842C33.0413 27.8866 33.154 27.1126 33.1775 26.3047L30.7891 26.3047Z"
              fill="#3B3EE4"
            />
            <path
              d="M32.3386 29.8954C32.4551 29.6724 32.5604 29.4334 32.6539 29.1808C32.071 29.0365 31.4403 28.9503 30.7891 28.9297V31.3772C31.3624 31.2414 31.9037 30.7273 32.3386 29.8954Z"
              fill="#3B3EE4"
            />
            <path
              d="M30.1773 31.3772V28.9297C29.5261 28.9503 28.8954 29.0365 28.3125 29.1808C28.4061 29.4333 28.5113 29.6724 28.6278 29.8954C29.0627 30.7273 29.604 31.2414 30.1773 31.3772Z"
              fill="#3B3EE4"
            />
            <path
              d="M30.1795 26.3047H27.791C27.8145 27.1126 27.9272 27.8866 28.1202 28.5842C28.7649 28.4201 29.462 28.3228 30.1795 28.3012V26.3047Z"
              fill="#3B3EE4"
            />
            <path
              d="M33.9712 9.78125C37.426 10.8929 40.4228 13.1692 42.4854 16.2481C44.5479 19.327 45.5576 23.0318 45.3541 26.7736C45.1504 30.5153 43.7454 34.0791 41.3618 36.8984C38.9785 39.7176 35.7536 41.6308 32.2001 42.3331L31.5391 38.7443C34.3199 38.1948 36.8436 36.6977 38.7088 34.4914C40.5742 32.2851 41.6737 29.4962 41.8331 26.568C41.9923 23.6398 41.2021 20.7405 39.5881 18.331C37.9741 15.9215 35.6288 14.1402 32.9252 13.2702L33.9712 9.78125Z"
              fill="white"
            />
          </svg>
          <h3>Knowledge Bases</h3>
          <h4>No knowledge base found for this URL.</h4>
          <button type="button" className="btn-primary" onClick={onCreateNewKb}>
            Create New KB
          </button>
          <p>
            Webmap momentarily saves the visible content from this tab to answer
            your prompts.
          </p>
        </div>
      </div>
    );
  }

  // SCREEN 1.b & 1.c: KB exists (changed or same)
  const headerNote =
    comparison === "same"
      ? "The data of the current url has not changed."
      : "The website's data has changed. Create a new KB or select an existing one below.";

  const headerSubNote =
    comparison === "same" ? "You can use your old kb or create a new one." : "";

  return (
    <div className="start-session-section">
      <div className="greeting-txt">
        Hi <strong>{firstName || username}</strong>, ready when you are.
      </div>
      <div className="session-box">
        <svg
          width="59"
          height="59"
          viewBox="0 0 59 59"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="59" height="59" rx="29.5" fill="#5D5FEF" />
          <path
            d="M31.5103 51.2928C24.8183 32.6933 27.6338 15.362 29.8781 9.02126C23.1454 8.38718 12.7402 14.5165 12.7402 26.3526C12.7402 35.8214 19.405 41.0067 22.7373 42.4159C21.0371 41.4998 17.3919 38.0196 16.4126 31.4251C15.1885 23.1822 20.2891 19.3778 23.3494 17.8983C22.3293 26.1412 24.3695 35.2296 26.0017 39.4567C27.6338 43.684 27.8379 44.1066 31.5103 51.2928Z"
            fill="white"
          />
          <path
            d="M30.4825 33.0326C26.7211 33.0326 23.672 29.8738 23.672 25.9772C23.672 22.0807 26.7211 18.9219 30.4825 18.9219C34.2438 18.9219 37.293 22.0807 37.293 25.9772C37.293 29.8738 34.2438 33.0326 30.4825 33.0326Z"
            fill="white"
          />
          <path
            d="M27.1706 26.3047H25.2432C25.3038 27.4009 25.6774 28.4357 26.3195 29.298C26.6806 29.0867 27.0861 28.9055 27.5241 28.7578C27.3157 28.0034 27.1945 27.1705 27.1706 26.3047Z"
            fill="#3B3EE4"
          />
          <path
            d="M27.1706 25.6574C27.1945 24.7916 27.3157 23.9586 27.5241 23.2043C27.0861 23.0565 26.6807 22.8754 26.3195 22.6641C25.6774 23.5263 25.3038 24.5612 25.2432 25.6574H27.1706Z"
            fill="#3B3EE4"
          />
          <path
            d="M28.6278 22.06C28.5113 22.283 28.406 22.522 28.3125 22.7746C28.8954 22.9189 29.5261 23.0051 30.1773 23.0257V20.5781C29.604 20.714 29.0627 21.2281 28.6278 22.06Z"
            fill="#3B3EE4"
          />
          <path
            d="M30.7891 20.5781V23.0257C31.4403 23.005 32.071 22.9188 32.6539 22.7746C32.5603 22.522 32.4551 22.2829 32.3386 22.06C31.9037 21.2281 31.3624 20.714 30.7891 20.5781Z"
            fill="#3B3EE4"
          />
          <path
            d="M32.8483 23.3906C32.2036 23.5548 31.5066 23.652 30.7891 23.6736V25.6701H33.1775C33.154 24.8623 33.0413 24.0882 32.8483 23.3906Z"
            fill="#3B3EE4"
          />
          <path
            d="M27.7199 29.3516C27.3651 29.4712 27.0348 29.6145 26.7363 29.7794C26.7492 29.793 26.7619 29.8068 26.7749 29.8204C27.3209 30.386 27.9662 30.8112 28.6699 31.0794C28.4602 30.8299 28.2651 30.5348 28.0883 30.1966C27.9508 29.9336 27.8279 29.6506 27.7199 29.3516Z"
            fill="#3B3EE4"
          />
          <path
            d="M33.2479 22.6028C33.6026 22.4831 33.9329 22.3398 34.2314 22.175C34.2185 22.1613 34.2058 22.1475 34.1928 22.134C33.6468 21.5684 33.0015 21.1431 32.2979 20.875C32.5075 21.1244 32.7026 21.4195 32.8794 21.7578C33.0169 22.0208 33.1398 22.3037 33.2479 22.6028Z"
            fill="#3B3EE4"
          />
          <path
            d="M33.7929 26.3047C33.769 27.1705 33.6479 28.0034 33.4395 28.7578C33.8775 28.9055 34.2829 29.0867 34.644 29.298C35.2861 28.4358 35.6597 27.4009 35.7203 26.3047L33.7929 26.3047Z"
            fill="#3B3EE4"
          />
          <path
            d="M33.2479 29.3516C33.1399 29.6506 33.0169 29.9335 32.8795 30.1966C32.7026 30.5348 32.5076 30.8299 32.2979 31.0793C33.0015 30.8112 33.6468 30.386 34.1928 29.8203C34.2058 29.8068 34.2185 29.793 34.2314 29.7794C33.9329 29.6145 33.6026 29.4712 33.2479 29.3516Z"
            fill="#3B3EE4"
          />
          <path
            d="M27.7198 22.6028C27.8278 22.3037 27.9508 22.0208 28.0883 21.7578C28.2651 21.4195 28.4601 21.1244 28.6699 20.875C27.9662 21.1431 27.3209 21.5684 26.7749 22.134C26.7619 22.1475 26.7492 22.1613 26.7363 22.175C27.0348 22.3398 27.3651 22.4831 27.7198 22.6028Z"
            fill="#3B3EE4"
          />
          <path
            d="M33.4395 23.2043C33.6479 23.9586 33.769 24.7915 33.7929 25.6574H35.7203C35.6597 24.5612 35.2861 23.5263 34.644 22.6641C34.2829 22.8753 33.8775 23.0565 33.4395 23.2043Z"
            fill="#3B3EE4"
          />
          <path
            d="M30.1795 25.6701V23.6736C29.462 23.652 28.7649 23.5547 28.1202 23.3906C27.9272 24.0882 27.8145 24.8622 27.791 25.6701H30.1795Z"
            fill="#3B3EE4"
          />
          <path
            d="M30.7891 26.3047V28.3012C31.5065 28.3228 32.2036 28.4201 32.8483 28.5842C33.0413 27.8866 33.154 27.1126 33.1775 26.3047L30.7891 26.3047Z"
            fill="#3B3EE4"
          />
          <path
            d="M32.3386 29.8954C32.4551 29.6724 32.5604 29.4334 32.6539 29.1808C32.071 29.0365 31.4403 28.9503 30.7891 28.9297V31.3772C31.3624 31.2414 31.9037 30.7273 32.3386 29.8954Z"
            fill="#3B3EE4"
          />
          <path
            d="M30.1773 31.3772V28.9297C29.5261 28.9503 28.8954 29.0365 28.3125 29.1808C28.4061 29.4333 28.5113 29.6724 28.6278 29.8954C29.0627 30.7273 29.604 31.2414 30.1773 31.3772Z"
            fill="#3B3EE4"
          />
          <path
            d="M30.1795 26.3047H27.791C27.8145 27.1126 27.9272 27.8866 28.1202 28.5842C28.7649 28.4201 29.462 28.3228 30.1795 28.3012V26.3047Z"
            fill="#3B3EE4"
          />
          <path
            d="M33.9712 9.78125C37.426 10.8929 40.4228 13.1692 42.4854 16.2481C44.5479 19.327 45.5576 23.0318 45.3541 26.7736C45.1504 30.5153 43.7454 34.0791 41.3618 36.8984C38.9785 39.7176 35.7536 41.6308 32.2001 42.3331L31.5391 38.7443C34.3199 38.1948 36.8436 36.6977 38.7088 34.4914C40.5742 32.2851 41.6737 29.4962 41.8331 26.568C41.9923 23.6398 41.2021 20.7405 39.5881 18.331C37.9741 15.9215 35.6288 14.1402 32.9252 13.2702L33.9712 9.78125Z"
            fill="white"
          />
        </svg>
        <h3>Knowledge Bases</h3>
        <h4>
          {headerNote}
          {headerSubNote && (
            <>
              <br />
              <span>{headerSubNote}</span>
            </>
          )}
        </h4>
        {/*
          Previously, the "Create New KB" button was shown only when
          comparison === "changed". We now want it visible in both cases
          (changed or same), so the conditional is commented out and the
          button is always rendered.
        */}
        <button type="button" className="btn-primary" onClick={onCreateNewKb}>
          Create New KB
        </button>
      </div>

      {/* Previous Session / History List */}
      {kbs.length > 0 && (
        <div className="history-section">
          <h4>Previous Session</h4>
          <ul className="history-list">
            {kbs.map((kb, index) => (
              <li key={kb.batch_id || index}>
                <div
                  onclick={() => onSelectKb?.(kb)}
                  className={`history-item ${index === 0 ? "active" : ""}`}
                >
                  {index === 0 && <span className="status"></span>}
                  <h5>{kb.title || kb.link_url}</h5>
                  <p>Created: {formatDateForCard(kb.created_at)}</p>
                  <div className="item-bottom">
                    <button
                      type="button"
                      className="start-btn"
                      onClick={() => onSelectKb?.(kb)}
                    >
                      Start
                    </button>
                    <div className="used-by">
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 13 13"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <g clipPath="url(#clip0_8598_35012)">
                          <path
                            d="M8.81613 7.64769L7.00357 6.28827V3.51912C7.00357 3.24069 6.77851 3.01562 6.50008 3.01562C6.22164 3.01562 5.99658 3.24069 5.99658 3.51912V6.54005C5.99658 6.69864 6.0711 6.84819 6.19798 6.94284L8.21191 8.45331C8.30253 8.52128 8.40828 8.55401 8.5135 8.55401C8.66707 8.55401 8.81811 8.48502 8.91681 8.3521C9.08401 8.13003 9.03868 7.81435 8.81613 7.64769Z"
                            fill="#676767"
                          />
                          <path
                            d="M6.5 0C2.91568 0 0 2.91568 0 6.5C0 10.0843 2.91568 13 6.5 13C10.0843 13 13 10.0843 13 6.5C13 2.91568 10.0843 0 6.5 0ZM6.5 11.993C3.47153 11.993 1.00697 9.52847 1.00697 6.5C1.00697 3.47153 3.47153 1.00697 6.5 1.00697C9.52897 1.00697 11.993 3.47153 11.993 6.5C11.993 9.52847 9.52847 11.993 6.5 11.993Z"
                            fill="#676767"
                          />
                        </g>
                        <defs>
                          <clipPath id="clip0_8598_35012">
                            <rect width="13" height="13" fill="white" />
                          </clipPath>
                        </defs>
                      </svg>
                      <span style={{ fontSize: "12px" }}>
                        Last Used:{" "}
                        {formatDateForCard(kb.updated_at || kb.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
