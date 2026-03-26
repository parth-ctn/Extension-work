// import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import { ChatSuggestionStrip } from "./ChatSuggestionStrip.jsx";
// import { scrambleText, TYPING_WORDS } from "../../../utils/textScramble.js";

// // Custom hook for scrambling text with random word selection
// function useScrambleTypingText(words, interval = 3000) {
//   const [currentWord, setCurrentWord] = useState(words[0]);
//   const [displayWord, setDisplayWord] = useState(words[0]);
//   const lastWordRef = useRef(words[0]);
//   const isScrambling = useRef(false);

//   useEffect(() => {
//     const cycleWords = async () => {
//       if (isScrambling.current || words.length === 0) return;

//       isScrambling.current = true;

//       // Get a random word that's different from the current one
//       let newWord;
//       do {
//         const randomIndex = Math.floor(Math.random() * words.length);
//         newWord = words[randomIndex];
//       } while (newWord === lastWordRef.current && words.length > 1);

//       const oldWord = lastWordRef.current;

//       await scrambleText({
//         oldText: oldWord,
//         newText: newWord,
//         onUpdate: (text) => setDisplayWord(text),
//         duration: 600,
//       });

//       setCurrentWord(newWord);
//       lastWordRef.current = newWord;
//       isScrambling.current = false;
//     };

//     const timer = setInterval(cycleWords, interval);
//     return () => clearInterval(timer);
//   }, [words, interval]);

//   return displayWord;
// }

// function extractPlainText(html) {
//   if (!html) {
//     return "";
//   }
//   if (typeof document === "undefined") {
//     return html;
//   }
//   const temp = document.createElement("div");
//   temp.innerHTML = html;
//   return temp.textContent ?? temp.innerText ?? html;
// }

// async function copyToClipboard(text) {
//   if (!text) {
//     return false;
//   }
//   try {
//     if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
//       await navigator.clipboard.writeText(text);
//       return true;
//     }
//   } catch (error) {
//     console.warn("Clipboard API copy failed", error);
//   }

//   if (typeof document === "undefined") {
//     return false;
//   }

//   try {
//     const textarea = document.createElement("textarea");
//     textarea.value = text;
//     textarea.setAttribute("readonly", "readonly");
//     textarea.style.position = "absolute";
//     textarea.style.left = "-9999px";
//     document.body.appendChild(textarea);
//     textarea.select();
//     const success = document.execCommand("copy");
//     document.body.removeChild(textarea);
//     return success;
//   } catch (error) {
//     console.warn("Fallback copy failed", error);
//     return false;
//   }
// }

// function CopyIcon() {
//   return (
//     <svg
//       width="20"
//       height="18"
//       viewBox="0 0 20 18"
//       fill="none"
//       xmlns="http://www.w3.org/2000/svg"
//     >
//       <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
//       <g
//         id="SVGRepo_tracerCarrier"
//         strokeLinecap="round"
//         strokeLinejoin="round"
//       ></g>
//       <g id="SVGRepo_iconCarrier">
//         <path
//           fillRule="evenodd"
//           clipRule="evenodd"
//           d="M7 1.75C7 0.783502 7.7835 0 8.75 0H17.25C18.2165 0 19 0.783502 19 1.75V12.25C19 13.2165 18.2165 14 17.25 14H16V15.75C16 16.7165 15.2165 17.5 14.25 17.5H2.75C1.7835 17.5 1 16.7165 1 15.75V6.25C1 5.2835 1.7835 4.5 2.75 4.5H4.5V1.75C4.5 0.783502 5.2835 0 6.25 0H7ZM7 4.5H14.25C15.2165 4.5 16 5.2835 16 6.25V12.5H17.25C17.3881 12.5 17.5 12.3881 17.5 12.25V1.75C17.5 1.61193 17.3881 1.5 17.25 1.5H8.75C8.61193 1.5 8.5 1.61193 8.5 1.75V4.5H7ZM2.75 6C2.61193 6 2.5 6.11193 2.5 6.25V15.75C2.5 15.8881 2.61193 16 2.75 16H14.25C14.3881 16 14.5 15.8881 14.5 15.75V6.25C14.5 6.11193 14.3881 6 14.25 6H2.75Z"
//           fill="currentColor"
//         ></path>
//       </g>
//     </svg>
//   );
// }

// function CheckIcon() {
//   return (
//     <svg
//       viewBox="0 0 20 20"
//       aria-hidden="true"
//       focusable="false"
//       width="10"
//       height="10"
//     >
//       <path
//         d="M16.53 6.28a.75.75 0 0 0-1.06-1.06L8.25 12.44 5.53 9.72a.75.75 0 1 0-1.06 1.06l3.25 3.25a.75.75 0 0 0 1.06 0l7.75-7.75Z"
//         fill="currentColor"
//       />
//     </svg>
//   );
// }

// export function ChatMessageList({
//   messages,
//   awaitingResponse,
//   onSuggestionSelect,
//   logoUrl,
// }) {
//   const listRef = useRef(null);
//   const scrollContainerRef = useRef(null);
//   const [showScrollButton, setShowScrollButton] = useState(false);
//   const [copiedMessageId, setCopiedMessageId] = useState(null);
//   const copyResetTimerRef = useRef(null);
//   const hasAutoScrolledRef = useRef(false);
//   const suggestionClickPendingRef = useRef(false);
//   const isPinnedToBottomRef = useRef(true);
//   const scrollRafRef = useRef(null);
//   const suggestionsPanelId = useMemo(
//     () => `suggested-prompts-${Math.random().toString(36).slice(2, 9)}`,
//     []
//   );

