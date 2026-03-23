import { useRef, useState } from "react";
import { Spinner } from "../common/Spinner.jsx";
import { WebmapLogo } from "../common/WebmapLogo.jsx";

export function VerifyOtpForm({
  onSubmit,
  onResend,
  onBack,
  isLoading,
  email,
}) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);
  const normalizedEmail = (email || "").trim();

  const handleChange = (index, value) => {
    if (value.length > 1) {
      value = value.slice(-1);
    }

    const nextOtp = [...otp];
    nextOtp[index] = value;
    setOtp(nextOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, event) => {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (event) => {
    event.preventDefault();
    const pastedData = event.clipboardData.getData("text").slice(0, 6);
    const nextOtp = [...otp];

    for (let i = 0; i < pastedData.length && i < 6; i += 1) {
      if (/^\d$/.test(pastedData[i])) {
        nextOtp[i] = pastedData[i];
      }
    }

    setOtp(nextOtp);

    const nextEmptyIndex = nextOtp.findIndex((val) => !val);
    if (nextEmptyIndex !== -1) {
      inputRefs.current[nextEmptyIndex]?.focus();
    } else {
      inputRefs.current[5]?.focus();
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isLoading) return;
    const otpString = otp.join("");
    if (otpString.length === 6) {
      onSubmit(otpString);
    }
  };

  return (
    <section className="main-section">
      <header className="section-header">
        <WebmapLogo />
      </header>

      <h2 className="section-heading">
        Hi there 👋
        <br />
        Welcome to Webmap
        <br />
        Extension
      </h2>
      <p className="section-para">
        Sign in to continue where you left off or create a new account in a few
        steps.
      </p>

      <section className="form-section">
        <div className="opt-wrapper">
          <div className="opt-header">
            <h3>Check your email for a code</h3>
            {typeof onBack === "function" ? (
              <button
                type="button"
                className="opt-back-btn"
                onClick={onBack}
                disabled={isLoading}
              >
                Back
              </button>
            ) : null}
          </div>
          <p>
            We&apos;ve sent a 6-Character code to your email
            {normalizedEmail ? (
              <>
                {" "}
                &quot;
                <strong>{normalizedEmail}</strong>
                &quot;.
              </>
            ) : (
              "."
            )}
          </p>

          <form onSubmit={handleSubmit} className="form-wrapper">
            <div className="form-fields">
              <label htmlFor="otp-0">
                Enter Email Code <span className="asterisk">*</span>
              </label>
              <div className="opt-inputs" onPaste={handlePaste}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    ref={(element) => {
                      inputRefs.current[index] = element;
                    }}
                    type="text"
                    inputMode="numeric"
                    className="opt"
                    maxLength="1"
                    value={digit}
                    onChange={(event) =>
                      handleChange(index, event.target.value)
                    }
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    required
                  />
                ))}
              </div>
            </div>

            <p
              className="resent-otp"
              onClick={onResend}
              style={{
                cursor: isLoading ? "not-allowed" : "pointer",
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              Resend OTP
            </p>

            <button
              type="submit"
              className="btn-primary"
              disabled={isLoading || otp.join("").length !== 6}
            >
              {isLoading ? <Spinner size={18} /> : "Verify"}
            </button>
          </form>
        </div>
      </section>
    </section>
  );
}
