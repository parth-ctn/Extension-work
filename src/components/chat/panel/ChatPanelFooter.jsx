import { useEffect, useRef, useState } from "react";
import browser from "webextension-polyfill";
import { CHAT_FOOTER_TEXT } from "../../../constants/chat.js";

// DiscussSheet — renders as bottom-sheet on collapsed view, side-sheet on expanded view
function DiscussSheet({ isOpen, isExpanded, onClose }) {
  const textareaRef = useRef(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 300);
    }
  }, [isOpen]);

  if (isExpanded) {
    // Side sheet for expanded view
    return (
      <>
        {/* Backdrop */}
        <div
          className={`discuss-side-backdrop${isOpen ? " open" : ""}`}
          onClick={onClose}
        />
        {/* Side drawer */}
        <div className={`discuss-side-sheet${isOpen ? " open" : ""}`}>
          <div className="discuss-side-sheet__header">
            <h3>Discuss</h3>
            <button
              className="discuss-close-btn"
              onClick={onClose}
              aria-label="Close discuss panel"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M13 1L1 13M1 1L13 13"
                  stroke="#667085"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div className="discuss-side-sheet__body">
            <textarea
              ref={textareaRef}
              className="discuss-textarea"
              placeholder="Write your thoughts here..."
            />
          </div>
        </div>
      </>
    );
  }

  // Bottom sheet for collapsed / normal view
  return (
    <>
      <div
        className={`screen-backdrop${isOpen ? " open" : ""}`}
        onClick={onClose}
      />
      <div className={`bottom-sheet discuss-bottom-sheet${isOpen ? " open" : ""}`}>
        <div className="bottom-sheet-header">
          <h3>Discuss</h3>
          <button
            className="discuss-close-btn closed-icon"
            onClick={onClose}
            aria-label="Close discuss panel"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M13 1L1 13M1 1L13 13"
                stroke="#667085"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="bottom-sheet-body">
          <textarea
            ref={textareaRef}
            className="discuss-textarea"
            placeholder="Write your thoughts here..."
          />
        </div>
      </div>
    </>
  );
}