//   // Track which suggestion accordion is open (by message index)
//   const [openSuggestionIndex, setOpenSuggestionIndex] = useState(null);

//   // Scrambling word for typing indicator
//   const scrambledWord = useScrambleTypingText(TYPING_WORDS, 3000);

//   const resolveScrollContainer = useCallback(() => {
//     if (scrollContainerRef.current) {
//       return scrollContainerRef.current;
//     }
//     // Look for the chat-message-container which is the actual scrollable element
//     let node = listRef.current?.closest(".chat-message-container");
//     // Fallback to agent-container or parent elements
//     if (!node) node = listRef.current?.closest(".agent-container");
//     if (!node) node = listRef.current?.closest(".wm-chat-sidebar__body");
//     if (!node) node = listRef.current?.parentElement ?? null;
//     if (!node) node = listRef.current ?? null;
//     if (node) {
//       scrollContainerRef.current = node;
//     }
//     return scrollContainerRef.current;
//   }, []);

//   const scrollPromptListToEnd = useCallback(() => {
//     try {
//       const root = listRef.current;
//       const list = root?.querySelector(
//         ".suggested-prompt .accordion-body.open .prompt-list"
//       );
//       if (!list) {
//         return;
//       }
//       if (typeof list.scrollTo === "function") {
//         list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
//       } else {
//         list.scrollTop = list.scrollHeight;
//       }
//     } catch {}
//   }, []);

//   const updateScrollIndicator = useCallback(() => {
//     const container = resolveScrollContainer();
//     if (!container) {
//       return;
//     }
//     const distanceFromBottom =
//       container.scrollHeight - container.scrollTop - container.clientHeight;
//     // Show button when scrolled up more than 100px from bottom
//     setShowScrollButton(distanceFromBottom > 100);
//     isPinnedToBottomRef.current = distanceFromBottom <= 120;
//   }, [resolveScrollContainer]);

//   const scrollToBottom = useCallback(
//     (behavior = "smooth") => {
//       const container = resolveScrollContainer();
//       if (!container) {
//         return;
//       }
//       container.scrollTo({
//         top: container.scrollHeight,
//         behavior,
//       });
//       if (typeof window !== "undefined" && window.requestAnimationFrame) {
//         window.requestAnimationFrame(updateScrollIndicator);
//       } else {
//         updateScrollIndicator();
//       }
//     },
//     [resolveScrollContainer, updateScrollIndicator]
//   );

//   const scheduleAutoScroll = useCallback(
//     (behavior) => {
//       if (!isPinnedToBottomRef.current) {
//         return;
//       }
//       if (scrollRafRef.current) {
//         return;
//       }
//       if (typeof window !== "undefined" && window.requestAnimationFrame) {
//         scrollRafRef.current = window.requestAnimationFrame(() => {
//           scrollRafRef.current = null;
//           scrollToBottom(behavior);
//         });
//       } else {
//         scrollToBottom(behavior);
//       }
//     },
//     [scrollToBottom]
//   );

//   useEffect(() => {
//     const container = resolveScrollContainer();
//     if (!container) {
//       return undefined;
//     }

//     const handleScroll = () => {
//       updateScrollIndicator();
//     };

//     container.addEventListener("scroll", handleScroll, { passive: true });
//     updateScrollIndicator();

//     return () => {
//       container.removeEventListener("scroll", handleScroll);
//     };
//   }, [resolveScrollContainer, updateScrollIndicator]);

//   const latestMessageKey = messages.length
//     ? messages[messages.length - 1].id ?? `message-${messages.length - 1}`
//     : null;

//   useEffect(() => {
//     if (!messages.length && !awaitingResponse) {
//       return;
//     }
//     // First scroll - delay to ensure container is properly rendered
//     if (!hasAutoScrolledRef.current) {
//       const timeoutId = setTimeout(() => {
//         scheduleAutoScroll("auto");
//         hasAutoScrolledRef.current = true;
//       }, 100);
//       return () => clearTimeout(timeoutId);
//     }

//     // While streaming, use instant scroll to prevent jitter from repeated smooth scrolls
//     const behavior = awaitingResponse ? "auto" : "smooth";
//     scheduleAutoScroll(behavior);
//   }, [
//     latestMessageKey,
//     awaitingResponse,
//     messages,
//     scheduleAutoScroll,
//   ]);

//   useEffect(() => {
//     return () => {
//       if (copyResetTimerRef.current) {
//         clearTimeout(copyResetTimerRef.current);
//       }
//       if (scrollRafRef.current && typeof window !== "undefined") {
//         window.cancelAnimationFrame(scrollRafRef.current);
//       }
//     };
//   }, []);

//   const handleCopy = useCallback(async (message, messageKey) => {
//     const plainText = extractPlainText(message?.text ?? "");
//     if (!plainText) {
//       return;
//     }
//     const ok = await copyToClipboard(plainText);
//     if (!ok) {
//       return;
//     }
//     setCopiedMessageId(messageKey);
//     if (copyResetTimerRef.current) {
//       clearTimeout(copyResetTimerRef.current);
//     }
//     copyResetTimerRef.current = setTimeout(() => {
//       setCopiedMessageId(null);
//       copyResetTimerRef.current = null;
//     }, 2000);
//   }, []);

