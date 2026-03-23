export function ChatStartScreen({ onStart, pageTitle, logoUrl }) {
  const title = pageTitle || "this page";

  return (
    <div className="wm-chat-start-screen">
      <div className="wm-chat-start-content">
        <div className="wm-chat-start-icon">
          {logoUrl ? (
            <img src={logoUrl} alt="Webmap" loading="lazy" />
          ) : (
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H8l-4 4V6a1 1 0 0 1 1-1z" />
              <path d="M8 9h8" />
              <path d="M8 13h5" />
            </svg>
          )}
        </div>
        <h2 className="wm-chat-start-title">Ask Webmap about this page</h2>
        <p className="wm-chat-start-description">
          We will capture "{title}" and keep everything in context so you can ask focused questions.
        </p>
        <button type="button" className="wm-chat-start-button" onClick={onStart}>
          Start session
        </button>
        <p className="wm-chat-start-note">Webmap momentarily saves the visible content from this tab to answer your prompts.</p>
      </div>
    </div>
  );
}
