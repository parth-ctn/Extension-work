// // import { useCallback, useEffect, useMemo, useState } from "react";
// // import { CHAT_EMPTY_STATE, CHAT_HEADER_TEXT } from "../../../constants/chat.js";
// // import { ChatPanelHeader } from "./ChatPanelHeader.jsx";
// // import { ChatPanelBody } from "./ChatPanelBody.jsx";
// // import { ChatPanelFooter } from "./ChatPanelFooter.jsx";
// // import { ChatProgress } from "./ChatProgress.jsx";
// // import { ChatErrorState } from "./ChatErrorState.jsx";
// // import { ChatEmptyState } from "./ChatEmptyState.jsx";
// // import { ChatMessageList } from "./ChatMessageList.jsx";
// // // Start screen now shows a Knowledge Base list for reuse
// // import { KbList } from "./KbList.jsx";
// // import { SessionMenu } from "./SessionMenu.jsx";
// // import { ViewAllSheet } from "./ViewAllSheet.jsx";

// // export function ChatPanel({
// //   logoUrl,
// //   isOpen,
// //   user,
// //   accessToken,
// //   refreshToken,
// //   onClose,
// //   state,
// //   htmlPreference,
// //   isHtmlPreferenceLoading,
// //   isHtmlPreferenceSaving,
// //   onToggleHtmlPreference,
// //   startKnowledgeChat,
// //   startExistingKbChat,
// //   sendMessage,
// //   createNewChat,
// //   switchSession,
// //   resetWorkflow,
// // }) {
// //   const currentUrl = useMemo(() => {
// //     if (typeof window === "undefined") {
// //       return "";
// //     }
// //     return window.location.href;
// //   }, []);

// //   const defaultTitle = useMemo(() => {
// //     if (typeof document !== "undefined" && document.title) {
// //       return document.title.slice(0, 80);
// //     }
// //     try {
// //       return new URL(currentUrl).hostname;
// //     } catch {
// //       return "Current page";
// //     }
// //   }, [currentUrl]);

// //   const [messageInput, setMessageInput] = useState("");
// //   const [kbComparison, setKbComparison] = useState("pending"); // none|same|changed|pending
// //   const [showSuggestions, setShowSuggestions] = useState(false);
// //   const [isExpanded, setIsExpanded] = useState(false);
// //   const [isSessionMenuOpen, setIsSessionMenuOpen] = useState(false);
// //   const [isInitialLoad, setIsInitialLoad] = useState(true);
// //   const [attachedImage, setAttachedImage] = useState(null);
// //   const [viewAll, setViewAll] = useState({
// //     open: false,
// //     type: null,
// //     items: [],
// //   });

// //   const hasSuggestions = Boolean(state.chat?.suggestions?.length);
// //   const canShowHeaderControls =
// //     state.status !== "idle" ||
// //     kbComparison === "same" ||
// //     kbComparison === "changed";
// //   const knowledgeBatchId = state?.context?.knowledgeBatchId || null;
// //   // Allow opening sessions whenever chat controls are shown (chat is active)
// //   // Also don't show sessions during processing/running state
// //   const canOpenSessions = canShowHeaderControls && state.status !== "running";

// //   const startChat = useCallback(() => {
// //     const normalizedTitle = defaultTitle?.trim() || "Current page";
// //     startKnowledgeChat({ title: normalizedTitle, note: "", url: currentUrl });
// //   }, [startKnowledgeChat, defaultTitle, currentUrl]);

// //   const toggleSuggestions = useCallback(() => {
// //     setShowSuggestions((value) => !value);
// //   }, []);

// //   const toggleExpanded = useCallback(() => {
// //     setIsExpanded((value) => !value);
// //   }, []);

// //   const openSessions = useCallback(() => {
// //     if (canOpenSessions) setIsSessionMenuOpen(true);
// //   }, [canOpenSessions]);

// //   const openViewAll = useCallback((payload) => {
// //     const { type, items } = payload || {};
// //     // Open the View All sheet first
// //     setViewAll({
// //       open: true,
// //       type: type || null,
// //       items: Array.isArray(items) ? items : [],
// //     });
// //     // Close the side menu once the sheet is opening
// //     setIsSessionMenuOpen(false);
// //   }, []);

// //   const closeViewAll = useCallback(
// //     () => setViewAll({ open: false, type: null, items: [] }),
// //     []
// //   );

// //   useEffect(() => {
// //     if (!isOpen) {
// //       setMessageInput("");
// //       setShowSuggestions(false);
// //       setIsExpanded(false);
// //       setIsSessionMenuOpen(false);
// //       // Reset initial load flag when closing
// //       setIsInitialLoad(true);
// //       return;
// //     }
// //     // Mark as no longer initial load immediately to prevent layout glitch
// //     if (isOpen && isInitialLoad) {
// //       // Use requestAnimationFrame to update after the open transition starts
// //       // This prevents the delay-induced layout shift while still preventing content flash
// //       if (typeof window !== "undefined" && window.requestAnimationFrame) {
// //         window.requestAnimationFrame(() => {
// //           window.requestAnimationFrame(() => setIsInitialLoad(false));
// //         });
// //       } else {
// //         setIsInitialLoad(false);
// //       }
// //     }
// //   }, [isOpen, isInitialLoad, state.status]);

// //   useEffect(() => {
// //     if (state.status === "error") {
// //       setShowSuggestions(false);
// //     }
// //   }, [state.status]);

// //   useEffect(() => {
// //     if (!hasSuggestions) {
// //       setShowSuggestions(false);
// //     }
// //   }, [hasSuggestions]);

// //   useEffect(() => {
// //     setIsSessionMenuOpen(false);
// //   }, [state.status]);

// //   const handleRetry = () => {
// //     resetWorkflow();
// //     setMessageInput("");
// //     setShowSuggestions(false);
// //   };

// //   const handleStartOver = () => {
// //     resetWorkflow();
// //     setMessageInput("");
// //     setShowSuggestions(false);
// //   };

// //   // Allow typing when awaitingResponse, but block sending
// //   const canSend =
// //     state.status === "ready" &&
// //     state.chat.ready &&
// //     !state.chat.connecting &&
// //     !state.chat.awaitingResponse;

// //   const handleSend = (event) => {
// //     event.preventDefault();
// //     if (!canSend) return;
// //     const trimmed = messageInput.trim();
// //     if (!trimmed && !attachedImage) return;

// //     let finalMessage = trimmed;
// //     if (attachedImage) {
// //       if (finalMessage) {
// //         finalMessage += `\n\n![Attached Image](${attachedImage})`;
// //       } else {
// //         finalMessage = `![Attached Image](${attachedImage})`;
// //       }
// //     }

// //     sendMessage(finalMessage);
// //     setMessageInput("");
// //     setAttachedImage(null);
// //   };

// //   const handleInputKeyDown = (event) => {
// //     if (event.key === "Enter" && !event.shiftKey) {
// //       // While assistant is typing, block submit via Enter
// //       if (state.chat.awaitingResponse) {
// //         event.preventDefault();
// //         return;
// //       }
// //       event.preventDefault();
// //       handleSend(event);
// //     }
// //   };

// //   const handleSuggestion = (suggestion) => {
// //     // Keep suggestions visible and jump to latest after sending
// //     sendMessage(suggestion, { mode: "suggested" });
// //     // Do not hide suggestions on click so the user can see and reuse them
// //   };

// //   const headerSubtitle = useMemo(() => {
// //     if (state.status === "ready") {
// //       if (!state.chat.ready) {
// //         return state.chat.connecting
// //           ? CHAT_HEADER_TEXT.connecting
// //           : CHAT_HEADER_TEXT.preparing;
// //       }
// //       return CHAT_HEADER_TEXT.ready;
// //     }
// //     if (state.status === "running") {
// //       return CHAT_HEADER_TEXT.running;
// //     }
// //     if (state.status === "error") {
// //       return CHAT_HEADER_TEXT.error;
// //     }
// //     return CHAT_HEADER_TEXT.idle;
// //   }, [state]);

// //   let bodyContent = null;

// //   // Prevent flash of old content on initial load/refresh
// //   if (isInitialLoad && isOpen) {
// //     bodyContent = null;
// //   } else if (state.status === "running") {
// //     bodyContent = (
// //       <ChatProgress
// //         steps={state.steps}
// //         knowledgeSummary={state.knowledgeSummary}
// //         isRunning
// //         onCancel={resetWorkflow}
// //       />
// //     );
// //   } else if (state.status === "error") {
// //     bodyContent = (
// //       <>
// //         <ChatErrorState
// //           message={state.error?.message}
// //           onRetry={handleRetry}
// //           actionLabel={state.error?.actionLabel}
// //         />
// //         <ChatProgress
// //           steps={state.steps}
// //           knowledgeSummary={state.knowledgeSummary}
// //           isRunning={false}
// //           onCancel={resetWorkflow}
// //         />
// //       </>
// //     );
// //   } else if (state.status === "ready") {
// //     // Skip loader screen when entering chat via an existing KB.
// //     if (!state.chat.messages.length && !state.chat.awaitingResponse) {
// //       bodyContent = (
// //         <ChatEmptyState description={CHAT_EMPTY_STATE.readyDescription} />
// //       );
// //     } else {
// //       bodyContent = (
// //         <ChatMessageList
// //           messages={state.chat.messages}
// //           awaitingResponse={state.chat.awaitingResponse}
// //           suggestions={state.chat.suggestions}
// //           showSuggestions={showSuggestions}
// //           onToggleSuggestions={toggleSuggestions}
// //           onSuggestionSelect={handleSuggestion}
// //           logoUrl={logoUrl}
// //         />
// //       );
// //     }
// //   } else {
// //     bodyContent = (
// //       <>
// //         <KbList
// //           user={user}
// //           userName={user?.username}
// //           userUuid={user?.uuid}
// //           accessToken={accessToken}
// //           refreshToken={refreshToken}
// //           onCreateNewKb={startChat}
// //           onSelectKb={(kb) =>
// //             startExistingKbChat?.({ batchId: kb.batch_id, title: kb.title })
// //           }
// //           onCompared={setKbComparison}
// //         />
// //       </>
// //     );
// //   }

// //   const panelClassNames = [
// //     "wm-chat-sidebar",
// //     isOpen ? "wm-chat-sidebar--open" : "",
// //     isExpanded ? "wm-chat-sidebar--expanded" : "",
// //     isInitialLoad ? "wm-chat-sidebar--initializing" : "",
// //   ]
// //     .filter(Boolean)
// //     .join(" ");

// //   if (isExpanded) {
// //     return (
// //       <section
// //         id="wm-chat-panel"
// //         className={panelClassNames}
// //         aria-hidden={!isOpen}
// //       >
// //         <main className="expended-view-container">
// //           <SessionMenu
// //             knowledgeBatchId={knowledgeBatchId}
// //             userUuid={user?.uuid}
// //             user={user}
// //             userName={user?.username}
// //             isOpen={!viewAll.open}
// //             isExpanded={true}
// //             showThreads={state.status === "ready"}
// //             onClose={() => setIsSessionMenuOpen(false)}
// //             onCreateNew={() => {
// //               setIsSessionMenuOpen(false);
// //               createNewChat?.();
// //             }}
// //             onStartNewKb={() => {
// //               setIsSessionMenuOpen(false);
// //               startChat();
// //             }}
// //             onSelectSession={(s) => {
// //               setIsSessionMenuOpen(false);
// //               switchSession?.(s);
// //             }}
// //             onOpenKb={({ batchId, title }) => {
// //               setIsSessionMenuOpen(false);
// //               startExistingKbChat?.({ batchId, title });
// //             }}
// //             onViewAll={openViewAll}
// //           />

