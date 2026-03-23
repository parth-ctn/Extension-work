import { useCallback, useEffect, useRef } from 'react';
import { AUTH_SOURCES, AUTH_STEPS } from "../../constants/authSteps.js";
import { useAuth } from "../../hooks/auth/useAuth.js";
import { useToast } from "../../hooks/common/useToast.js";
import { useAuthFlow } from "../../hooks/auth/useAuthFlow.js";
import { startGoogleOAuth } from "../../utils/google.js";
import { CreateUsernameForm } from './CreateUsernameForm.jsx';
import { LoggedInView } from './LoggedInView.jsx';
import { SignInForm } from './SignInForm.jsx';
import { SignUpForm } from './SignUpForm.jsx';
import { Spinner } from "../common/Spinner.jsx";
import { VerifyOtpForm } from './VerifyOtpForm.jsx';
import { GoogleSignInButton } from './GoogleSignInButton.jsx';

export function AuthGate() {
  const { status } = useAuth();
  const toast = useToast();
  const flow = useAuthFlow();
  const {
    step,
    clearPersistedStep,
    source,
    isLoading,
    formData,
    beginGate,
    beginSignIn,
    beginSignUp,
    handleSignIn,
    handleSignUpDetails,
    handleUsername,
    handleVerify,
    handleResendOtp,
    handleGoogleCredential
  } = flow;

  const closeAuthWindow = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      if (typeof window.close === 'function') {
        window.close();
      }
    } catch (error) {
      console.warn('Unable to close auth window automatically.', error);
    }
  }, []);

  const previousStatusRef = useRef(status);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    let timer = null;

    if (status === 'authenticated' && previousStatus === 'unauthenticated') {
      timer = setTimeout(closeAuthWindow, 400);
    }
    previousStatusRef.current = status;

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [status, closeAuthWindow]);

  const triggerGoogle = useCallback(async () => {
    try {
      const credential = await startGoogleOAuth();
      handleGoogleCredential(credential);
    } catch (error) {
      console.error(error);
      toast.showToast({ type: 'error', description: error.message || 'Unable to start Google sign-in.' });
    }
  }, [handleGoogleCredential, toast]);

  const handleOtpBack = useCallback(() => {
    if (source === AUTH_SOURCES.SIGN_UP || source === AUTH_SOURCES.GOOGLE_SIGN_UP) {
      beginSignUp();
    } else {
      beginSignIn();
    }
    clearPersistedStep?.();
  }, [beginSignIn, beginSignUp, clearPersistedStep, source]);

  if (status === 'checking') {
    return (
      <div className="auth-shell">
        <div className="auth-card" style={{ alignItems: 'center', textAlign: 'center' }}>
          <Spinner size={32} />
          <p className="auth-card__subtitle">Loading your session.</p>
        </div>
      </div>
    );
  }

  let content = null;

  switch (step) {
    case AUTH_STEPS.GATE:
      content = (
        <GateView
          onSignIn={beginSignIn}
          onSignUp={beginSignUp}
          onGoogle={triggerGoogle}
          isLoading={isLoading}
        />
      );
      break;
    case AUTH_STEPS.SIGN_IN:
      content = (
        <SignInForm
          onSubmit={handleSignIn}
          onBack={beginGate}
          onSwitchToSignUp={beginSignUp}
          onGoogleSignIn={triggerGoogle}
          isLoading={isLoading}
        />
      );
      break;
    case AUTH_STEPS.SIGN_UP:
      content = (
        <SignUpForm
          onSubmit={handleSignUpDetails}
          onBack={beginGate}
          onSwitchToSignIn={beginSignIn}
          onGoogleSignIn={triggerGoogle}
          isLoading={isLoading}
        />
      );
      break;
    case AUTH_STEPS.CREATE_USERNAME:
      content = (
        <CreateUsernameForm
          onSubmit={handleUsername}
          isLoading={isLoading}
          onBack={beginGate}
          initialUsername={formData?.username}
        />
      );
      break;
    case AUTH_STEPS.VERIFY_OTP:
      content = (
        <VerifyOtpForm
          onSubmit={handleVerify}
          onResend={handleResendOtp}
          isLoading={isLoading}
          onBack={handleOtpBack}
          email={formData?.email}
        />
      );
      break;
    case AUTH_STEPS.LOGGED_IN:
      content = <LoggedInView />;
      break;
    default:
      content = <GateView onSignIn={beginSignIn} onSignUp={beginSignUp} onGoogle={triggerGoogle} isLoading={isLoading} />;
  }

  return <div className="auth-shell">{content}</div>;
}

function GateView({ onSignIn, onSignUp, onGoogle, isLoading }) {
  return (
    <div className="auth-card">
      <header className="auth-card__header">
        <h2 className="auth-card__title">Welcome to Webmap</h2>
        <p className="auth-card__subtitle">Sign in to continue where you left off or create a new account in a few steps.</p>
      </header>
      <div className="actions">
        <button type="button" className="primary" onClick={onSignIn} disabled={isLoading}>
          I have an account
        </button>
        <button type="button" className="secondary" onClick={onSignUp} disabled={isLoading}>
          I'm new to Webmap
        </button>
        <GoogleSignInButton onClick={onGoogle} disabled={isLoading} />
      </div>
    </div>
  );
}




