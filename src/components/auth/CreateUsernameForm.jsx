import { useEffect, useMemo, useState } from "react";
import { authService } from "../../api/authService.js";
import { useDebouncedValue } from "../../hooks/common/useDebouncedValue.js";
import { Spinner } from "../common/Spinner.jsx";
import { WebmapLogo } from "../common/WebmapLogo.jsx";

const MIN_LENGTH = 3;
const MAX_LENGTH = 15;

export function CreateUsernameForm({
  onSubmit,
  onBack,
  isLoading,
  initialUsername = "",
}) {
  const [username, setUsername] = useState(initialUsername);
  const [status, setStatus] = useState("idle"); // idle | checking | available | taken | invalid | error
  const [agree, setAgree] = useState(false);

  const debouncedUsername = useDebouncedValue(username.trim(), 500);

  const rules = useMemo(
    () => ({
      noSpecialChar: /^[a-zA-Z0-9-]*$/.test(username),
      startsWithAlpha: /^[a-zA-Z]/.test(username),
      validLength:
        username.length >= MIN_LENGTH && username.length <= MAX_LENGTH,
    }),
    [username]
  );

  useEffect(() => {
    if (!username) {
      setStatus("idle");
      return;
    }

    if (!rules.noSpecialChar || !rules.startsWithAlpha || !rules.validLength) {
      setStatus("invalid");
      return;
    }

    if (!debouncedUsername) {
      return;
    }

    const controller = new AbortController();
    setStatus("checking");

    authService
      .checkUsername(debouncedUsername, { signal: controller.signal })
      .then((response) => {
        setStatus(response?.available ? "available" : "taken");
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          console.warn("Username availability check failed", error);
          setStatus("error");
        }
      });

    return () => controller.abort();
  }, [
    debouncedUsername,
    rules.noSpecialChar,
    rules.startsWithAlpha,
    rules.validLength,
    username,
  ]);

  const canSubmit = useMemo(() => {
    return (
      username.trim() &&
      rules.noSpecialChar &&
      rules.startsWithAlpha &&
      rules.validLength &&
      status !== "taken" &&
      status !== "checking" &&
      agree
    );
  }, [rules, status, username, agree]);

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!canSubmit || isLoading) return;
    onSubmit({ username: username.trim() });
  };

  return (
    <section className="main-section">
      <header className="section-header">
        <WebmapLogo />
      </header>

      <h2 className="section-heading">
        Hi there 👋<br />
        Welcome to Webmap<br />
        Extension
      </h2>
      <p className="section-para">
        Sign in to continue where you left off or create a new account in a few
        steps.
      </p>

      <section className="form-section">
        <form className="form-wrapper" onSubmit={handleSubmit}>
          <div className="form-fields">
            <label htmlFor="username">
              Create Username <span className="asterisk">*</span>
            </label>
            <input
              id="username"
              value={username}
              onChange={(event) => setUsername(event.target.value.toLowerCase())}
              placeholder="Create Username"
              autoComplete="off"
              required
            />
            <UsernameStatus status={status} />
          </div>

          <div className="inst-list">
            <div className={`inst ${rules.noSpecialChar ? 'success' : ''}`}>
              <span className="inst-icon">
                <svg
                  fill="#ffffff"
                  width="9"
                  height="9"
                  viewBox="0 0 1920 1920"
                  xmlns="http://www.w3.org/2000/svg"
                  stroke="#ffffff"
                >
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    <path
                      d="M1827.701 303.065 698.835 1431.801 92.299 825.266 0 917.564 698.835 1616.4 1919.869 395.234z"
                      fillRule="evenodd"
                      className="elem-path"
                    ></path>
                  </g>
                </svg>
              </span>
              <span className="inst-txt">
                Special characters are not allowed (except for '-').
              </span>
            </div>
            <div className={`inst ${rules.startsWithAlpha ? 'success' : ''}`}>
              <span className="inst-icon">
                <svg
                  fill="#ffffff"
                  width="9"
                  height="9"
                  viewBox="0 0 1920 1920"
                  xmlns="http://www.w3.org/2000/svg"
                  stroke="#ffffff"
                >
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    <path
                      d="M1827.701 303.065 698.835 1431.801 92.299 825.266 0 917.564 698.835 1616.4 1919.869 395.234z"
                      fillRule="evenodd"
                      className="elem-path"
                    ></path>
                  </g>
                </svg>
              </span>
              <span className="inst-txt">
                The first letter must be an alphabet character.
              </span>
            </div>
            <div className={`inst ${rules.validLength ? 'success' : ''}`}>
              <span className="inst-icon">
                <svg
                  fill="#ffffff"
                  width="9"
                  height="9"
                  viewBox="0 0 1920 1920"
                  xmlns="http://www.w3.org/2000/svg"
                  stroke="#ffffff"
                >
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    <path
                      d="M1827.701 303.065 698.835 1431.801 92.299 825.266 0 917.564 698.835 1616.4 1919.869 395.234z"
                      fillRule="evenodd"
                      className="elem-path"
                    ></path>
                  </g>
                </svg>
              </span>
              <span className="inst-txt">
                Length must be between {MIN_LENGTH} to {MAX_LENGTH} characters.
              </span>
            </div>
          </div>

          <div className="term-conditions">
            <label>
              <input
                type="checkbox"
                checked={agree}
                onChange={(event) => setAgree(event.target.checked)}
              />
              <span>
                I agree with Webmap Terms of Service, Privacy Policy, and
                default Notification Settings.
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={!canSubmit || isLoading}
          >
            {isLoading ? <Spinner size={18} /> : "Create Account"}
          </button>
        </form>
      </section>
    </section>
  );
}

function UsernameStatus({ status }) {
  if (status === "idle") return null;
  if (status === "checking")
    return <span style={{ fontSize: '0.75rem', color: '#9b9b9b' }}>Checking availability...</span>;
  if (status === "available")
    return <span style={{ fontSize: '0.75rem', color: '#27a127' }}>Username is available!</span>;
  if (status === "taken")
    return <span style={{ fontSize: '0.75rem', color: '#f00' }}>Already taken.</span>;
  if (status === "invalid")
    return (
      <span style={{ fontSize: '0.75rem', color: '#f00' }}>
        Make sure username follows the rules.
      </span>
    );
  if (status === "error")
    return (
      <span style={{ fontSize: '0.75rem', color: '#f00' }}>Could not verify availability.</span>
    );
  return null;
}
