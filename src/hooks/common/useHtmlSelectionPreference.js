import { useCallback, useEffect, useState } from "react";
import { scrapperService } from "../../api/scrapperService.js";
import {
  readStoredHtmlSelection,
  writeStoredHtmlSelection,
} from "../../utils/htmlSelectionPreference.js";

export function useHtmlSelectionPreference(
  userUuid,
  { autoHydrate = true, accessToken = null, refreshToken = null } = {}
) {
  const [preference, setPreference] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const hydrate = useCallback(async () => {
    if (!userUuid) {
      setPreference(null);
      return null;
    }

    setIsLoading(true);
    let nextValue = null;

    try {
      const cached = await readStoredHtmlSelection(userUuid);
      if (cached && typeof cached.cleaned_html === "boolean") {
        nextValue = Boolean(cached.cleaned_html);
        setPreference(nextValue);
      }

      try {
        const remote = await scrapperService.getHtmlSelectionPreference(userUuid, {
          accessToken,
          refreshToken,
          logLabel: "last-html-selection:get",
        });
        if (remote && typeof remote.cleaned_html === "boolean") {
          nextValue = Boolean(remote.cleaned_html);
          await writeStoredHtmlSelection(userUuid, nextValue);
          setPreference(nextValue);
        }
      } catch (error) {
        console.warn("[useHtmlSelectionPreference] Failed to fetch preference", error);
      }
    } catch (error) {
      console.warn("[useHtmlSelectionPreference] Failed to hydrate preference", error);
    } finally {
      setIsLoading(false);
    }

    return nextValue;
  }, [accessToken, refreshToken, userUuid]);

  const update = useCallback(
    async (nextValue) => {
      if (!userUuid) return null;
      const normalized = Boolean(nextValue);
      setPreference(normalized);
      setIsSaving(true);
      try {
        await scrapperService.updateHtmlSelectionPreference(
          {
            user_uuid: userUuid,
            cleaned_html: normalized,
          },
          { accessToken, refreshToken, logLabel: "last-html-selection:update" }
        );
        await writeStoredHtmlSelection(userUuid, normalized);
        setPreference(normalized);
      } catch (error) {
        console.warn("[useHtmlSelectionPreference] Failed to update preference", error);
        // Revert on failure
        const cached = await readStoredHtmlSelection(userUuid);
        if (cached && typeof cached.cleaned_html === "boolean") {
          setPreference(Boolean(cached.cleaned_html));
        }
        throw error;
      } finally {
        setIsSaving(false);
      }
      return normalized;
    },
    [accessToken, refreshToken, userUuid]
  );

  useEffect(() => {
    if (autoHydrate && userUuid) {
      hydrate();
    } else if (!userUuid) {
      setPreference(null);
    }
  }, [autoHydrate, hydrate, userUuid]);

  return {
    preference,
    isLoading,
    isSaving,
    refreshPreference: hydrate,
    setPreference: update,
  };
}