//   const handleScrollButtonClick = useCallback(() => {
//     scrollToBottom("smooth");
//   }, [scrollToBottom]);

//   const [copiedPromptIndex, setCopiedPromptIndex] = useState(null);

//   const handleCopyPrompt = useCallback((e, suggestion, index) => {
//     e.stopPropagation();
//     navigator.clipboard.writeText(suggestion).then(() => {
//       setCopiedPromptIndex(index);
//       setTimeout(() => setCopiedPromptIndex(null), 2000);
//     });
//   }, []);

//   const handleToggleSuggestions = useCallback((messageIndex) => {
//     setOpenSuggestionIndex(prev => prev === messageIndex ? null : messageIndex);
//   }, []);

//   // Scroll to bottom only when the LAST suggestion accordion is opened
//   useEffect(() => {
//     if (openSuggestionIndex !== null) {
//       // Find the index of the last message with suggestions
//       let lastSuggestionIndex = -1;
//       for (let i = messages.length - 1; i >= 0; i--) {
//         if (messages[i].role === "assistant" && messages[i].suggestions?.length > 0) {
//           lastSuggestionIndex = i;
//           break;
//         }
//       }

//       // Only scroll if this is the last suggestion accordion
//       if (openSuggestionIndex === lastSuggestionIndex) {
//         // When expanding suggestions, scroll to bottom to show the suggestions
//         const doScrolls = () => {
//           // First scroll to bottom immediately
//           scrollToBottom("smooth");
//           // Wait for accordion animation to complete, then scroll again to ensure full visibility
//           setTimeout(() => {
//             scrollToBottom("smooth");
//           }, 450);
//         };
//         if (typeof window !== "undefined" && window.requestAnimationFrame) {
//           window.requestAnimationFrame(doScrolls);
//         } else {
//           doScrolls();
//         }
//       }
//     }
//   }, [openSuggestionIndex, scrollToBottom, messages]);

//   const handleSuggestionToggleKeyDown = useCallback(
//     (event, messageIndex) => {
//       if (event.key === "Enter" || event.key === " ") {
//         event.preventDefault();
//         handleToggleSuggestions(messageIndex);
//       }
//     },
//     [handleToggleSuggestions]
//   );

//   const handleSuggestionClick = useCallback(
//     (suggestion) => {
//       suggestionClickPendingRef.current = true;
//       onSuggestionSelect?.(suggestion);
//     },
//     [onSuggestionSelect]
//   );

//   const handleContentClick = useCallback(async (event) => {
//     // Per-code-block copy via event delegation
//     const target = event.target;
//     if (!target || typeof target.closest !== "function") return;
//     const copyBtn = target.closest(".wm-codeblock__copy, .copy-btn");
//     if (!copyBtn) return;
//     // If it's a code copy button, copy the content of the nearest code block
//     if (copyBtn.classList.contains("wm-codeblock__copy")) {
//       event.preventDefault();
//       const wrapper =
//         copyBtn.closest(".wm-codeblock") || copyBtn.closest(".message-content");
//       const codeEl = wrapper?.querySelector("pre > code");
//       const raw = codeEl?.textContent || "";
//       if (!raw.trim()) return;
//       const ok = await copyToClipboard(raw);
//       if (!ok) return;

//       // Update button state + provide feedback
//       if (copyBtn._wmResetTimer) {
//         clearTimeout(copyBtn._wmResetTimer);
//       }
//       copyBtn.classList.add("is-copied");
//       copyBtn.setAttribute("aria-label", "Code copied");
//       copyBtn.setAttribute("title", "Code copied");

//       copyBtn._wmResetTimer = setTimeout(() => {
//         copyBtn.classList.remove("is-copied");
//         copyBtn.setAttribute("aria-label", "Copy code");
//         copyBtn.setAttribute("title", "Copy code");
//         delete copyBtn._wmResetTimer;
//       }, 2000);
//       return;
//     }
//     // Otherwise per-message copy is handled by onClick on its own button
//   }, []);


//   const formatTime = (timestamp) => {
//     if (!timestamp) return "";
//     const date = new Date(timestamp);
//     return date.toLocaleTimeString("en-US", {
//       hour: "2-digit",
//       minute: "2-digit",
//       hour12: true,
//     });
//   };

//   return (
//     <>
//       <div className="chat-message-container" ref={listRef}>
//         <div className="chat-messages">
//           {messages.map((message, index) => {
//             const messageKey = message.id ?? `message-${index}`;
//             const isAssistant = message.role === "assistant";
//             const messageClass = isAssistant ? "message-agent" : "message-user";
//             const messageSuggestions = message.suggestions || [];
//             const hasSuggestions = isAssistant && messageSuggestions.length > 0;

//             return (
//               <React.Fragment key={messageKey}>
//                 <div className={`message ${messageClass}`}>
//                   {message.timestamp && (
//                     <span className="response-time">
//                       {formatTime(message.timestamp)}
//                     </span>
//                   )}
//                   <div className="message-content">
//                     <div
//                       onClick={handleContentClick}
//                       dangerouslySetInnerHTML={{ __html: message.text }}
//                     />
//                     {isAssistant && (
//                       <div className="message-actions">
//                         <button
//                           type="button"
//                           className={`copy-btn${
//                             copiedMessageId === messageKey ? " is-copied" : ""
//                           }`}
//                           aria-label={
//                             copiedMessageId === messageKey
//                               ? "Response copied"
//                               : "Copy response"
//                           }
//                           title={
//                             copiedMessageId === messageKey
//                               ? "Response copied"
//                               : "Copy response"
//                           }
//                           onClick={() => handleCopy(message, messageKey)}
//                         >
//                           {copiedMessageId === messageKey ? (
//                             <CheckIcon />
//                           ) : (
//                             <CopyIcon />
//                           )}
//                         </button>
//                       </div>
//                     )}
//                   </div>
//                 </div>

