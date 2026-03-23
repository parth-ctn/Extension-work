export function HtmlChoicePrompt({ onChoose }) {
  return (
    <>
      <button
        type="button"
        className="btn-primary"
        onClick={() => onChoose?.("cleaned")}
      >
        Use Cleaned HTML
      </button>
      <button
        type="button"
        className="btn-outline"
        onClick={() => onChoose?.("original")}
      >
        Use Original (No Ads)
      </button>
    </>
  );
}
