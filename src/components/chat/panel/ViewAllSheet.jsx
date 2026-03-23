import { useMemo } from "react";

function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateForCard(iso) {
  try {
    const d = new Date(iso);
    if (!Number.isFinite(d.getTime())) return "";
    const now = new Date();
    if (isSameDay(d, now)) {
      return d.toLocaleTimeString(undefined, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
    return d.toLocaleDateString();
  } catch {
    return "";
  }
}

export function ViewAllSheet({
  open,
  type, // 'threads' | 'kbs'
  items = [],
  onClose,
  onCreateNew,
  onSelectItem,
}) {
  const title = useMemo(() => {
    if (type === "kbs") return "Previous Session";
    return "Threads";
  }, [type]);

  return (
    <>
      <div
        className={`screen-backdrop ${open ? "open" : ""}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <div className={`bottom-sheet ${open ? "open" : ""}`} aria-hidden={!open}>
        <div className="bottom-sheet-header">
          <h3>{title}</h3>
          <div className="closed-icon" onClick={onClose}>
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M4.73292 3.99998L7.84796 0.884843C8.05069 0.682216 8.05069 0.354597 7.84796 0.15197C7.64534 -0.0506567 7.31772 -0.0506567 7.11509 0.15197L3.99996 3.26711L0.884914 0.15197C0.682192 -0.0506567 0.354668 -0.0506567 0.152041 0.15197C-0.0506804 0.354597 -0.0506804 0.682216 0.152041 0.884843L3.26708 3.99998L0.152041 7.11511C-0.0506804 7.31774 -0.0506804 7.64536 0.152041 7.84799C0.253022 7.94906 0.385797 7.99984 0.518478 7.99984C0.651158 7.99984 0.783838 7.94906 0.884914 7.84799L3.99996 4.73285L7.11509 7.84799C7.21617 7.94906 7.34885 7.99984 7.48153 7.99984C7.61421 7.99984 7.74689 7.94906 7.84796 7.84799C8.05069 7.64536 8.05069 7.31774 7.84796 7.11511L4.73292 3.99998Z"
                fill="#667085"
              />
            </svg>
          </div>
        </div>
        <div className="bottom-sheet-body">
          {items.map((item, idx) => (
            <div
              onClick={() => onSelectItem?.(item)}
              key={item.id || item.batch_id || item.chat_session_id || idx}
              className="card-item"
            >
              <h3 className="para">
                {item.title || item.link_url || "Untitled"}
              </h3>
              <div className="bottom">
                <div
                  onClick={() => onSelectItem?.(item)}
                  className="message-icon"
                  style={{ cursor: "pointer" }}
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9 0.5H3C1.6215 0.5 0.5 1.6215 0.5 3V7C0.5 8.207 1.3605 9.217 2.5 9.4495V11C2.5 11.1845 2.6015 11.354 2.764 11.441C2.838 11.4805 2.919 11.5 3 11.5C3.097 11.5 3.1935 11.4715 3.2775 11.416L6.1515 9.5H9C10.3785 9.5 11.5 8.3785 11.5 7V3C11.5 1.6215 10.3785 0.5 9 0.5ZM5.7225 8.584L3.5 10.0655V9C3.5 8.724 3.276 8.5 3 8.5C2.173 8.5 1.5 7.827 1.5 7V3C1.5 2.173 2.173 1.5 3 1.5H9C9.827 1.5 10.5 2.173 10.5 3V7C10.5 7.827 9.827 8.5 9 8.5H6C5.724 8.5 5.5 8.724 5.5 9C5.5 9.105 5.5215 9.2065 5.562 9.296C5.601 9.383 5.657 9.4625 5.7225 9.5345V8.584Z"
                      fill="#5D5FEF"
                    />
                  </svg>
                </div>
                <span className="created-on">
                  <svg
                    width="13"
                    height="13"
                    viewBox="0 0 13 13"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clipPath="url(#clip0_clock_va)">
                      <path
                        d="M8.81565 7.64769L7.00309 6.28827V3.51912C7.00309 3.24069 6.77802 3.01562 6.49959 3.01562C6.22116 3.01562 5.99609 3.24069 5.99609 3.51912V6.49912C5.99609 6.65644 6.06984 6.80487 6.19465 6.90225L8.18559 8.46188C8.26465 8.52394 8.35934 8.5545 8.45371 8.5545C8.60846 8.5545 8.76034 8.486 8.86446 8.35256C9.03928 8.132 8.99909 7.80894 8.81565 7.64769Z"
                        fill="#676767"
                      />
                      <path
                        d="M6.49967 0.8125C3.28839 0.8125 0.6875 3.41339 0.6875 6.62467C0.6875 9.83595 3.28839 12.4368 6.49967 12.4368C9.71095 12.4368 12.3118 9.83595 12.3118 6.62467C12.3118 3.41339 9.71095 0.8125 6.49967 0.8125ZM6.49967 11.4298C3.84006 11.4298 1.69453 9.28427 1.69453 6.62467C1.69453 3.96506 3.84006 1.81953 6.49967 1.81953C9.15927 1.81953 11.3048 3.96506 11.3048 6.62467C11.3048 9.28427 9.15927 11.4298 6.49967 11.4298Z"
                        fill="#676767"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_clock_va">
                        <rect
                          width="11.6242"
                          height="11.6242"
                          fill="white"
                          transform="translate(0.6875 0.8125)"
                        />
                      </clipPath>
                    </defs>
                  </svg>
                  <span style={{ marginLeft: 1, fontSize: "12px" }}>
                    Last Used:{" "}
                    {formatDateForCard(item.updated_at || item.created_at)}
                  </span>
                </span>
                {/* <button
                type="button"
                className="start-btn"
                onClick={() => onSelectItem?.(item)}
              >
                Chat
              </button> */}
              </div>
            </div>
          ))}
        </div>
        <div className="bottom-sheet-bottom">
          <button className="btn-primary btn-sm" onClick={onCreateNew}>
            {type === "kbs" ? "Create New KB" : "New Chat"}
          </button>
        </div>
      </div>
    </>
  );
}