// //           <div className="chat-main-container">
// //             <ChatPanelHeader
// //               logoUrl={logoUrl}
// //               chatTitle={
// //                 state.status === "ready" ||
// //                 state.status === "running" ||
// //                 state.status === "error"
// //                   ? state.chat?.chatTitle || "New Chat"
// //                   : "Webmap Network"
// //               }
// //               subtitle={headerSubtitle}
// //               onClose={onClose}
// //               showControls={canShowHeaderControls}
// //               onRestart={state.status === "idle" ? startChat : handleStartOver}
// //               hasSuggestions={hasSuggestions}
// //               showSuggestions={showSuggestions}
// //               onToggleSuggestions={toggleSuggestions}
// //               isExpanded={isExpanded}
// //               onToggleExpand={toggleExpanded}
// //               canOpenSessions={canOpenSessions}
// //               onOpenSessions={openSessions}
// //               isHome={
// //                 state.status !== "ready" &&
// //                 state.status !== "running" &&
// //                 state.status !== "error"
// //               }
// //             />
// //             <div className="agent-container">{bodyContent}</div>
// //             <div className="section-footer">
// //               <ChatPanelFooter
// //                 status={state.status}
// //                 chat={state.chat}
// //                 message={messageInput}
// //                 onMessageChange={(event) => setMessageInput(event.target.value)}
// //                 onSubmit={handleSend}
// //                 onKeyDown={handleInputKeyDown}
// //                 canSend={canSend}
// //                 attachedImage={attachedImage}
// //                 setAttachedImage={setAttachedImage}
// //               />
// //               <div className="copy-right">
// //                 <p>Powered by.</p>
// //                 <svg
// //                   width="70"
// //                   height="18"
// //                   viewBox="0 0 70 18"
// //                   fill="none"
// //                   xmlns="http://www.w3.org/2000/svg"
// //                 >
// //                   <g clipPath="url(#clip0_8091_33206_expanded)">
// //                     <path
// //                       d="M25.8331 5.02888C25.7384 5.02888 25.6199 5.02888 25.5251 5.02888C25.5251 5.02888 25.5251 5.02888 25.5014 5.02888C25.3829 5.02888 25.2645 5.0531 25.1697 5.10153C25.0276 5.1984 25.0038 5.31948 24.9802 5.39212L23.3453 9.55722L22.1844 6.31232C22.0422 5.92487 21.9001 5.53742 21.758 5.14996C21.6868 4.98045 21.5447 4.85938 21.3551 4.85938H21.3315C21.284 4.85938 21.213 4.85938 21.1656 4.85938C20.976 4.85938 20.8102 4.98045 20.7392 5.14996C20.3127 6.36075 19.8625 7.57153 19.436 8.78232L19.8862 9.96888C20.0046 10.3079 20.4786 10.3079 20.5969 9.96888C20.8102 9.38771 21.0234 8.80654 21.2366 8.22535L22.2554 11.0344C22.445 11.5429 22.6109 12.0272 22.8004 12.5358C22.8715 12.7053 23.0136 12.8263 23.2032 12.8263H23.2268C23.2743 12.8263 23.3217 12.8263 23.3691 12.8263H23.3927C23.5823 12.8263 23.7244 12.7295 23.7955 12.5358C24.53 10.6469 25.2645 8.75811 25.999 6.86928L26.5202 5.53742C26.5202 5.5132 26.5439 5.48899 26.5439 5.46477L26.6861 4.95624L25.8331 5.02888Z"
// //                       fill="#5D5FEF"
// //                     />
// //                     <path
// //                       d="M18.8435 8.6886C18.3933 7.55046 17.9668 6.43653 17.5167 5.2984C17.4456 5.12889 17.3035 5.00781 17.0902 5.00781C16.9718 5.00781 16.8295 5.00781 16.7112 5.00781H16.4031H16.3557C16.3321 5.00781 16.3083 5.00781 16.3083 5.00781L15.7871 5.03203L15.9766 5.51635L18.3223 11.5461C18.4408 11.8851 18.5829 12.1999 18.7014 12.5389C18.7724 12.7084 18.9146 12.8294 19.1041 12.8294H19.1278C19.1752 12.8294 19.2226 12.8294 19.2463 12.8294H19.2699C19.4595 12.8294 19.6017 12.7084 19.6728 12.5389C19.7675 12.2483 19.886 11.9819 19.9808 11.6913L18.8435 8.6886Z"
// //                       fill="#5D5FEF"
// //                     />
// //                     <path
// //                       d="M34.1968 7.79102C34.1494 7.64573 34.1257 7.50044 34.0783 7.35515C34.0547 7.2825 34.0309 7.20985 33.9836 7.11299C33.9362 6.96769 33.8651 6.84661 33.794 6.72554C33.1069 5.56318 31.8749 4.8125 30.4296 4.8125C28.2262 4.8125 26.4966 6.58024 26.4966 8.80808C26.4966 9.89779 26.8993 10.8906 27.6339 11.6656C28.3683 12.4162 29.3635 12.8278 30.4296 12.8278C31.1404 12.8278 31.8038 12.6584 32.3961 12.2951C32.4909 12.2467 32.6093 12.1499 32.7516 12.0288C33.178 11.6656 33.1543 10.9875 32.7042 10.6485L32.3013 10.3579L32.0881 10.5758C31.6616 11.0117 31.0693 11.2296 30.4533 11.2296C29.8136 11.2296 29.2212 10.9875 28.7711 10.5274C28.6526 10.4063 28.5342 10.261 28.4394 10.1157C28.4394 10.1157 28.4394 10.1157 28.4394 10.0915C28.3209 9.89779 28.2262 9.65563 28.1551 9.43769C27.7997 8.15426 28.5342 7.33093 28.5342 7.33093C28.9606 6.74976 29.6477 6.3623 30.4296 6.3623C31.4484 6.3623 32.3251 7.01612 32.6567 7.96054H29.4345C29.008 7.96054 28.6763 8.29956 28.6763 8.73544C28.6763 8.95338 28.7 9.19554 28.7711 9.43769H32.9174C33.7703 9.48612 34.41 8.63857 34.1968 7.79102Z"
// //                       fill="#5D5FEF"
// //                     />
// //                     <path
// //                       d="M36.6585 6.92762V0.812408C36.6585 0.424957 36.3505 0.0859375 35.9477 0.0859375H35.0947V0.52182V4.3479C35.0947 5.00172 35.0947 8.18684 35.0947 8.84066C35.4027 8.33213 35.8293 7.94469 36.2557 7.67831C36.5164 7.5088 36.6585 7.24242 36.6585 6.92762Z"
// //                       fill="#5D5FEF"
// //                     />
// //                     <path
// //                       d="M42.7475 8.17382C42.558 7.05989 41.9894 6.18813 41.0653 5.58274C40.4257 5.17107 39.7385 4.95312 38.9803 4.95312C38.7197 4.95312 38.4354 4.97735 38.1511 5.04999C38.1511 5.04999 35.1184 5.72804 35.0947 8.65813C35.0947 8.70656 35.0947 8.75499 35.0947 8.80343C35.0947 9.09401 35.1184 9.36038 35.1657 9.57833C35.3553 10.6922 35.9239 11.564 36.8242 12.1694C37.464 12.6052 38.1747 12.8232 38.9093 12.8232C39.1461 12.8232 39.3831 12.799 39.6437 12.7506C40.7336 12.5568 41.5866 11.9757 42.1789 11.0555C42.7475 10.1837 42.9371 9.21509 42.7475 8.17382ZM38.9803 11.2492C37.6773 11.2492 36.6821 10.2079 36.6821 8.87607C36.6821 7.5442 37.7009 6.50294 38.9803 6.50294C39.5964 6.50294 40.1887 6.74509 40.6151 7.18097C41.0416 7.61685 41.2786 8.22224 41.2786 8.87607C41.2786 10.2079 40.2598 11.2492 38.9803 11.2492Z"
// //                       fill="#5D5FEF"
// //                     />
// //                     <path
// //                       d="M48.5509 6.60073C48.7405 6.18907 48.845 6.04903 49.0582 5.78265C48.3058 5.15607 47.5268 4.93275 46.9107 4.90853C46.2948 4.88431 45.7261 5.05383 45.2522 5.39284V5.05383H44.4467C44.0439 5.05383 43.6885 5.39284 43.6885 5.82873V12.0037C43.6885 12.4154 44.0202 12.7786 44.4467 12.7786H45.2522V11.2288C45.2522 10.2844 45.2522 9.34 45.2522 8.4198C45.2522 8.00814 45.3233 7.66911 45.4655 7.35431C45.7261 6.82156 46.0815 6.5552 46.6027 6.48255C46.6501 6.48255 46.6975 6.48255 46.7212 6.48255C46.9107 6.48255 47.5813 6.43772 48.3197 7.02158C48.5567 7.14266 48.4562 6.81868 48.5509 6.60073Z"
// //                       fill="#5D5FEF"
// //                     />
// //                     <path
// //                       d="M53.6635 7.78771C53.6635 7.4729 53.6397 7.20654 53.5687 6.94016C53.3555 6.14104 52.9053 5.55987 52.2182 5.19663C51.6732 4.90605 51.0809 4.8334 50.4412 4.95447C50.3227 4.97869 50.1806 5.0029 50.0621 5.05133C49.1617 5.36614 47.8823 6.31056 47.8823 9.26487C47.8823 9.89447 47.8823 10.5241 47.8823 11.1779V12.0255C47.8823 12.4371 48.214 12.8004 48.6405 12.8004H49.4461V11.2506C49.4461 10.3061 49.4461 9.36173 49.4461 8.44153C49.4461 8.02987 49.5172 7.69085 49.6593 7.40025C49.9199 6.86751 50.2754 6.57692 50.7966 6.52849C50.8439 6.52849 50.8913 6.52849 50.9151 6.52849C51.3415 6.52849 51.7443 6.79486 51.9339 7.20654C52.0286 7.40025 52.0523 7.6182 52.0523 7.88457C52.0523 8.99849 52.0523 10.0882 52.0523 11.2021V12.0497C52.0523 12.4613 52.3841 12.8245 52.8105 12.8245H53.6161V11.2506C53.6635 10.064 53.6635 8.92584 53.6635 7.78771Z"
// //                       fill="#5D5FEF"
// //                     />
// //                     <path
// //                       d="M59.5707 9.56037V11.2555H59.3338H58.1254C57.7937 11.2555 57.4857 11.2555 57.154 11.2555C56.9882 11.2555 56.846 11.2312 56.7038 11.1586C56.3248 10.9649 56.0879 10.5774 56.0879 10.1658C56.0879 9.75408 56.3248 9.36664 56.7038 9.17291C56.846 9.12448 56.9882 9.10026 57.154 9.10026C57.4857 9.10026 57.7937 9.10026 58.1254 9.10026H58.9074H60.3762C60.7791 9.10026 61.0871 8.76125 61.0871 8.37379V6.96929C61.0871 6.92085 61.0871 6.87242 61.0871 6.84821C60.8976 5.78271 59.9972 5.00781 58.931 5.00781H57.3199C56.9171 5.00781 56.5617 5.34683 56.5617 5.78271V6.58183H58.931C59.2153 6.58183 59.4522 6.75134 59.5471 7.01772C59.5471 7.04193 59.5707 7.06615 59.5707 7.11458V7.57468H59.2864C59.0021 7.57468 58.6941 7.57468 58.4098 7.57468C57.9122 7.57468 57.4857 7.57468 57.1066 7.57468C56.4669 7.57468 55.8746 7.81684 55.4008 8.27693C54.8321 8.78545 54.5479 9.39085 54.5479 10.1415V10.1658C54.5479 10.9407 54.8321 11.5945 55.4008 12.1272C55.8746 12.5873 56.4669 12.8294 57.1066 12.8294C57.4857 12.8294 57.8885 12.8294 58.4098 12.8294C58.6704 12.8294 58.9547 12.8294 59.2153 12.8294H59.6418H61.0871V9.56037H59.5707Z"
// //                       fill="#5D5FEF"
// //                     />
// //                     <path
// //                       d="M69.8775 8.17692C69.5931 6.26389 67.982 4.85938 66.0866 4.85938C65.8971 4.85938 65.7312 4.8836 65.5416 4.9078C65.3048 4.93202 65.0915 4.98045 64.8783 5.0531C64.5228 5.17418 64.286 5.48899 64.286 5.87643V7.2083C64.7124 6.7482 65.3284 6.45762 66.0156 6.45762C66.6553 6.45762 67.2476 6.69977 67.6977 7.15987C68.1479 7.61996 68.3849 8.22535 68.3849 8.90339C68.3849 10.2595 67.3423 11.325 66.0156 11.3492C65.3759 11.3492 64.7834 11.107 64.3333 10.6469C63.8831 10.1868 63.6463 9.58144 63.6463 8.92761V5.77957V5.07732H62.9117C62.4616 5.07732 62.0825 5.46477 62.0825 5.92487V17.9116H62.817C63.2672 17.9116 63.6463 17.5242 63.6463 17.064V12.0272C64.3333 12.5842 65.1863 12.8748 66.0629 12.8748C66.8211 12.8748 67.5556 12.6568 68.1716 12.2209C69.5458 11.2765 70.1144 9.87202 69.8775 8.17692Z"
// //                       fill="#5D5FEF"
// //                     />
// //                     <path
// //                       d="M7.99028 17.8815C5.14157 10.07 6.34011 2.79115 7.29547 0.128145C4.4294 -0.138156 0 2.43608 0 7.40703C0 11.3838 2.83713 13.5615 4.25569 14.1534C3.53194 13.7686 1.9802 12.307 1.56331 9.53743C1.04221 6.07553 3.21348 4.47773 4.51624 3.85636C4.082 7.31826 4.9505 11.1352 5.6453 12.9106C6.34011 14.686 6.42696 14.8635 7.99028 17.8815Z"
// //                       fill="#5D5FEF"
// //                     />
// //                     <path
// //                       d="M7.55297 10.2153C5.95179 10.2153 4.65379 8.8887 4.65379 7.2522C4.65379 5.61571 5.95179 4.28906 7.55297 4.28906C9.15414 4.28906 10.4521 5.61571 10.4521 7.2522C10.4521 8.8887 9.15414 10.2153 7.55297 10.2153Z"
// //                       fill="#5D5FEF"
// //                     />
// //                     <path
// //                       d="M6.14424 7.39062H5.32373C5.34955 7.85101 5.50857 8.28563 5.78192 8.64777C5.93565 8.55902 6.10824 8.48293 6.29469 8.42087C6.20598 8.10407 6.15439 7.75426 6.14424 7.39062Z"
// //                       fill="white"
// //                     />
// //                     <path
// //                       d="M6.14424 7.11654C6.15439 6.75289 6.20598 6.40308 6.29469 6.08625C6.10824 6.02421 5.93566 5.94812 5.78193 5.85938C5.50857 6.22151 5.34955 6.65614 5.32373 7.11654H6.14424Z"
// //                       fill="white"
// //                     />
// //                     <path
// //                       d="M6.76264 5.60674C6.71303 5.70038 6.66823 5.80079 6.62842 5.90685C6.87655 5.96746 7.14505 6.00365 7.42227 6.01231V4.98438C7.17821 5.04143 6.94777 5.25735 6.76264 5.60674Z"
// //                       fill="white"
// //                     />
// //                     <path
// //                       d="M7.68311 4.98438V6.01231C7.96032 6.00364 8.22882 5.96744 8.47695 5.90684C8.43712 5.80079 8.39232 5.70036 8.34272 5.60674C8.1576 5.25735 7.92716 5.04143 7.68311 4.98438Z"
// //                       fill="white"
// //                     />
// //                     <path
// //                       d="M8.55972 6.16406C8.28527 6.233 7.98854 6.27384 7.68311 6.28291V7.12142H8.69984C8.68985 6.78213 8.64187 6.45705 8.55972 6.16406Z"
// //                       fill="white"
// //                     />
// //                     <path
// //                       d="M6.3762 8.67188C6.2252 8.72214 6.08459 8.78231 5.95752 8.85156C5.96301 8.85729 5.96841 8.86308 5.97396 8.86877C6.20639 9.10632 6.48107 9.28491 6.78061 9.39753C6.69135 9.29277 6.60832 9.16883 6.53304 9.02677C6.47452 8.91631 6.42219 8.79746 6.3762 8.67188Z"
// //                       fill="white"
// //                     />
// //                     <path
// //                       d="M8.72912 5.83501C8.88013 5.78475 9.02074 5.72458 9.14781 5.65534C9.14231 5.64961 9.13692 5.6438 9.13137 5.63813C8.89894 5.40058 8.62426 5.22199 8.32471 5.10938C8.41397 5.21413 8.49701 5.33807 8.57228 5.48013C8.6308 5.59058 8.68313 5.70942 8.72912 5.83501Z"
// //                       fill="white"
// //                     />
// //                     <path
// //                       d="M8.96198 7.39062C8.95182 7.75426 8.90024 8.10407 8.81152 8.42089C8.99798 8.48293 9.17056 8.55902 9.3243 8.64777C9.59764 8.28565 9.75666 7.85103 9.78247 7.39064L8.96198 7.39062Z"
// //                       fill="white"
// //                     />
// //                     <path
// //                       d="M8.72914 8.67188C8.68315 8.79746 8.63081 8.9163 8.57229 9.02676C8.49702 9.16882 8.41398 9.29276 8.32471 9.39751C8.62426 9.2849 8.89894 9.10631 9.13137 8.86876C9.13692 8.86308 9.14231 8.85727 9.1478 8.85154C9.02074 8.78232 8.88014 8.72214 8.72914 8.67188Z"
// //                       fill="white"
// //                     />
// //                     <path
// //                       d="M6.37618 5.83501C6.42217 5.70942 6.47449 5.59059 6.53302 5.48013C6.6083 5.33807 6.69134 5.21413 6.78061 5.10938C6.48106 5.22199 6.20638 5.40058 5.97395 5.63813C5.9684 5.6438 5.963 5.64961 5.95752 5.65534C6.08458 5.72458 6.22518 5.78475 6.37618 5.83501Z"
// //                       fill="white"
// //                     />
// //                     <path
// //                       d="M8.81152 6.08625C8.90025 6.40307 8.95182 6.75288 8.96198 7.11653H9.78248C9.75667 6.65613 9.59764 6.22149 9.3243 5.85938C9.17056 5.94811 8.99798 6.0242 8.81152 6.08625Z"
// //                       fill="white"
// //                     />
// //                     <path
// //                       d="M7.42251 7.12142V6.2829C7.11708 6.27383 6.82034 6.23298 6.54588 6.16406C6.46373 6.45703 6.41575 6.78211 6.40576 7.12142H7.42251Z"
// //                       fill="white"
// //                     />
// //                     <path
// //                       d="M7.68311 7.39064V8.22914C7.98853 8.23822 8.28527 8.27906 8.55972 8.34797C8.64187 8.05501 8.68985 7.72994 8.69984 7.39062L7.68311 7.39064Z"
// //                       fill="white"
// //                     />
// //                     <path
// //                       d="M8.34272 8.89777C8.39233 8.80413 8.43713 8.70372 8.47695 8.59766C8.22882 8.53705 7.96033 8.50086 7.68311 8.49219V9.52012C7.92717 9.46307 8.15761 9.24715 8.34272 8.89777Z"
// //                       fill="white"
// //                     />
// //                     <path
// //                       d="M7.42227 9.52012V8.49219C7.14505 8.50086 7.87656 8.53705 6.62842 8.59766C6.66824 8.70371 6.71304 8.80413 6.76264 8.89777C6.94778 9.24715 7.17822 9.46307 7.42227 9.52012Z"
// //                       fill="white"
// //                     />
// //                     <path
// //                       d="M7.42251 7.39062H6.40576C6.41576 7.72994 6.46373 8.05501 6.54588 8.34797C6.82033 8.27905 7.11708 8.23821 7.42251 8.22914V7.39062Z"
// //                       fill="white"
// //                     />
// //                     <path
// //                       d="M9.03927 0.453125C10.51 0.920005 11.7857 1.87599 12.6637 3.16909C13.5417 4.46218 13.9715 6.01817 13.8849 7.58963C13.7982 9.1611 13.2 10.6579 12.1854 11.8419C11.1708 13.0259 9.79799 13.8294 8.28529 14.1244L8.00391 12.6172C9.18771 12.3864 10.262 11.7576 11.056 10.831C11.8501 9.9044 12.3181 8.73308 12.386 7.50328C12.4538 6.27349 12.1174 5.05583 11.4303 4.04387C10.7432 3.03193 9.74488 2.2838 8.59396 1.91844L9.03927 0.453125Z"
// //                       fill="#5D5FEF"
// //                     />
// //                   </g>
// //                   <defs>
// //                     <clipPath id="clip0_8091_33206_expanded">
// //                       <rect width="70" height="18" fill="white" />
// //                     </clipPath>
// //                   </defs>
// //                 </svg>
// //               </div>
// //             </div>
// //           </div>
// //         </main>

// //         <ViewAllSheet
// //           open={viewAll.open}
// //           type={viewAll.type}
// //           items={viewAll.items}
// //           onClose={closeViewAll}
// //           onCreateNew={() => {
// //             closeViewAll();
// //             if (viewAll.type === "kbs") {
// //               startChat();
// //             } else {
// //               // threads
// //               createNewChat?.();
// //             }
// //           }}
// //           onSelectItem={(item) => {
// //             if (viewAll.type === "kbs") {
// //               const batchId = item.batch_id || item.id;
// //               const title = item.title || item.link_url || "";
// //               closeViewAll();
// //               setIsSessionMenuOpen(false);
// //               startExistingKbChat?.({ batchId, title });
// //             } else {
// //               // threads
// //               closeViewAll();
// //               setIsSessionMenuOpen(false);
// //               switchSession?.(item);
// //             }
// //           }}
// //         />
// //       </section>
// //     );
// //   }

