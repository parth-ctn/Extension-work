export function ChatLauncher({ logoUrl, isOpen, onToggle }) {
  return (
    <button
      type="button"
      className={`wm-chat-launcher ${isOpen ? "wm-chat-launcher--active" : ""}`}
      aria-label={isOpen ? "Hide Webmap chat" : "Open Webmap chat"}
      aria-expanded={isOpen}
      aria-controls="wm-chat-panel"
      onClick={onToggle}
    >
      <img className="wm-chat-launcher__icon" src={logoUrl} alt="Webmap" />
    </button>
  );
}