//                 {/* Suggested Prompts for this message */}
//                 {hasSuggestions && (
//                   <div className="message message-agent">
//                     <div className="suggested-prompt">
//                       <div className="reference-accordion">
//                         <div
//                           className={`accordion-header${
//                             openSuggestionIndex === index ? " active" : ""
//                           }`}
//                           onClick={() => handleToggleSuggestions(index)}
//                           onKeyDown={(e) => handleSuggestionToggleKeyDown(e, index)}
//                           role="button"
//                           tabIndex={0}
//                           aria-expanded={openSuggestionIndex === index}
//                           aria-controls={`${suggestionsPanelId}-${index}`}
//                         >
//                           <h4 className="heading">Suggested prompts</h4>
//                           <span className="icon" aria-hidden="true">
//                             {openSuggestionIndex === index ? (
//                               <svg
//                                 width="16"
//                                 height="16"
//                                 viewBox="0 0 24 24"
//                                 fill="none"
//                                 xmlns="http://www.w3.org/2000/svg"
//                               >
//                                 <path
//                                   d="M6.343 15.657a1 1 0 0 0 1.414 0L12 11.414l4.243 4.243a1 1 0 0 0 1.414-1.414l-4.95-4.95a1.5 1.5 0 0 0-2.121 0l-4.95 4.95a1 1 0 0 0 0 1.414Z"
//                                   fill="#5D5FEF"
//                                 />
//                               </svg>
//                             ) : (
//                               <svg
//                                 width="16"
//                                 height="16"
//                                 viewBox="0 0 24 24"
//                                 fill="none"
//                                 xmlns="http://www.w3.org/2000/svg"
//                               >
//                                 <path
//                                   d="M17.657 8.343a1 1 0 0 0-1.414 0L12 12.586 7.757 8.343A1 1 0 0 0 6.343 9.757l4.95 4.95a1.5 1.5 0 0 0 2.121 0l4.95-4.95a1 1 0 0 0 0-1.414Z"
//                                   fill="#5D5FEF"
//                                 />
//                               </svg>
//                             )}
//                           </span>
//                         </div>
//                         <div
//                           className={`accordion-body${
//                             openSuggestionIndex === index ? " open" : ""
//                           }`}
//                           id={`${suggestionsPanelId}-${index}`}
//                         >
//                           <div className="prompt-list">
//                             {messageSuggestions.map((suggestion, suggIdx) => (
//                               <div
//                                 key={`suggestion-${index}-${suggIdx}`}
//                                 className="prompt-item"
//                                 onClick={() => handleSuggestionClick(suggestion)}
//                               >
//                                 <p>{suggestion}</p>
//                                 <button
//                                   className={`copy-chat${
//                                     copiedPromptIndex === `${index}-${suggIdx}` ? " is-copied" : ""
//                                   }`}
//                                   onClick={(e) =>
//                                     handleCopyPrompt(e, suggestion, `${index}-${suggIdx}`)
//                                   }
//                                   aria-label={
//                                     copiedPromptIndex === `${index}-${suggIdx}`
//                                       ? "Copied!"
//                                       : "Copy prompt"
//                                   }
//                                   type="button"
//                                 >
//                                   {copiedPromptIndex === `${index}-${suggIdx}` ? (
//                                     <svg
//                                       width="10"
//                                       height="10"
//                                       viewBox="0 0 24 24"
//                                       fill="none"
//                                       xmlns="http://www.w3.org/2000/svg"
//                                     >
//                                       <path
//                                         d="M20 6L9 17L4 12"
//                                         stroke="currentColor"
//                                         strokeWidth="3"
//                                         strokeLinecap="round"
//                                         strokeLinejoin="round"
//                                       />
//                                     </svg>
//                                   ) : (
//                                     <svg
//                                       width="10"
//                                       height="10"
//                                       viewBox="0 0 24 24"
//                                       fill="none"
//                                       xmlns="http://www.w3.org/2000/svg"
//                                     >
//                                       <path
//                                         d="M8 4V16C8 17.1046 8.89543 18 10 18H18C19.1046 18 20 17.1046 20 16V7.24162C20 6.7034 19.7831 6.18789 19.3982 5.81161L16.1566 2.62007C15.7699 2.24169 15.2431 2.02632 14.6934 2.02632H10C8.89543 2.02632 8 2.92175 8 4.02632V4Z"
//                                         stroke="currentColor"
//                                         strokeWidth="1.5"
//                                       />
//                                       <path
//                                         d="M16 18V20C16 21.1046 15.1046 22 14 22H6C4.89543 22 4 21.1046 4 20V9C4 7.89543 4.89543 7 6 7H8"
//                                         stroke="currentColor"
//                                         strokeWidth="1.5"
//                                       />
//                                     </svg>
//                                   )}
//                                 </button>
//                               </div>
//                             ))}
//                           </div>
//                         </div>
//                       </div>
//                     </div>
//                   </div>
//                 )}
//               </React.Fragment>
//             );
//           })}