// //   // Normal collapsed view
// //   return (
// //     <section
// //       id="wm-chat-panel"
// //       className={panelClassNames}
// //       aria-hidden={!isOpen}
// //     >
// //       <ChatPanelHeader
// //         logoUrl={logoUrl}
// //         chatTitle={
// //           state.status === "ready" ||
// //           state.status === "running" ||
// //           state.status === "error"
// //             ? state.chat?.chatTitle || "New Chat"
// //             : "Webmap Network"
// //         }
// //         subtitle={headerSubtitle}
// //         onClose={onClose}
// //         showControls={canShowHeaderControls}
// //         onRestart={state.status === "idle" ? startChat : handleStartOver}
// //         hasSuggestions={hasSuggestions}
// //         showSuggestions={showSuggestions}
// //         onToggleSuggestions={toggleSuggestions}
// //         isExpanded={isExpanded}
// //         onToggleExpand={toggleExpanded}
// //         canOpenSessions={canOpenSessions}
// //         onOpenSessions={openSessions}
// //         isHome={
// //           state.status !== "ready" &&
// //           state.status !== "running" &&
// //           state.status !== "error"
// //         }
// //       />
// //       <div className="wm-chat-sidebar__body">
// //         <main className="agent-container">{bodyContent}</main>
// //       </div>
// //       <SessionMenu
// //         knowledgeBatchId={knowledgeBatchId}
// //         userUuid={user?.uuid}
// //         user={user}
// //         userName={user?.username}
// //         isOpen={isSessionMenuOpen}
// //         showThreads={state.status === "ready"}
// //         onClose={() => setIsSessionMenuOpen(false)}
// //         onCreateNew={() => {
// //           setIsSessionMenuOpen(false);
// //           createNewChat?.();
// //         }}
// //         onStartNewKb={() => {
// //           setIsSessionMenuOpen(false);
// //           startChat();
// //         }}
// //         onSelectSession={(s) => {
// //           setIsSessionMenuOpen(false);
// //           switchSession?.(s);
// //         }}
// //         onOpenKb={({ batchId, title }) => {
// //           setIsSessionMenuOpen(false);
// //           startExistingKbChat?.({ batchId, title });
// //         }}
// //         onViewAll={openViewAll}
// //       />
// //       <div className="wm-chat-sidebar__footer">
// //         <ChatPanelFooter
// //           status={state.status}
// //           chat={state.chat}
// //           message={messageInput}
// //           onMessageChange={(event) => setMessageInput(event.target.value)}
// //           onSubmit={handleSend}
// //           onKeyDown={handleInputKeyDown}
// //           canSend={canSend}
// //           attachedImage={attachedImage}
// //           setAttachedImage={setAttachedImage}
// //         />
// //         <div className="copy-right">
// //           <p>Powered by.</p>
// //           <svg
// //             width="70"
// //             height="18"
// //             viewBox="0 0 70 18"
// //             fill="none"
// //             xmlns="http://www.w3.org/2000/svg"
// //           >
// //             <g clip-path="url(#clip0_8091_33206)">
// //               <path
// //                 d="M25.8331 5.02888C25.7384 5.02888 25.6199 5.02888 25.5251 5.02888C25.5251 5.02888 25.5251 5.02888 25.5014 5.02888C25.3829 5.02888 25.2645 5.0531 25.1697 5.10153C25.0276 5.1984 25.0038 5.31948 24.9802 5.39212L23.3453 9.55722L22.1844 6.31232C22.0422 5.92487 21.9001 5.53742 21.758 5.14996C21.6868 4.98045 21.5447 4.85938 21.3551 4.85938H21.3315C21.284 4.85938 21.213 4.85938 21.1656 4.85938C20.976 4.85938 20.8102 4.98045 20.7392 5.14996C20.3127 6.36075 19.8625 7.57153 19.436 8.78232L19.8862 9.96888C20.0046 10.3079 20.4786 10.3079 20.5969 9.96888C20.8102 9.38771 21.0234 8.80654 21.2366 8.22535L22.2554 11.0344C22.445 11.5429 22.6109 12.0272 22.8004 12.5358C22.8715 12.7053 23.0136 12.8263 23.2032 12.8263H23.2268C23.2743 12.8263 23.3217 12.8263 23.3691 12.8263H23.3927C23.5823 12.8263 23.7244 12.7295 23.7955 12.5358C24.53 10.6469 25.2645 8.75811 25.999 6.86928L26.5202 5.53742C26.5202 5.5132 26.5439 5.48899 26.5439 5.46477L26.6861 4.95624L25.8331 5.02888Z"
// //                 fill="#5D5FEF"
// //               ></path>
// //               <path
// //                 d="M18.8435 8.6886C18.3933 7.55046 17.9668 6.43653 17.5167 5.2984C17.4456 5.12889 17.3035 5.00781 17.0902 5.00781C16.9718 5.00781 16.8295 5.00781 16.7112 5.00781H16.4031H16.3557C16.3321 5.00781 16.3083 5.00781 16.3083 5.00781L15.7871 5.03203L15.9766 5.51635L18.3223 11.5461C18.4408 11.8851 18.5829 12.1999 18.7014 12.5389C18.7724 12.7084 18.9146 12.8294 19.1041 12.8294H19.1278C19.1752 12.8294 19.2226 12.8294 19.2463 12.8294H19.2699C19.4595 12.8294 19.6017 12.7084 19.6728 12.5389C19.7675 12.2483 19.886 11.9819 19.9808 11.6913L18.8435 8.6886Z"
// //                 fill="#5D5FEF"
// //               ></path>
// //               <path
// //                 d="M34.1968 7.79102C34.1494 7.64573 34.1257 7.50044 34.0783 7.35515C34.0547 7.2825 34.0309 7.20985 33.9836 7.11299C33.9362 6.96769 33.8651 6.84661 33.794 6.72554C33.1069 5.56318 31.8749 4.8125 30.4296 4.8125C28.2262 4.8125 26.4966 6.58024 26.4966 8.80808C26.4966 9.89779 26.8993 10.8906 27.6339 11.6656C28.3683 12.4162 29.3635 12.8278 30.4296 12.8278C31.1404 12.8278 31.8038 12.6584 32.3961 12.2951C32.4909 12.2467 32.6093 12.1499 32.7516 12.0288C33.178 11.6656 33.1543 10.9875 32.7042 10.6485L32.3013 10.3579L32.0881 10.5758C31.6616 11.0117 31.0693 11.2296 30.4533 11.2296C29.8136 11.2296 29.2212 10.9875 28.7711 10.5274C28.6526 10.4063 28.5342 10.261 28.4394 10.1157C28.4394 10.1157 28.4394 10.1157 28.4394 10.0915C28.3209 9.89779 28.2262 9.65563 28.1551 9.43769C27.7997 8.15426 28.5342 7.33093 28.5342 7.33093C28.9606 6.74976 29.6477 6.3623 30.4296 6.3623C31.4484 6.3623 32.3251 7.01612 32.6567 7.96054H29.4345C29.008 7.96054 28.6763 8.29956 28.6763 8.73544C28.6763 8.95338 28.7 9.19554 28.7711 9.43769H32.9174C33.7703 9.48612 34.41 8.63857 34.1968 7.79102Z"
// //                 fill="#5D5FEF"
// //               ></path>
// //               <path
// //                 d="M36.6585 6.92762V0.812408C36.6585 0.424957 36.3505 0.0859375 35.9477 0.0859375H35.0947V0.52182V4.3479C35.0947 5.00172 35.0947 8.18684 35.0947 8.84066C35.4027 8.33213 35.8293 7.94469 36.2557 7.67831C36.5164 7.5088 36.6585 7.24242 36.6585 6.92762Z"
// //                 fill="#5D5FEF"
// //               ></path>
// //               <path
// //                 d="M42.7475 8.17382C42.558 7.05989 41.9894 6.18813 41.0653 5.58274C40.4257 5.17107 39.7385 4.95312 38.9803 4.95312C38.7197 4.95312 38.4354 4.97735 38.1511 5.04999C38.1511 5.04999 35.1184 5.72804 35.0947 8.65813C35.0947 8.70656 35.0947 8.75499 35.0947 8.80343C35.0947 9.09401 35.1184 9.36038 35.1657 9.57833C35.3553 10.6922 35.9239 11.564 36.8242 12.1694C37.464 12.6052 38.1747 12.8232 38.9093 12.8232C39.1461 12.8232 39.3831 12.799 39.6437 12.7506C40.7336 12.5568 41.5866 11.9757 42.1789 11.0555C42.7475 10.1837 42.9371 9.21509 42.7475 8.17382ZM38.9803 11.2492C37.6773 11.2492 36.6821 10.2079 36.6821 8.87607C36.6821 7.5442 37.7009 6.50294 38.9803 6.50294C39.5964 6.50294 40.1887 6.74509 40.6151 7.18097C41.0416 7.61685 41.2786 8.22224 41.2786 8.87607C41.2786 10.2079 40.2598 11.2492 38.9803 11.2492Z"
// //                 fill="#5D5FEF"
// //               ></path>
// //               <path
// //                 d="M48.5509 6.60073C48.7405 6.18907 48.845 6.04903 49.0582 5.78265C48.3058 5.15607 47.5268 4.93275 46.9107 4.90853C46.2948 4.88431 45.7261 5.05383 45.2522 5.39284V5.05383H44.4467C44.0439 5.05383 43.6885 5.39284 43.6885 5.82873V12.0037C43.6885 12.4154 44.0202 12.7786 44.4467 12.7786H45.2522V11.2288C45.2522 10.2844 45.2522 9.34 45.2522 8.4198C45.2522 8.00814 45.3233 7.66911 45.4655 7.35431C45.7261 6.82156 46.0815 6.5552 46.6027 6.48255C46.6501 6.48255 46.6975 6.48255 46.7212 6.48255C46.9107 6.48255 47.5813 6.43772 48.3197 7.02158C48.5567 7.14266 48.4562 6.81868 48.5509 6.60073Z"
// //                 fill="#5D5FEF"
// //               ></path>
// //               <path
// //                 d="M53.6635 7.78771C53.6635 7.4729 53.6397 7.20654 53.5687 6.94016C53.3555 6.14104 52.9053 5.55987 52.2182 5.19663C51.6732 4.90605 51.0809 4.8334 50.4412 4.95447C50.3227 4.97869 50.1806 5.0029 50.0621 5.05133C49.1617 5.36614 47.8823 6.31056 47.8823 9.26487C47.8823 9.89447 47.8823 10.5241 47.8823 11.1779V12.0255C47.8823 12.4371 48.214 12.8004 48.6405 12.8004H49.4461V11.2506C49.4461 10.3061 49.4461 9.36173 49.4461 8.44153C49.4461 8.02987 49.5172 7.69085 49.6593 7.40025C49.9199 6.86751 50.2754 6.57692 50.7966 6.52849C50.8439 6.52849 50.8913 6.52849 50.9151 6.52849C51.3415 6.52849 51.7443 6.79486 51.9339 7.20654C52.0286 7.40025 52.0523 7.6182 52.0523 7.88457C52.0523 8.99849 52.0523 10.0882 52.0523 11.2021V12.0497C52.0523 12.4613 52.3841 12.8245 52.8105 12.8245H53.6161V11.2506C53.6635 10.064 53.6635 8.92584 53.6635 7.78771Z"
// //                 fill="#5D5FEF"
// //               ></path>
// //               <path
// //                 d="M59.5707 9.56037V11.2555H59.3338H58.1254C57.7937 11.2555 57.4857 11.2555 57.154 11.2555C56.9882 11.2555 56.846 11.2312 56.7038 11.1586C56.3248 10.9649 56.0879 10.5774 56.0879 10.1658C56.0879 9.75408 56.3248 9.36664 56.7038 9.17291C56.846 9.12448 56.9882 9.10026 57.154 9.10026C57.4857 9.10026 57.7937 9.10026 58.1254 9.10026H58.9074H60.3762C60.7791 9.10026 61.0871 8.76125 61.0871 8.37379V6.96929C61.0871 6.92085 61.0871 6.87242 61.0871 6.84821C60.8976 5.78271 59.9972 5.00781 58.931 5.00781H57.3199C56.9171 5.00781 56.5617 5.34683 56.5617 5.78271V6.58183H58.931C59.2153 6.58183 59.4522 6.75134 59.5471 7.01772C59.5471 7.04193 59.5707 7.06615 59.5707 7.11458V7.57468H59.2864C59.0021 7.57468 58.6941 7.57468 58.4098 7.57468C57.9122 7.57468 57.4857 7.57468 57.1066 7.57468C56.4669 7.57468 55.8746 7.81684 55.4008 8.27693C54.8321 8.78545 54.5479 9.39085 54.5479 10.1415V10.1658C54.5479 10.9407 54.8321 11.5945 55.4008 12.1272C55.8746 12.5873 56.4669 12.8294 57.1066 12.8294C57.4857 12.8294 57.8885 12.8294 58.4098 12.8294C58.6704 12.8294 58.9547 12.8294 59.2153 12.8294H59.6418H61.0871V9.56037H59.5707Z"
// //                 fill="#5D5FEF"
// //               ></path>
// //               <path
// //                 d="M69.8775 8.17692C69.5931 6.26389 67.982 4.85938 66.0866 4.85938C65.8971 4.85938 65.7312 4.8836 65.5416 4.9078C65.3048 4.93202 65.0915 4.98045 64.8783 5.0531C64.5228 5.17418 64.286 5.48899 64.286 5.87643V7.2083C64.7124 6.7482 65.3284 6.45762 66.0156 6.45762C66.6553 6.45762 67.2476 6.69977 67.6977 7.15987C68.1479 7.61996 68.3849 8.22535 68.3849 8.90339C68.3849 10.2595 67.3423 11.325 66.0156 11.3492C65.3759 11.3492 64.7834 11.107 64.3333 10.6469C63.8831 10.1868 63.6463 9.58144 63.6463 8.92761V5.77957V5.07732H62.9117C62.4616 5.07732 62.0825 5.46477 62.0825 5.92487V17.9116H62.817C63.2672 17.9116 63.6463 17.5242 63.6463 17.064V12.0272C64.3333 12.5842 65.1863 12.8748 66.0629 12.8748C66.8211 12.8748 67.5556 12.6568 68.1716 12.2209C69.5458 11.2765 70.1144 9.87202 69.8775 8.17692Z"
// //                 fill="#5D5FEF"
// //               ></path>
// //               <path
// //                 d="M7.99028 17.8815C5.14157 10.07 6.34011 2.79115 7.29547 0.128145C4.4294 -0.138156 0 2.43608 0 7.40703C0 11.3838 2.83713 13.5615 4.25569 14.1534C3.53194 13.7686 1.9802 12.307 1.56331 9.53743C1.04221 6.07553 3.21348 4.47773 4.51624 3.85636C4.082 7.31826 4.9505 11.1352 5.6453 12.9106C6.34011 14.686 6.42696 14.8635 7.99028 17.8815Z"
// //                 fill="#5D5FEF"
// //               ></path>
// //               <path
// //                 d="M7.55297 10.2153C5.95179 10.2153 4.65379 8.8887 4.65379 7.2522C4.65379 5.61571 5.95179 4.28906 7.55297 4.28906C9.15414 4.28906 10.4521 5.61571 10.4521 7.2522C10.4521 8.8887 9.15414 10.2153 7.55297 10.2153Z"
// //                 fill="#5D5FEF"
// //               ></path>
// //               <path
// //                 d="M6.14424 7.39062H5.32373C5.34955 7.85101 5.50857 8.28563 5.78192 8.64777C5.93565 8.55902 6.10824 8.48293 6.29469 8.42087C6.20598 8.10407 6.15439 7.75426 6.14424 7.39062Z"
// //                 fill="white"
// //               ></path>
// //               <path
// //                 d="M6.14424 7.11654C6.15439 6.75289 6.20598 6.40308 6.29469 6.08625C6.10824 6.02421 5.93566 5.94812 5.78193 5.85938C5.50857 6.22151 5.34955 6.65614 5.32373 7.11654H6.14424Z"
// //                 fill="white"
// //               ></path>
// //               <path
// //                 d="M6.76264 5.60674C6.71303 5.70038 6.66823 5.80079 6.62842 5.90685C6.87655 5.96746 7.14505 6.00365 7.42227 6.01231V4.98438C7.17821 5.04143 6.94777 5.25735 6.76264 5.60674Z"
// //                 fill="white"
// //               ></path>
// //               <path
// //                 d="M7.68311 4.98438V6.01231C7.96032 6.00364 8.22882 5.96744 8.47695 5.90684C8.43712 5.80079 8.39232 5.70036 8.34272 5.60674C8.1576 5.25735 7.92716 5.04143 7.68311 4.98438Z"
// //                 fill="white"
// //               ></path>
// //               <path
// //                 d="M8.55972 6.16406C8.28527 6.233 7.98854 6.27384 7.68311 6.28291V7.12142H8.69984C8.68985 6.78213 8.64187 6.45705 8.55972 6.16406Z"
// //                 fill="white"
// //               ></path>
// //               <path
// //                 d="M6.3762 8.67188C6.2252 8.72214 6.08459 8.78231 5.95752 8.85156C5.96301 8.85729 5.96841 8.86308 5.97396 8.86877C6.20639 9.10632 6.48107 9.28491 6.78061 9.39753C6.69135 9.29277 6.60832 9.16883 6.53304 9.02677C6.47452 8.91631 6.42219 8.79746 6.3762 8.67188Z"
// //                 fill="white"
// //               ></path>
// //               <path
// //                 d="M8.72912 5.83501C8.88013 5.78475 9.02074 5.72458 9.14781 5.65534C9.14231 5.64961 9.13692 5.6438 9.13137 5.63813C8.89894 5.40058 8.62426 5.22199 8.32471 5.10938C8.41397 5.21413 8.49701 5.33807 8.57228 5.48013C8.6308 5.59058 8.68313 5.70942 8.72912 5.83501Z"
// //                 fill="white"
// //               ></path>
// //               <path
// //                 d="M8.96198 7.39062C8.95182 7.75426 8.90024 8.10407 8.81152 8.42089C8.99798 8.48293 9.17056 8.55902 9.3243 8.64777C9.59764 8.28565 9.75666 7.85103 9.78247 7.39064L8.96198 7.39062Z"
// //                 fill="white"
// //               ></path>
// //               <path
// //                 d="M8.72914 8.67188C8.68315 8.79746 8.63081 8.9163 8.57229 9.02676C8.49702 9.16882 8.41398 9.29276 8.32471 9.39751C8.62426 9.2849 8.89894 9.10631 9.13137 8.86876C9.13692 8.86308 9.14231 8.85727 9.1478 8.85154C9.02074 8.78232 8.88014 8.72214 8.72914 8.67188Z"
// //                 fill="white"
// //               ></path>
// //               <path
// //                 d="M6.37618 5.83501C6.42217 5.70942 6.47449 5.59059 6.53302 5.48013C6.6083 5.33807 6.69134 5.21413 6.78061 5.10938C6.48106 5.22199 6.20638 5.40058 5.97395 5.63813C5.9684 5.6438 5.963 5.64961 5.95752 5.65534C6.08458 5.72458 6.22518 5.78475 6.37618 5.83501Z"
// //                 fill="white"
// //               ></path>
// //               <path
// //                 d="M8.81152 6.08625C8.90025 6.40307 8.95182 6.75288 8.96198 7.11653H9.78248C9.75667 6.65613 9.59764 6.22149 9.3243 5.85938C9.17056 5.94811 8.99798 6.0242 8.81152 6.08625Z"
// //                 fill="white"
// //               ></path>
// //               <path
// //                 d="M7.42251 7.12142V6.2829C7.11708 6.27383 6.82034 6.23298 6.54588 6.16406C6.46373 6.45703 6.41575 6.78211 6.40576 7.12142H7.42251Z"
// //                 fill="white"
// //               ></path>
// //               <path
// //                 d="M7.68311 7.39064V8.22914C7.98853 8.23822 8.28527 8.27906 8.55972 8.34797C8.64187 8.05501 8.68985 7.72994 8.69984 7.39062L7.68311 7.39064Z"
// //                 fill="white"
// //               ></path>
// //               <path
// //                 d="M8.34272 8.89777C8.39233 8.80413 8.43713 8.70372 8.47695 8.59766C8.22882 8.53705 7.96033 8.50086 7.68311 8.49219V9.52012C7.92717 9.46307 8.15761 9.24715 8.34272 8.89777Z"
// //                 fill="white"
// //               ></path>
// //               <path
// //                 d="M7.42227 9.52012V8.49219C7.14505 8.50086 6.87656 8.53705 6.62842 8.59766C6.66824 8.70371 6.71304 8.80413 6.76264 8.89777C6.94778 9.24715 7.17822 9.46307 7.42227 9.52012Z"
// //                 fill="white"
// //               ></path>
// //               <path
// //                 d="M7.42251 7.39062H6.40576C6.41576 7.72994 6.46373 8.05501 6.54588 8.34797C6.82033 8.27905 7.11708 8.23821 7.42251 8.22914V7.39062Z"
// //                 fill="white"
// //               ></path>
// //               <path
// //                 d="M9.03927 0.453125C10.51 0.920005 11.7857 1.87599 12.6637 3.16909C13.5417 4.46218 13.9715 6.01817 13.8849 7.58963C13.7982 9.1611 13.2 10.6579 12.1854 11.8419C11.1708 13.0259 9.79799 13.8294 8.28529 14.1244L8.00391 12.6172C9.18771 12.3864 10.262 11.7576 11.056 10.831C11.8501 9.9044 12.3181 8.73308 12.386 7.50328C12.4538 6.27349 12.1174 5.05583 11.4303 4.04387C10.7432 3.03193 9.74488 2.2838 8.59396 1.91844L9.03927 0.453125Z"
// //                 fill="#5D5FEF"
// //               ></path>
// //             </g>
// //             <defs>
// //               <clipPath id="clip0_8091_33206">
// //                 <rect width="70" height="18" fill="white"></rect>
// //               </clipPath>
// //             </defs>
// //           </svg>
// //         </div>
// //       </div>
// //       <ViewAllSheet
// //         open={viewAll.open}
// //         type={viewAll.type}
// //         items={viewAll.items}
// //         onClose={closeViewAll}
// //         onCreateNew={() => {
// //           closeViewAll();
// //           if (viewAll.type === "kbs") {
// //             startChat();
// //           } else {
// //             // threads
// //             createNewChat?.();
// //           }
// //         }}
// //         onSelectItem={(item) => {
// //           if (viewAll.type === "kbs") {
// //             const batchId = item.batch_id || item.id;
// //             const title = item.title || item.link_url || "";
// //             closeViewAll();
// //             setIsSessionMenuOpen(false);
// //             startExistingKbChat?.({ batchId, title });
// //           } else {
// //             // threads
// //             closeViewAll();
// //             setIsSessionMenuOpen(false);
// //             switchSession?.(item);
// //           }
// //         }}
// //       />
// //     </section>
// //   );
// // }

// import { useCallback, useEffect, useMemo, useState } from "react";
// import { CHAT_EMPTY_STATE, CHAT_HEADER_TEXT } from "../../../constants/chat.js";
// import { ChatPanelHeader } from "./ChatPanelHeader.jsx";
// import { ChatPanelBody } from "./ChatPanelBody.jsx";
// import { ChatPanelFooter } from "./ChatPanelFooter.jsx";
// import { ChatProgress } from "./ChatProgress.jsx";
// import { ChatErrorState } from "./ChatErrorState.jsx";
// import { ChatEmptyState } from "./ChatEmptyState.jsx";
// import { ChatMessageList } from "./ChatMessageList.jsx";
// import { KbList } from "./KbList.jsx";
// import { SessionMenu } from "./SessionMenu.jsx";
// import { ViewAllSheet } from "./ViewAllSheet.jsx";

// export function ChatPanel({
//   logoUrl,
//   isOpen,
//   user,
//   accessToken,
//   refreshToken,
//   onClose,
//   state,
//   htmlPreference,
//   isHtmlPreferenceLoading,
//   isHtmlPreferenceSaving,
//   onToggleHtmlPreference,
//   startKnowledgeChat,
//   startExistingKbChat,
//   sendMessage,
//   createNewChat,
//   switchSession,
//   resetWorkflow,
// }) {
//   const currentUrl = useMemo(() => {
//     if (typeof window === "undefined") {
//       return "";
//     }
//     return window.location.href;
//   }, []);

//   const defaultTitle = useMemo(() => {
//     if (typeof document !== "undefined" && document.title) {
//       return document.title.slice(0, 80);
//     }
//     try {
//       return new URL(currentUrl).hostname;
//     } catch {
//       return "Current page";
//     }
//   }, [currentUrl]);

//   const [messageInput, setMessageInput] = useState("");
//   const [kbComparison, setKbComparison] = useState("pending");
//   const [showSuggestions, setShowSuggestions] = useState(false);
//   const [isExpanded, setIsExpanded] = useState(false);
//   const [isSessionMenuOpen, setIsSessionMenuOpen] = useState(false);
//   const [isInitialLoad, setIsInitialLoad] = useState(true);
//   const [attachedImages, setAttachedImages] = useState([]);
//   const [viewAll, setViewAll] = useState({
//     open: false,
//     type: null,
//     items: [],
//   });

//   const hasSuggestions = Boolean(state.chat?.suggestions?.length);
//   const canShowHeaderControls =
//     state.status !== "idle" ||
//     kbComparison === "same" ||
//     kbComparison === "changed";
//   const knowledgeBatchId = state?.context?.knowledgeBatchId || null;
//   const canOpenSessions = canShowHeaderControls && state.status !== "running";

//   const startChat = useCallback(() => {
//     const normalizedTitle = defaultTitle?.trim() || "Current page";
//     startKnowledgeChat({ title: normalizedTitle, note: "", url: currentUrl });
//   }, [startKnowledgeChat, defaultTitle, currentUrl]);

//   const toggleSuggestions = useCallback(() => {
//     setShowSuggestions((value) => !value);
//   }, []);

//   const toggleExpanded = useCallback(() => {
//     setIsExpanded((value) => !value);
//   }, []);

//   const openSessions = useCallback(() => {
//     if (canOpenSessions) setIsSessionMenuOpen(true);
//   }, [canOpenSessions]);

//   const openViewAll = useCallback((payload) => {
//     const { type, items } = payload || {};
//     setViewAll({
//       open: true,
//       type: type || null,
//       items: Array.isArray(items) ? items : [],
//     });
//     setIsSessionMenuOpen(false);
//   }, []);

//   const closeViewAll = useCallback(
//     () => setViewAll({ open: false, type: null, items: [] }),
//     [],
//   );

//   useEffect(() => {
//     if (!isOpen) {
//       setMessageInput("");
//       setShowSuggestions(false);
//       setIsExpanded(false);
//       setIsSessionMenuOpen(false);
//       setIsInitialLoad(true);
//       return;
//     }
//     if (isOpen && isInitialLoad) {
//       if (typeof window !== "undefined" && window.requestAnimationFrame) {
//         window.requestAnimationFrame(() => {
//           window.requestAnimationFrame(() => setIsInitialLoad(false));
//         });
//       } else {
//         setIsInitialLoad(false);
//       }
//     }
//   }, [isOpen, isInitialLoad, state.status]);

//   useEffect(() => {
//     if (state.status === "error") {
//       setShowSuggestions(false);
//     }
//   }, [state.status]);

//   useEffect(() => {
//     if (!hasSuggestions) {
//       setShowSuggestions(false);
//     }
//   }, [hasSuggestions]);

//   useEffect(() => {
//     setIsSessionMenuOpen(false);
//   }, [state.status]);

//   const handleRetry = () => {
//     resetWorkflow();
//     setMessageInput("");
//     setShowSuggestions(false);
//   };

//   const handleStartOver = () => {
//     resetWorkflow();
//     setMessageInput("");
//     setShowSuggestions(false);
//   };

//   const canSend =
//     state.status === "ready" &&
//     state.chat.ready &&
//     !state.chat.connecting &&
//     !state.chat.awaitingResponse;

//   const handleSend = (event) => {
//     event.preventDefault();
//     if (!canSend) return;
//     const trimmed = messageInput.trim();
//     if (!trimmed && attachedImages.length === 0) return;

