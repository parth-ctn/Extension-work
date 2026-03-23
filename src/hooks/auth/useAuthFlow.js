import { useCallback, useEffect, useMemo, useState } from "react";
import { authService } from "../../api/authService.js";
import { STORAGE_KEYS } from "../../constants/storageKeys.js";
import { AUTH_SOURCES, AUTH_STEPS } from "../../constants/authSteps.js";
import { TOAST_MESSAGES } from "../../constants/toastMessages.js";
import { useAuth } from "./useAuth.js";
import { getDeviceFingerprint } from "../../utils/deviceFingerprint.js";
import { getJSON, getRaw, setJSON, setRaw } from "../../utils/storage.js";
import { useToast } from "../common/useToast.js";
import { extension } from "webextension-polyfill";

export function useAuthFlow() {
  const { isAuthenticated, status, setSession } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState(() => {
    if (isAuthenticated) {
      return AUTH_STEPS.LOGGED_IN;
    }
    // Try to restore the persisted step if user was in the middle of auth flow
    const persistedStep = getRaw(STORAGE_KEYS.AUTH_STEP);
    const hasFormData = Object.keys(getJSON(STORAGE_KEYS.FORM_DATA, {})).length > 0;
    // Only restore VERIFY_OTP or CREATE_USERNAME steps if we have formData
    if (persistedStep && hasFormData &&
        (persistedStep === AUTH_STEPS.VERIFY_OTP || persistedStep === AUTH_STEPS.CREATE_USERNAME)) {
      return persistedStep;
    }
    return AUTH_STEPS.SIGN_IN;
  });
  const [source, setSource] = useState(() =>
    getRaw(STORAGE_KEYS.SOURCE) || AUTH_SOURCES.SIGN_IN
  );
  const [formData, setFormData] = useState(() =>
    getJSON(STORAGE_KEYS.FORM_DATA, {})
  );
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      setStep(AUTH_STEPS.LOGGED_IN);
      // Clear persisted step on authentication
      setRaw(STORAGE_KEYS.AUTH_STEP, undefined);
    } else if (status === "unauthenticated") {
      // Try to restore persisted step if available
      const persistedStep = getRaw(STORAGE_KEYS.AUTH_STEP);
      const hasFormData = Object.keys(getJSON(STORAGE_KEYS.FORM_DATA, {})).length > 0;
      if (persistedStep && hasFormData &&
          (persistedStep === AUTH_STEPS.VERIFY_OTP || persistedStep === AUTH_STEPS.CREATE_USERNAME)) {
        setStep(persistedStep);
      } else {
        // Otherwise default to sign in
        setStep(AUTH_STEPS.SIGN_IN);
        setSource(AUTH_SOURCES.SIGN_IN);
        setRaw(STORAGE_KEYS.SOURCE, AUTH_SOURCES.SIGN_IN);
        setRaw(STORAGE_KEYS.AUTH_STEP, undefined);
      }
    }
  }, [status]);

  // Persist step to localStorage whenever it changes
  useEffect(() => {
    // Only persist VERIFY_OTP and CREATE_USERNAME steps
    if (step === AUTH_STEPS.VERIFY_OTP || step === AUTH_STEPS.CREATE_USERNAME) {
      setRaw(STORAGE_KEYS.AUTH_STEP, step);
    } else if (step === AUTH_STEPS.LOGGED_IN || step === AUTH_STEPS.GATE) {
      // Clear persisted step when going back to gate or after login
      setRaw(STORAGE_KEYS.AUTH_STEP, undefined);
    }
  }, [step]);

  const persistFormData = useCallback((data) => {
    setFormData(data);
    setJSON(STORAGE_KEYS.FORM_DATA, data);
  }, []);

  const persistSource = useCallback((nextSource) => {
    setSource(nextSource);
    if (nextSource) {
      setRaw(STORAGE_KEYS.SOURCE, nextSource);
    } else {
      setRaw(STORAGE_KEYS.SOURCE, undefined);
    }
  }, []);

  const persistVisitorIdentity = useCallback((identifiers) => {
    if (!identifiers) return;
    const { visitorId, requestId } = identifiers;
    if (visitorId) {
      setRaw(STORAGE_KEYS.VISITOR_ID, visitorId);
    }
    if (requestId) {
      setRaw(STORAGE_KEYS.REQUEST_ID, requestId);
    }
  }, []);

  const beginSignUp = useCallback(() => {
    persistSource(AUTH_SOURCES.SIGN_UP);
    setStep(AUTH_STEPS.SIGN_UP);
  }, [persistSource]);

  const beginSignIn = useCallback(() => {
    persistSource(AUTH_SOURCES.SIGN_IN);
    setStep(AUTH_STEPS.SIGN_IN);
  }, [persistSource]);

  const beginGate = useCallback(() => {
    persistSource(null);
    persistFormData({});
    setRaw(STORAGE_KEYS.AUTH_STEP, undefined);
    setStep(AUTH_STEPS.GATE);
  }, [persistFormData, persistSource]);

  const clearPersistedStep = useCallback(() => {
    setRaw(STORAGE_KEYS.AUTH_STEP, undefined);
  }, []);

  const completeSession = useCallback(
    async (response) => {
      if (!response?.tokens) {
        return false;
      }

      const resolvedVisitorId =
        response?.visitor_id ??
        response?.visitorId ??
        response?.user?.visitor_id ??
        null;
      const resolvedRequestId =
        response?.request_id ??
        response?.requestId ??
        response?.user?.request_id ??
        null;

      persistVisitorIdentity({
        visitorId: resolvedVisitorId ?? undefined,
        requestId: resolvedRequestId ?? undefined,
      });

      // Map 'name' field (from OTP login/register) to 'first_name' for consistency
      const firstName = response.first_name || response.name || undefined;

      await setSession({
        tokens: response.tokens,
        user_uuid: response.user_uuid,
        username: response.username,
        first_name: firstName,
        plan: response.plan,
        visitor_id: resolvedVisitorId ?? undefined,
        request_id: resolvedRequestId ?? undefined,
      });
      showToast({ type: "success", description: TOAST_MESSAGES.LOGGED_IN });
      persistFormData({});
      persistSource(null);
      setRaw(STORAGE_KEYS.AUTH_STEP, undefined);
      setStep(AUTH_STEPS.LOGGED_IN);
      return true;
    },
    [persistFormData, persistSource, persistVisitorIdentity, setSession, showToast]
  );

  const handleSignUpDetails = useCallback(
    async (values) => {
      setIsLoading(true);
      try {
        // Ensure we mark this flow as sign-up
        persistSource(AUTH_SOURCES.SIGN_UP);
        const fingerprint = await getDeviceFingerprint("signup");
        persistVisitorIdentity(fingerprint);
        const payload = {
          ...values,
          visitor_ids: fingerprint.visitorId ? [fingerprint.visitorId] : [],
          fingerprint_ids: fingerprint.requestId ? [fingerprint.requestId] : [],
        };
        persistFormData(payload);
        showToast({
          type: "info",
          description: "Great! Choose a username to continue.",
        });
        setStep(AUTH_STEPS.CREATE_USERNAME);
      } catch (error) {
        console.error(error);
        showToast({ type: "error", description: TOAST_MESSAGES.GENERIC_ERROR });
      } finally {
        setIsLoading(false);
      }
    },
    [persistFormData, persistVisitorIdentity, showToast]
  );

  const handleSignIn = useCallback(
    async ({ email }) => {
      setIsLoading(true);
      try {
        // Ensure we mark this flow as sign-in
        persistSource(AUTH_SOURCES.SIGN_IN);
        const fingerprint = await getDeviceFingerprint("signin");
        persistVisitorIdentity(fingerprint);
        const payload = {
          email,
          visitor_ids: fingerprint.visitorId ? [fingerprint.visitorId] : [],
          fingerprint_ids: fingerprint.requestId ? [fingerprint.requestId] : [],
        };
        const response = await authService.login(payload);
        persistFormData(payload);
        if (!(await completeSession(response))) {
          showToast({ type: "info", description: TOAST_MESSAGES.OTP_SENT });
          setStep(AUTH_STEPS.VERIFY_OTP);
        }
      } catch (error) {
        console.error(error);
        const statusCode = error?.status;
        if (statusCode === 404 || statusCode === 400) {
          showToast({ type: "error", description: TOAST_MESSAGES.ACCOUNT_MISSING });
        } else {
          showToast({ type: "error", description: TOAST_MESSAGES.GENERIC_ERROR });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [completeSession, persistFormData, persistVisitorIdentity, showToast]
  );

  const handleUsername = useCallback(
    async ({ username }) => {
      setIsLoading(true);
      try {
        const payload = { ...formData, username };
        persistFormData(payload);
        const response =
          source === AUTH_SOURCES.GOOGLE_SIGN_UP
            ? await authService.signUpWithGoogle(payload)
            : await authService.signUp(payload);

        if (!(await completeSession(response))) {
          showToast({ type: "info", description: TOAST_MESSAGES.OTP_SENT });
          setStep(AUTH_STEPS.VERIFY_OTP);
        }
      } catch (error) {
        console.error(error);
        showToast({ type: "error", description: TOAST_MESSAGES.GENERIC_ERROR });
      } finally {
        setIsLoading(false);
      }
    },
    [completeSession, formData, persistFormData, showToast, source]
  );

  const handleVerify = useCallback(
    async (otp) => {
      if (!formData || Object.keys(formData).length === 0) {
        showToast({
          type: "error",
          description: "No pending request found. Please try again.",
        });
        beginGate();
        return;
      }
      setIsLoading(true);
      try {
        const payload = { ...formData, otp };
        let response;
        if (source === AUTH_SOURCES.SIGN_IN) {
          response = await authService.login(payload);
        } else if (source === AUTH_SOURCES.GOOGLE_SIGN_UP) {
          response = await authService.signUpWithGoogle(payload);
        } else {
          response = await authService.signUp(payload);
        }

        if (await completeSession(response)) {
          return;
        }

        showToast({ type: "error", description: TOAST_MESSAGES.OTP_FAILED });
      } catch (error) {
        console.error(error);
        if (error?.status === 400 || error?.status === 401) {
          showToast({ type: "error", description: TOAST_MESSAGES.OTP_FAILED });
        } else {
          showToast({
            type: "error",
            description: TOAST_MESSAGES.GENERIC_ERROR,
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [beginGate, completeSession, formData, showToast, source]
  );

  const handleResendOtp = useCallback(async () => {
    if (!formData || Object.keys(formData).length === 0) {
      return;
    }
    try {
      if (source === AUTH_SOURCES.SIGN_IN) {
        await authService.login(formData);
      } else if (source === AUTH_SOURCES.GOOGLE_SIGN_UP) {
        await authService.signUpWithGoogle(formData);
      } else {
        await authService.signUp(formData);
      }
      showToast({ type: "success", description: TOAST_MESSAGES.OTP_SENT });
    } catch (error) {
      console.error(error);
      showToast({ type: "error", description: TOAST_MESSAGES.GENERIC_ERROR });
    }
  }, [formData, showToast, source]);

  const handleGoogleCredential = useCallback(
    async (credential) => {
      setIsLoading(true);
      try {
        const fingerprint = await getDeviceFingerprint("signin");
        persistVisitorIdentity(fingerprint);
        const payload = {
          token_id: credential,
          visitor_ids: fingerprint.visitorId ? [fingerprint.visitorId] : [],
          fingerprint_ids: fingerprint.requestId ? [fingerprint.requestId] : [],
        };
        const response = await authService.signUpWithGoogle(payload);
        persistFormData(payload);
        // Await the session completion to ensure tokens are stored before proceeding
        if (!(await completeSession(response))) {
          persistSource(AUTH_SOURCES.GOOGLE_SIGN_UP);
          showToast({
            type: "info",
            description: "Choose a username to finish setting up your account.",
          });
          setStep(AUTH_STEPS.CREATE_USERNAME);
        }
      } catch (error) {
        console.error(error);
        showToast({ type: "error", description: TOAST_MESSAGES.GENERIC_ERROR });
      } finally {
        setIsLoading(false);
      }
    },
    [completeSession, persistFormData, persistSource, persistVisitorIdentity, showToast]
  );

  const value = useMemo(
    () => ({
      step,
      source,
      formData,
      isLoading,
      beginGate,
      beginSignIn,
      beginSignUp,
      handleSignUpDetails,
      handleSignIn,
      handleUsername,
      handleVerify,
      handleResendOtp,
      handleGoogleCredential,
      clearPersistedStep,
    }),
    [
      beginGate,
      beginSignIn,
      beginSignUp,
      formData,
      handleGoogleCredential,
      handleResendOtp,
      handleSignIn,
      handleSignUpDetails,
      handleUsername,
      handleVerify,
      isLoading,
      source,
      step,
      clearPersistedStep,
    ]
  );

  return value;
}
