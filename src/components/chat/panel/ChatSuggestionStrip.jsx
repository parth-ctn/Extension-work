import { CHAT_SUGGESTION_LABELS } from "../../../constants/chat.js";

export function ChatSuggestionStrip({
  suggestions,
  show,
  onToggle,
  onSelect,
  showToggle = true,
}) {
  if (!suggestions?.length) {
    return null;
  }

  if (!showToggle && !show) {
    return null;
  }

  return (
    <div className="wm-chat-suggestion-strip">
      {showToggle ? (
        <button
          type="button"
          className="wm-chat-suggestion-strip__toggle"
          onClick={onToggle}
        >
          {show ? CHAT_SUGGESTION_LABELS.toggleHide : CHAT_SUGGESTION_LABELS.toggleShow}
        </button>
      ) : null}
      {show ? (
        <>
          <p className="wm-chat-suggestion-strip__title">Suggested prompts</p>
          <div className="wm-chat-suggestion-strip__list">
            {suggestions.map((suggestion, index) => (
              <button
                key={`suggestion-${index}`}
                type="button"
                className="wm-chat-suggestion"
                onClick={() => onSelect?.(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