//     let finalMessage = trimmed;
//     if (attachedImages.length > 0) {
//       const imgMarkdown = attachedImages
//         .map((src, i) => `![Attached Image ${i + 1}](${src})`)
//         .join("\n");
//       finalMessage = finalMessage
//         ? `${finalMessage}\n\n${imgMarkdown}`
//         : imgMarkdown;
//     }

//     sendMessage(finalMessage);
//     setMessageInput("");
//     setAttachedImages([]);
//   };

//   const handleInputKeyDown = (event) => {
//     if (event.key === "Enter" && !event.shiftKey) {
//       if (state.chat.awaitingResponse) {
//         event.preventDefault();
//         return;
//       }
//       event.preventDefault();
//       handleSend(event);
//     }
//   };

//   const handleSuggestion = (suggestion) => {
//     sendMessage(suggestion, { mode: "suggested" });
//   };

//   const headerSubtitle = useMemo(() => {
//     if (state.status === "ready") {
//       if (!state.chat.ready) {
//         return state.chat.connecting
//           ? CHAT_HEADER_TEXT.connecting
//           : CHAT_HEADER_TEXT.preparing;
//       }
//       return CHAT_HEADER_TEXT.ready;
//     }
//     if (state.status === "running") {
//       return CHAT_HEADER_TEXT.running;
//     }
//     if (state.status === "error") {
//       return CHAT_HEADER_TEXT.error;
//     }
//     return CHAT_HEADER_TEXT.idle;
//   }, [state]);

//   let bodyContent = null;

//   if (isInitialLoad && isOpen) {
//     bodyContent = null;
//   } else if (state.status === "running") {
//     bodyContent = (
//       <ChatProgress
//         steps={state.steps}
//         knowledgeSummary={state.knowledgeSummary}
//         isRunning
//         onCancel={resetWorkflow}
//       />
//     );
//   } else if (state.status === "error") {
//     bodyContent = (
//       <>
//         <ChatErrorState
//           message={state.error?.message}
//           onRetry={handleRetry}
//           actionLabel={state.error?.actionLabel}
//         />
//         <ChatProgress
//           steps={state.steps}
//           knowledgeSummary={state.knowledgeSummary}
//           isRunning={false}
//           onCancel={resetWorkflow}
//         />
//       </>
//     );
//   } else if (state.status === "ready") {
//     if (!state.chat.messages.length && !state.chat.awaitingResponse) {
//       bodyContent = (
//         <ChatEmptyState description={CHAT_EMPTY_STATE.readyDescription} />
//       );
//     } else {
//       bodyContent = (
//         <ChatMessageList
//           messages={state.chat.messages}
//           awaitingResponse={state.chat.awaitingResponse}
//           suggestions={state.chat.suggestions}
//           showSuggestions={showSuggestions}
//           onToggleSuggestions={toggleSuggestions}
//           onSuggestionSelect={handleSuggestion}
//           logoUrl={logoUrl}
//         />
//       );
//     }
//   } else {
//     bodyContent = (
//       <>
//         <KbList
//           user={user}
//           userName={user?.username}
//           userUuid={user?.uuid}
//           accessToken={accessToken}
//           refreshToken={refreshToken}
//           onCreateNewKb={startChat}
//           onSelectKb={(kb) =>
//             startExistingKbChat?.({ batchId: kb.batch_id, title: kb.title })
//           }
//           onCompared={setKbComparison}
//         />
//       </>
//     );
//   }

//   const panelClassNames = [
//     "wm-chat-sidebar",
//     isOpen ? "wm-chat-sidebar--open" : "",
//     isExpanded ? "wm-chat-sidebar--expanded" : "",
//     isInitialLoad ? "wm-chat-sidebar--initializing" : "",
//   ]
//     .filter(Boolean)
//     .join(" ");

//   if (isExpanded) {
//     return (
//       <section
//         id="wm-chat-panel"
//         className={panelClassNames}
//         aria-hidden={!isOpen}
//       >
//         <main className="expended-view-container">
//           <SessionMenu
//             knowledgeBatchId={knowledgeBatchId}
//             userUuid={user?.uuid}
//             user={user}
//             userName={user?.username}
//             isOpen={!viewAll.open}
//             isExpanded={true}
//             showThreads={state.status === "ready"}
//             onClose={() => setIsSessionMenuOpen(false)}
//             onCreateNew={() => {
//               setIsSessionMenuOpen(false);
//               createNewChat?.();
//             }}
//             onStartNewKb={() => {
//               setIsSessionMenuOpen(false);
//               startChat();
//             }}
//             onSelectSession={(s) => {
//               setIsSessionMenuOpen(false);
//               switchSession?.(s);
//             }}
//             onOpenKb={({ batchId, title }) => {
//               setIsSessionMenuOpen(false);
//               startExistingKbChat?.({ batchId, title });
//             }}
//             onViewAll={openViewAll}
//           />

//           <div className="chat-main-container">
//             <ChatPanelHeader
//               logoUrl={logoUrl}
//               chatTitle={
//                 state.status === "ready" ||
//                 state.status === "running" ||
//                 state.status === "error"
//                   ? state.chat?.chatTitle || "New Chat"
//                   : "Webmap Network"
//               }
//               subtitle={headerSubtitle}
//               onClose={onClose}
//               showControls={canShowHeaderControls}
//               onRestart={state.status === "idle" ? startChat : handleStartOver}
//               hasSuggestions={hasSuggestions}
//               showSuggestions={showSuggestions}
//               onToggleSuggestions={toggleSuggestions}
//               isExpanded={isExpanded}
//               onToggleExpand={toggleExpanded}
//               canOpenSessions={canOpenSessions}
//               onOpenSessions={openSessions}
//               isHome={
//                 state.status !== "ready" &&
//                 state.status !== "running" &&
//                 state.status !== "error"
//               }
//             />
//             <div className="agent-container">{bodyContent}</div>
//             <div className="section-footer">
//               <ChatPanelFooter
//                 status={state.status}
//                 chat={state.chat}
//                 message={messageInput}
//                 onMessageChange={(event) => setMessageInput(event.target.value)}
//                 onSubmit={handleSend}
//                 onKeyDown={handleInputKeyDown}
//                 canSend={canSend}
//                 attachedImages={attachedImages}
//                 setAttachedImages={setAttachedImages}
//               />
//               <div className="copy-right">
//                 <p>Powered by.</p>
//                 <svg
//                   width="70"
//                   height="18"
//                   viewBox="0 0 70 18"
//                   fill="none"
//                   xmlns="http://www.w3.org/2000/svg"
//                 >
//                   <g clipPath="url(#clip0_8091_33206_expanded)">
//                     <path
//                       d="M25.8331 5.02888C25.7384 5.02888 25.6199 5.02888 25.5251 5.02888C25.5251 5.02888 25.5251 5.02888 25.5014 5.02888C25.3829 5.02888 25.2645 5.0531 25.1697 5.10153C25.0276 5.1984 25.0038 5.31948 24.9802 5.39212L23.3453 9.55722L22.1844 6.31232C22.0422 5.92487 21.9001 5.53742 21.758 5.14996C21.6868 4.98045 21.5447 4.85938 21.3551 4.85938H21.3315C21.284 4.85938 21.213 4.85938 21.1656 4.85938C20.976 4.85938 20.8102 4.98045 20.7392 5.14996C20.3127 6.36075 19.8625 7.57153 19.436 8.78232L19.8862 9.96888C20.0046 10.3079 20.4786 10.3079 20.5969 9.96888C20.8102 9.38771 21.0234 8.80654 21.2366 8.22535L22.2554 11.0344C22.445 11.5429 22.6109 12.0272 22.8004 12.5358C22.8715 12.7053 23.0136 12.8263 23.2032 12.8263H23.2268C23.2743 12.8263 23.3217 12.8263 23.3691 12.8263H23.3927C23.5823 12.8263 23.7244 12.7295 23.7955 12.5358C24.53 10.6469 25.2645 8.75811 25.999 6.86928L26.5202 5.53742C26.5202 5.5132 26.5439 5.48899 26.5439 5.46477L26.6861 4.95624L25.8331 5.02888Z"
//                       fill="#5D5FEF"
//                     />
//                     <path
//                       d="M18.8435 8.6886C18.3933 7.55046 17.9668 6.43653 17.5167 5.2984C17.4456 5.12889 17.3035 5.00781 17.0902 5.00781C16.9718 5.00781 16.8295 5.00781 16.7112 5.00781H16.4031H16.3557C16.3321 5.00781 16.3083 5.00781 16.3083 5.00781L15.7871 5.03203L15.9766 5.51635L18.3223 11.5461C18.4408 11.8851 18.5829 12.1999 18.7014 12.5389C18.7724 12.7084 18.9146 12.8294 19.1041 12.8294H19.1278C19.1752 12.8294 19.2226 12.8294 19.2463 12.8294H19.2699C19.4595 12.8294 19.6017 12.7084 19.6728 12.5389C19.7675 12.2483 19.886 11.9819 19.9808 11.6913L18.8435 8.6886Z"
//                       fill="#5D5FEF"
//                     />
//                     <path
//                       d="M34.1968 7.79102C34.1494 7.64573 34.1257 7.50044 34.0783 7.35515C34.0547 7.2825 34.0309 7.20985 33.9836 7.11299C33.9362 6.96769 33.8651 6.84661 33.794 6.72554C33.1069 5.56318 31.8749 4.8125 30.4296 4.8125C28.2262 4.8125 26.4966 6.58024 26.4966 8.80808C26.4966 9.89779 26.8993 10.8906 27.6339 11.6656C28.3683 12.4162 29.3635 12.8278 30.4296 12.8278C31.1404 12.8278 31.8038 12.6584 32.3961 12.2951C32.4909 12.2467 32.6093 12.1499 32.7516 12.0288C33.178 11.6656 33.1543 10.9875 32.7042 10.6485L32.3013 10.3579L32.0881 10.5758C31.6616 11.0117 31.0693 11.2296 30.4533 11.2296C29.8136 11.2296 29.2212 10.9875 28.7711 10.5274C28.6526 10.4063 28.5342 10.261 28.4394 10.1157C28.4394 10.1157 28.4394 10.1157 28.4394 10.0915C28.3209 9.89779 28.2262 9.65563 28.1551 9.43769C27.7997 8.15426 28.5342 7.33093 28.5342 7.33093C28.9606 6.74976 29.6477 6.3623 30.4296 6.3623C31.4484 6.3623 32.3251 7.01612 32.6567 7.96054H29.4345C29.008 7.96054 28.6763 8.29956 28.6763 8.73544C28.6763 8.95338 28.7 9.19554 28.7711 9.43769H32.9174C33.7703 9.48612 34.41 8.63857 34.1968 7.79102Z"
//                       fill="#5D5FEF"
//                     />
//                     <path
//                       d="M36.6585 6.92762V0.812408C36.6585 0.424957 36.3505 0.0859375 35.9477 0.0859375H35.0947V0.52182V4.3479C35.0947 5.00172 35.0947 8.18684 35.0947 8.84066C35.4027 8.33213 35.8293 7.94469 36.2557 7.67831C36.5164 7.5088 36.6585 7.24242 36.6585 6.92762Z"
//                       fill="#5D5FEF"
//                     />
//                     <path
//                       d="M42.7475 8.17382C42.558 7.05989 41.9894 6.18813 41.0653 5.58274C40.4257 5.17107 39.7385 4.95312 38.9803 4.95312C38.7197 4.95312 38.4354 4.97735 38.1511 5.04999C38.1511 5.04999 35.1184 5.72804 35.0947 8.65813C35.0947 8.70656 35.0947 8.75499 35.0947 8.80343C35.0947 9.09401 35.1184 9.36038 35.1657 9.57833C35.3553 10.6922 35.9239 11.564 36.8242 12.1694C37.464 12.6052 38.1747 12.8232 38.9093 12.8232C39.1461 12.8232 39.3831 12.799 39.6437 12.7506C40.7336 12.5568 41.5866 11.9757 42.1789 11.0555C42.7475 10.1837 42.9371 9.21509 42.7475 8.17382ZM38.9803 11.2492C37.6773 11.2492 36.6821 10.2079 36.6821 8.87607C36.6821 7.5442 37.7009 6.50294 38.9803 6.50294C39.5964 6.50294 40.1887 6.74509 40.6151 7.18097C41.0416 7.61685 41.2786 8.22224 41.2786 8.87607C41.2786 10.2079 40.2598 11.2492 38.9803 11.2492Z"
//                       fill="#5D5FEF"
//                     />
//                     <path
//                       d="M48.5509 6.60073C48.7405 6.18907 48.845 6.04903 49.0582 5.78265C48.3058 5.15607 47.5268 4.93275 46.9107 4.90853C46.2948 4.88431 45.7261 5.05383 45.2522 5.39284V5.05383H44.4467C44.0439 5.05383 43.6885 5.39284 43.6885 5.82873V12.0037C43.6885 12.4154 44.0202 12.7786 44.4467 12.7786H45.2522V11.2288C45.2522 10.2844 45.2522 9.34 45.2522 8.4198C45.2522 8.00814 45.3233 7.66911 45.4655 7.35431C45.7261 6.82156 46.0815 6.5552 46.6027 6.48255C46.6501 6.48255 46.6975 6.48255 46.7212 6.48255C46.9107 6.48255 47.5813 6.43772 48.3197 7.02158C48.5567 7.14266 48.4562 6.81868 48.5509 6.60073Z"
//                       fill="#5D5FEF"
//                     />
//                     <path
//                       d="M53.6635 7.78771C53.6635 7.4729 53.6397 7.20654 53.5687 6.94016C53.3555 6.14104 52.9053 5.55987 52.2182 5.19663C51.6732 4.90605 51.0809 4.8334 50.4412 4.95447C50.3227 4.97869 50.1806 5.0029 50.0621 5.05133C49.1617 5.36614 47.8823 6.31056 47.8823 9.26487C47.8823 9.89447 47.8823 10.5241 47.8823 11.1779V12.0255C47.8823 12.4371 48.214 12.8004 48.6405 12.8004H49.4461V11.2506C49.4461 10.3061 49.4461 9.36173 49.4461 8.44153C49.4461 8.02987 49.5172 7.69085 49.6593 7.40025C49.9199 6.86751 50.2754 6.57692 50.7966 6.52849C50.8439 6.52849 50.8913 6.52849 50.9151 6.52849C51.3415 6.52849 51.7443 6.79486 51.9339 7.20654C52.0286 7.40025 52.0523 7.6182 52.0523 7.88457C52.0523 8.99849 52.0523 10.0882 52.0523 11.2021V12.0497C52.0523 12.4613 52.3841 12.8245 52.8105 12.8245H53.6161V11.2506C53.6635 10.064 53.6635 8.92584 53.6635 7.78771Z"
//                       fill="#5D5FEF"
//                     />
//                     <path
//                       d="M59.5707 9.56037V11.2555H59.3338H58.1254C57.7937 11.2555 57.4857 11.2555 57.154 11.2555C56.9882 11.2555 56.846 11.2312 56.7038 11.1586C56.3248 10.9649 56.0879 10.5774 56.0879 10.1658C56.0879 9.75408 56.3248 9.36664 56.7038 9.17291C56.846 9.12448 56.9882 9.10026 57.154 9.10026C57.4857 9.10026 57.7937 9.10026 58.1254 9.10026H58.9074H60.3762C60.7791 9.10026 61.0871 8.76125 61.0871 8.37379V6.96929C61.0871 6.92085 61.0871 6.87242 61.0871 6.84821C60.8976 5.78271 59.9972 5.00781 58.931 5.00781H57.3199C56.9171 5.00781 56.5617 5.34683 56.5617 5.78271V6.58183H58.931C59.2153 6.58183 59.4522 6.75134 59.5471 7.01772C59.5471 7.04193 59.5707 7.06615 59.5707 7.11458V7.57468H59.2864C59.0021 7.57468 58.6941 7.57468 58.4098 7.57468C57.9122 7.57468 57.4857 7.57468 57.1066 7.57468C56.4669 7.57468 55.8746 7.81684 55.4008 8.27693C54.8321 8.78545 54.5479 9.39085 54.5479 10.1415V10.1658C54.5479 10.9407 54.8321 11.5945 55.4008 12.1272C55.8746 12.5873 56.4669 12.8294 57.1066 12.8294C57.4857 12.8294 57.8885 12.8294 58.4098 12.8294C58.6704 12.8294 58.9547 12.8294 59.2153 12.8294H59.6418H61.0871V9.56037H59.5707Z"
//                       fill="#5D5FEF"
//                     />
//                     <path
//                       d="M69.8775 8.17692C69.5931 6.26389 67.982 4.85938 66.0866 4.85938C65.8971 4.85938 65.7312 4.8836 65.5416 4.9078C65.3048 4.93202 65.0915 4.98045 64.8783 5.0531C64.5228 5.17418 64.286 5.48899 64.286 5.87643V7.2083C64.7124 6.7482 65.3284 6.45762 66.0156 6.45762C66.6553 6.45762 67.2476 6.69977 67.6977 7.15987C68.1479 7.61996 68.3849 8.22535 68.3849 8.90339C68.3849 10.2595 67.3423 11.325 66.0156 11.3492C65.3759 11.3492 64.7834 11.107 64.3333 10.6469C63.8831 10.1868 63.6463 9.58144 63.6463 8.92761V5.77957V5.07732H62.9117C62.4616 5.07732 62.0825 5.46477 62.0825 5.92487V17.9116H62.817C63.2672 17.9116 63.6463 17.5242 63.6463 17.064V12.0272C64.3333 12.5842 65.1863 12.8748 66.0629 12.8748C66.8211 12.8748 67.5556 12.6568 68.1716 12.2209C69.5458 11.2765 70.1144 9.87202 69.8775 8.17692Z"
//                       fill="#5D5FEF"
//                     />
//                     <path
//                       d="M7.99028 17.8815C5.14157 10.07 6.34011 2.79115 7.29547 0.128145C4.4294 -0.138156 0 2.43608 0 7.40703C0 11.3838 2.83713 13.5615 4.25569 14.1534C3.53194 13.7686 1.9802 12.307 1.56331 9.53743C1.04221 6.07553 3.21348 4.47773 4.51624 3.85636C4.082 7.31826 4.9505 11.1352 5.6453 12.9106C6.34011 14.686 6.42696 14.8635 7.99028 17.8815Z"
//                       fill="#5D5FEF"
//                     />
//                     <path
//                       d="M7.55297 10.2153C5.95179 10.2153 4.65379 8.8887 4.65379 7.2522C4.65379 5.61571 5.95179 4.28906 7.55297 4.28906C9.15414 4.28906 10.4521 5.61571 10.4521 7.2522C10.4521 8.8887 9.15414 10.2153 7.55297 10.2153Z"
//                       fill="#5D5FEF"
//                     />
//                     <path
//                       d="M6.14424 7.39062H5.32373C5.34955 7.85101 5.50857 8.28563 5.78192 8.64777C5.93565 8.55902 6.10824 8.48293 6.29469 8.42087C6.20598 8.10407 6.15439 7.75426 6.14424 7.39062Z"
//                       fill="white"
//                     />
//                     <path
//                       d="M6.14424 7.11654C6.15439 6.75289 6.20598 6.40308 6.29469 6.08625C6.10824 6.02421 5.93566 5.94812 5.78193 5.85938C5.50857 6.22151 5.34955 6.65614 5.32373 7.11654H6.14424Z"
//                       fill="white"
//                     />
//                     <path
//                       d="M6.76264 5.60674C6.71303 5.70038 6.66823 5.80079 6.62842 5.90685C6.87655 5.96746 7.14505 6.00365 7.42227 6.01231V4.98438C7.17821 5.04143 6.94777 5.25735 6.76264 5.60674Z"
//                       fill="white"
//                     />
//                     <path
//                       d="M7.68311 4.98438V6.01231C7.96032 6.00364 8.22882 5.96744 8.47695 5.90684C8.43712 5.80079 8.39232 5.70036 8.34272 5.60674C8.1576 5.25735 7.92716 5.04143 7.68311 4.98438Z"
//                       fill="white"
//                     />
//                     <path
//                       d="M8.55972 6.16406C8.28527 6.233 7.98854 6.27384 7.68311 6.28291V7.12142H8.69984C8.68985 6.78213 8.64187 6.45705 8.55972 6.16406Z"
//                       fill="white"
//                     />
//                     <path
//                       d="M6.3762 8.67188C6.2252 8.72214 6.08459 8.78231 5.95752 8.85156C5.96301 8.85729 5.96841 8.86308 5.97396 8.86877C6.20639 9.10632 6.48107 9.28491 6.78061 9.39753C6.69135 9.29277 6.60832 9.16883 6.53304 9.02677C6.47452 8.91631 6.42219 8.79746 6.3762 8.67188Z"
//                       fill="white"
//                     />
//                     <path
//                       d="M8.72912 5.83501C8.88013 5.78475 9.02074 5.72458 9.14781 5.65534C9.14231 5.64961 9.13692 5.6438 9.13137 5.63813C8.89894 5.40058 8.62426 5.22199 8.32471 5.10938C8.41397 5.21413 8.49701 5.33807 8.57228 5.48013C8.6308 5.59058 8.68313 5.70942 8.72912 5.83501Z"
//                       fill="white"
//                     />
//                     <path
//                       d="M8.96198 7.39062C8.95182 7.75426 8.90024 8.10407 8.81152 8.42089C8.99798 8.48293 9.17056 8.55902 9.3243 8.64777C9.59764 8.28565 9.75666 7.85103 9.78247 7.39064L8.96198 7.39062Z"
//                       fill="white"
//                     />
//                     <path
//                       d="M8.72914 8.67188C8.68315 8.79746 8.63081 8.9163 8.57229 9.02676C8.49702 9.16882 8.41398 9.29276 8.32471 9.39751C8.62426 9.2849 8.89894 9.10631 9.13137 8.86876C9.13692 8.86308 9.14231 8.85727 9.1478 8.85154C9.02074 8.78232 8.88014 8.72214 8.72914 8.67188Z"
//                       fill="white"
//                     />
//                     <path
//                       d="M6.37618 5.83501C6.42217 5.70942 6.47449 5.59059 6.53302 5.48013C6.6083 5.33807 6.69134 5.21413 6.78061 5.10938C6.48106 5.22199 6.20638 5.40058 5.97395 5.63813C5.9684 5.6438 5.963 5.64961 5.95752 5.65534C6.08458 5.72458 6.22518 5.78475 6.37618 5.83501Z"
//                       fill="white"
//                     />
//                     <path
//                       d="M8.81152 6.08625C8.90025 6.40307 8.95182 6.75288 8.96198 7.11653H9.78248C9.75667 6.65613 9.59764 6.22149 9.3243 5.85938C9.17056 5.94811 8.99798 6.0242 8.81152 6.08625Z"
//                       fill="white"
//                     />
//                     <path
//                       d="M7.42251 7.12142V6.2829C7.11708 6.27383 6.82034 6.23298 6.54588 6.16406C6.46373 6.45703 6.41575 6.78211 6.40576 7.12142H7.42251Z"
//                       fill="white"
//                     />
//                     <path
//                       d="M7.68311 7.39064V8.22914C7.98853 8.23822 8.28527 8.27906 8.55972 8.34797C8.64187 8.05501 8.68985 7.72994 8.69984 7.39062L7.68311 7.39064Z"
//                       fill="white"
//                     />
//                     <path
//                       d="M8.34272 8.89777C8.39233 8.80413 8.43713 8.70372 8.47695 8.59766C8.22882 8.53705 7.96033 8.50086 7.68311 8.49219V9.52012C7.92717 9.46307 8.15761 9.24715 8.34272 8.89777Z"
//                       fill="white"
//                     />
//                     <path
//                       d="M7.42227 9.52012V8.49219C7.14505 8.50086 6.87656 8.53705 6.62842 8.59766C6.66824 8.70371 6.71304 8.80413 6.76264 8.89777C6.94778 9.24715 7.17822 9.46307 7.42227 9.52012Z"
//                       fill="white"
//                     />
//                     <path
//                       d="M7.42251 7.39062H6.40576C6.41576 7.72994 6.46373 8.05501 6.54588 8.34797C6.82033 8.27905 7.11708 8.23821 7.42251 8.22914V7.39062Z"
//                       fill="white"
//                     />
//                     <path
//                       d="M9.03927 0.453125C10.51 0.920005 11.7857 1.87599 12.6637 3.16909C13.5417 4.46218 13.9715 6.01817 13.8849 7.58963C13.7982 9.1611 13.2 10.6579 12.1854 11.8419C11.1708 13.0259 9.79799 13.8294 8.28529 14.1244L8.00391 12.6172C9.18771 12.3864 10.262 11.7576 11.056 10.831C11.8501 9.9044 12.3181 8.73308 12.386 7.50328C12.4538 6.27349 12.1174 5.05583 11.4303 4.04387C10.7432 3.03193 9.74488 2.2838 8.59396 1.91844L9.03927 0.453125Z"
//                       fill="#5D5FEF"
//                     />
//                   </g>
//                   <defs>
//                     <clipPath id="clip0_8091_33206_expanded">
//                       <rect width="70" height="18" fill="white" />
//                     </clipPath>
//                   </defs>
//                 </svg>
//               </div>
//             </div>
//           </div>
//         </main>

