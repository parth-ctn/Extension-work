export function ChatErrorState({ message, onRetry, actionLabel = "Try again" }) {
  return (
    <div className="wm-chat-error">
      <p>{message ?? "We couldn't finish setting things up."}</p>
      <div className="wm-chat-error__actions">
        {onRetry ? (
          <button type="button" className="wm-chat-primary" onClick={onRetry}>
            {actionLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