//           {awaitingResponse ? (
//             <div className="message message-agent">
//               <div className="message-content typing-indicator">
//                 <div className="typing-dots">
//                   {logoUrl && (
//                     <img
//                       src={logoUrl}
//                       alt="Webmap"
//                       style={{
//                         width: "18px",
//                         height: "18px",
//                         borderRadius: "50%",
//                         marginRight: "6px",
//                         verticalAlign: "middle",
//                       }}
//                     />
//                   )}
//                   <span className="typing-text">
//                     {messages.length === 0 ? (
//                       "Loading overview of this page..."
//                     ) : (
//                       <>
//                         Webmap is&nbsp;
//                         <span className="typing-text-scramble">
//                           {scrambledWord}
//                         </span>
//                       </>
//                     )}
//                   </span>
//                   {messages.length > 0 && (
//                     <div className="dots">
//                       <div className="dot"></div>
//                       <div className="dot"></div>
//                       <div className="dot"></div>
//                     </div>
//                   )}
//                 </div>
//               </div>
//             </div>
//           ) : null}
//         </div>

//         <button
//           type="button"
//           className={`scroll-to-bottom${showScrollButton ? " visible" : ""}`}
//           aria-label="Scroll to latest message"
//           onClick={handleScrollButtonClick}
//         >
//           <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
//             <path
//               d="M10 3.5a.75.75 0 0 1 .75.75v8.19l3.22-3.22a.75.75 0 0 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V4.25A.75.75 0 0 1 10 3.5Z"
//               fill="currentColor"
//             />
//           </svg>
//         </button>
//       </div>
//     </>
//   );
// }



import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChatSuggestionStrip } from "./ChatSuggestionStrip.jsx";
import { scrambleText, TYPING_WORDS } from "../../../utils/textScramble.js";

// Custom hook for scrambling text with random word selection
function useScrambleTypingText(words, interval = 3000) {
  const [currentWord, setCurrentWord] = useState(words[0]);
  const [displayWord, setDisplayWord] = useState(words[0]);
  const lastWordRef = useRef(words[0]);
  const isScrambling = useRef(false);

  useEffect(() => {
    const cycleWords = async () => {
      if (isScrambling.current || words.length === 0) return;

      isScrambling.current = true;

      // Get a random word that's different from the current one
      let newWord;
      do {
        const randomIndex = Math.floor(Math.random() * words.length);
        newWord = words[randomIndex];
      } while (newWord === lastWordRef.current && words.length > 1);

      const oldWord = lastWordRef.current;

      await scrambleText({
        oldText: oldWord,
        newText: newWord,
        onUpdate: (text) => setDisplayWord(text),
        duration: 600,
      });

      setCurrentWord(newWord);
      lastWordRef.current = newWord;
      isScrambling.current = false;
    };

    const timer = setInterval(cycleWords, interval);
    return () => clearInterval(timer);
  }, [words, interval]);

  return displayWord;
}

function extractPlainText(html) {
  if (!html) {
    return "";
  }
  if (typeof document === "undefined") {
    return html;
  }
  const temp = document.createElement("div");
  temp.innerHTML = html;
  return temp.textContent ?? temp.innerText ?? html;
}

async function copyToClipboard(text) {
  if (!text) {
    return false;
  }
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    console.warn("Clipboard API copy failed", error);
  }

  if (typeof document === "undefined") {
    return false;
  }

  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "readonly");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  } catch (error) {
    console.warn("Fallback copy failed", error);
    return false;
  }
}

