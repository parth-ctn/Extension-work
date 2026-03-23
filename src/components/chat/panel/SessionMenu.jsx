import { useEffect, useMemo, useState, useCallback } from "react";
import { knowledgeBaseService } from "../../../api/knowledgeBaseService.js";
import { extensionAgentService } from "../../../api/extensionAgentService.js";
import {
  readExtensionStorage,
  writeExtensionStorage,
  getRaw,
} from "../../../utils/storage.js";
import { STORAGE_KEYS } from "../../../constants/storageKeys.js";

function UserAvatarIcon() {
  return (
    <svg
      className="user-img"
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="20" cy="20" r="20" fill="#FFFFFF" />
      <circle cx="20" cy="20" r="19.5" stroke="#E5E7EB" />
      <path
        d="M20 21C22.7614 21 25 18.7614 25 16C25 13.2386 22.7614 11 20 11C17.2386 11 15 13.2386 15 16C15 18.7614 17.2386 21 20 21Z"
        fill="#9CA3AF"
      />
      <path
        d="M28 29C28 25.134 24.4183 22 20 22C15.5817 22 12 25.134 12 29"
        stroke="#9CA3AF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

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

export function SessionMenu({
  knowledgeBatchId,
  userUuid,
  user,
  userName,
  isOpen,
  isExpanded = false,
  showThreads = false,
  onClose,
  onSelectSession,
  onCreateNew,
  onOpenKb,
  onViewAll,
  onStartNewKb,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [kbs, setKbs] = useState([]);
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const canShow = useMemo(() => Boolean(isOpen), [isOpen]);
  const currentUrl = useMemo(
    () => (typeof window !== "undefined" ? window.location.href : ""),
    []
  );
  const linkUrl = useMemo(() => {
    try {
      const u = new URL(currentUrl);
      return u.href.replace(/\/$/, "");
    } catch {
      return String(currentUrl ?? "").replace(/\/$/, "");
    }
  }, [currentUrl]);

  const fetchSessions = useCallback(
    async (forceRefresh = false) => {
      if (!knowledgeBatchId) return;
      setLoading(true);
      setError(null);
      try {
        const selectedExtensionId = await readExtensionStorage(
          STORAGE_KEYS.SELECTED_EXTENSION_ID
        );
        const cacheKey = `sessions-cache:${
          selectedExtensionId || ""
        }:${knowledgeBatchId}`;
        if (!forceRefresh) {
          const cached = await readExtensionStorage(cacheKey);
          if (cached?.sessions) {
            setSessions(cached.sessions);
            setLoading(false);
            return;
          }
        }
        const resp = await knowledgeBaseService.getChatSessions({
          batch_id: knowledgeBatchId,
          user_uuid: userUuid ?? "None",
        });
        const list = Array.isArray(resp?.data) ? resp.data : [];
        setSessions(list);
        await writeExtensionStorage(cacheKey, {
          sessions: list,
          savedAt: Date.now(),
        });
      } catch (e) {
        setError(e?.message || "Failed to load sessions");
      } finally {
        setLoading(false);
      }
    },
    [knowledgeBatchId, userUuid]
  );

  const fetchKbs = useCallback(async () => {
    try {
      const params = {
        user_uuid: userUuid ?? "",
        link_url: linkUrl,
      };
      const resp = await extensionAgentService.getKbDomainList(params);
      const list = Array.isArray(resp?.data)
        ? resp.data
        : Array.isArray(resp)
        ? resp
        : [];
      setKbs(list);
    } catch {}
  }, [linkUrl, userUuid]);

  useEffect(() => {
    if (!canShow) return;
    let cancelled = false;
    (async () => {
      if (!cancelled) {
        await fetchSessions(false);
        await fetchKbs();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canShow, fetchSessions, fetchKbs, refreshTrigger]);

  useEffect(() => {
    // Load username (for @ mention)
    // Prefer props (drilled from ChatPanel/AuthContext)
    if (userName || user?.username) {
      setUsername(userName || user?.username || "");
    } else {
      // Then try localStorage raw
      const fromLocal = getRaw(STORAGE_KEYS.USER_USERNAME);
      if (fromLocal && typeof fromLocal === "string") {
        setUsername(fromLocal);
      } else {
        // Finally, try extension storage
        (async () => {
          try {
            const stored = await readExtensionStorage(
              STORAGE_KEYS.USER_USERNAME
            );
            if (stored && typeof stored === "string") {
              setUsername(stored);
            }
          } catch {}
        })();
      }
    }

    // Load first name (for display name)
    if (user?.firstName) {
      setFirstName(user.firstName);
    } else {
      // Try localStorage raw
      const fromLocal = getRaw(STORAGE_KEYS.USER_FIRST_NAME);
      if (fromLocal && typeof fromLocal === "string") {
        setFirstName(fromLocal);
      } else {
        // Finally, try extension storage
        (async () => {
          try {
            const stored = await readExtensionStorage(
              STORAGE_KEYS.USER_FIRST_NAME
            );
            if (stored && typeof stored === "string") {
              setFirstName(stored);
            }
          } catch {}
        })();
      }
    }
  }, [userName, user]);

  const effectiveUsername = (
    userName ||
    user?.username ||
    username ||
    ""
  ).toString();

  useEffect(() => {
    const handleSessionsUpdated = (event) => {
      const { knowledgeBatchId: updatedBatchId } = event.detail || {};
      if (updatedBatchId === knowledgeBatchId) setRefreshTrigger((p) => p + 1);
    };
    window.addEventListener("webmap:sessions-updated", handleSessionsUpdated);
    return () =>
      window.removeEventListener(
        "webmap:sessions-updated",
        handleSessionsUpdated
      );
  }, [knowledgeBatchId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!canShow) return null;

  return (
    <>
      {!isExpanded && (
        <div
          className={`screen-backdrop ${isOpen ? "open" : ""}`}
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <div
        className={`side-menu ${isOpen ? "open" : ""} ${
          isExpanded ? "expended-view" : ""
        }`}
        role="menu"
        aria-label="Sessions"
      >
        <div className="menu-header">
          <UserAvatarIcon />
          <div className="user-info">
            <h5 className="user-name">
              {firstName || effectiveUsername || "Guest"}
            </h5>
            <h6>
              @
              {(effectiveUsername || "guest").toLowerCase().replace(/\s+/g, "")}
            </h6>
          </div>
          {!isExpanded && (
            <div className="sidebar-close-btn right-side" onClick={onClose}>
              <svg
                width="8"
                height="8"
                viewBox="0 0 8 8"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4.73292 3.99998L7.84796 0.884843C8.05069 0.682216 8.05069 0.354597 7.84796 0.15197C7.64534 -0.0506567 7.31772 -0.0506567 7.11509 0.15197L3.99996 3.26711L0.884914 0.15197C0.682192 -0.0506567 0.354668 -0.0506567 0.152041 0.15197C-0.0506804 0.354597 -0.0506804 0.682216 0.152041 0.884843L3.26708 3.99998L0.152041 7.11511C-0.0506804 7.31774 -0.0506804 7.64536 0.152041 7.84799C0.253022 7.94906 0.385797 7.99984 0.518478 7.99984C0.651158 7.99984 0.783838 7.94906 0.884914 7.84799L3.99996 4.73285L7.11509 7.84799C7.21617 7.94906 7.34885 7.99984 7.48153 7.99984C7.61421 7.99984 7.74689 7.94906 7.84796 7.84799C8.05069 7.64536 8.05069 7.31774 7.84796 7.11511L4.73292 3.99998Z"
                  fill="#5D5FEF"
                />
              </svg>
            </div>
          )}
        </div>

        <div className="menu-body">
          {/* Threads - Only show when in active chat (ready state) */}
          {showThreads && (
            <div className="menu-section">
              <div className="section-head">
                <div className="heading">
                  {/* Threads icon */}
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 18 18"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M3.00698 10.3133C2.86523 10.3133 2.72123 10.2885 2.58023 10.2353C2.03798 10.0343 1.68848 9.501 1.68848 8.87475V3.99675C1.68848 2.72325 2.61323 1.6875 3.75098 1.6875H14.251C15.3887 1.6875 16.3135 2.72325 16.3135 3.99675V6.6165C16.3135 7.89 15.3887 8.92575 14.251 8.92575H5.12123C4.88723 8.92575 4.66223 9.0375 4.48748 9.24075L3.95723 9.858C3.70298 10.155 3.36098 10.3125 3.00623 10.3125L3.00698 10.3133ZM3.75023 2.8125C3.23348 2.8125 2.81273 3.3435 2.81273 3.99675V8.87475C2.81273 9.0465 2.89148 9.1515 2.97023 9.18075C2.99348 9.18825 3.03623 9.204 3.10373 9.126L3.63398 8.50875C4.02098 8.05875 4.56248 7.8015 5.12123 7.8015H14.2502C14.767 7.8015 15.1877 7.2705 15.1877 6.61725V3.9975C15.1877 3.34425 14.767 2.81325 14.2502 2.81325L3.75023 2.8125ZM14.2502 16.3125H6.75023C5.61248 16.3125 4.68773 15.3877 4.68773 14.25V12.75C4.68773 11.6123 5.61248 10.6875 6.75023 10.6875H14.2502C15.388 10.6875 16.3127 11.6123 16.3127 12.75V14.25C16.3127 15.3877 15.388 16.3125 14.2502 16.3125ZM6.75023 11.8125C6.23348 11.8125 5.81273 12.2332 5.81273 12.75V14.25C5.81273 14.7668 6.23348 15.1875 6.75023 15.1875H14.2502C14.767 15.1875 15.1877 14.7668 15.1877 14.25V12.75C15.1877 12.2332 14.767 11.8125 14.2502 11.8125H6.75023Z"
                      fill="#5D5FEF"
                    />
                  </svg>
                  <h3>Threads</h3>
                </div>
                <div className="add-more" onClick={() => onCreateNew?.()}>
                  <svg
                    width="9"
                    height="9"
                    viewBox="0 0 9 9"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clipPath="url(#clip0_add_more)">
                      <path
                        d="M7.94121 3.42857H5.57143V1.05879C5.57143 0.476571 5.08243 0 4.5 0C3.91757 0 3.42857 0.476571 3.42857 1.05879V3.42857H1.05879C0.476571 3.42857 0 3.91757 0 4.5C0 5.08243 0.476571 5.57143 1.05879 5.57143H3.42857V7.94121C3.42857 8.52343 3.91757 9 4.5 9C5.08243 9 5.57143 8.52343 5.57143 7.94121V5.57143H7.94121C8.52343 5.57143 9 5.08243 9 4.5C9 3.91757 8.52343 3.42857 7.94121 3.42857Z"
                        fill="#5D5FEF"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_add_more">
                        <rect width="9" height="9" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                </div>
              </div>
              <div className="section-body">
                {loading ? (
                  <div className="card-item">
                    <h3 className="para">Loading sessions...</h3>
                  </div>
                ) : error ? (
                  <div className="card-item">
                    <h3 className="para">{error}</h3>
                  </div>
                ) : sessions.length === 0 ? (
                  <div className="card-item">
                    <h3 className="para">No sessions yet</h3>
                  </div>
                ) : (
                  <>
                    {sessions.slice(0, 3).map((s) => (
                      <div
                        key={s.chat_session_id}
                        className="card-item"
                        onClick={() => onSelectSession?.(s)}
                      >
                        <h3 className="para">
                          {s.title || s.chat_session_id.slice(0, 30)}
                        </h3>
                        <div className="bottom">
                          <div className="message-icon">
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
                              <g clipPath="url(#clip0_clock)">
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
                                <clipPath id="clip0_clock">
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
                              {formatDateForCard(s.updated_at || s.created_at)}
                            </span>
                          </span>
                        </div>
                      </div>
                    ))}
                    {sessions.length > 3 && (
                      <div
                        className="view-all"
                        onClick={() =>
                          onViewAll?.({ type: "threads", items: sessions })
                        }
                      >
                        <svg
                          width="10"
                          height="6"
                          viewBox="0 0 10 6"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M5.02282 5.73994C4.92844 5.74049 4.83488 5.7224 4.74751 5.68671C4.66014 5.65102 4.58067 5.59844 4.51366 5.53198L0.210901 1.22922C0.0758633 1.09418 0 0.911032 0 0.72006C0 0.529089 0.0758633 0.345938 0.210901 0.210901C0.345938 0.0758633 0.529089 0 0.72006 0C0.911032 0 1.09418 0.0758633 1.22922 0.210901L5.02282 4.01167L8.81641 0.218072C8.9536 0.100588 9.13007 0.0391974 9.31055 0.0461687C9.49104 0.05314 9.66224 0.12796 9.78996 0.255676C9.91768 0.383392 9.99249 0.554598 9.99946 0.735082C10.0064 0.915565 9.94505 1.09203 9.82756 1.22922L5.52481 5.53198C5.39123 5.66446 5.21095 5.73915 5.02282 5.73994Z"
                            fill="#676767"
                          />
                        </svg>
                        <span>View all</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Previous Session (KBs) */}
          <div className="menu-section">
            <div className="section-head">
              <div className="heading">
                {/* Home icon for Previous Session */}
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g clipPath="url(#clip0_home)">
                    <path
                      d="M14.4506 5.66819L9.71001 0.926944C9.12329 0.341937 8.32855 0.0134277 7.50001 0.0134277C6.67147 0.0134277 5.87673 0.341937 5.29001 0.926944L0.549383 5.66819C0.374648 5.84181 0.236114 6.04838 0.141809 6.27594C0.0475045 6.50349 -0.000694 6.7475 7.54968e-06 6.99382V13.1294C7.54968e-06 13.6267 0.197552 14.1036 0.549182 14.4553C0.900813 14.8069 1.37773 15.0044 1.87501 15.0044H13.125C13.6223 15.0044 14.0992 14.8069 14.4508 14.4553C14.8025 14.1036 15 13.6267 15 13.1294V6.99382C15.0007 6.7475 14.9525 6.50349 14.8582 6.27594C14.7639 6.04838 14.6254 5.84181 14.4506 5.66819ZM9.37501 13.7544H5.62501V11.2544C5.62501 10.7581 6.02691 10.3562 6.52326 10.3562H8.47676C8.9731 10.3562 9.37501 10.7581 9.37501 11.2544V13.7544ZM13.125 13.7544H10.5V11.2544C10.5 10.0701 9.66109 9.13806 8.48976 9.13806H6.51026C5.33894 9.13806 4.50001 10.0701 4.50001 11.2544V13.7544H1.87501C1.69445 13.7544 1.52195 13.6838 1.39573 13.5575C1.26951 13.4313 1.19888 13.2589 1.19888 13.0783V6.99382C1.19854 6.95309 1.20738 6.9128 1.22485 6.87591C1.24216 6.83875 1.26785 6.80543 1.30013 6.77806L6.04076 2.03681C6.50282 1.57457 7.04063 1.32321 7.50001 1.32321C7.95938 1.32321 8.49719 1.57457 8.95926 2.03681L13.6999 6.77806C13.732 6.8052 13.7577 6.83836 13.7751 6.87533C13.7925 6.9123 13.8014 6.95236 13.8017 6.99303V13.1273C13.8017 13.3079 13.731 13.4804 13.6048 13.6066C13.4786 13.7328 13.3061 13.8034 13.125 13.8034V13.7544Z"
                      fill="#5D5FEF"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_home">
                      <rect width="15" height="15" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
                <h3>Previous Session</h3>
              </div>
              <div className="add-more" onClick={() => onStartNewKb?.()}>
                <svg
                  width="9"
                  height="9"
                  viewBox="0 0 9 9"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g clipPath="url(#clip0_add_more_kb)">
                    <path
                      d="M7.94121 3.42857H5.57143V1.05879C5.57143 0.476571 5.08243 0 4.5 0C3.91757 0 3.42857 0.476571 3.42857 1.05879V3.42857H1.05879C0.476571 3.42857 0 3.91757 0 4.5C0 5.08243 0.476571 5.57143 1.05879 5.57143H3.42857V7.94121C3.42857 8.52343 3.91757 9 4.5 9C5.08243 9 5.57143 8.52343 5.57143 7.94121V5.57143H7.94121C8.52343 5.57143 9 5.08243 9 4.5C9 3.91757 8.52343 3.42857 7.94121 3.42857Z"
                      fill="#5D5FEF"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_add_more_kb">
                      <rect width="9" height="9" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </div>
            </div>
            <div className="section-body">
              {kbs.length === 0 ? (
                <div className="card-item">
                  <h3 className="para">Previous KB sessions will appear</h3>
                </div>
              ) : (
                <>
                  {kbs.slice(0, 3).map((kb, idx) => (
                    <div
                      key={kb.batch_id || idx}
                      className="card-item"
                      onClick={() =>
                        onOpenKb?.({
                          batchId: kb.batch_id || kb.id,
                          title: kb.title || kb.link_url,
                        })
                      }
                    >
                      <h3 className="para">
                        {kb.title || kb.link_url || "Untitled"}
                      </h3>
                      <div className="bottom">
                        <div className="message-icon">
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
                            <g clipPath="url(#clip0_clock2)">
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
                              <clipPath id="clip0_clock2">
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
                            {formatDateForCard(kb.updated_at || kb.created_at)}
                          </span>
                        </span>
                      </div>
                    </div>
                  ))}
                  {kbs.length > 3 && (
                    <div
                      className="view-all"
                      onClick={() => onViewAll?.({ type: "kbs", items: kbs })}
                    >
                      <svg
                        width="10"
                        height="6"
                        viewBox="0 0 10 6"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          d="M5.02282 5.73994C4.92844 5.74049 4.83488 5.7224 4.74751 5.68671C4.66014 5.65102 4.58067 5.59844 4.51366 5.53198L0.210901 1.22922C0.0758633 1.09418 0 0.911032 0 0.72006C0 0.529089 0.0758633 0.345938 0.210901 0.210901C0.345938 0.0758633 0.529089 0 0.72006 0C0.911032 0 1.09418 0.0758633 1.22922 0.210901L5.02282 4.01167L8.81641 0.218072C8.9536 0.100588 9.13007 0.0391974 9.31055 0.0461687C9.49104 0.05314 9.66224 0.12796 9.78996 0.255676C9.91768 0.383392 9.99249 0.554598 9.99946 0.735082C10.0064 0.915565 9.94505 1.09203 9.82756 1.22922L5.52481 5.53198C5.39123 5.66446 5.21095 5.73915 5.02282 5.73994Z"
                          fill="#676767"
                        />
                      </svg>
                      <span>View all</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="side-menu-bottom">
            <button
              onClick={() =>
                window.open(
                  "https://scrapper.blockverse.tech/workspace/extension",
                  "_blank"
                )
              }
              className="btn-primary btn-sm"
            >
              Explore Webmap Dashboard
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