//         <ViewAllSheet
//           open={viewAll.open}
//           type={viewAll.type}
//           items={viewAll.items}
//           onClose={closeViewAll}
//           onCreateNew={() => {
//             closeViewAll();
//             if (viewAll.type === "kbs") {
//               startChat();
//             } else {
//               createNewChat?.();
//             }
//           }}
//           onSelectItem={(item) => {
//             if (viewAll.type === "kbs") {
//               const batchId = item.batch_id || item.id;
//               const title = item.title || item.link_url || "";
//               closeViewAll();
//               setIsSessionMenuOpen(false);
//               startExistingKbChat?.({ batchId, title });
//             } else {
//               closeViewAll();
//               setIsSessionMenuOpen(false);
//               switchSession?.(item);
//             }
//           }}
//         />
//       </section>
//     );
//   }

//   // Normal collapsed view
//   return (
//     <section
//       id="wm-chat-panel"
//       className={panelClassNames}
//       aria-hidden={!isOpen}
//     >
//       <ChatPanelHeader
//         logoUrl={logoUrl}
//         chatTitle={
//           state.status === "ready" ||
//           state.status === "running" ||
//           state.status === "error"
//             ? state.chat?.chatTitle || "New Chat"
//             : "Webmap Network"
//         }
//         subtitle={headerSubtitle}
//         onClose={onClose}
//         showControls={canShowHeaderControls}
//         onRestart={state.status === "idle" ? startChat : handleStartOver}
//         hasSuggestions={hasSuggestions}
//         showSuggestions={showSuggestions}
//         onToggleSuggestions={toggleSuggestions}
//         isExpanded={isExpanded}
//         onToggleExpand={toggleExpanded}
//         canOpenSessions={canOpenSessions}
//         onOpenSessions={openSessions}
//         isHome={
//           state.status !== "ready" &&
//           state.status !== "running" &&
//           state.status !== "error"
//         }
//       />
//       <div className="wm-chat-sidebar__body">
//         <main className="agent-container">{bodyContent}</main>
//       </div>
//       <SessionMenu
//         knowledgeBatchId={knowledgeBatchId}
//         userUuid={user?.uuid}
//         user={user}
//         userName={user?.username}
//         isOpen={isSessionMenuOpen}
//         showThreads={state.status === "ready"}
//         onClose={() => setIsSessionMenuOpen(false)}
//         onCreateNew={() => {
//           setIsSessionMenuOpen(false);
//           createNewChat?.();
//         }}
//         onStartNewKb={() => {
//           setIsSessionMenuOpen(false);
//           startChat();
//         }}
//         onSelectSession={(s) => {
//           setIsSessionMenuOpen(false);
//           switchSession?.(s);
//         }}
//         onOpenKb={({ batchId, title }) => {
//           setIsSessionMenuOpen(false);
//           startExistingKbChat?.({ batchId, title });
//         }}
//         onViewAll={openViewAll}
//       />
//       <div className="wm-chat-sidebar__footer">
//         <ChatPanelFooter
//           status={state.status}
//           chat={state.chat}
//           message={messageInput}
//           onMessageChange={(event) => setMessageInput(event.target.value)}
//           onSubmit={handleSend}
//           onKeyDown={handleInputKeyDown}
//           canSend={canSend}
//           attachedImages={attachedImages}
//           setAttachedImages={setAttachedImages}
//         />
//         <div className="copy-right">
//           <p>Powered by.</p>
//           <svg
//             width="70"
//             height="18"
//             viewBox="0 0 70 18"
//             fill="none"
//             xmlns="http://www.w3.org/2000/svg"
//           >
//             <g clipPath="url(#clip0_8091_33206)">
//               <path
//                 d="M25.8331 5.02888C25.7384 5.02888 25.6199 5.02888 25.5251 5.02888C25.5251 5.02888 25.5251 5.02888 25.5014 5.02888C25.3829 5.02888 25.2645 5.0531 25.1697 5.10153C25.0276 5.1984 25.0038 5.31948 24.9802 5.39212L23.3453 9.55722L22.1844 6.31232C22.0422 5.92487 21.9001 5.53742 21.758 5.14996C21.6868 4.98045 21.5447 4.85938 21.3551 4.85938H21.3315C21.284 4.85938 21.213 4.85938 21.1656 4.85938C20.976 4.85938 20.8102 4.98045 20.7392 5.14996C20.3127 6.36075 19.8625 7.57153 19.436 8.78232L19.8862 9.96888C20.0046 10.3079 20.4786 10.3079 20.5969 9.96888C20.8102 9.38771 21.0234 8.80654 21.2366 8.22535L22.2554 11.0344C22.445 11.5429 22.6109 12.0272 22.8004 12.5358C22.8715 12.7053 23.0136 12.8263 23.2032 12.8263H23.2268C23.2743 12.8263 23.3217 12.8263 23.3691 12.8263H23.3927C23.5823 12.8263 23.7244 12.7295 23.7955 12.5358C24.53 10.6469 25.2645 8.75811 25.999 6.86928L26.5202 5.53742C26.5202 5.5132 26.5439 5.48899 26.5439 5.46477L26.6861 4.95624L25.8331 5.02888Z"
//                 fill="#5D5FEF"
//               />
//               <path
//                 d="M18.8435 8.6886C18.3933 7.55046 17.9668 6.43653 17.5167 5.2984C17.4456 5.12889 17.3035 5.00781 17.0902 5.00781C16.9718 5.00781 16.8295 5.00781 16.7112 5.00781H16.4031H16.3557C16.3321 5.00781 16.3083 5.00781 16.3083 5.00781L15.7871 5.03203L15.9766 5.51635L18.3223 11.5461C18.4408 11.8851 18.5829 12.1999 18.7014 12.5389C18.7724 12.7084 18.9146 12.8294 19.1041 12.8294H19.1278C19.1752 12.8294 19.2226 12.8294 19.2463 12.8294H19.2699C19.4595 12.8294 19.6017 12.7084 19.6728 12.5389C19.7675 12.2483 19.886 11.9819 19.9808 11.6913L18.8435 8.6886Z"
//                 fill="#5D5FEF"
//               />
//               <path
//                 d="M34.1968 7.79102C34.1494 7.64573 34.1257 7.50044 34.0783 7.35515C34.0547 7.2825 34.0309 7.20985 33.9836 7.11299C33.9362 6.96769 33.8651 6.84661 33.794 6.72554C33.1069 5.56318 31.8749 4.8125 30.4296 4.8125C28.2262 4.8125 26.4966 6.58024 26.4966 8.80808C26.4966 9.89779 26.8993 10.8906 27.6339 11.6656C28.3683 12.4162 29.3635 12.8278 30.4296 12.8278C31.1404 12.8278 31.8038 12.6584 32.3961 12.2951C32.4909 12.2467 32.6093 12.1499 32.7516 12.0288C33.178 11.6656 33.1543 10.9875 32.7042 10.6485L32.3013 10.3579L32.0881 10.5758C31.6616 11.0117 31.0693 11.2296 30.4533 11.2296C29.8136 11.2296 29.2212 10.9875 28.7711 10.5274C28.6526 10.4063 28.5342 10.261 28.4394 10.1157C28.4394 10.1157 28.4394 10.1157 28.4394 10.0915C28.3209 9.89779 28.2262 9.65563 28.1551 9.43769C27.7997 8.15426 28.5342 7.33093 28.5342 7.33093C28.9606 6.74976 29.6477 6.3623 30.4296 6.3623C31.4484 6.3623 32.3251 7.01612 32.6567 7.96054H29.4345C29.008 7.96054 28.6763 8.29956 28.6763 8.73544C28.6763 8.95338 28.7 9.19554 28.7711 9.43769H32.9174C33.7703 9.48612 34.41 8.63857 34.1968 7.79102Z"
//                 fill="#5D5FEF"
//               />
//               <path
//                 d="M36.6585 6.92762V0.812408C36.6585 0.424957 36.3505 0.0859375 35.9477 0.0859375H35.0947V0.52182V4.3479C35.0947 5.00172 35.0947 8.18684 35.0947 8.84066C35.4027 8.33213 35.8293 7.94469 36.2557 7.67831C36.5164 7.5088 36.6585 7.24242 36.6585 6.92762Z"
//                 fill="#5D5FEF"
//               />
//               <path
//                 d="M42.7475 8.17382C42.558 7.05989 41.9894 6.18813 41.0653 5.58274C40.4257 5.17107 39.7385 4.95312 38.9803 4.95312C38.7197 4.95312 38.4354 4.97735 38.1511 5.04999C38.1511 5.04999 35.1184 5.72804 35.0947 8.65813C35.0947 8.70656 35.0947 8.75499 35.0947 8.80343C35.0947 9.09401 35.1184 9.36038 35.1657 9.57833C35.3553 10.6922 35.9239 11.564 36.8242 12.1694C37.464 12.6052 38.1747 12.8232 38.9093 12.8232C39.1461 12.8232 39.3831 12.799 39.6437 12.7506C40.7336 12.5568 41.5866 11.9757 42.1789 11.0555C42.7475 10.1837 42.9371 9.21509 42.7475 8.17382ZM38.9803 11.2492C37.6773 11.2492 36.6821 10.2079 36.6821 8.87607C36.6821 7.5442 37.7009 6.50294 38.9803 6.50294C39.5964 6.50294 40.1887 6.74509 40.6151 7.18097C41.0416 7.61685 41.2786 8.22224 41.2786 8.87607C41.2786 10.2079 40.2598 11.2492 38.9803 11.2492Z"
//                 fill="#5D5FEF"
//               />
//               <path
//                 d="M48.5509 6.60073C48.7405 6.18907 48.845 6.04903 49.0582 5.78265C48.3058 5.15607 47.5268 4.93275 46.9107 4.90853C46.2948 4.88431 45.7261 5.05383 45.2522 5.39284V5.05383H44.4467C44.0439 5.05383 43.6885 5.39284 43.6885 5.82873V12.0037C43.6885 12.4154 44.0202 12.7786 44.4467 12.7786H45.2522V11.2288C45.2522 10.2844 45.2522 9.34 45.2522 8.4198C45.2522 8.00814 45.3233 7.66911 45.4655 7.35431C45.7261 6.82156 46.0815 6.5552 46.6027 6.48255C46.6501 6.48255 46.6975 6.48255 46.7212 6.48255C46.9107 6.48255 47.5813 6.43772 48.3197 7.02158C48.5567 7.14266 48.4562 6.81868 48.5509 6.60073Z"
//                 fill="#5D5FEF"
//               />
//               <path
//                 d="M53.6635 7.78771C53.6635 7.4729 53.6397 7.20654 53.5687 6.94016C53.3555 6.14104 52.9053 5.55987 52.2182 5.19663C51.6732 4.90605 51.0809 4.8334 50.4412 4.95447C50.3227 4.97869 50.1806 5.0029 50.0621 5.05133C49.1617 5.36614 47.8823 6.31056 47.8823 9.26487C47.8823 9.89447 47.8823 10.5241 47.8823 11.1779V12.0255C47.8823 12.4371 48.214 12.8004 48.6405 12.8004H49.4461V11.2506C49.4461 10.3061 49.4461 9.36173 49.4461 8.44153C49.4461 8.02987 49.5172 7.69085 49.6593 7.40025C49.9199 6.86751 50.2754 6.57692 50.7966 6.52849C50.8439 6.52849 50.8913 6.52849 50.9151 6.52849C51.3415 6.52849 51.7443 6.79486 51.9339 7.20654C52.0286 7.40025 52.0523 7.6182 52.0523 7.88457C52.0523 8.99849 52.0523 10.0882 52.0523 11.2021V12.0497C52.0523 12.4613 52.3841 12.8245 52.8105 12.8245H53.6161V11.2506C53.6635 10.064 53.6635 8.92584 53.6635 7.78771Z"
//                 fill="#5D5FEF"
//               />
//               <path
//                 d="M59.5707 9.56037V11.2555H59.3338H58.1254C57.7937 11.2555 57.4857 11.2555 57.154 11.2555C56.9882 11.2555 56.846 11.2312 56.7038 11.1586C56.3248 10.9649 56.0879 10.5774 56.0879 10.1658C56.0879 9.75408 56.3248 9.36664 56.7038 9.17291C56.846 9.12448 56.9882 9.10026 57.154 9.10026C57.4857 9.10026 57.7937 9.10026 58.1254 9.10026H58.9074H60.3762C60.7791 9.10026 61.0871 8.76125 61.0871 8.37379V6.96929C61.0871 6.92085 61.0871 6.87242 61.0871 6.84821C60.8976 5.78271 59.9972 5.00781 58.931 5.00781H57.3199C56.9171 5.00781 56.5617 5.34683 56.5617 5.78271V6.58183H58.931C59.2153 6.58183 59.4522 6.75134 59.5471 7.01772C59.5471 7.04193 59.5707 7.06615 59.5707 7.11458V7.57468H59.2864C59.0021 7.57468 58.6941 7.57468 58.4098 7.57468C57.9122 7.57468 57.4857 7.57468 57.1066 7.57468C56.4669 7.57468 55.8746 7.81684 55.4008 8.27693C54.8321 8.78545 54.5479 9.39085 54.5479 10.1415V10.1658C54.5479 10.9407 54.8321 11.5945 55.4008 12.1272C55.8746 12.5873 56.4669 12.8294 57.1066 12.8294C57.4857 12.8294 57.8885 12.8294 58.4098 12.8294C58.6704 12.8294 58.9547 12.8294 59.2153 12.8294H59.6418H61.0871V9.56037H59.5707Z"
//                 fill="#5D5FEF"
//               />
//               <path
//                 d="M69.8775 8.17692C69.5931 6.26389 67.982 4.85938 66.0866 4.85938C65.8971 4.85938 65.7312 4.8836 65.5416 4.9078C65.3048 4.93202 65.0915 4.98045 64.8783 5.0531C64.5228 5.17418 64.286 5.48899 64.286 5.87643V7.2083C64.7124 6.7482 65.3284 6.45762 66.0156 6.45762C66.6553 6.45762 67.2476 6.69977 67.6977 7.15987C68.1479 7.61996 68.3849 8.22535 68.3849 8.90339C68.3849 10.2595 67.3423 11.325 66.0156 11.3492C65.3759 11.3492 64.7834 11.107 64.3333 10.6469C63.8831 10.1868 63.6463 9.58144 63.6463 8.92761V5.77957V5.07732H62.9117C62.4616 5.07732 62.0825 5.46477 62.0825 5.92487V17.9116H62.817C63.2672 17.9116 63.6463 17.5242 63.6463 17.064V12.0272C64.3333 12.5842 65.1863 12.8748 66.0629 12.8748C66.8211 12.8748 67.5556 12.6568 68.1716 12.2209C69.5458 11.2765 70.1144 9.87202 69.8775 8.17692Z"
//                 fill="#5D5FEF"
//               />
//               <path
//                 d="M7.99028 17.8815C5.14157 10.07 6.34011 2.79115 7.29547 0.128145C4.4294 -0.138156 0 2.43608 0 7.40703C0 11.3838 2.83713 13.5615 4.25569 14.1534C3.53194 13.7686 1.9802 12.307 1.56331 9.53743C1.04221 6.07553 3.21348 4.47773 4.51624 3.85636C4.082 7.31826 4.9505 11.1352 5.6453 12.9106C6.34011 14.686 6.42696 14.8635 7.99028 17.8815Z"
//                 fill="#5D5FEF"
//               />
//               <path
//                 d="M7.55297 10.2153C5.95179 10.2153 4.65379 8.8887 4.65379 7.2522C4.65379 5.61571 5.95179 4.28906 7.55297 4.28906C9.15414 4.28906 10.4521 5.61571 10.4521 7.2522C10.4521 8.8887 9.15414 10.2153 7.55297 10.2153Z"
//                 fill="#5D5FEF"
//               />
//               <path
//                 d="M6.14424 7.39062H5.32373C5.34955 7.85101 5.50857 8.28563 5.78192 8.64777C5.93565 8.55902 6.10824 8.48293 6.29469 8.42087C6.20598 8.10407 6.15439 7.75426 6.14424 7.39062Z"
//                 fill="white"
//               />
//               <path
//                 d="M6.14424 7.11654C6.15439 6.75289 6.20598 6.40308 6.29469 6.08625C6.10824 6.02421 5.93566 5.94812 5.78193 5.85938C5.50857 6.22151 5.34955 6.65614 5.32373 7.11654H6.14424Z"
//                 fill="white"
//               />
//               <path
//                 d="M6.76264 5.60674C6.71303 5.70038 6.66823 5.80079 6.62842 5.90685C6.87655 5.96746 7.14505 6.00365 7.42227 6.01231V4.98438C7.17821 5.04143 6.94777 5.25735 6.76264 5.60674Z"
//                 fill="white"
//               />
//               <path
//                 d="M7.68311 4.98438V6.01231C7.96032 6.00364 8.22882 5.96744 8.47695 5.90684C8.43712 5.80079 8.39232 5.70036 8.34272 5.60674C8.1576 5.25735 7.92716 5.04143 7.68311 4.98438Z"
//                 fill="white"
//               />
//               <path
//                 d="M8.55972 6.16406C8.28527 6.233 7.98854 6.27384 7.68311 6.28291V7.12142H8.69984C8.68985 6.78213 8.64187 6.45705 8.55972 6.16406Z"
//                 fill="white"
//               />
//               <path
//                 d="M6.3762 8.67188C6.2252 8.72214 6.08459 8.78231 5.95752 8.85156C5.96301 8.85729 5.96841 8.86308 5.97396 8.86877C6.20639 9.10632 6.48107 9.28491 6.78061 9.39753C6.69135 9.29277 6.60832 9.16883 6.53304 9.02677C6.47452 8.91631 6.42219 8.79746 6.3762 8.67188Z"
//                 fill="white"
//               />
//               <path
//                 d="M8.72912 5.83501C8.88013 5.78475 9.02074 5.72458 9.14781 5.65534C9.14231 5.64961 9.13692 5.6438 9.13137 5.63813C8.89894 5.40058 8.62426 5.22199 8.32471 5.10938C8.41397 5.21413 8.49701 5.33807 8.57228 5.48013C8.6308 5.59058 8.68313 5.70942 8.72912 5.83501Z"
//                 fill="white"
//               />
//               <path
//                 d="M8.96198 7.39062C8.95182 7.75426 8.90024 8.10407 8.81152 8.42089C8.99798 8.48293 9.17056 8.55902 9.3243 8.64777C9.59764 8.28565 9.75666 7.85103 9.78247 7.39064L8.96198 7.39062Z"
//                 fill="white"
//               />
//               <path
//                 d="M8.72914 8.67188C8.68315 8.79746 8.63081 8.9163 8.57229 9.02676C8.49702 9.16882 8.41398 9.29276 8.32471 9.39751C8.62426 9.2849 8.89894 9.10631 9.13137 8.86876C9.13692 8.86308 9.14231 8.85727 9.1478 8.85154C9.02074 8.78232 8.88014 8.72214 8.72914 8.67188Z"
//                 fill="white"
//               />
//               <path
//                 d="M6.37618 5.83501C6.42217 5.70942 6.47449 5.59059 6.53302 5.48013C6.6083 5.33807 6.69134 5.21413 6.78061 5.10938C6.48106 5.22199 6.20638 5.40058 5.97395 5.63813C5.9684 5.6438 5.963 5.64961 5.95752 5.65534C6.08458 5.72458 6.22518 5.78475 6.37618 5.83501Z"
//                 fill="white"
//               />
//               <path
//                 d="M8.81152 6.08625C8.90025 6.40307 8.95182 6.75288 8.96198 7.11653H9.78248C9.75667 6.65613 9.59764 6.22149 9.3243 5.85938C9.17056 5.94811 8.99798 6.0242 8.81152 6.08625Z"
//                 fill="white"
//               />
//               <path
//                 d="M7.42251 7.12142V6.2829C7.11708 6.27383 6.82034 6.23298 6.54588 6.16406C6.46373 6.45703 6.41575 6.78211 6.40576 7.12142H7.42251Z"
//                 fill="white"
//               />
//               <path
//                 d="M7.68311 7.39064V8.22914C7.98853 8.23822 8.28527 8.27906 8.55972 8.34797C8.64187 8.05501 8.68985 7.72994 8.69984 7.39062L7.68311 7.39064Z"
//                 fill="white"
//               />
//               <path
//                 d="M8.34272 8.89777C8.39233 8.80413 8.43713 8.70372 8.47695 8.59766C8.22882 8.53705 7.96033 8.50086 7.68311 8.49219V9.52012C7.92717 9.46307 8.15761 9.24715 8.34272 8.89777Z"
//                 fill="white"
//               />
//               <path
//                 d="M7.42227 9.52012V8.49219C7.14505 8.50086 6.87656 8.53705 6.62842 8.59766C6.66824 8.70371 6.71304 8.80413 6.76264 8.89777C6.94778 9.24715 7.17822 9.46307 7.42227 9.52012Z"
//                 fill="white"
//               />
//               <path
//                 d="M7.42251 7.39062H6.40576C6.41576 7.72994 6.46373 8.05501 6.54588 8.34797C6.82033 8.27905 7.11708 8.23821 7.42251 8.22914V7.39062Z"
//                 fill="white"
//               />
//               <path
//                 d="M9.03927 0.453125C10.51 0.920005 11.7857 1.87599 12.6637 3.16909C13.5417 4.46218 13.9715 6.01817 13.8849 7.58963C13.7982 9.1611 13.2 10.6579 12.1854 11.8419C11.1708 13.0259 9.79799 13.8294 8.28529 14.1244L8.00391 12.6172C9.18771 12.3864 10.262 11.7576 11.056 10.831C11.8501 9.9044 12.3181 8.73308 12.386 7.50328C12.4538 6.27349 12.1174 5.05583 11.4303 4.04387C10.7432 3.03193 9.74488 2.2838 8.59396 1.91844L9.03927 0.453125Z"
//                 fill="#5D5FEF"
//               />
//             </g>
//             <defs>
//               <clipPath id="clip0_8091_33206">
//                 <rect width="70" height="18" fill="white" />
//               </clipPath>
//             </defs>
//           </svg>
//         </div>
//       </div>
//       <ViewAllSheet
//         open={viewAll.open}
//         type={viewAll.type}
//         items={viewAll.items}
//         onClose={closeViewAll}
//         onCreateNew={() => {
//           closeViewAll();
//           if (viewAll.type === "kbs") {
//             startChat();
//           } else {
//             createNewChat?.();
//           }
//         }}
//         onSelectItem={(item) => {
//           if (viewAll.type === "kbs") {
//             const batchId = item.batch_id || item.id;
//             const title = item.title || item.link_url || "";
//             closeViewAll();
//             setIsSessionMenuOpen(false);
//             startExistingKbChat?.({ batchId, title });
//           } else {
//             closeViewAll();  
//             setIsSessionMenuOpen(false);
//             switchSession?.(item);
//           }
//         }}
//       />
//     </section>
//   );
// }
import { useCallback, useEffect, useMemo, useState } from "react";
import { CHAT_EMPTY_STATE, CHAT_HEADER_TEXT } from "../../../constants/chat.js";
import { ChatPanelHeader } from "./ChatPanelHeader.jsx";
import { ChatPanelBody } from "./ChatPanelBody.jsx";
import { ChatPanelFooter } from "./ChatPanelFooter.jsx";
import { ChatProgress } from "./ChatProgress.jsx";
import { ChatErrorState } from "./ChatErrorState.jsx";
import { ChatEmptyState } from "./ChatEmptyState.jsx";
import { ChatMessageList } from "./ChatMessageList.jsx";
// Start screen now shows a Knowledge Base list for reuse
import { KbList } from "./KbList.jsx";
import { SessionMenu } from "./SessionMenu.jsx";
import { ViewAllSheet } from "./ViewAllSheet.jsx";

