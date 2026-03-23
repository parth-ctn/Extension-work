export function ChatProgress({
  steps,
  knowledgeSummary,
  isRunning,
  onCancel,
}) {
  return (
    <div className="start-message">
      <div className="message-box">
        <h5>{isRunning ? "Building your chatbot..." : "Setup Complete"}</h5>
        <p>
          {isRunning
            ? "This will only take a moment"
            : "Your chatbot is ready to use"}
        </p>

        <div className="check-list">
          {steps.map((step) => {
            const isDone = step.status === "done";
            const isInProgress = step.status === "in-progress";
            const isPending = step.status === "pending";
            const isError = step.status === "error";

            return (
              <label key={step.key}>
                <div className="check">
                  <div className={`check-status ${isDone ? "check" : ""}`}>
                    {isDone ? null : isInProgress ? (
                      <span className="loader"></span>
                    ) : isError ? (
                      <span className="error-icon">!</span>
                    ) : null}
                  </div>
                  <h4 className="check-label">{step.label}</h4>
                </div>
                {isInProgress && step.note && step.status !== "error" ? (
                  <p className="progress-txt">{step.note}</p>
                ) : null}
                {step.status === "error" && step.message ? (
                  <p className="progress-txt error-txt">{step.message}</p>
                ) : null}
              </label>
            );
          })}
        </div>

        {isRunning ? (
          <div className="message-box-bottom">
            <button
              type="button"
              className="btn-outline-danger"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
