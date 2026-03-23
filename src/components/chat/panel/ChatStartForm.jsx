export function ChatStartForm({ title, note, onTitleChange, onNoteChange, onSubmit }) {
  return (
    <form className="wm-chat-form" onSubmit={onSubmit}>
      <label className="wm-chat-form__label">
        Title
        <input
          className="wm-chat-input"
          value={title}
          onChange={onTitleChange}
          placeholder="Give this chat a name"
          required
        />
      </label>
      <label className="wm-chat-form__label">
        Note <span className="wm-chat-form__optional">(optional)</span>
        <textarea
          className="wm-chat-input wm-chat-input--textarea"
          value={note}
          onChange={onNoteChange}
          placeholder="Add a short note to remember the context"
          rows={3}
        />
      </label>
      <button type="submit" className="wm-chat-primary">
        Build knowledge base
      </button>
    </form>
  );
}