function CopyIcon() {
  return (
    <svg
      width="20"
      height="18"
      viewBox="0 0 20 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
      <g
        id="SVGRepo_tracerCarrier"
        strokeLinecap="round"
        strokeLinejoin="round"
      ></g>
      <g id="SVGRepo_iconCarrier">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M7 1.75C7 0.783502 7.7835 0 8.75 0H17.25C18.2165 0 19 0.783502 19 1.75V12.25C19 13.2165 18.2165 14 17.25 14H16V15.75C16 16.7165 15.2165 17.5 14.25 17.5H2.75C1.7835 17.5 1 16.7165 1 15.75V6.25C1 5.2835 1.7835 4.5 2.75 4.5H4.5V1.75C4.5 0.783502 5.2835 0 6.25 0H7ZM7 4.5H14.25C15.2165 4.5 16 5.2835 16 6.25V12.5H17.25C17.3881 12.5 17.5 12.3881 17.5 12.25V1.75C17.5 1.61193 17.3881 1.5 17.25 1.5H8.75C8.61193 1.5 8.5 1.61193 8.5 1.75V4.5H7ZM2.75 6C2.61193 6 2.5 6.11193 2.5 6.25V15.75C2.5 15.8881 2.61193 16 2.75 16H14.25C14.3881 16 14.5 15.8881 14.5 15.75V6.25C14.5 6.11193 14.3881 6 14.25 6H2.75Z"
          fill="currentColor"
        ></path>
      </g>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
      width="10"
      height="10"
    >
      <path
        d="M16.53 6.28a.75.75 0 0 0-1.06-1.06L8.25 12.44 5.53 9.72a.75.75 0 1 0-1.06 1.06l3.25 3.25a.75.75 0 0 0 1.06 0l7.75-7.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function ChatMessageList({
  messages,
  awaitingResponse,
  onSuggestionSelect,
  logoUrl,
  onLearnMore,
  onSelection,
}) {
  const listRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);
  const copyResetTimerRef = useRef(null);
  const hasAutoScrolledRef = useRef(false);
  const suggestionClickPendingRef = useRef(false);
  const isPinnedToBottomRef = useRef(true);
  const scrollRafRef = useRef(null);
  const suggestionsPanelId = useMemo(
    () => `suggested-prompts-${Math.random().toString(36).slice(2, 9)}`,
    [],
  );

  // Track which suggestion accordion is open (by message index)
  const [openSuggestionIndex, setOpenSuggestionIndex] = useState(null);

  // Scrambling word for typing indicator
  const scrambledWord = useScrambleTypingText(TYPING_WORDS, 3000);

  const resolveScrollContainer = useCallback(() => {
    if (scrollContainerRef.current) {
      return scrollContainerRef.current;
    }
    // Look for the chat-message-container which is the actual scrollable element
    let node = listRef.current?.closest(".chat-message-container");
    // Fallback to agent-container or parent elements
    if (!node) node = listRef.current?.closest(".agent-container");
    if (!node) node = listRef.current?.closest(".wm-chat-sidebar__body");
    if (!node) node = listRef.current?.parentElement ?? null;
    if (!node) node = listRef.current ?? null;
    if (node) {
      scrollContainerRef.current = node;
    }
    return scrollContainerRef.current;
  }, []);

  const scrollPromptListToEnd = useCallback(() => {
    try {
      const root = listRef.current;
      const list = root?.querySelector(
        ".suggested-prompt .accordion-body.open .prompt-list",
      );
      if (!list) {
        return;
      }
      if (typeof list.scrollTo === "function") {
        list.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
      } else {
        list.scrollTop = list.scrollHeight;
      }
    } catch {}
  }, []);

  const updateScrollIndicator = useCallback(() => {
    const container = resolveScrollContainer();
    if (!container) {
      return;
    }
    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    // Show button when scrolled up more than 100px from bottom
    setShowScrollButton(distanceFromBottom > 100);
    isPinnedToBottomRef.current = distanceFromBottom <= 120;
  }, [resolveScrollContainer]);

  const scrollToBottom = useCallback(
    (behavior = "smooth") => {
      const container = resolveScrollContainer();
      if (!container) {
        return;
      }
      container.scrollTo({
        top: container.scrollHeight,
        behavior,
      });
      if (typeof window !== "undefined" && window.requestAnimationFrame) {
        window.requestAnimationFrame(updateScrollIndicator);
      } else {
        updateScrollIndicator();
      }
    },
    [resolveScrollContainer, updateScrollIndicator],
  );

  const scheduleAutoScroll = useCallback(
    (behavior) => {
      if (!isPinnedToBottomRef.current) {
        return;
      }
      if (scrollRafRef.current) {
        return;
      }
      if (typeof window !== "undefined" && window.requestAnimationFrame) {
        scrollRafRef.current = window.requestAnimationFrame(() => {
          scrollRafRef.current = null;
          scrollToBottom(behavior);
        });
      } else {
        scrollToBottom(behavior);
      }
    },
    [scrollToBottom],
  );

  useEffect(() => {
    const container = resolveScrollContainer();
    if (!container) {
      return undefined;
    }

    const handleScroll = () => {
      updateScrollIndicator();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    updateScrollIndicator();

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [resolveScrollContainer, updateScrollIndicator]);

  const latestMessageKey = messages.length
    ? (messages[messages.length - 1].id ?? `message-${messages.length - 1}`)
    : null;

  useEffect(() => {
    if (!messages.length && !awaitingResponse) {
      return;
    }
    // First scroll - delay to ensure container is properly rendered
    if (!hasAutoScrolledRef.current) {
      const timeoutId = setTimeout(() => {
        scheduleAutoScroll("auto");
        hasAutoScrolledRef.current = true;
      }, 100);
      return () => clearTimeout(timeoutId);
    }

    // While streaming, use instant scroll to prevent jitter from repeated smooth scrolls
    const behavior = awaitingResponse ? "auto" : "smooth";
    scheduleAutoScroll(behavior);
  }, [latestMessageKey, awaitingResponse, messages, scheduleAutoScroll]);

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current) {
        clearTimeout(copyResetTimerRef.current);
      }
      if (scrollRafRef.current && typeof window !== "undefined") {
        window.cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(async (message, messageKey) => {
    const plainText = extractPlainText(message?.text ?? "");
    if (!plainText) {
      return;
    }
    const ok = await copyToClipboard(plainText);
    if (!ok) {
      return;
    }
    setCopiedMessageId(messageKey);
    if (copyResetTimerRef.current) {
      clearTimeout(copyResetTimerRef.current);
    }
    copyResetTimerRef.current = setTimeout(() => {
      setCopiedMessageId(null);
      copyResetTimerRef.current = null;
    }, 2000);
  }, []);

  const handleScrollButtonClick = useCallback(() => {
    scrollToBottom("smooth");
  }, [scrollToBottom]);

  const [copiedPromptIndex, setCopiedPromptIndex] = useState(null);

  const handleCopyPrompt = useCallback((e, suggestion, index) => {
    e.stopPropagation();
    navigator.clipboard.writeText(suggestion).then(() => {
      setCopiedPromptIndex(index);
      setTimeout(() => setCopiedPromptIndex(null), 2000);
    });
  }, []);

  const handleToggleSuggestions = useCallback((messageIndex) => {
    setOpenSuggestionIndex((prev) =>
      prev === messageIndex ? null : messageIndex,
    );
  }, []);

  // Scroll to bottom only when the LAST suggestion accordion is opened
  useEffect(() => {
    if (openSuggestionIndex !== null) {
      // Find the index of the last message with suggestions
      let lastSuggestionIndex = -1;
      for (let i = messages.length - 1; i >= 0; i--) {
        if (
          messages[i].role === "assistant" &&
          messages[i].suggestions?.length > 0
        ) {
          lastSuggestionIndex = i;
          break;
        }
      }

      // Only scroll if this is the last suggestion accordion
      if (openSuggestionIndex === lastSuggestionIndex) {
        // When expanding suggestions, scroll to bottom to show the suggestions
        const doScrolls = () => {
          // First scroll to bottom immediately
          scrollToBottom("smooth");
          // Wait for accordion animation to complete, then scroll again to ensure full visibility
          setTimeout(() => {
            scrollToBottom("smooth");
          }, 450);
        };
        if (typeof window !== "undefined" && window.requestAnimationFrame) {
          window.requestAnimationFrame(doScrolls);
        } else {
          doScrolls();
        }
      }
    }
  }, [openSuggestionIndex, scrollToBottom, messages]);

  const handleSuggestionToggleKeyDown = useCallback(
    (event, messageIndex) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleToggleSuggestions(messageIndex);
      }
    },
    [handleToggleSuggestions],
  );

  const handleSuggestionClick = useCallback(
    (suggestion) => {
      suggestionClickPendingRef.current = true;
      onSuggestionSelect?.(suggestion);
    },
    [onSuggestionSelect],
  );

  const handleContentClick = useCallback(async (event) => {
    // Per-code-block copy via event delegation
    const target = event.target;
    if (!target || typeof target.closest !== "function") return;
    const copyBtn = target.closest(".wm-codeblock__copy, .copy-btn");
    if (!copyBtn) return;
    // If it's a code copy button, copy the content of the nearest code block
    if (copyBtn.classList.contains("wm-codeblock__copy")) {
      event.preventDefault();
      const wrapper =
        copyBtn.closest(".wm-codeblock") || copyBtn.closest(".message-content");
      const codeEl = wrapper?.querySelector("pre > code");
      const raw = codeEl?.textContent || "";
      if (!raw.trim()) return;
      const ok = await copyToClipboard(raw);
      if (!ok) return;

      // Update button state + provide feedback
      if (copyBtn._wmResetTimer) {
        clearTimeout(copyBtn._wmResetTimer);
      }
      copyBtn.classList.add("is-copied");
      copyBtn.setAttribute("aria-label", "Code copied");
      copyBtn.setAttribute("title", "Code copied");

      copyBtn._wmResetTimer = setTimeout(() => {
        copyBtn.classList.remove("is-copied");
        copyBtn.setAttribute("aria-label", "Copy code");
        copyBtn.setAttribute("title", "Copy code");
        delete copyBtn._wmResetTimer;
      }, 2000);
      return;
    }
    // Otherwise per-message copy is handled by onClick on its own button
  }, []);

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleMouseUp = useCallback(() => {
    const node = listRef.current;
    if (!node) return;

    // Support Shadow DOM selection
    const rootNode = node.getRootNode();
    const sel =
      rootNode && rootNode.getSelection
        ? rootNode.getSelection()
        : window.getSelection();
    const text = sel.toString().trim();

    if (!text || !sel.rangeCount) {
      onSelection?.(null);
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Calculate coordinates relative to the sidebar (containing block)
    const sidebar = node.closest(".wm-chat-sidebar");
    const sidebarRect = sidebar
      ? sidebar.getBoundingClientRect()
      : { top: 0, left: 0 };

    onSelection?.({
      text,
      rect: {
        top: rect.top - sidebarRect.top,
        left: rect.left - sidebarRect.left + rect.width / 2,
      },
    });
  }, [onSelection]);

  return (
    <>
      <div
        className="chat-message-container"
        ref={listRef}
        onMouseUp={handleMouseUp}
        style={{ position: "relative" }}
      >
        <div className="chat-messages">
          {messages.map((message, index) => {
            const messageKey = message.id ?? `message-${index}`;
            const isAssistant = message.role === "assistant";
            const messageClass = isAssistant ? "message-agent" : "message-user";
            const messageSuggestions = message.suggestions || [];
            const hasSuggestions = isAssistant && messageSuggestions.length > 0;

            return (
              <React.Fragment key={messageKey}>
                <div className={`message ${messageClass}`}>
                  {message.timestamp && (
                    <span className="response-time">
                      {formatTime(message.timestamp)}
                    </span>
                  )}
                  <div className="message-content">
                    <div
                      onClick={handleContentClick}
                      dangerouslySetInnerHTML={{ __html: message.text }}
                    />
                    {isAssistant && (
                      <div className="message-actions">
                        <button
                          type="button"
                          className={`copy-btn${
                            copiedMessageId === messageKey ? " is-copied" : ""
                          }`}
                          aria-label={
                            copiedMessageId === messageKey
                              ? "Response copied"
                              : "Copy response"
                          }
                          title={
                            copiedMessageId === messageKey
                              ? "Response copied"
                              : "Copy response"
                          }
                          onClick={() => handleCopy(message, messageKey)}
                        >
                          {copiedMessageId === messageKey ? (
                            <CheckIcon />
                          ) : (
                            <CopyIcon />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Suggested Prompts for this message */}
                {hasSuggestions && (
                  <div className="message message-agent">
                    <div className="suggested-prompt">
                      <div className="reference-accordion">
                        <div
                          className={`accordion-header${
                            openSuggestionIndex === index ? " active" : ""
                          }`}
                          onClick={() => handleToggleSuggestions(index)}
                          onKeyDown={(e) =>
                            handleSuggestionToggleKeyDown(e, index)
                          }
                          role="button"
                          tabIndex={0}
                          aria-expanded={openSuggestionIndex === index}
                          aria-controls={`${suggestionsPanelId}-${index}`}
                        >
                          <h4 className="heading">Suggested prompts</h4>
                          <span className="icon" aria-hidden="true">
                            {openSuggestionIndex === index ? (
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M6.343 15.657a1 1 0 0 0 1.414 0L12 11.414l4.243 4.243a1 1 0 0 0 1.414-1.414l-4.95-4.95a1.5 1.5 0 0 0-2.121 0l-4.95 4.95a1 1 0 0 0 0 1.414Z"
                                  fill="#5D5FEF"
                                />
                              </svg>
                            ) : (
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <path
                                  d="M17.657 8.343a1 1 0 0 0-1.414 0L12 12.586 7.757 8.343A1 1 0 0 0 6.343 9.757l4.95 4.95a1.5 1.5 0 0 0 2.121 0l4.95-4.95a1 1 0 0 0 0-1.414Z"
                                  fill="#5D5FEF"
                                />
                              </svg>
                            )}
                          </span>
                        </div>
                        <div
                          className={`accordion-body${
                            openSuggestionIndex === index ? " open" : ""
                          }`}
                          id={`${suggestionsPanelId}-${index}`}
                        >
                          <div className="prompt-list">
                            {messageSuggestions.map((suggestion, suggIdx) => (
                              <div
                                key={`suggestion-${index}-${suggIdx}`}
                                className="prompt-item"
                                onClick={() =>
                                  handleSuggestionClick(suggestion)
                                }
                              >
                                <p>{suggestion}</p>
                                <button
                                  className={`copy-chat${
                                    copiedPromptIndex === `${index}-${suggIdx}`
                                      ? " is-copied"
                                      : ""
                                  }`}
                                  onClick={(e) =>
                                    handleCopyPrompt(
                                      e,
                                      suggestion,
                                      `${index}-${suggIdx}`,
                                    )
                                  }
                                  aria-label={
                                    copiedPromptIndex === `${index}-${suggIdx}`
                                      ? "Copied!"
                                      : "Copy prompt"
                                  }
                                  type="button"
                                >
                                  {copiedPromptIndex ===
                                  `${index}-${suggIdx}` ? (
                                    <svg
                                      width="10"
                                      height="10"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        d="M20 6L9 17L4 12"
                                        stroke="currentColor"
                                        strokeWidth="3"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                      />
                                    </svg>
                                  ) : (
                                    <svg
                                      width="10"
                                      height="10"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      xmlns="http://www.w3.org/2000/svg"
                                    >
                                      <path
                                        d="M8 4V16C8 17.1046 8.89543 18 10 18H18C19.1046 18 20 17.1046 20 16V7.24162C20 6.7034 19.7831 6.18789 19.3982 5.81161L16.1566 2.62007C15.7699 2.24169 15.2431 2.02632 14.6934 2.02632H10C8.89543 2.02632 8 2.92175 8 4.02632V4Z"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                      />
                                      <path
                                        d="M16 18V20C16 21.1046 15.1046 22 14 22H6C4.89543 22 4 21.1046 4 20V9C4 7.89543 4.89543 7 6 7H8"
                                        stroke="currentColor"
                                        strokeWidth="1.5"
                                      />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {awaitingResponse ? (
            <div className="message message-agent">
              <div className="message-content typing-indicator">
                <div className="typing-dots">
                  {logoUrl && (
                    <img
                      src={logoUrl}
                      alt="Webmap"
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "50%",
                        marginRight: "6px",
                        verticalAlign: "middle",
                      }}
                    />
                  )}
                  <span className="typing-text">
                    {messages.length === 0 ? (
                      "Loading overview of this page..."
                    ) : (
                      <>
                        Webmap is&nbsp;
                        <span className="typing-text-scramble">
                          {scrambledWord}
                        </span>
                      </>
                    )}
                  </span>
                  {messages.length > 0 && (
                    <div className="dots">
                      <div className="dot"></div>
                      <div className="dot"></div>
                      <div className="dot"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          className={`scroll-to-bottom${showScrollButton ? " visible" : ""}`}
          aria-label="Scroll to latest message"
          onClick={handleScrollButtonClick}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false">
            <path
              d="M10 3.5a.75.75 0 0 1 .75.75v8.19l3.22-3.22a.75.75 0 0 1 1.06 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0l-4.5-4.5a.75.75 0 1 1 1.06-1.06l3.22 3.22V4.25A.75.75 0 0 1 10 3.5Z"
              fill="currentColor"
            />
          </svg>
        </button>
      </div>
    </>
  );
}