export function ChatPanel({
  logoUrl,
  isOpen,
  user,
  accessToken,
  refreshToken,
  onClose,
  state,
  htmlPreference,
  isHtmlPreferenceLoading,
  isHtmlPreferenceSaving,
  onToggleHtmlPreference,
  startKnowledgeChat,
  startExistingKbChat,
  sendMessage,
  createNewChat,
  switchSession,
  resetWorkflow,
}) {
  const currentUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return "";
    }
    return window.location.href;
  }, []);

  const defaultTitle = useMemo(() => {
    if (typeof document !== "undefined" && document.title) {
      return document.title.slice(0, 80);
    }
    try {
      return new URL(currentUrl).hostname;
    } catch {
      return "Current page";
    }
  }, [currentUrl]);

  const [messageInput, setMessageInput] = useState("");
  const [kbComparison, setKbComparison] = useState("pending"); // none|same|changed|pending
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSessionMenuOpen, setIsSessionMenuOpen] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [attachedImages, setAttachedImages] = useState([]);
  const [viewAll, setViewAll] = useState({
    open: false,
    type: null,
    items: [],
  });
  const [selection, setSelection] = useState(null); // { text, rect }
  const [quotedText, setQuotedText] = useState(null);

  const hasSuggestions = Boolean(state.chat?.suggestions?.length);
  const canShowHeaderControls =
    state.status !== "idle" ||
    kbComparison === "same" ||
    kbComparison === "changed";
  const knowledgeBatchId = state?.context?.knowledgeBatchId || null;
  // Allow opening sessions whenever chat controls are shown (chat is active)
  // Also don't show sessions during processing/running state
  const canOpenSessions = canShowHeaderControls && state.status !== "running";

  const startChat = useCallback(() => {
    const normalizedTitle = defaultTitle?.trim() || "Current page";
    startKnowledgeChat({ title: normalizedTitle, note: "", url: currentUrl });
  }, [startKnowledgeChat, defaultTitle, currentUrl]);

  const toggleSuggestions = useCallback(() => {
    setShowSuggestions((value) => !value);
  }, []);

  const toggleExpanded = useCallback(() => {
    setIsExpanded((value) => !value);
  }, []);

  const openSessions = useCallback(() => {
    if (canOpenSessions) setIsSessionMenuOpen(true);
  }, [canOpenSessions]);

  const openViewAll = useCallback((payload) => {
    const { type, items } = payload || {};
    // Open the View All sheet first
    setViewAll({
      open: true,
      type: type || null,
      items: Array.isArray(items) ? items : [],
    });
    // Close the side menu once the sheet is opening
    setIsSessionMenuOpen(false);
  }, []);

  const closeViewAll = useCallback(
    () => setViewAll({ open: false, type: null, items: [] }),
    [],
  );

  useEffect(() => {
    if (!isOpen) {
      setMessageInput("");
      setShowSuggestions(false);
      setIsExpanded(false);
      setIsSessionMenuOpen(false);
      // Reset initial load flag when closing
      setIsInitialLoad(true);
      return;
    }
    // Mark as no longer initial load immediately to prevent layout glitch
    if (isOpen && isInitialLoad) {
      // Use requestAnimationFrame to update after the open transition starts
      // This prevents the delay-induced layout shift while still preventing content flash
      if (typeof window !== "undefined" && window.requestAnimationFrame) {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => setIsInitialLoad(false));
        });
      } else {
        setIsInitialLoad(false);
      }
    }
  }, [isOpen, isInitialLoad, state.status]);

  useEffect(() => {
    if (state.status === "error") {
      setShowSuggestions(false);
    }
  }, [state.status]);

  useEffect(() => {
    if (!hasSuggestions) {
      setShowSuggestions(false);
    }
  }, [hasSuggestions]);

  useEffect(() => {
    setIsSessionMenuOpen(false);
    setSelection(null);
  }, [state.status]);

  useEffect(() => {
    const handleDocumentClick = (e) => {
      const path = e.composedPath();
      const isInsidePopup = path.some(
        (el) => el.classList && el.classList.contains("learn-more-popup"),
      );
      if (!isInsidePopup) {
        setSelection(null);
      }
    };

    const handleScroll = () => {
      setSelection(null);
    };

    document.addEventListener("mousedown", handleDocumentClick);
    window.addEventListener("scroll", handleScroll, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      window.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, []);

  const handleRetry = () => {
    resetWorkflow();
    setMessageInput("");
    setShowSuggestions(false);
  };

  const handleStartOver = () => {
    resetWorkflow();
    setMessageInput("");
    setShowSuggestions(false);
  };

  // Allow typing when awaitingResponse, but block sending
  const canSend =
    state.status === "ready" &&
    state.chat.ready &&
    !state.chat.connecting &&
    !state.chat.awaitingResponse;

  const handleSend = (event) => {
    event.preventDefault();
    if (!canSend) return;
    const trimmed = messageInput.trim();
    // use selection for existence check as selectedText is undefined
    if (!trimmed && attachedImages.length === 0 && !selection && !quotedText)
      return;

    let finalMessage = trimmed;
    if (quotedText) {
      const quoted = `> ${quotedText}\n\n`;
      finalMessage = finalMessage ? `${quoted}${finalMessage}` : quoted;
    }

    if (attachedImages.length > 0) {
      const imageMarkdown = attachedImages
        .map((img) => `![Attached Image](${img})`)
        .join("\n\n");

      if (finalMessage) {
        finalMessage += `\n\n${imageMarkdown}`;
      } else {
        finalMessage = imageMarkdown;
      }
    }

    sendMessage(finalMessage);
    setMessageInput("");
    setAttachedImages([]);
    setSelection(null);
    setQuotedText(null);
  };

  const handleInputKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      // While assistant is typing, block submit via Enter
      if (state.chat.awaitingResponse) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      handleSend(event);
    }
  };

  const handleSuggestion = (suggestion) => {
    // Keep suggestions visible and jump to latest after sending
    sendMessage(suggestion, { mode: "suggested" });
    // Do not hide suggestions on click so the user can see and reuse them
  };

  const headerSubtitle = useMemo(() => {
    if (state.status === "ready") {
      if (!state.chat.ready) {
        return state.chat.connecting
          ? CHAT_HEADER_TEXT.connecting
          : CHAT_HEADER_TEXT.preparing;
      }
      return CHAT_HEADER_TEXT.ready;
    }
    if (state.status === "running") {
      return CHAT_HEADER_TEXT.running;
    }
    if (state.status === "error") {
      return CHAT_HEADER_TEXT.error;
    }
    return CHAT_HEADER_TEXT.idle;
  }, [state]);

  let bodyContent = null;

  // Prevent flash of old content on initial load/refresh
  if (isInitialLoad && isOpen) {
    bodyContent = null;
  } else if (state.status === "running") {
    bodyContent = (
      <ChatProgress
        steps={state.steps}
        knowledgeSummary={state.knowledgeSummary}
        isRunning
        onCancel={resetWorkflow}
      />
    );
  } else if (state.status === "error") {
    bodyContent = (
      <>
        <ChatErrorState
          message={state.error?.message}
          onRetry={handleRetry}
          actionLabel={state.error?.actionLabel}
        />
        <ChatProgress
          steps={state.steps}
          knowledgeSummary={state.knowledgeSummary}
          isRunning={false}
          onCancel={resetWorkflow}
        />
      </>
    );
  } else if (state.status === "ready") {
    // Skip loader screen when entering chat via an existing KB.
    if (!state.chat.messages.length && !state.chat.awaitingResponse) {
      bodyContent = (
        <ChatEmptyState description={CHAT_EMPTY_STATE.readyDescription} />
      );
    } else {
      bodyContent = (
        <ChatMessageList
          messages={state.chat.messages}
          awaitingResponse={state.chat.awaitingResponse}
          suggestions={state.chat.suggestions}
          showSuggestions={showSuggestions}
          onToggleSuggestions={toggleSuggestions}
          onSuggestionSelect={handleSuggestion}
          logoUrl={logoUrl}
          onLearnMore={(text) => {
            const quoted = `> ${text}\n\n`;
            setMessageInput((prev) => (prev ? `${quoted}${prev}` : quoted));
          }}
          onSelection={setSelection}
        />
      );
    }
  } else {
    bodyContent = (
      <>
        <KbList
          user={user}
          userName={user?.username}
          userUuid={user?.uuid}
          accessToken={accessToken}
          refreshToken={refreshToken}
          onCreateNewKb={startChat}
          onSelectKb={(kb) =>
            startExistingKbChat?.({ batchId: kb.batch_id, title: kb.title })
          }
          onCompared={setKbComparison}
        />
      </>
    );
  }

  const renderLearnMorePopup = () => {
    if (!selection) return null;

    return (
      <div
        className="learn-more-popup"
        style={{
          position: "absolute",
          top: `${Math.max(10, selection.rect.top - 50)}px`,
          left: `${selection.rect.left + selection.rect.width / 2}px`,
          transform: "translateX(-50%)",
          zIndex: 2147483647,
          padding: "4px",
          background: "white",
          borderRadius: "24px",
          boxShadow: "0 6px 20px rgba(0,0,0,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "auto",
        }}
      >
        <button
          type="button"
          className="learn-more-btn"
          onClick={(e) => {
            e.stopPropagation();
            setQuotedText(selection.text);
            setSelection(null);
            // Clear selection across document and shadow roots
            if (window.getSelection) window.getSelection().removeAllRanges();
          }}
          style={{
            backgroundColor: "#5D5FEF",
            color: "white",
            border: "none",
            borderRadius: "20px",
            padding: "8px 16px",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(93, 95, 239, 0.4)",
            whiteSpace: "nowrap",
            display: "flex",
            alignItems: "center",
            gap: "6px",
          }}
        >
          Learn More
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  };

  const panelClassNames = [
    "wm-chat-sidebar",
    isOpen ? "wm-chat-sidebar--open" : "",
    isExpanded ? "wm-chat-sidebar--expanded" : "",
    isInitialLoad ? "wm-chat-sidebar--initializing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (isExpanded) {
    return (
      <section
        id="wm-chat-panel"
        className={panelClassNames}
        aria-hidden={!isOpen}
      >
        <main className="expended-view-container">
          <SessionMenu
            knowledgeBatchId={knowledgeBatchId}
            userUuid={user?.uuid}
            user={user}
            userName={user?.username}
            isOpen={!viewAll.open}
            isExpanded={true}
            showThreads={state.status === "ready"}
            onClose={() => setIsSessionMenuOpen(false)}
            onCreateNew={() => {
              setIsSessionMenuOpen(false);
              createNewChat?.();
            }}
            onStartNewKb={() => {
              setIsSessionMenuOpen(false);
              startChat();
            }}
            onSelectSession={(s) => {
              setIsSessionMenuOpen(false);
              switchSession?.(s);
            }}
            onOpenKb={({ batchId, title }) => {
              setIsSessionMenuOpen(false);
              startExistingKbChat?.({ batchId, title });
            }}
            onViewAll={openViewAll}
          />

          <div className="chat-main-container">
            <ChatPanelHeader
              logoUrl={logoUrl}
              chatTitle={
                state.status === "ready" ||
                state.status === "running" ||
                state.status === "error"
                  ? state.chat?.chatTitle || "New Chat"
                  : "Webmap Network"
              }
              subtitle={headerSubtitle}
              onClose={onClose}
              showControls={canShowHeaderControls}
              onRestart={state.status === "idle" ? startChat : handleStartOver}
              hasSuggestions={hasSuggestions}
              showSuggestions={showSuggestions}
              onToggleSuggestions={toggleSuggestions}
              isExpanded={isExpanded}
              onToggleExpand={toggleExpanded}
              canOpenSessions={canOpenSessions}
              onOpenSessions={openSessions}
              isHome={
                state.status !== "ready" &&
                state.status !== "running" &&
                state.status !== "error"
              }
            />
            <div className="agent-container">{bodyContent}</div>
            <div className="section-footer">
              <ChatPanelFooter
                status={state.status}
                chat={state.chat}
                message={messageInput}
                onMessageChange={(event) => setMessageInput(event.target.value)}
                onSubmit={handleSend}
                onKeyDown={handleInputKeyDown}
                canSend={canSend}
                attachedImages={attachedImages}
                setAttachedImages={setAttachedImages}
                quotedText={quotedText}
                setQuotedText={setQuotedText}
                onOpenSessions={() => setIsSessionMenuOpen(true)}
              />
              <div className="copy-right">
                <p>Powered by.</p>
                <svg
                  width="70"
                  height="18"
                  viewBox="0 0 70 18"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="copy-right-logo"
                >
                  <g clipPath="url(#clip0_8091_33206)">
                    <path
                      d="M25.8331 5.02888C25.7384 5.02888 25.6199 5.02888 25.5251 5.02888C25.5251 5.02888 25.5251 5.02888 25.5014 5.02888C25.3829 5.02888 25.2645 5.0531 25.1697 5.10153C25.0276 5.1984 25.0038 5.31948 24.9802 5.39212L23.3453 9.55722L22.1844 6.31232C22.0422 5.92487 21.9001 5.53742 21.758 5.14996C21.6868 4.98045 21.5447 4.85938 21.3551 4.85938H21.3315C21.284 4.85938 21.213 4.85938 21.1656 4.85938C20.976 4.85938 20.8102 4.98045 20.7392 5.14996C20.3127 6.36075 19.8625 7.57153 19.436 8.78232L19.8862 9.96888C20.0046 10.3079 20.4786 10.3079 20.5969 9.96888C20.8102 9.38771 21.0234 8.80654 21.2366 8.22535L22.2554 11.0344C22.445 11.5429 22.6109 12.0272 22.8004 12.5358C22.8715 12.7053 23.0136 12.8263 23.2032 12.8263H23.2268C23.2743 12.8263 23.3217 12.8263 23.3691 12.8263H23.3927C23.5823 12.8263 23.7244 12.7295 23.7955 12.5358C24.53 10.6469 25.2645 8.75811 25.999 6.86928L26.5202 5.53742C26.5202 5.5132 26.5439 5.48899 26.5439 5.46477L26.6861 4.95624L25.8331 5.02888Z"
                      fill="#5D5FEF"
                    />
                    <path
                      d="M18.8435 8.6886C18.3933 7.55046 17.9668 6.43653 17.5167 5.2984C17.4456 5.12889 17.3035 5.00781 17.0902 5.00781C16.9718 5.00781 16.8295 5.00781 16.7112 5.00781H16.4031H16.3557C16.3321 5.00781 16.3083 5.00781 16.3083 5.00781L15.7871 5.03203L15.9766 5.51635L18.3223 11.5461C18.4408 11.8851 18.5829 12.1999 18.7014 12.5389C18.7724 12.7084 18.9146 12.8294 19.1041 12.8294H19.1278C19.1752 12.8294 19.2226 12.8294 19.2463 12.8294H19.2699C19.4595 12.8294 19.6017 12.7084 19.6728 12.5389C19.7675 12.2483 19.886 11.9819 19.9808 11.6913L18.8435 8.6886Z"
                      fill="#5D5FEF"
                    />
                    <path
                      d="M34.1968 7.79102C34.1494 7.64573 34.1257 7.50044 34.0783 7.35515C34.0547 7.2825 34.0309 7.20985 33.9836 7.11299C33.9362 6.96769 33.8651 6.84661 33.794 6.72554C33.1069 5.56318 31.8749 4.8125 30.4296 4.8125C28.2262 4.8125 26.4966 6.58024 26.4966 8.80808C26.4966 9.89779 26.8993 10.8906 27.6339 11.6656C28.3683 12.4162 29.3635 12.8278 30.4296 12.8278C31.1404 12.8278 31.8038 12.6584 32.3961 12.2951C32.4909 12.2467 32.6093 12.1499 32.7516 12.0288C33.178 11.6656 33.1543 10.9875 32.7042 10.6485L32.3013 10.3579L32.0881 10.5758C31.6616 11.0117 31.0693 11.2296 30.4533 11.2296C29.8136 11.2296 29.2212 10.9875 28.7711 10.5274C28.6526 10.4063 28.5342 10.261 28.4394 10.1157C28.4394 10.1157 28.4394 10.1157 28.4394 10.0915C28.3209 9.89779 28.2262 9.65563 28.1551 9.43769C27.7997 8.15426 28.5342 7.33093 28.5342 7.33093C28.9606 6.74976 29.6477 6.3623 30.4296 6.3623C31.4484 6.3623 32.3251 7.01612 32.6567 7.96054H29.4345C29.008 7.96054 28.6763 8.29956 28.6763 8.73544C28.6763 8.95338 28.7 9.19554 28.7711 9.43769H32.9174C33.7703 9.48612 34.41 8.63857 34.1968 7.79102Z"
                      fill="#5D5FEF"
                    />
                    <path
                      d="M36.6585 6.92762V0.812408C36.6585 0.424957 36.3505 0.0859375 35.9477 0.0859375H35.0947V0.52182V4.3479C35.0947 5.00172 35.0947 8.18684 35.0947 8.84066C35.4027 8.33213 35.8293 7.94469 36.2557 7.67831C36.5164 7.5088 36.6585 7.24242 36.6585 6.92762Z"
                      fill="#5D5FEF"
                    />
                    <path
                      d="M42.7475 8.17382C42.558 7.05989 41.9894 6.18813 41.0653 5.58274C40.4257 5.17107 39.7385 4.95312 38.9803 4.95312C38.7197 4.95312 38.4354 4.97735 38.1511 5.04999C38.1511 5.04999 35.1184 5.72804 35.0947 8.65813C35.0947 8.70656 35.0947 8.75499 35.0947 8.80343C35.0947 9.09401 35.1184 9.36038 35.1657 9.57833C35.3553 10.6922 35.9239 11.564 36.8242 12.1694C37.464 12.6052 38.1747 12.8232 38.9093 12.8232C39.1461 12.8232 39.3831 12.799 39.6437 12.7506C40.7336 12.5568 41.5866 11.9757 42.1789 11.0555C42.7475 10.1837 42.9371 9.21509 42.7475 8.17382ZM38.9803 11.2492C37.6773 11.2492 36.6821 10.2079 36.6821 8.87607C36.6821 7.5442 37.7009 6.50294 38.9803 6.50294C39.5964 6.50294 40.1887 6.74509 40.6151 7.18097C41.0416 7.61685 41.2786 8.22224 41.2786 8.87607C41.2786 10.2079 40.2598 11.2492 38.9803 11.2492Z"
                      fill="#5D5FEF"
                    />
                    <path
                      d="M48.5509 6.60073C48.7405 6.18907 48.845 6.04903 49.0582 5.78265C48.3058 5.15607 47.5268 4.93275 46.9107 4.90853C46.2948 4.88431 45.7261 5.05383 45.2522 5.39284V5.05383H44.4467C44.0439 5.05383 43.6885 5.39284 43.6885 5.82873V12.0037C43.6885 12.4154 44.0202 12.7786 44.4467 12.7786H45.2522V11.2288C45.2522 10.2844 45.2522 9.34 45.2522 8.4198C45.2522 8.00814 45.3233 7.66911 45.4655 7.35431C45.7261 6.82156 46.0815 6.5552 46.6027 6.48255C46.6501 6.48255 46.6975 6.48255 46.7212 6.48255C46.9107 6.48255 47.5813 6.43772 48.3197 7.02158C48.5567 7.14266 48.4562 6.81868 48.5509 6.60073Z"
                      fill="#5D5FEF"
                    />
                    <path
                      d="M53.6635 7.78771C53.6635 7.4729 53.6397 7.20654 53.5687 6.94016C53.3555 6.14104 52.9053 5.55987 52.2182 5.19663C51.6732 4.90605 51.0809 4.8334 50.4412 4.95447C50.3227 4.97869 50.1806 5.0029 50.0621 5.05133C49.1617 5.36614 47.8823 6.31056 47.8823 9.26487C47.8823 9.89447 47.8823 10.5241 47.8823 11.1779V12.0255C47.8823 12.4371 48.214 12.8004 48.6405 12.8004H49.4461V11.2506C49.4461 10.3061 49.4461 9.36173 49.4461 8.44153C49.4461 8.02987 49.5172 7.69085 49.6593 7.40025C49.9199 6.86751 50.2754 6.57692 50.7966 6.52849C50.8439 6.52849 50.8913 6.52849 50.9151 6.52849C51.3415 6.52849 51.7443 6.79486 51.9339 7.20654C52.0286 7.40025 52.0523 7.6182 52.0523 7.88457C52.0523 8.99849 52.0523 10.0882 52.0523 11.2021V12.0497C52.0523 12.4613 52.3841 12.8245 52.8105 12.8245H53.6161V11.2506C53.6635 10.064 53.6635 8.92584 53.6635 7.78771Z"
                      fill="#5D5FEF"
                    />
                    <path
                      d="M59.5707 9.56037V11.2555H59.3338H58.1254C57.7937 11.2555 57.4857 11.2555 57.154 11.2555C56.9882 11.2555 56.846 11.2312 56.7038 11.1586C56.3248 10.9649 56.0879 10.5774 56.0879 10.1658C56.0879 9.75408 56.3248 9.36664 56.7038 9.17291C56.846 9.12448 56.9882 9.10026 57.154 9.10026C57.4857 9.10026 57.7937 9.10026 58.1254 9.10026H58.9074H60.3762C60.7791 9.10026 61.0871 8.76125 61.0871 8.37379V6.96929C61.0871 6.92085 61.0871 6.87242 61.0871 6.84821C60.8976 5.78271 59.9972 5.00781 58.931 5.00781H57.3199C56.9171 5.00781 56.5617 5.34683 56.5617 5.78271V6.58183H58.931C59.2153 6.58183 59.4522 6.75134 59.5471 7.01772C59.5471 7.04193 59.5707 7.06615 59.5707 7.11458V7.57468H59.2864C59.0021 7.57468 58.6941 7.57468 58.4098 7.57468C57.9122 7.57468 57.4857 7.57468 57.1066 7.57468C56.4669 7.57468 55.8746 7.81684 55.4008 8.27693C54.8321 8.78545 54.5479 9.39085 54.5479 10.1415V10.1658C54.5479 10.9407 54.8321 11.5945 55.4008 12.1272C55.8746 12.5873 56.4669 12.8294 57.1066 12.8294C57.4857 12.8294 57.8885 12.8294 58.4098 12.8294C58.6704 12.8294 58.9547 12.8294 59.2153 12.8294H59.6418H61.0871V9.56037H59.5707Z"
                      fill="#5D5FEF"
                    />
                    <path
                      d="M69.8775 8.17692C69.5931 6.26389 67.982 4.85938 66.0866 4.85938C65.8971 4.85938 65.7312 4.8836 65.5416 4.9078C65.3048 4.93202 65.0915 4.98045 64.8783 5.0531C64.5228 5.17418 64.286 5.48899 64.286 5.87643V7.2083C64.7124 6.7482 65.3284 6.45762 66.0156 6.45762C66.6553 6.45762 67.2476 6.69977 67.6977 7.15987C68.1479 7.61996 68.3849 8.22535 68.3849 8.90339C68.3849 10.2595 67.3423 11.325 66.0156 11.3492C65.3759 11.3492 64.7834 11.107 64.3333 10.6469C63.8831 10.1868 63.6463 9.58144 63.6463 8.92761V5.77957V5.07732H62.9117C62.4616 5.07732 62.0825 5.46477 62.0825 5.92487V17.9116H62.817C63.2672 17.9116 63.6463 17.5242 63.6463 17.064V12.0272C64.3333 12.5842 65.1863 12.8748 66.0629 12.8748C66.8211 12.8748 67.5556 12.6568 68.1716 12.2209C69.5458 11.2765 70.1144 9.87202 69.8775 8.17692Z"
                      fill="#5D5FEF"
                    />
                    <path
                      d="M7.99028 17.8815C5.14157 10.07 6.34011 2.79115 7.29547 0.128145C4.4294 -0.138156 0 2.43608 0 7.40703C0 11.3838 2.83713 13.5615 4.25569 14.1534C3.53194 13.7686 1.9802 12.307 1.56331 9.53743C1.04221 6.07553 3.21348 4.47773 4.51624 3.85636C4.082 7.31826 4.9505 11.1352 5.6453 12.9106C6.34011 14.686 6.42696 14.8635 7.99028 17.8815Z"
                      fill="#5D5FEF"
                    />
                    <path
                      d="M7.55297 10.2153C5.95179 10.2153 4.65379 8.8887 4.65379 7.2522C4.65379 5.61571 5.95179 4.28906 7.55297 4.28906C9.15414 4.28906 10.4521 5.61571 10.4521 7.2522C10.4521 8.8887 9.15414 10.2153 7.55297 10.2153Z"
                      fill="#5D5FEF"
                    />
                    <path
                      d="M6.14424 7.39062H5.32373C5.34955 7.85101 5.50857 8.28563 5.78192 8.64777C5.93565 8.55902 6.10824 8.48293 6.29469 8.42087C6.20598 8.10407 6.15439 7.75426 6.14424 7.39062Z"
                      fill="white"
                    />
                    <path
                      d="M6.14424 7.11654C6.15439 6.75289 6.20598 6.40308 6.29469 6.08625C6.10824 6.02421 5.93566 5.94812 5.78193 5.85938C5.50857 6.22151 5.34955 6.65614 5.32373 7.11654H6.14424Z"
                      fill="white"
                    />
                    <path
                      d="M6.76264 5.60674C6.71303 5.70038 6.66823 5.80079 6.62842 5.90685C6.87655 5.96746 7.14505 6.00365 7.42227 6.01231V4.98438C7.17821 5.04143 6.94777 5.25735 6.76264 5.60674Z"
                      fill="white"
                    />
                    <path
                      d="M7.68311 4.98438V6.01231C7.96032 6.00364 8.22882 5.96744 8.47695 5.90684C8.43712 5.80079 8.39232 5.70036 8.34272 5.60674C8.1576 5.25735 7.92716 5.04143 7.68311 4.98438Z"
                      fill="white"
                    />
                    <path
                      d="M8.55972 6.16406C8.28527 6.233 7.98854 6.27384 7.68311 6.28291V7.12142H8.69984C8.68985 6.78213 8.64187 6.45705 8.55972 6.16406Z"
                      fill="white"
                    />
                    <path
                      d="M6.3762 8.67188C6.2252 8.72214 6.08459 8.78231 5.95752 8.85156C5.96301 8.85729 5.96841 8.86308 5.97396 8.86877C6.20639 9.10632 6.48107 9.28491 6.78061 9.39753C6.69135 9.29277 6.60832 9.16883 6.53304 9.02677C6.47452 8.91631 6.42219 8.79746 6.3762 8.67188Z"
                      fill="white"
                    />
                    <path
                      d="M8.72912 5.83501C8.88013 5.78475 9.02074 5.72458 9.14781 5.65534C9.14231 5.64961 9.13692 5.6438 9.13137 5.63813C8.89894 5.40058 8.62426 5.22199 8.32471 5.10938C8.41397 5.21413 8.49701 5.33807 8.57228 5.48013C8.6308 5.59058 8.68313 5.70942 8.72912 5.83501Z"
                      fill="white"
                    />
                    <path
                      d="M8.96198 7.39062C8.95182 7.75426 8.90024 8.10407 8.81152 8.42089C8.99798 8.48293 9.17056 8.55902 9.3243 8.64777C9.59764 8.28565 9.75666 7.85103 9.78247 7.39064L8.96198 7.39062Z"
                      fill="white"
                    />
                    <path
                      d="M8.72914 8.67188C8.68315 8.79746 8.63081 8.9163 8.57229 9.02676C8.49702 9.16882 8.41398 9.29276 8.32471 9.39751C8.62426 9.2849 8.89894 9.10631 9.13137 8.86876C9.13692 8.86308 9.14231 8.85727 9.1478 8.85154C9.02074 8.78232 8.88014 8.72214 8.72914 8.67188Z"
                      fill="white"
                    />
                    <path
                      d="M6.37618 5.83501C6.42217 5.70038 6.47449 5.59059 6.53302 5.48013C6.6083 5.33807 6.69134 5.21413 6.78061 5.10938C6.48106 5.22199 6.20638 5.40058 5.97395 5.63813C5.9684 5.6438 5.963 5.64961 5.95752 5.65534C6.08458 5.72458 6.22518 5.78475 6.37618 5.83501Z"
                      fill="white"
                    />
                    <path
                      d="M8.81152 6.08625C8.90025 6.40307 8.95182 6.75288 8.96198 7.11653H9.78248C9.75667 6.65613 9.59764 6.22149 9.3243 5.85938C9.17056 5.94811 8.99798 6.0242 8.81152 6.08625Z"
                      fill="white"
                    />
                    <path
                      d="M7.42251 7.12142V6.2829C7.11708 6.27383 6.82034 6.23298 6.54588 6.16406C6.46373 6.45703 6.41575 6.78211 6.40576 7.12142H7.42251Z"
                      fill="white"
                    />
                    <path
                      d="M7.68311 7.39064V8.22914C7.98853 8.23822 8.28527 8.27906 8.55972 8.34797C8.64187 8.05501 8.68985 7.72994 8.69984 7.39062L7.68311 7.39064Z"
                      fill="white"
                    />
                    <path
                      d="M8.34272 8.89777C8.39233 8.80413 8.43713 8.70372 8.47695 8.59766C8.22882 8.53705 7.96033 8.50086 7.68311 8.49219V9.52012C7.92717 9.46307 8.15761 9.24715 8.34272 8.89777Z"
                      fill="white"
                    />
                    <path
                      d="M7.42227 9.52012V8.49219C7.14505 8.50086 7.87656 8.53705 6.62842 8.59766C6.66824 8.70371 6.71304 8.80413 6.76264 8.89777C6.94778 9.24715 7.17822 9.46307 7.42227 9.52012Z"
                      fill="white"
                    />
                    <path
                      d="M7.42251 7.39062H6.40576C6.41576 7.72994 6.46373 8.05501 6.54588 8.34797C6.82033 8.27905 7.11708 8.23821 7.42251 8.22914V7.39062Z"
                      fill="white"
                    />
                    <path
                      d="M9.03927 0.453125C10.51 0.920005 11.7857 1.87599 12.6637 3.16909C13.5417 4.46218 13.9715 6.01817 13.8849 7.58963C13.7982 9.1611 13.2 10.6579 12.1854 11.8419C11.1708 13.0259 9.79799 13.8294 8.28529 14.1244L8.00391 12.6172C9.18771 12.3864 10.262 11.7576 11.056 10.831C11.8501 9.9044 12.3181 8.73308 12.386 7.50328C12.4538 6.27349 12.1174 5.05583 11.4303 4.04387C10.7432 3.03193 9.74488 2.2838 8.59396 1.91844L9.03927 0.453125Z"
                      fill="#5D5FEF"
                    />
                  </g>
                  <defs>
                    <clipPath id="clip0_8091_33206">
                      <rect width="70" height="18" fill="white" />
                    </clipPath>
                  </defs>
                </svg>
              </div>
            </div>
          </div>
        </main>

        <ViewAllSheet
          open={viewAll.open}
          type={viewAll.type}
          items={viewAll.items}
          onClose={closeViewAll}
          onCreateNew={() => {
            closeViewAll();
            if (viewAll.type === "kbs") {
              startChat();
            } else {
              // threads
              createNewChat?.();
            }
          }}
          onSelectItem={(item) => {
            if (viewAll.type === "kbs") {
              const batchId = item.batch_id || item.id;
              const title = item.title || item.link_url || "";
              closeViewAll();
              setIsSessionMenuOpen(false);
              startExistingKbChat?.({ batchId, title });
            } else {
              // threads
              closeViewAll();
              setIsSessionMenuOpen(false);
              switchSession?.(item);
            }
          }}
        />

        <ViewAllSheet
          open={viewAll.open}
          type={viewAll.type}
          items={viewAll.items}
          onClose={closeViewAll}
          onCreateNew={() => {
            closeViewAll();
            if (viewAll.type === "kbs") {
              startChat();
            } else {
              // threads
              createNewChat?.();
            }
          }}
          onSelectItem={(item) => {
            if (viewAll.type === "kbs") {
              const batchId = item.batch_id || item.id;
              const title = item.title || item.link_url || "";
              closeViewAll();
              setIsSessionMenuOpen(false);
              startExistingKbChat?.({ batchId, title });
            } else {
              // threads
              closeViewAll();
              setIsSessionMenuOpen(false);
              switchSession?.(item);
            }
          }}
        />

        {renderLearnMorePopup()}
      </section>
    );
  }

  // Normal collapsed view
  return (
    <section
      id="wm-chat-panel"
      className={panelClassNames}
      aria-hidden={!isOpen}
    >
      <ChatPanelHeader
        logoUrl={logoUrl}
        chatTitle={
          state.status === "ready" ||
          state.status === "running" ||
          state.status === "error"
            ? state.chat?.chatTitle || "New Chat"
            : "Webmap Network"
        }
        subtitle={headerSubtitle}
        onClose={onClose}
        showControls={canShowHeaderControls}
        onRestart={state.status === "idle" ? startChat : handleStartOver}
        hasSuggestions={hasSuggestions}
        showSuggestions={showSuggestions}
        onToggleSuggestions={toggleSuggestions}
        isExpanded={isExpanded}
        onToggleExpand={toggleExpanded}
        canOpenSessions={canOpenSessions}
        onOpenSessions={openSessions}
        isHome={
          state.status !== "ready" &&
          state.status !== "running" &&
          state.status !== "error"
        }
      />
      <div className="wm-chat-sidebar__body">
        <main className="agent-container">{bodyContent}</main>
      </div>
      <SessionMenu
        knowledgeBatchId={knowledgeBatchId}
        userUuid={user?.uuid}
        user={user}
        userName={user?.username}
        isOpen={isSessionMenuOpen}
        showThreads={state.status === "ready"}
        onClose={() => setIsSessionMenuOpen(false)}
        onCreateNew={() => {
          setIsSessionMenuOpen(false);
          createNewChat?.();
        }}
        onStartNewKb={() => {
          setIsSessionMenuOpen(false);
          startChat();
        }}
        onSelectSession={(s) => {
          setIsSessionMenuOpen(false);
          switchSession?.(s);
        }}
        onOpenKb={({ batchId, title }) => {
          setIsSessionMenuOpen(false);
          startExistingKbChat?.({ batchId, title });
        }}
        onViewAll={openViewAll}
      />
      <div className="wm-chat-sidebar__footer">
        <ChatPanelFooter
          status={state.status}
          chat={state.chat}
          message={messageInput}
          onMessageChange={(event) => setMessageInput(event.target.value)}
          onSubmit={handleSend}
          onKeyDown={handleInputKeyDown}
          canSend={canSend}
          attachedImages={attachedImages}
          setAttachedImages={setAttachedImages}
          quotedText={quotedText}
          setQuotedText={setQuotedText}
          onOpenSessions={() => setIsSessionMenuOpen(true)}
        />
        <div className="copy-right">
          <p>Powered by.</p>
          <svg
            width="70"
            height="18"
            viewBox="0 0 70 18"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="copy-right-logo"
          >
            <g clipPath="url(#clip0_8091_33206)">
              <path
                d="M25.8331 5.02888C25.7384 5.02888 25.6199 5.02888 25.5251 5.02888C25.5251 5.02888 25.5251 5.02888 25.5014 5.02888C25.3829 5.02888 25.2645 5.0531 25.1697 5.10153C25.0276 5.1984 25.0038 5.31948 24.9802 5.39212L23.3453 9.55722L22.1844 6.31232C22.0422 5.92487 21.9001 5.53742 21.758 5.14996C21.6868 4.98045 21.5447 4.85938 21.3551 4.85938H21.3315C21.284 4.85938 21.213 4.85938 21.1656 4.85938C20.976 4.85938 20.8102 4.98045 20.7392 5.14996C20.3127 6.36075 19.8625 7.57153 19.436 8.78232L19.8862 9.96888C20.0046 10.3079 20.4786 10.3079 20.5969 9.96888C20.8102 9.38771 21.0234 8.80654 21.2366 8.22535L22.2554 11.0344C22.445 11.5429 22.6109 12.0272 22.8004 12.5358C22.8715 12.7053 23.0136 12.8263 23.2032 12.8263H23.2268C23.2743 12.8263 23.3217 12.8263 23.3691 12.8263H23.3927C23.5823 12.8263 23.7244 12.7295 23.7955 12.5358C24.53 10.6469 25.2645 8.75811 25.999 6.86928L26.5202 5.53742C26.5202 5.5132 26.5439 5.48899 26.5439 5.46477L26.6861 4.95624L25.8331 5.02888Z"
                fill="#5D5FEF"
              />
              <path
                d="M18.8435 8.6886C18.3933 7.55046 17.9668 6.43653 17.5167 5.2984C17.4456 5.12889 17.3035 5.00781 17.0902 5.00781C16.9718 5.00781 16.8295 5.00781 16.7112 5.00781H16.4031H16.3557C16.3321 5.00781 16.3083 5.00781 16.3083 5.00781L15.7871 5.03203L15.9766 5.51635L18.3223 11.5461C18.4408 11.8851 18.5829 12.1999 18.7014 12.5389C18.7724 12.7084 18.9146 12.8294 19.1041 12.8294H19.1278C19.1752 12.8294 19.2226 12.8294 19.2463 12.8294H19.2699C19.4595 12.8294 19.6017 12.7084 19.6728 12.5389C19.7675 12.2483 19.886 11.9819 19.9808 11.6913L18.8435 8.6886Z"
                fill="#5D5FEF"
              />
              <path
                d="M34.1968 7.79102C34.1494 7.64573 34.1257 7.50044 34.0783 7.35515C34.0547 7.2825 34.0309 7.20985 33.9836 7.11299C33.9362 6.96769 33.8651 6.84661 33.794 6.72554C33.1069 5.56318 31.8749 4.8125 30.4296 4.8125C28.2262 4.8125 26.4966 6.58024 26.4966 8.80808C26.4966 9.89779 26.8993 10.8906 27.6339 11.6656C28.3683 12.4162 29.3635 12.8278 30.4296 12.8278C31.1404 12.8278 31.8038 12.6584 32.3961 12.2951C32.4909 12.2467 32.6093 12.1499 32.7516 12.0288C33.178 11.6656 33.1543 10.9875 32.7042 10.6485L32.3013 10.3579L32.0881 10.5758C31.6616 11.0117 31.0693 11.2296 30.4533 11.2296C29.8136 11.2296 29.2212 10.9875 28.7711 10.5274C28.6526 10.4063 28.5342 10.261 28.4394 10.1157C28.4394 10.1157 28.4394 10.1157 28.4394 10.0915C28.3209 9.89779 28.2262 9.65563 28.1551 9.43769C27.7997 8.15426 28.5342 7.33093 28.5342 7.33093C28.9606 6.74976 29.6477 6.3623 30.4296 6.3623C31.4484 6.3623 32.3251 7.01612 32.6567 7.96054H29.4345C29.008 7.96054 28.6763 8.29956 28.6763 8.73544C28.6763 8.95338 28.7 9.19554 28.7711 9.43769H32.9174C33.7703 9.48612 34.41 8.63857 34.1968 7.79102Z"
                fill="#5D5FEF"
              />
              <path
                d="M36.6585 6.92762V0.812408C36.6585 0.424957 36.3505 0.0859375 35.9477 0.0859375H35.0947V0.52182V4.3479C35.0947 5.00172 35.0947 8.18684 35.0947 8.84066C35.4027 8.33213 35.8293 7.94469 36.2557 7.67831C36.5164 7.5088 36.6585 7.24242 36.6585 6.92762Z"
                fill="#5D5FEF"
              />
              <path
                d="M42.7475 8.17382C42.558 7.05989 41.9894 6.18813 41.0653 5.58274C40.4257 5.17107 39.7385 4.95312 38.9803 4.95312C38.7197 4.95312 38.4354 4.97735 38.1511 5.04999C38.1511 5.04999 35.1184 5.72804 35.0947 8.65813C35.0947 8.70656 35.0947 8.75499 35.0947 8.80343C35.0947 9.09401 35.1184 9.36038 35.1657 9.57833C35.3553 10.6922 35.9239 11.564 36.8242 12.1694C37.464 12.6052 38.1747 12.8232 38.9093 12.8232C39.1461 12.8232 39.3831 12.799 39.6437 12.7506C40.7336 12.5568 41.5866 11.9757 42.1789 11.0555C42.7475 10.1837 42.9371 9.21509 42.7475 8.17382ZM38.9803 11.2492C37.6773 11.2492 36.6821 10.2079 36.6821 8.87607C36.6821 7.5442 37.7009 6.50294 38.9803 6.50294C39.5964 6.50294 40.1887 6.74509 40.6151 7.18097C41.0416 7.61685 41.2786 8.22224 41.2786 8.87607C41.2786 10.2079 40.2598 11.2492 38.9803 11.2492Z"
                fill="#5D5FEF"
              />
              <path
                d="M48.5509 6.60073C48.7405 6.18907 48.845 6.04903 49.0582 5.78265C48.3058 5.15607 47.5268 4.93275 46.9107 4.90853C46.2948 4.88431 45.7261 5.05383 45.2522 5.39284V5.05383H44.4467C44.0439 5.05383 43.6885 5.39284 43.6885 5.82873V12.0037C43.6885 12.4154 44.0202 12.7786 44.4467 12.7786H45.2522V11.2288C45.2522 10.2844 45.2522 9.34 45.2522 8.4198C45.2522 8.00814 45.3233 7.66911 45.4655 7.35431C45.7261 6.82156 46.0815 6.5552 46.6027 6.48255C46.6501 6.48255 46.6975 6.48255 46.7212 6.48255C46.9107 6.48255 47.5813 6.43772 48.3197 7.02158C48.5567 7.14266 48.4562 6.81868 48.5509 6.60073Z"
                fill="#5D5FEF"
              />
              <path
                d="M53.6635 7.78771C53.6635 7.4729 53.6397 7.20654 53.5687 6.94016C53.3555 6.14104 52.9053 5.55987 52.2182 5.19663C51.6732 4.90605 51.0809 4.8334 50.4412 4.95447C50.3227 4.97869 50.1806 5.0029 50.0621 5.05133C49.1617 5.36614 47.8823 6.31056 47.8823 9.26487C47.8823 9.89447 47.8823 10.5241 47.8823 11.1779V12.0255C47.8823 12.4371 48.214 12.8004 48.6405 12.8004H49.4461V11.2506C49.4461 10.3061 49.4461 9.36173 49.4461 8.44153C49.4461 8.02987 49.5172 7.69085 49.6593 7.40025C49.9199 6.86751 50.2754 6.57692 50.7966 6.52849C50.8439 6.52849 50.8913 6.52849 50.9151 6.52849C51.3415 6.52849 51.7443 6.79486 51.9339 7.20654C52.0286 7.40025 52.0523 7.6182 52.0523 7.88457C52.0523 8.99849 52.0523 10.0882 52.0523 11.2021V12.0497C52.0523 12.4613 52.3841 12.8245 52.8105 12.8245H53.6161V11.2506C53.6635 10.064 53.6635 8.92584 53.6635 7.78771Z"
                fill="#5D5FEF"
              />
              <path
                d="M59.5707 9.56037V11.2555H59.3338H58.1254C57.7937 11.2555 57.4857 11.2555 57.154 11.2555C56.9882 11.2555 56.846 11.2312 56.7038 11.1586C56.3248 10.9649 56.0879 10.5774 56.0879 10.1658C56.0879 9.75408 56.3248 9.36664 56.7038 9.17291C56.846 9.12448 56.9882 9.10026 57.154 9.10026C57.4857 9.10026 57.7937 9.10026 58.1254 9.10026H58.9074H60.3762C60.7791 9.10026 61.0871 8.76125 61.0871 8.37379V6.96929C61.0871 6.92085 61.0871 6.87242 61.0871 6.84821C60.8976 5.78271 59.9972 5.00781 58.931 5.00781H57.3199C56.9171 5.00781 56.5617 5.34683 56.5617 5.78271V6.58183H58.931C59.2153 6.58183 59.4522 6.75134 59.5471 7.01772C59.5471 7.04193 59.5707 7.06615 59.5707 7.11458V7.57468H59.2864C59.0021 7.57468 58.6941 7.57468 58.4098 7.57468C57.9122 7.57468 57.4857 7.57468 57.1066 7.57468C56.4669 7.57468 55.8746 7.81684 55.4008 8.27693C54.8321 8.78545 54.5479 9.39085 54.5479 10.1415V10.1658C54.5479 10.9407 54.8321 11.5945 55.4008 12.1272C55.8746 12.5873 56.4669 12.8294 57.1066 12.8294C57.4857 12.8294 57.8885 12.8294 58.4098 12.8294C58.6704 12.8294 58.9547 12.8294 59.2153 12.8294H59.6418H61.0871V9.56037H59.5707Z"
                fill="#5D5FEF"
              />
              <path
                d="M69.8775 8.17692C69.5931 6.26389 67.982 4.85938 66.0866 4.85938C65.8971 4.85938 65.7312 4.8836 65.5416 4.9078C65.3048 4.93202 65.0915 4.98045 64.8783 5.0531C64.5228 5.17418 64.286 5.48899 64.286 5.87643V7.2083C64.7124 6.7482 65.3284 6.45762 66.0156 6.45762C66.6553 6.45762 67.2476 6.69977 67.6977 7.15987C68.1479 7.61996 68.3849 8.22535 68.3849 8.90339C68.3849 10.2595 67.3423 11.325 66.0156 11.3492C65.3759 11.3492 64.7834 11.107 64.3333 10.6469C63.8831 10.1868 63.6463 9.58144 63.6463 8.92761V5.77957V5.07732H62.9117C62.4616 5.07732 62.0825 5.46477 62.0825 5.92487V17.9116H62.817C63.2672 17.9116 63.6463 17.5242 63.6463 17.064V12.0272C64.3333 12.5842 65.1863 12.8748 66.0629 12.8748C66.8211 12.8748 67.5556 12.6568 68.1716 12.2209C69.5458 11.2765 70.1144 9.87202 69.8775 8.17692Z"
                fill="#5D5FEF"
              />
              <path
                d="M7.99028 17.8815C5.14157 10.07 6.34011 2.79115 7.29547 0.128145C4.4294 -0.138156 0 2.43608 0 7.40703C0 11.3838 2.83713 13.5615 4.25569 14.1534C3.53194 13.7686 1.9802 12.307 1.56331 9.53743C1.04221 6.07553 3.21348 4.47773 4.51624 3.85636C4.082 7.31826 4.9505 11.1352 5.6453 12.9106C6.34011 14.686 6.42696 14.8635 7.99028 17.8815Z"
                fill="#5D5FEF"
              />
              <path
                d="M7.55297 10.2153C5.95179 10.2153 4.65379 8.8887 4.65379 7.2522C4.65379 5.61571 5.95179 4.28906 7.55297 4.28906C9.15414 4.28906 10.4521 5.61571 10.4521 7.2522C10.4521 8.8887 9.15414 10.2153 7.55297 10.2153Z"
                fill="#5D5FEF"
              />
              <path
                d="M6.14424 7.39062H5.32373C5.34955 7.85101 5.50857 8.28563 5.78192 8.64777C5.93565 8.55902 6.10824 8.48293 6.29469 8.42087C6.20598 8.10407 6.15439 7.75426 6.14424 7.39062Z"
                fill="white"
              />
              <path
                d="M6.14424 7.11654C6.15439 6.75289 6.20598 6.40308 6.29469 6.08625C6.10824 6.02421 5.93566 5.94812 5.78193 5.85938C5.50857 6.22151 5.34955 6.65614 5.32373 7.11654H6.14424Z"
                fill="white"
              />
              <path
                d="M6.76264 5.60674C6.71303 5.70038 6.66823 5.80079 6.62842 5.90685C6.87655 5.96746 7.14505 6.00365 7.42227 6.01231V4.98438C7.17821 5.04143 6.94777 5.25735 6.76264 5.60674Z"
                fill="white"
              />
              <path
                d="M7.68311 4.98438V6.01231C7.96032 6.00364 8.22882 5.96744 8.47695 5.90684C8.43712 5.80079 8.39232 5.70036 8.34272 5.60674C8.1576 5.25735 7.92716 5.04143 7.68311 4.98438Z"
                fill="white"
              />
              <path
                d="M8.55972 6.16406C8.28527 6.233 7.98854 6.27384 7.68311 6.28291V7.12142H8.69984C8.68985 6.78213 8.64187 6.45705 8.55972 6.16406Z"
                fill="white"
              />
              <path
                d="M6.3762 8.67188C6.2252 8.72214 6.08459 8.78231 5.95752 8.85156C5.96301 8.85729 5.96841 8.86308 5.97396 8.86877C6.20639 9.10632 6.48107 9.28491 6.78061 9.39753C6.69135 9.29277 6.60832 9.16883 6.53304 9.02677C6.47452 8.91631 6.42219 8.79746 6.3762 8.67188Z"
                fill="white"
              />
              <path
                d="M8.72912 5.83501C8.88013 5.78475 9.02074 5.72458 9.14781 5.65534C9.14231 5.64961 9.13692 5.6438 9.13137 5.63813C8.89894 5.40058 8.62426 5.22199 8.32471 5.10938C8.41397 5.21413 8.49701 5.33807 8.57228 5.48013C8.6308 5.59058 8.68313 5.70942 8.72912 5.83501Z"
                fill="white"
              />
              <path
                d="M8.96198 7.39062C8.95182 7.75426 8.90024 8.10407 8.81152 8.42089C8.99798 8.48293 9.17056 8.55902 9.3243 8.64777C9.59764 8.28565 9.75666 7.85103 9.78247 7.39064L8.96198 7.39062Z"
                fill="white"
              />
              <path
                d="M8.72914 8.67188C8.68315 8.79746 8.63081 8.9163 8.57229 9.02676C8.49702 9.16882 8.41398 9.29276 8.32471 9.39751C8.62426 9.2849 8.89894 9.10631 9.13137 8.86876C9.13692 8.86308 9.14231 8.85727 9.1478 8.85154C9.02074 8.78232 8.88014 8.72214 8.72914 8.67188Z"
                fill="white"
              />
              <path
                d="M6.37618 5.83501C6.42217 5.70038 6.47449 5.59059 6.53302 5.48013C6.6083 5.33807 6.69134 5.21413 6.78061 5.10938C6.48106 5.22199 6.20638 5.40058 5.97395 5.63813C5.9684 5.6438 5.963 5.64961 5.95752 5.65534C6.08458 5.72458 6.22518 5.78475 6.37618 5.83501Z"
                fill="white"
              />
              <path
                d="M8.81152 6.08625C8.90025 6.40307 8.95182 6.75288 8.96198 7.11653H9.78248C9.75667 6.65613 9.59764 6.22149 9.3243 5.85938C9.17056 5.94811 8.99798 6.0242 8.81152 6.08625Z"
                fill="white"
              />
              <path
                d="M7.42251 7.12142V6.2829C7.11708 6.27383 6.82034 6.23298 6.54588 6.16406C6.46373 6.45703 6.41575 6.78211 6.40576 7.12142H7.42251Z"
                fill="white"
              />
              <path
                d="M7.68311 7.39064V8.22914C7.98853 8.23822 8.28527 8.27906 8.55972 8.34797C8.64187 8.05501 8.68985 7.72994 8.69984 7.39062L7.68311 7.39064Z"
                fill="white"
              />
              <path
                d="M8.34272 8.89777C8.39233 8.80413 8.43713 8.70372 8.47695 8.59766C8.22882 8.53705 7.96033 8.50086 7.68311 8.49219V9.52012C7.92717 9.46307 8.15761 9.24715 8.34272 8.89777Z"
                fill="white"
              />
              <path
                d="M7.42227 9.52012V8.49219C7.14505 8.50086 7.87656 8.53705 6.62842 8.59766C6.66824 8.70371 6.71304 8.80413 6.76264 8.89777C6.94778 9.24715 7.17822 9.46307 7.42227 9.52012Z"
                fill="white"
              />
              <path
                d="M7.42251 7.39062H6.40576C6.41576 7.72994 6.46373 8.05501 6.54588 8.34797C6.82033 8.27905 7.11708 8.23821 7.42251 8.22914V7.39062Z"
                fill="white"
              />
              <path
                d="M9.03927 0.453125C10.51 0.920005 11.7857 1.87599 12.6637 3.16909C13.5417 4.46218 13.9715 6.01817 13.8849 7.58963C13.7982 9.1611 13.2 10.6579 12.1854 11.8419C11.1708 13.0259 9.79799 13.8294 8.28529 14.1244L8.00391 12.6172C9.18771 12.3864 10.262 11.7576 11.056 10.831C11.8501 9.9044 12.3181 8.73308 12.386 7.50328C12.4538 6.27349 12.1174 5.05583 11.4303 4.04387C10.7432 3.03193 9.74488 2.2838 8.59396 1.91844L9.03927 0.453125Z"
                fill="#5D5FEF"
              />
            </g>
            <defs>
              <clipPath id="clip0_8091_33206">
                <rect width="70" height="18" fill="white" />
              </clipPath>
            </defs>
          </svg>
        </div>
      </div>
      <ViewAllSheet
        open={viewAll.open}
        type={viewAll.type}
        items={viewAll.items}
        onClose={closeViewAll}
        onCreateNew={() => {
          closeViewAll();
          if (viewAll.type === "kbs") {
            startChat();
          } else {
            // threads
            createNewChat?.();
          }
        }}
        onSelectItem={(item) => {
          if (viewAll.type === "kbs") {
            const batchId = item.batch_id || item.id;
            const title = item.title || item.link_url || "";
            closeViewAll();
            setIsSessionMenuOpen(false);
            startExistingKbChat?.({ batchId, title });
          } else {
            // threads
            closeViewAll();
            setIsSessionMenuOpen(false);
            switchSession?.(item);
          }
        }}
      />

      {renderLearnMorePopup()}
    </section>
  );
}