export function ChatPanelFooter({
  status,
  chat,
  message,
  onMessageChange,
  onSubmit,
  onKeyDown,
  canSend,
  attachedImages,
  setAttachedImages,
  isExpanded, // pass this prop from ChatPanel
}) {
  const textareaRef = useRef(null);
  const [isDiscussOpen, setIsDiscussOpen] = useState(false);

  const startSnippingTool = (dataUrl, onComplete) => {
    const overlay = document.createElement("div");
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100%";
    overlay.style.height = "100%";
    overlay.style.zIndex = "2147483647";
    overlay.style.cursor = "crosshair";
    overlay.style.backgroundColor = "rgba(0,0,0,0.3)";

    const canvasBack = document.createElement("canvas");
    canvasBack.style.position = "absolute";
    canvasBack.style.top = "0";
    canvasBack.style.left = "0";
    canvasBack.width = window.innerWidth;
    canvasBack.height = window.innerHeight;
    overlay.appendChild(canvasBack);

    const ctxBack = canvasBack.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctxBack.drawImage(img, 0, 0, window.innerWidth, window.innerHeight);
      ctxBack.fillStyle = "rgba(0,0,0,0.4)";
      ctxBack.fillRect(0, 0, window.innerWidth, window.innerHeight);
    };
    img.src = dataUrl;

    const selection = document.createElement("div");
    selection.style.position = "absolute";
    selection.style.border = "2px solid #5D5FEF";
    selection.style.backgroundColor = "transparent";
    selection.style.display = "none";
    overlay.appendChild(selection);

    document.body.appendChild(overlay);

    let startX, startY;
    let isDragging = false;

    const onMouseDown = (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      selection.style.left = `${startX}px`;
      selection.style.top = `${startY}px`;
      selection.style.width = "0px";
      selection.style.height = "0px";
      selection.style.display = "block";
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const currentX = e.clientX;
      const currentY = e.clientY;
      const x = Math.min(startX, currentX);
      const y = Math.min(startY, currentY);
      const width = Math.abs(currentX - startX);
      const height = Math.abs(currentY - startY);

      selection.style.left = `${x}px`;
      selection.style.top = `${y}px`;
      selection.style.width = `${width}px`;
      selection.style.height = `${height}px`;

      ctxBack.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ctxBack.drawImage(img, 0, 0, window.innerWidth, window.innerHeight);
      ctxBack.fillStyle = "rgba(0,0,0,0.4)";
      ctxBack.fillRect(0, 0, window.innerWidth, y);
      ctxBack.fillRect(0, y + height, window.innerWidth, window.innerHeight - (y + height));
      ctxBack.fillRect(0, y, x, height);
      ctxBack.fillRect(x + width, y, window.innerWidth - (x + width), height);
    };

    const onMouseUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      const endX = e.clientX;
      const endY = e.clientY;
      const x = Math.min(startX, endX);
      const y = Math.min(startY, endY);
      const width = Math.abs(endX - startX);
      const height = Math.abs(endY - startY);

      document.body.removeChild(overlay);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", onKeyDownEsc);

      if (width > 5 && height > 5) {
        const cropCanvas = document.createElement("canvas");
        cropCanvas.width = width;
        cropCanvas.height = height;
        const cropCtx = cropCanvas.getContext("2d");
        cropCtx.drawImage(
          img,
          x * (img.width / window.innerWidth),
          y * (img.height / window.innerHeight),
          width * (img.width / window.innerWidth),
          height * (img.height / window.innerHeight),
          0,
          0,
          width,
          height,
        );
        onComplete(cropCanvas.toDataURL("image/png"));
      }
    };

    const onKeyDownEsc = (e) => {
      if (e.key === "Escape") {
        document.body.removeChild(overlay);
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        window.removeEventListener("keydown", onKeyDownEsc);
      }
    };

    overlay.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("keydown", onKeyDownEsc);
  };

  const handleSnip = async () => {
    try {
      const response = await browser.runtime.sendMessage({
        type: "webmap/capture-tab",
      });
      if (response?.ok && response.dataUrl) {
        startSnippingTool(response.dataUrl, (cropped) => {
          setAttachedImages((prev) => [...(prev || []), cropped]);
        });
      }
    } catch (err) {
      console.error("[Snip] Failed to send snip message:", err);
    }
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = (event) => {
          setAttachedImages((prev) => [...(prev || []), event.target.result]);
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  const handleRemoveImage = (index) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    if (message.length > 0) {
      textarea.style.height = `${textarea.scrollHeight}px`;
    } else {
      textarea.style.height = "auto";
    }
  }, [message]);

  if (status === "ready") {
    const inputDisabled = false;
    const sendDisabled = !canSend || chat.awaitingResponse || !chat.ready;
    const images = attachedImages || [];

    return (
      <>
        <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
          {images.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "nowrap",
                overflowX: "auto",
                gap: "8px",
                padding: "8px 12px 4px",
                scrollbarWidth: "none",
              }}
            >
              {images.map((src, index) => (
                <div key={index} style={{ position: "relative", flexShrink: 0 }}>
                  <img
                    src={src}
                    alt={`Attached ${index + 1}`}
                    style={{
                      width: "64px",
                      height: "64px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: "1px solid #ddd",
                      display: "block",
                    }}
                  />
                  <button
                    onClick={() => handleRemoveImage(index)}
                    style={{
                      position: "absolute",
                      top: "0",
                      right: "0",
                      background: "#f44336",
                      color: "white",
                      border: "none",
                      borderRadius: "50%",
                      width: "18px",
                      height: "18px",
                      fontSize: "12px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transform: "translate(40%, -40%)",
                    }}
                    aria-label={`Remove image ${index + 1}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="message-field">
            <textarea
              ref={textareaRef}
              placeholder="Write a message"
              value={message}
              onChange={onMessageChange}
              onKeyDown={onKeyDown}
              onPaste={handlePaste}
              disabled={inputDisabled}
              rows={1}
            />
            <div className="message-options">
              {/* Snip button */}
              <button
                type="button"
                className="icon"
                title="Snip"
                onClick={handleSnip}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#667085"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="6" cy="6" r="3"></circle>
                  <circle cx="6" cy="18" r="3"></circle>
                  <line x1="20" y1="4" x2="8.12" y2="15.88"></line>
                  <line x1="14.47" y1="14.48" x2="20" y2="20"></line>
                  <line x1="8.12" y1="8.12" x2="12" y2="12"></line>
                </svg>
              </button>

              {/* Emoji button (disabled) */}
              <button type="button" className="icon" disabled>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 0C4.48598 0 0 4.48598 0 10C0 15.514 4.48598 20 10 20C15.514 20 20 15.514 20 10C20 4.48598 15.514 0 10 0ZM10 18.75C5.17523 18.75 1.25 14.8248 1.25 10C1.25 5.17523 5.17523 1.25 10 1.25C14.8248 1.25 18.75 5.17523 18.75 10C18.75 14.8248 14.8248 18.75 10 18.75ZM15.373 12.7812C14.7209 13.5756 13.9008 14.2155 12.9717 14.6548C12.0426 15.0941 11.0277 15.322 9.99996 15.322C8.97224 15.322 7.9573 15.0941 7.02821 14.6548C6.09913 14.2155 5.27902 13.5756 4.62691 12.7812C4.57449 12.7179 4.53509 12.6448 4.51097 12.5662C4.48685 12.4875 4.47848 12.4049 4.48635 12.3231C4.49422 12.2412 4.51817 12.1617 4.55683 12.0891C4.59548 12.0165 4.64809 11.9522 4.71162 11.9C4.77516 11.8478 4.84838 11.8086 4.92708 11.7848C5.00579 11.7609 5.08843 11.7528 5.17027 11.7609C5.25211 11.769 5.33154 11.7933 5.40401 11.8321C5.47648 11.871 5.54056 11.9238 5.59258 11.9875C6.12742 12.6392 6.80012 13.1642 7.56223 13.5246C8.32434 13.885 9.15689 14.072 9.99994 14.072C10.843 14.072 11.6755 13.885 12.4377 13.5246C13.1998 13.1642 13.8725 12.6392 14.4073 11.9875C14.5127 11.8601 14.6644 11.7796 14.8291 11.7638C14.9937 11.748 15.1579 11.7981 15.2857 11.9031C15.4135 12.0081 15.4945 12.1595 15.5108 12.3241C15.5272 12.4888 15.4776 12.6531 15.373 12.7812H15.373ZM11.4506 8.27168V7.83203C11.4506 6.91148 12.3093 6.16258 13.3647 6.16258C14.4201 6.16258 15.2787 6.91148 15.2787 7.83203V8.27187C15.2787 8.43764 15.2129 8.59661 15.0957 8.71382C14.9785 8.83103 14.8195 8.89687 14.6537 8.89687C14.488 8.89687 14.329 8.83103 14.2118 8.71382C14.0946 8.59661 14.0287 8.43764 14.0287 8.27187V7.83203C14.0287 7.63402 13.7447 7.41258 13.3647 7.41258C12.9846 7.41258 12.7006 7.63402 12.7006 7.83203V8.27187C12.7006 8.43764 12.6348 8.59661 12.5176 8.71382C12.4004 8.83103 12.2414 8.89687 12.0756 8.89687C11.9099 8.89687 11.7509 8.83103 11.6337 8.71382C11.5165 8.59661 11.4506 8.43764 11.4506 8.27187V8.27168ZM4.72105 8.27168V7.83203C4.72105 6.91148 5.57977 6.16258 6.63512 6.16258C7.69047 6.16258 8.54918 6.91148 8.54918 7.83203V8.27187C8.54918 8.43764 8.48333 8.59661 8.36612 8.71382C8.24891 8.83103 8.08994 8.89687 7.92418 8.89687C7.75842 8.89687 7.59945 8.83103 7.48224 8.71382C7.36503 8.59661 7.29918 8.43764 7.29918 8.27187V7.83203C7.29918 7.63402 7.01519 7.41258 6.63512 7.41258C6.25504 7.41258 5.97105 7.63402 5.97105 7.83203V8.27187C5.97105 8.43764 5.90521 8.59661 5.788 8.71382C5.67079 8.83103 5.51181 8.89687 5.34605 8.89687C5.18029 8.89687 5.02132 8.83103 4.90411 8.71382C4.7869 8.59661 4.72105 8.43764 4.72105 8.27187V8.27168Z" fill="#667085" />
                </svg>
              </button>

              {/* Attach button (disabled) */}
              <button type="button" className="icon" disabled>
                <svg width="17" height="19" viewBox="0 0 17 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10.3179 6.07722L5.01135 11.2581C4.21237 12.0381 4.21237 13.3036 5.01135 14.0837V14.0837C5.81033 14.8637 7.10650 14.8637 7.90548 14.0837L14.9009 7.25391C16.3664 5.82318 16.3664 3.50378 14.9009 2.07305V2.07305C13.4355 0.642317 11.0598 0.642317 9.59437 2.07305L2.59893 8.9028C0.467023 10.9842 0.467023 14.3575 2.59893 16.4389V16.4389C4.73084 18.5204 8.18599 18.5204 10.3179 16.4389L14.5633 12.2941" stroke="#667085" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* ✅ Discuss button */}
              <button
                type="button"
                className={`icon discuss-btn${isDiscussOpen ? " active" : ""}`}
                title="Discuss"
                onClick={() => setIsDiscussOpen((v) => !v)}
                aria-label="Open discuss panel"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                    stroke={isDiscussOpen ? "#5D5FEF" : "#667085"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill={isDiscussOpen ? "rgba(93,95,239,0.1)" : "none"}
                  />
                </svg>
              </button>

              {/* Send button */}
              <button
                type="button"
                className="icon"
                disabled={sendDisabled}
                onClick={onSubmit}
                aria-label="Send message"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g clipPath="url(#clip0_8144_29300)">
                    <path d="M18.4172 8.80443L2.29384 0.938594C2.1389 0.863089 1.96729 0.82825 1.79517 0.837357C1.62305 0.846463 1.45608 0.899216 1.30997 0.99065C1.16385 1.08208 1.04341 1.20919 0.959972 1.36001C0.876532 1.51083 0.83284 1.6804 0.833008 1.85276V1.88193C0.833091 2.01819 0.849883 2.15392 0.883008 2.28609L2.42968 8.47276C2.45041 8.55518 2.49584 8.62928 2.55989 8.68514C2.62394 8.74099 2.70354 8.77593 2.78801 8.78526L9.58551 9.54109C9.69861 9.5547 9.8028 9.60927 9.87839 9.69449C9.95398 9.77972 9.99572 9.88968 9.99572 10.0036C9.99572 10.1175 9.95398 10.2275 9.87839 10.3127C9.8028 10.3979 9.69861 10.4525 9.58551 10.4661L2.78801 11.2219C2.70354 11.2313 2.62394 11.2662 2.55989 11.3221C2.49584 11.3779 2.45041 11.452 2.42968 11.5344L0.883008 17.7203C0.849883 17.8524 0.833091 17.9882 0.833008 18.1244V18.1536C0.832982 18.3259 0.876777 18.4954 0.960275 18.6461C1.04377 18.7968 1.16423 18.9238 1.31032 19.0151C1.45641 19.1064 1.62333 19.1591 1.79538 19.1682C1.96743 19.1772 2.13896 19.1424 2.29384 19.0669L18.4163 11.2011C18.6409 11.0916 18.8301 10.9211 18.9625 10.7093C19.0949 10.4974 19.1651 10.2526 19.1651 10.0028C19.1651 9.75293 19.0949 9.50813 18.9625 9.29626C18.8301 9.08439 18.6417 8.91397 18.4172 8.80443Z" fill="#5D5FEF" />
                  </g>
                  <defs>
                    <clipPath id="clip0_8144_29300">
                      <rect width="20" height="20" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Discuss Sheet (bottom or side based on isExpanded) */}
        <DiscussSheet
          isOpen={isDiscussOpen}
          isExpanded={!!isExpanded}
          onClose={() => setIsDiscussOpen(false)}
        />
      </>
    );
  }

  if (status === "running") {
    return (
      <footer className="section-footer">
        <p>{CHAT_FOOTER_TEXT.running}</p>
      </footer>
    );
  }

  if (status === "error") {
    return (
      <footer className="section-footer">
        <p>{CHAT_FOOTER_TEXT.error}</p>
      </footer>
    );
  }

  if (status === "idle") {
    return (
      <footer className="section-footer">
        <p>{CHAT_FOOTER_TEXT.idle}</p>
      </footer>
    );
  }

  return null;
}