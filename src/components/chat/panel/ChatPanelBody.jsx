export function ChatPanelBody({ children, centered = false }) {
  return (
    <div className={`wm-chat-sidebar__body ${centered ? "wm-chat-sidebar__body--center" : ""}`}>
      {children}
    </div>
  );
}
