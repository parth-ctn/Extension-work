import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { scrapperService } from "../../api/scrapperService.js";
import { knowledgeBaseService } from "../../api/knowledgeBaseService.js";
import { usersService } from "../../api/usersService.js";
import { extensionAgentService } from "../../api/extensionAgentService.js";
import { readExtensionVisitorIdentity } from "../../utils/extensionState.js";
import {
  readExtensionStorage,
  writeExtensionStorage,
} from "../../utils/storage.js";
import {
  readStoredHtmlSelection,
  writeStoredHtmlSelection,
} from "../../utils/htmlSelectionPreference.js";
import { STORAGE_KEYS } from "../../constants/storageKeys.js";
import {
  cleanHtmlString,
  removeAdsOnlyFromHtml,
} from "../../utils/htmlCleaner.js";
import {
  CHAT_PING_INTERVAL_MS,
  KNOWLEDGE_DOMAIN,
} from "../../constants/knowledgeWorkflow.js";
import {
  CHAT_START_PROMPT,
  CHAT_START_PROMPT_K_VALUE,
} from "../../constants/chat.js";
import {
  captureRenderedHtml,
  generateHtmlFilename,
} from "../../utils/htmlCapture.js";
import { renderMarkdownToHtml } from "../../utils/markdown.js";
import { useSettings } from "../settings/useSettings.js";

const EMBEDDING_MODELS = {
  OPENAI: "text-embedding-3-large",
  PARAPHRASE: "paraphrase-multilingual-MiniLM-L12-v2",
};

function normalizeHost(url) {
  if (!url) return "";
  try {
    const { host } = new URL(url);
    return host;
  } catch {
    return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }
}

function normalizeFullUrlNoTrailing(url) {
  try {
    const u = new URL(url);
    return u.href.replace(/\/$/, "");
  } catch {
    return String(url ?? "").replace(/\/$/, "");
  }
}

function normalizeExtensionId(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

const knowledgeHost = normalizeHost(import.meta.env.VITE_API_KNOWLEDGE_URL);
const knowledgeWsBase = knowledgeHost ? `wss://${knowledgeHost}` : null;

const scrapperHost = normalizeHost(import.meta.env.VITE_API_SCRAPER_URL);
const scrapperWsBase = scrapperHost ? `wss://${scrapperHost}` : null;

const WS_PING_INTERVAL_MS = 30000;

// ---- Helpers: content detection and filenames ----
function isProbablyPdfUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    if (path.endsWith(".pdf")) return true;
  } catch {}
  // Fallback heuristic
  return /\.pdf(?:[$?#]|$)/i.test(String(url));
}

function isGoogleDocsUrl(url) {
  try {
    const { hostname, pathname } = new URL(url);
    if (!hostname) return false;
    const host = hostname.toLowerCase();
    if (!/\.google\.com$/.test(host)) return false;
    return (
      (host === "docs.google.com" || host === "drive.google.com") &&
      (/\/document\/d\//.test(pathname) ||
        /\/spreadsheets\/d\//.test(pathname) ||
        /\/presentation\/d\//.test(pathname) ||
        /\/file\/d\//.test(pathname))
    );
  } catch {
    return false;
  }
}

function toGoogleDocsPdfExport(url) {
  try {
    const u = new URL(url);
    const { hostname, pathname, search } = u;
    const idMatch = pathname.match(
      /\/(document|spreadsheets|presentation|file)\/d\/([^/]+)/
    );
    if (!idMatch) return null;
    const type = idMatch[1];
    const id = idMatch[2];
    if (hostname === "docs.google.com") {
      if (type === "document") {
        return `https://docs.google.com/document/d/${id}/export?format=pdf`;
      }
      if (type === "spreadsheets") {
        // Basic PDF export for sheets (can be customized via params)
        return `https://docs.google.com/spreadsheets/d/${id}/export?format=pdf`;
      }
      if (type === "presentation") {
        return `https://docs.google.com/presentation/d/${id}/export/pdf`;
      }
    }
    if (hostname === "drive.google.com") {
      // Drive viewer -> direct download
      return `https://drive.google.com/uc?export=download&id=${id}`;
    }
  } catch {}
  return null;
}

function sanitizeBase(name) {
  return String(name || "page")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 100);
}

function makeFilename(url, title, ext) {
  let base = title?.trim();
  if (!base) {
    try {
      base = new URL(url).hostname;
    } catch {
      base = "page";
    }
  }
  const ts = Date.now();
  return `${sanitizeBase(base)}_${ts}.${ext}`;
}

function createInitialSteps() {
  return [
    { key: "llm", label: "Processing page content", status: "pending" },
    { key: "knowledge", label: "Building knowledge base", status: "pending" },
    { key: "session", label: "Preparing chat session", status: "pending" },
  ];
}

function createInitialState(userUuid = null) {
  return {
    status: "idle",
    steps: createInitialSteps(),
    error: null,
    knowledgeSummary: null,
    htmlChoice: { waiting: false, selected: null },
    context: {
      url: "",
      title: "",
      note: "",
      visitorId: "",
      requestId: "",
      userUuid,
      toolBatchId: null, // markdown/LLM batch
      knowledgeBatchId: null, // KB batch
      sessionId: null,
      selectedExtensionId: null,
      hasExistingSession: false,
    },
    chat: {
      ready: false,
      connecting: false,
      messages: [],
      suggestions: [],
      awaitingResponse: false,
      chatTitle: "New Chat", // Title for the current chat session
      hasReceivedFirstResponse: false, // Track if first response has been received
    },
  };
}

function safeHostname(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function mapContextUrls(context = {}) {
  const entries = [];
  for (const [name, value] of Object.entries(context)) {
    if (!value) continue;
    const url = value.doc_url || name;
    const pages = Array.isArray(value.page) ? value.page : [];
    if (pages.length === 0) entries.push({ name, url, page: null });
    else pages.forEach((page) => entries.push({ name, url, page }));
  }
  return entries;
}

function mapChatHistory(items = []) {
  const messages = [];
  items.forEach((item, index) => {
    if (item.question) {
      messages.push({
        id: `user-${index}-${Date.now()}`,
        role: "user",
        text: item.question,
        timestamp: item.created_at ?? null,
      });
    }
    // New contract: `response` contains Markdown (convert client-side)
    if (item.response) {
      const html = renderMarkdownToHtml(item.response);
      messages.push({
        id: `assistant-${index}-${Date.now()}`,
        role: "assistant",
        text: html,
        timestamp: item.created_at ?? null,
        references: mapContextUrls(item.context_urls ?? {}),
        suggestions: item.suggestion_questions ?? [],
        cost: item.overview_cost_per_chat ?? null,
        prompt: item.prompt ?? null,
        kValue: item.k_value ?? null,
      });
    }
  });
  return messages;
}

// Extract the latest assistant-provided suggestions from a messages list
function extractLatestSuggestions(messages = []) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const m = messages[i];
    if (
      m &&
      m.role === "assistant" &&
      Array.isArray(m.suggestions) &&
      m.suggestions.length
    ) {
      return m.suggestions;
    }
  }
  return [];
}

// Unique counter for message IDs to avoid collisions
let messageIdCounter = 0;

function createMessageId() {
  messageIdCounter += 1;
  return `msg-${Date.now()}-${messageIdCounter}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

// Maximum number of messages to keep in memory (prevents unbounded growth)
const MAX_MESSAGES_IN_MEMORY = 100;

export function useKnowledgeWorkflow({
  user,
  selectedExtensionId: externalSelectedExtensionId = null,
  accessToken = null,
  refreshToken = null,
}) {
  const { isOpenAI } = useSettings();
  const [state, setState] = useState(() =>
    createInitialState(user?.uuid ?? null)
  );
  const stateRef = useRef(state);
  const isMountedRef = useRef(true);
  const isOpenAIRef = useRef(isOpenAI);

  const runRef = useRef({ id: 0, cancelled: false });
  const abortRef = useRef(null);

  const chatSocketRef = useRef(null);
  const chatPingRef = useRef(null);

  // new sockets for LLM & KB
  const llmSocketRef = useRef(null);
  const llmPingRef = useRef(null);

  const kbSocketRef = useRef(null);
  const kbPingRef = useRef(null);

  const autoPromptSentRef = useRef(false);
  const streamMessageIdRef = useRef(null);
  const streamBufferRef = useRef("");
  const propSelectedExtensionIdRef = useRef(
    normalizeExtensionId(externalSelectedExtensionId)
  );

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Keep the ref updated with the latest isOpenAI value
  useEffect(() => {
    isOpenAIRef.current = isOpenAI;
    console.log("[useKnowledgeWorkflow] isOpenAI updated in ref:", isOpenAI);
  }, [isOpenAI]);

  useEffect(() => {
    propSelectedExtensionIdRef.current = normalizeExtensionId(
      externalSelectedExtensionId
    );
  }, [externalSelectedExtensionId]);

  const readLocalSelectedExtensionId = useCallback(() => {
    if (typeof window === "undefined" || !window?.localStorage) return null;

    const parseValue = (raw) => {
      if (
        raw === undefined ||
        raw === null ||
        raw === "" ||
        raw === "undefined"
      ) {
        return null;
      }
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    };

    const candidateKeys = [
      STORAGE_KEYS.SELECTED_EXTENSION_ID,
      STORAGE_KEYS.SELECTED_AGENT_DATA,
      "selectedAgentData",
      "selectedAgent",
    ];

    for (const key of candidateKeys) {
      try {
        const rawValue = window.localStorage.getItem(key);
        if (!rawValue) continue;
        const parsed = parseValue(rawValue);
        if (typeof parsed === "string" && parsed.trim().length > 0) {
          return parsed.trim();
        }
        if (parsed && typeof parsed === "object") {
          if (typeof parsed.extension_id === "string") {
            return parsed.extension_id;
          }
          if (typeof parsed.id === "string") {
            return parsed.id;
          }
        }
      } catch (error) {
        console.warn(
          "[useKnowledgeWorkflow] Failed to parse agent data from local storage",
          { key, error }
        );
      }
    }

    return null;
  }, []);

  const resolveSelectedExtensionId = useCallback(
    async ({ reason = "unknown" } = {}) => {
      const propValue = propSelectedExtensionIdRef.current;
      if (propValue) {
        console.log("[useKnowledgeWorkflow] Agent resolved via prop", {
          reason,
          extensionId: propValue,
        });
        return propValue;
      }

      try {
        const extensionStorageValue = await readExtensionStorage(
          STORAGE_KEYS.SELECTED_EXTENSION_ID
        );
        if (
          typeof extensionStorageValue === "string" &&
          extensionStorageValue.trim().length > 0
        ) {
          console.log(
            "[useKnowledgeWorkflow] Agent resolved via extension storage",
            { reason, extensionId: extensionStorageValue }
          );
          return extensionStorageValue.trim();
        }
      } catch (error) {
        console.warn(
          "[useKnowledgeWorkflow] Unable to read agent ID from extension storage",
          error
        );
      }

      const localValue = readLocalSelectedExtensionId();
      if (localValue) {
        console.log("[useKnowledgeWorkflow] Agent resolved via local storage", {
          reason,
          extensionId: localValue,
        });
        return localValue;
      }

      console.warn("[useKnowledgeWorkflow] Agent ID unavailable", { reason });
      return null;
    },
    [readLocalSelectedExtensionId]
  );

  // Safe setState wrapper that checks if component is mounted
  const safeSetState = useCallback((updater) => {
    if (isMountedRef.current) {
      setState(updater);
    }
  }, []);

  const setStepStatus = useCallback(
    (key, status, meta) => {
      safeSetState((prev) => ({
        ...prev,
        steps: prev.steps.map((s) =>
          s.key === key ? { ...s, status, ...(meta ?? {}) } : s
        ),
      }));
    },
    [safeSetState]
  );

  const updateContext = useCallback(
    (patch) => {
      safeSetState((prev) => ({
        ...prev,
        context: { ...prev.context, ...patch },
      }));
    },
    [safeSetState]
  );

  useEffect(() => {
    const nextId = propSelectedExtensionIdRef.current;
    const currentId =
      stateRef.current?.context?.selectedExtensionId ?? null;
    if (nextId !== currentId) {
      updateContext({ selectedExtensionId: nextId });
    }
  }, [externalSelectedExtensionId, updateContext]);

  const cleanupSocket = useCallback((ref, pingRef, shouldNotifyServer = false) => {
    try {
      // Clear ping interval first
      if (pingRef?.current) {
        clearInterval(pingRef.current);
        pingRef.current = null;
      }
      const s = ref?.current;
      if (s) {
        // Send close_connection message to server (backend will handle closing the socket)
        if (shouldNotifyServer && s.readyState === WebSocket.OPEN) {
          try {
            s.send(JSON.stringify({ type: 'close_connection' }));
          } catch (err) {
            console.warn("Error sending close_connection message:", err);
          }
        }
        // Remove all event handlers to prevent memory leaks
        s.onopen = null;
        s.onmessage = null;
        s.onerror = null;
        s.onclose = null;
        // Only close socket manually if we're NOT notifying the server (backend handles it otherwise)
        if (!shouldNotifyServer) {
          if (
            s.readyState === WebSocket.OPEN ||
            s.readyState === WebSocket.CONNECTING
          ) {
            s.close(1000, "client_cleanup");
          }
        }
      }
    } catch (err) {
      console.warn("Error cleaning up socket:", err);
    }
    if (ref) ref.current = null;
  }, []);

  const cleanupAll = useCallback(() => {
    cleanupSocket(chatSocketRef, chatPingRef, true); // Notify server when cleaning up chat socket
    cleanupSocket(llmSocketRef, llmPingRef);
    cleanupSocket(kbSocketRef, kbPingRef);
  }, [cleanupSocket]);


  const resetState = useCallback(
    (userUuid = user?.uuid ?? null) => {
      autoPromptSentRef.current = false;
      streamMessageIdRef.current = null;
      streamBufferRef.current = "";
      setState(() => createInitialState(userUuid));
    },
    [user?.uuid]
  );

  const releaseCollection = useCallback(() => {
    const { knowledgeBatchId } = stateRef.current.context;
    if (!knowledgeBatchId) return;
    knowledgeBaseService
      .releaseCollection({
        domain: KNOWLEDGE_DOMAIN,
        batch_id: knowledgeBatchId,
      })
      .catch(() => {});
  }, []);

  const cancel = useCallback(() => {
    runRef.current.cancelled = true;
    abortRef.current?.abort();
    abortRef.current = null;
    cleanupAll();
    releaseCollection();
    resetState();
  }, [cleanupAll, releaseCollection, resetState]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cancel();
    };
  }, [cancel]);

  useEffect(() => {
    if (!user && state.status !== "idle") cancel();
  }, [user, state.status, cancel]);

  const isActive = useCallback((runId) => {
    const current = runRef.current;
    return current.id === runId && !current.cancelled;
  }, []);

  // ---- CHAT socket message handler with memory optimization ----
  const handleChatSocketMessage = useCallback(
    (payload) => {
      if (!isMountedRef.current) return;

      // Refresh sessions cache the first time we receive a socket message
      try {
        const { knowledgeBatchId, userUuid } = stateRef.current?.context ?? {};
        if (knowledgeBatchId && !stateRef.current.__sessionsRefreshed) {
          stateRef.current.__sessionsRefreshed = true;
          (async () => {
            try {
              const selectedExtensionId = await readExtensionStorage(
                STORAGE_KEYS.SELECTED_EXTENSION_ID
              );
              const resp = await knowledgeBaseService.getChatSessions({
                batch_id: knowledgeBatchId,
                user_uuid: userUuid ?? "None",
              });
              const list = Array.isArray(resp?.data) ? resp.data : [];
              const cacheKey = `sessions-cache:${
                selectedExtensionId || ""
              }:${knowledgeBatchId}`;
              await writeExtensionStorage(cacheKey, {
                sessions: list,
                savedAt: Date.now(),
              });
              try {
                window.dispatchEvent(
                  new CustomEvent("webmap:sessions-updated", {
                    detail: { knowledgeBatchId },
                  })
                );
              } catch {}
            } catch {}
          })();
        }
      } catch {}

      if (payload?.info === "ChatBot is ready to explore!") {
        const { chat = {}, context = {} } = stateRef.current ?? {};
        const hasExistingSession = Boolean(context.hasExistingSession);
        const hasMessages =
          Array.isArray(chat.messages) && chat.messages.length > 0;
        const shouldAutoSend =
          !autoPromptSentRef.current && !hasExistingSession && !hasMessages;

        if (shouldAutoSend) {
          const socket = chatSocketRef.current;
          if (socket && socket.readyState === WebSocket.OPEN) {
            // Fetch dynamic conversation starter from API
            (async () => {
              try {
                const selectedExtensionId = context.selectedExtensionId || await readExtensionStorage(STORAGE_KEYS.SELECTED_EXTENSION_ID);
                const userUuid = context.userUuid || user?.uuid;

                let conversationStarter = CHAT_START_PROMPT; // fallback to static prompt

                // Fetch extension agents list to get the conversation starter
                if (userUuid) {
                  try {
                    const agentsResp = await extensionAgentService.getExtensionAgents({
                      user_uuid: userUuid
                    });
                    const agentsList = Array.isArray(agentsResp?.data) ? agentsResp.data : Array.isArray(agentsResp) ? agentsResp : [];

                    // Find the matching agent by extension_id
                    if (selectedExtensionId && agentsList.length > 0) {
                      const matchingAgent = agentsList.find(agent => agent.extension_id === selectedExtensionId);
                      if (matchingAgent && matchingAgent.conversation_starters) {
                        conversationStarter = matchingAgent.conversation_starters;
                      }
                    }
                  } catch (error) {
                    console.warn("[useKnowledgeWorkflow] Failed to fetch conversation starters, using default:", error);
                  }
                }

                // Send the conversation starter to socket
                if (socket.readyState === WebSocket.OPEN) {
                  socket.send(
                    JSON.stringify({
                      prompt: conversationStarter,
                      type: "chat",
                      k_value: CHAT_START_PROMPT_K_VALUE,
                    })
                  );
                  autoPromptSentRef.current = true;
                  safeSetState((prev) => ({
                    ...prev,
                    chat: {
                      ...prev.chat,
                      ready: true,
                      awaitingResponse: true,
                      suggestions: [],
                    },
                  }));
                } else {
                  safeSetState((prev) => ({
                    ...prev,
                    chat: { ...prev.chat, ready: true },
                  }));
                }
              } catch (error) {
                console.error("[useKnowledgeWorkflow] Error sending auto prompt:", error);
                safeSetState((prev) => ({
                  ...prev,
                  chat: { ...prev.chat, ready: true },
                }));
              }
            })();
            return;
          }
        }
        safeSetState((prev) => ({
          ...prev,
          chat: { ...prev.chat, ready: true },
        }));
        return;
      }

      if (payload?.info === "Chat session created") return;

      if (payload?.chat_type === "error" || payload?.error) {
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : "Chat encountered an issue";
        streamMessageIdRef.current = null;
        streamBufferRef.current = "";
        safeSetState((prev) => {
          const newMessages = [
            ...prev.chat.messages,
            {
              id: createMessageId(),
              role: "system",
              type: "error",
              text: message,
              timestamp: new Date().toISOString(),
            },
          ];
          // Limit messages to prevent memory overflow
          const trimmedMessages =
            newMessages.length > MAX_MESSAGES_IN_MEMORY
              ? newMessages.slice(-MAX_MESSAGES_IN_MEMORY)
              : newMessages;

          return {
            ...prev,
            chat: {
              ...prev.chat,
              awaitingResponse: false,
              messages: trimmedMessages,
            },
          };
        });
        return;
      }

      const streamValue = payload?.stream;
      const isStreamStart = streamValue === "START_OF_STREAM";
      const isStreamEnd = streamValue === "END_OF_STREAM";
      const isStreamFinal = payload?.type === "STREAM";
      const isStreamChunk =
        typeof streamValue === "string" && streamValue && !isStreamStart && !isStreamEnd;

      if (isStreamStart || isStreamChunk || isStreamEnd || isStreamFinal) {
        const ensureStreamMessage = () => {
          let streamId = streamMessageIdRef.current;
          if (streamId) return streamId;

          streamId = createMessageId();
          streamMessageIdRef.current = streamId;
          streamBufferRef.current = "";

          safeSetState((prev) => {
            const newMessages = [
              ...prev.chat.messages,
              {
                id: streamId,
                role: "assistant",
                text: "",
                timestamp: new Date().toISOString(),
              },
            ];
            const trimmedMessages =
              newMessages.length > MAX_MESSAGES_IN_MEMORY
                ? newMessages.slice(-MAX_MESSAGES_IN_MEMORY)
                : newMessages;

            return {
              ...prev,
              chat: {
                ...prev.chat,
                awaitingResponse: true,
                messages: trimmedMessages,
              },
            };
          });

          return streamId;
        };

        if (isStreamStart) {
          ensureStreamMessage();
          return;
        }

        if (isStreamChunk) {
          const streamId = ensureStreamMessage();
          const chunk = String(streamValue ?? "");
          streamBufferRef.current = `${streamBufferRef.current ?? ""}${chunk}`;
          const html = renderMarkdownToHtml(streamBufferRef.current);

          safeSetState((prev) => {
            const messages = [...prev.chat.messages];
            const idx = messages.findIndex((m) => m.id === streamId);
            if (idx >= 0) {
              messages[idx] = { ...messages[idx], text: html };
            } else {
              messages.push({
                id: streamId,
                role: "assistant",
                text: html,
                timestamp: new Date().toISOString(),
              });
            }
            return {
              ...prev,
              chat: { ...prev.chat, messages },
            };
          });
          return;
        }

        if (isStreamEnd || isStreamFinal) {
          const streamId = streamMessageIdRef.current;
          const finalMarkdown =
            payload?.response ?? streamBufferRef.current ?? "";
          const html = renderMarkdownToHtml(finalMarkdown);
          const assistantMessage = {
            id: streamId || createMessageId(),
            role: "assistant",
            text: html,
            timestamp: payload.created_at ?? new Date().toISOString(),
            references: mapContextUrls(payload.context_urls ?? {}),
            suggestions: payload.suggestion_questions ?? [],
            cost: payload.overview_cost_per_chat ?? null,
            prompt: payload.prompt ?? null,
            kValue: payload.k_value ?? null,
          };

          const isFirstResponse = !stateRef.current?.chat?.hasReceivedFirstResponse;

          safeSetState((prev) => {
            const nextMessages = [...prev.chat.messages];
            const idx = streamId
              ? nextMessages.findIndex((m) => m.id === streamId)
              : -1;
            if (idx >= 0) {
              nextMessages[idx] = { ...nextMessages[idx], ...assistantMessage };
            } else {
              nextMessages.push(assistantMessage);
            }

            const trimmedMessages =
              nextMessages.length > MAX_MESSAGES_IN_MEMORY
                ? nextMessages.slice(-MAX_MESSAGES_IN_MEMORY)
                : nextMessages;

            return {
              ...prev,
              chat: {
                ...prev.chat,
                awaitingResponse: false,
                messages: trimmedMessages,
                suggestions: payload.suggestion_questions ?? [],
                hasReceivedFirstResponse: true,
              },
            };
          });

          streamMessageIdRef.current = null;
          streamBufferRef.current = "";

          if (isFirstResponse) {
            setTimeout(async () => {
              try {
                const knowledgeBatchId =
                  stateRef.current?.context?.knowledgeBatchId;
                const userUuid = stateRef.current?.context?.userUuid;

                if (knowledgeBatchId) {
                  const resp = await knowledgeBaseService.getChatSessions({
                    batch_id: knowledgeBatchId,
                    user_uuid: userUuid ?? "None",
                  });

                  const sessions = Array.isArray(resp?.data) ? resp.data : [];
                  if (sessions.length > 0) {
                    const currentSession = sessions[0];
                    const newTitle = currentSession.title || "New Chat";

                    safeSetState((prev) => ({
                      ...prev,
                      chat: {
                        ...prev.chat,
                        chatTitle: newTitle,
                      },
                    }));

                    window.dispatchEvent(
                      new CustomEvent("webmap:sessions-updated", {
                        detail: { knowledgeBatchId },
                      })
                    );
                  }
                }
              } catch (error) {
                console.warn(
                  "[useKnowledgeWorkflow] Failed to fetch session title",
                  error
                );
              }
            }, 1000);
          }

          return;
        }
      }

      // New contract: `response` contains Markdown (convert client-side)
      if (payload?.response) {
        const html = renderMarkdownToHtml(payload.response);
        const assistantMessage = {
          id: createMessageId(),
          role: "assistant",
          text: html,
          timestamp: payload.created_at ?? new Date().toISOString(),
          references: mapContextUrls(payload.context_urls ?? {}),
          suggestions: payload.suggestion_questions ?? [],
          cost: payload.overview_cost_per_chat ?? null,
          prompt: payload.prompt ?? null,
          kValue: payload.k_value ?? null,
        };

        const isFirstResponse = !stateRef.current?.chat?.hasReceivedFirstResponse;

        safeSetState((prev) => {
          const newMessages = [...prev.chat.messages, assistantMessage];
          // Limit messages to prevent memory overflow
          const trimmedMessages =
            newMessages.length > MAX_MESSAGES_IN_MEMORY
              ? newMessages.slice(-MAX_MESSAGES_IN_MEMORY)
              : newMessages;

          return {
            ...prev,
            chat: {
              ...prev.chat,
              awaitingResponse: false,
              messages: trimmedMessages,
              suggestions: payload.suggestion_questions ?? [],
              hasReceivedFirstResponse: true,
            },
          };
        });

        // Fetch session title after first response
        if (isFirstResponse) {
          setTimeout(async () => {
            try {
              const knowledgeBatchId = stateRef.current?.context?.knowledgeBatchId;
              const userUuid = stateRef.current?.context?.userUuid;

              if (knowledgeBatchId) {
                // Fetch chat sessions to get the title
                const resp = await knowledgeBaseService.getChatSessions({
                  batch_id: knowledgeBatchId,
                  user_uuid: userUuid ?? "None",
                });

                const sessions = Array.isArray(resp?.data) ? resp.data : [];
                if (sessions.length > 0) {
                  // Get the most recent session (first in array)
                  const currentSession = sessions[0];
                  const newTitle = currentSession.title || "New Chat";

                  safeSetState((prev) => ({
                    ...prev,
                    chat: {
                      ...prev.chat,
                      chatTitle: newTitle,
                    },
                  }));

                  // Dispatch event to update side menu
                  window.dispatchEvent(
                    new CustomEvent("webmap:sessions-updated", {
                      detail: { knowledgeBatchId },
                    })
                  );
                }
              }
            } catch (error) {
              console.warn("[useKnowledgeWorkflow] Failed to fetch session title", error);
            }
          }, 1000); // Delay to ensure API has generated the session title
        }

        return;
      }
    },
    [resolveSelectedExtensionId, safeSetState]
  );

  const openChatSocketConnection = useCallback(
    ({
      knowledgeBatchId,
      visitorId,
      userUuid,
      sessionId,
      extensionId,
      runId = null,
      shouldUpdateSessionStep = true,
      source = "default",
    }) => {
      if (!knowledgeWsBase)
        throw new Error("Knowledge websocket endpoint is not configured.");

      const socketUrl =
        `${knowledgeWsBase}/ws/extension-chat/${encodeURIComponent(
          knowledgeBatchId
        )}/?` +
        `domain=${encodeURIComponent(KNOWLEDGE_DOMAIN)}` +
        `&visitor_id=${encodeURIComponent(visitorId ?? "None")}` +
        `&user_uuid=${encodeURIComponent(userUuid ?? "None")}` +
        `&session_id=${encodeURIComponent(sessionId ?? "")}` +
        `&extension_id=${encodeURIComponent(extensionId || "")}`;

      console.log("[useKnowledgeWorkflow] Opening chat socket", {
        sessionId,
        knowledgeBatchId,
        extensionId: extensionId || null,
        source,
      });

      const chatSocket = new WebSocket(socketUrl);
      chatSocketRef.current = chatSocket;

      chatSocket.onopen = () => {
        if (runId && !isActive(runId)) return;
        if (!isMountedRef.current) return;
        if (shouldUpdateSessionStep) {
          setStepStatus("session", "done");
        }
        safeSetState((prev) => ({
          ...prev,
          chat: { ...prev.chat, connecting: false, ready: true },
        }));
        console.log("[useKnowledgeWorkflow] Chat socket ready", {
          sessionId,
          knowledgeBatchId,
          extensionId: extensionId || null,
          source,
        });
      };

      chatSocket.onmessage = (event) => {
        if (runId && !isActive(runId)) return;
        if (!isMountedRef.current) return;
        try {
          handleChatSocketMessage(JSON.parse(event.data));
        } catch (error) {
          console.warn(
            "[useKnowledgeWorkflow] Failed to parse chat socket payload",
            error
          );
        }
      };

      chatSocket.onerror = () => {
        if (runId && !isActive(runId)) return;
        if (!isMountedRef.current) return;
        safeSetState((prev) => ({
          ...prev,
          chat: { ...prev.chat, ready: false, connecting: false },
          error: prev.error ?? {
            message: "Chat connection encountered an issue.",
          },
        }));
        console.error("[useKnowledgeWorkflow] Chat socket error", {
          sessionId,
          knowledgeBatchId,
          extensionId: extensionId || null,
          source,
        });
      };

      chatSocket.onclose = () => {
        if (runId && !isActive(runId)) return;
        if (!isMountedRef.current) return;
        safeSetState((prev) => ({
          ...prev,
          chat: { ...prev.chat, ready: false },
        }));
        console.log("[useKnowledgeWorkflow] Chat socket closed", {
          sessionId,
          knowledgeBatchId,
          extensionId: extensionId || null,
          source,
        });
      };

      chatPingRef.current = setInterval(() => {
        if (chatSocketRef.current?.readyState === WebSocket.OPEN) {
          try {
            chatSocketRef.current.send(
              JSON.stringify({ prompt: "ping", type: "ping" })
            );
          } catch {}
        }
      }, CHAT_PING_INTERVAL_MS);
    },
    [handleChatSocketMessage, isActive, safeSetState, setStepStatus]
  );

  // ---------- LLM WS (markdown) ----------
  const waitForLlmViaWebSocket = useCallback(
    ({ batchId, taskId, visitorId, runId }) => {
      return new Promise((resolve) => {
        if (!scrapperWsBase || !batchId) {
          // proceed even if not configured
          resolve({ ok: true, reason: "no-socket" });
          return;
        }

        const url = `${scrapperWsBase}/ws/markdown/${encodeURIComponent(
          batchId
        )}/`;
        const socket = new WebSocket(url);
        llmSocketRef.current = socket;

        // safety timeout to avoid hanging spinner
        const timeoutId = setTimeout(() => {
          try {
            setStepStatus("llm", "error", {
              message: "Timed out waiting for markdown processing.",
            });
          } catch {}
          try {
            socket.close(4000, "timeout");
          } catch {}
          resolve({ ok: true, reason: "timeout" });
        }, 90000);

        const sendPing = () => {
          if (llmSocketRef.current?.readyState === WebSocket.OPEN) {
            try {
              llmSocketRef.current.send(
                JSON.stringify({
                  type: "ping",
                  visitor_id: visitorId,
                  task_id: taskId,
                })
              );
            } catch {}
          }
        };

        socket.onopen = () => {
          if (!isActive(runId)) return;
          setStepStatus("llm", "in-progress");
          // initial ping + interval
          sendPing();
          llmPingRef.current = setInterval(sendPing, WS_PING_INTERVAL_MS);
        };

        socket.onmessage = (event) => {
          if (!isActive(runId)) return;
          let data;
          try {
            data = JSON.parse(event.data);
          } catch {
            return;
          }

          // Angular parity: 201 success, 210 stopped (credit), 500 terminated
          const code = data?.status_code ?? data?.data?.status_code;
          const msg = data?.message ?? data?.data?.message;

          if (
            code === 201 &&
            msg === "Markdown process finished successfully"
          ) {
            setStepStatus("llm", "done", { note: null });
            clearTimeout(timeoutId);
            resolve({ ok: true });
          } else if (code === 210) {
            setStepStatus("llm", "error", {
              message: msg || "Credit exhausted",
            });
            // non-blocking per your spec: continue
            clearTimeout(timeoutId);
            resolve({ ok: true, reason: "credit-exhausted" });
          } else if (code === 500) {
            setStepStatus("llm", "error", {
              message: msg || "Task terminated",
            });
            // non-blocking: continue
            clearTimeout(timeoutId);
            resolve({ ok: true, reason: "terminated" });
          }
        };

        socket.onerror = () => {
          if (!isActive(runId)) return;
          // non-blocking
          clearTimeout(timeoutId);
          resolve({ ok: true, reason: "socket-error" });
        };

        socket.onclose = () => {
          // if it closed before terminal, still proceed (non-blocking)
          clearTimeout(timeoutId);
          resolve({ ok: true, reason: "socket-closed" });
        };
      }).finally(() => {
        // cleanup once resolved
        cleanupSocket(llmSocketRef, llmPingRef);
      });
    },
    [cleanupSocket, isActive, setStepStatus]
  );

  // ---------- KB WS (chatbot) ----------
  const waitForKbViaWebSocket = useCallback(
    ({ batchId, taskId, visitorId, runId }) => {
      return new Promise((resolve, reject) => {
        if (!knowledgeWsBase || !batchId) {
          reject(new Error("Knowledge websocket endpoint is not configured."));
          return;
        }
        const url = `${knowledgeWsBase}/ws/chatbot/${encodeURIComponent(
          batchId
        )}/`;
        const socket = new WebSocket(url);
        kbSocketRef.current = socket;

        // safety timeout to prevent indefinite wait
        const timeoutId = setTimeout(() => {
          try {
            setStepStatus("knowledge", "error", {
              message: "Timed out building knowledge base.",
            });
          } catch {}
          try {
            socket.close(4000, "timeout");
          } catch {}
          reject(new Error("Knowledge websocket timed out."));
        }, 120000);

        const sendPing = () => {
          if (kbSocketRef.current?.readyState === WebSocket.OPEN) {
            try {
              kbSocketRef.current.send(
                JSON.stringify({
                  type: "ping",
                  visitor_id: visitorId,
                  task_id: taskId,
                })
              );
            } catch {}
          }
        };

        socket.onopen = () => {
          if (!isActive(runId)) return;
          setStepStatus("knowledge", "in-progress");
          sendPing();
          kbPingRef.current = setInterval(sendPing, WS_PING_INTERVAL_MS);
        };

        socket.onmessage = (event) => {
          if (!isActive(runId)) return;
          let payload;
          try {
            payload = JSON.parse(event.data);
          } catch {
            return;
          }

          const code = payload?.data?.status_code ?? payload?.status_code;
          const msg = payload?.data?.message ?? payload?.message;

          if (code === 200 && msg === "Knowledgebase built") {
            // Completed
            safeSetState((prev) => ({
              ...prev,
              knowledgeSummary: {
                inserted: payload?.data?.url_count ?? null,
                status: payload?.data?.scan_status ?? "Completed",
              },
            }));
            setStepStatus("knowledge", "done", { note: null });
            clearTimeout(timeoutId);
            resolve({ ok: true });
          } else if (code === 210) {
            setStepStatus("knowledge", "error", {
              message: msg || "Credit exhausted",
            });
            clearTimeout(timeoutId);
            reject(new Error("Embedding process stopped: credit exhausted."));
          } else if (code === 500) {
            setStepStatus("knowledge", "error", {
              message: msg || "Task terminated",
            });
            clearTimeout(timeoutId);
            reject(new Error("Embedding process terminated from backend."));
          } else {
            // Custom progress messages that rotate
            const customMessages = [
              "Analyzing page content...",
              "Processing data structures...",
              "Building knowledge connections...",
              "Finalizing knowledge base..."
            ];

            // Use a simple rotation based on message count
            const messageIndex = Math.floor(Date.now() / 2000) % customMessages.length;
            const progressNote = customMessages[messageIndex];

            setStepStatus("knowledge", "in-progress", {
              note: progressNote,
            });
          }
        };

        socket.onerror = () => {
          if (!isActive(runId)) return;
          setStepStatus("knowledge", "error", { message: "KB socket error" });
          clearTimeout(timeoutId);
          reject(new Error("Knowledge websocket error."));
        };

        socket.onclose = () => {
          // If we closed without seeing 200, reject if still active
          if (!isActive(runId)) return;
          clearTimeout(timeoutId);
          reject(new Error("Knowledge websocket closed unexpectedly."));
        };
      }).finally(() => {
        cleanupSocket(kbSocketRef, kbPingRef);
      });
    },
    [cleanupSocket, isActive, safeSetState, setStepStatus]
  );

  // ---------- CHAT WS ----------
  const connectChatSocket = useCallback(
    async ({ knowledgeBatchId, visitorId, userUuid, runId }) => {
      setStepStatus("session", "in-progress");

      const selectedExtensionId =
        (await resolveSelectedExtensionId({ reason: "connect-chat" })) || null;

      const listResp = await knowledgeBaseService.getChatSessions({
        // domain: KNOWLEDGE_DOMAIN,
        // visitor_id: visitorId,
        batch_id: knowledgeBatchId,
        user_uuid: userUuid ?? "None",
      });
      if (!isActive(runId)) return;

      const sessions = Array.isArray(listResp?.data) ? listResp.data : [];
      const hasExistingSession = sessions.length > 0;
      // Prefer the latest session by created_at desc if available
      let sessionId = null;
      if (hasExistingSession) {
        const sorted = [...sessions].sort((a, b) => {
          const da = new Date(a.created_at || 0).getTime();
          const db = new Date(b.created_at || 0).getTime();
          return db - da;
        });
        sessionId =
          sorted[0]?.chat_session_id ?? sessions[0]?.chat_session_id ?? null;
      }
      let initialMessages = [];

      if (sessionId) {
        const historyResp = await knowledgeBaseService.getChatHistory({
          // domain: KNOWLEDGE_DOMAIN,
          visitor_id: visitorId,
          batch_id: knowledgeBatchId,
          user_uuid: userUuid ?? "None",
          session_id: sessionId,
        });
        if (!isActive(runId)) return;
        initialMessages = mapChatHistory(historyResp?.data ?? []);
      } else {
        const historyResp = await knowledgeBaseService.getChatHistory({
          // domain: KNOWLEDGE_DOMAIN,
          visitor_id: visitorId,
          batch_id: knowledgeBatchId,
          user_uuid: userUuid ?? "None",
          session_id: null,
        });
        if (!isActive(runId)) return;
        sessionId =
          historyResp?.session_id ??
          historyResp?.data?.[0]?.chat_session_id ??
          null;
        initialMessages = mapChatHistory(historyResp?.data ?? []);
      }

      if (!sessionId) throw new Error("Unable to establish a chat session.");

      updateContext({ sessionId, hasExistingSession, selectedExtensionId });
      autoPromptSentRef.current = hasExistingSession;

      const initialSuggestions = extractLatestSuggestions(initialMessages);

      // Fetch session title if we have an existing session
      let sessionTitle = "New Chat";
      if (hasExistingSession && knowledgeBatchId) {
        try {
          const sessionsResp = await knowledgeBaseService.getChatSessions({
            batch_id: knowledgeBatchId,
            user_uuid: userUuid ?? "None",
          });
          const sessionsList = Array.isArray(sessionsResp?.data) ? sessionsResp.data : [];
          const currentSession = sessionsList.find(s => s.chat_session_id === sessionId);
          sessionTitle = currentSession?.title || "New Chat";
        } catch (error) {
          console.warn("[useKnowledgeWorkflow] Failed to fetch session title", error);
        }
      }

      safeSetState((prev) => ({
        ...prev,
        status: "ready",
        chat: {
          ...prev.chat,
          connecting: true,
          ready: false,
          messages:
            initialMessages.length > MAX_MESSAGES_IN_MEMORY
              ? initialMessages.slice(-MAX_MESSAGES_IN_MEMORY)
              : initialMessages,
          suggestions: initialSuggestions,
          awaitingResponse: false,
          chatTitle: sessionTitle,
          hasReceivedFirstResponse: hasExistingSession,
        },
      }));

      cleanupSocket(chatSocketRef, chatPingRef, true);
      openChatSocketConnection({
        knowledgeBatchId,
        visitorId,
        userUuid,
        sessionId,
        extensionId: selectedExtensionId,
        runId,
        shouldUpdateSessionStep: true,
        source: "connectChatSocket",
      });
    },
    [
      cleanupSocket,
      openChatSocketConnection,
      resolveSelectedExtensionId,
      safeSetState,
      setStepStatus,
      updateContext,
    ]
  );

  // Start chat for an already-built knowledge base (skip LLM/KB build)
  const startChatForExistingKb = useCallback(
    async ({ batchId, title, note } = {}) => {
      if (!batchId) return;

      // reset any ongoing run
      cancel();

      const runId = Date.now();
      runRef.current = { id: runId, cancelled: false };

      // Prepare minimal steps: prior steps are already done
      const existingSteps = createInitialSteps().map((s) =>
        s.key === "session"
          ? { ...s, status: "pending" }
          : { ...s, status: "done" }
      );

      // Fingerprint/visitor identity
      const identity = await readExtensionVisitorIdentity();
      const visitorId = identity?.visitorId ?? null;
      const requestId = identity?.requestId ?? null;

      // Prime state to show connecting spinner immediately
      safeSetState((prev) => ({
        ...prev,
        status: "ready",
        steps: existingSteps,
        error: null,
        knowledgeSummary: null,
        context: {
          ...prev.context,
          title: title ?? prev.context.title ?? "",
          note: note ?? prev.context.note ?? "",
          visitorId: visitorId ?? "",
          requestId: requestId ?? "",
          userUuid: user?.uuid ?? null,
          toolBatchId: null,
          knowledgeBatchId: batchId,
          sessionId: null,
          hasExistingSession: false,
        },
        chat: {
          ...prev.chat,
          ready: false,
          connecting: true,
          messages: [],
          suggestions: [],
          awaitingResponse: false,
          chatTitle: "New Chat",
          hasReceivedFirstResponse: false,
        },
      }));

      try {
        await connectChatSocket({
          knowledgeBatchId: batchId,
          visitorId,
          userUuid: user?.uuid ?? null,
          runId,
        });
      } catch (e) {
        if (!isActive(runId)) return;
        setStepStatus("session", "error", {
          message: e?.message || "Failed to connect chat session.",
        });
        safeSetState((prev) => ({
          ...prev,
          status: "error",
          error: { message: e?.message || "Unable to start chat." },
          chat: { ...prev.chat, ready: false, connecting: false },
        }));
      }
    },
    [
      cancel,
      connectChatSocket,
      isActive,
      safeSetState,
      setStepStatus,
      user?.uuid,
    ]
  );

  // Switch to a different session for the current KB
  const switchSession = useCallback(
    async (session) => {
      const sessionId =
        typeof session === "string" ? session : session?.chat_session_id;
      const sessionTitle =
        typeof session === "object" ? session?.title || "New Chat" : "New Chat";
      const knowledgeBatchId = stateRef.current?.context?.knowledgeBatchId;
      const visitorId = stateRef.current?.context?.visitorId;
      const userUuid =
        stateRef.current?.context?.userUuid ?? user?.uuid ?? null;
      if (!sessionId || !knowledgeBatchId) return;

      // Close existing socket and show connecting (notify server about disconnection)
      cleanupSocket(chatSocketRef, chatPingRef, true);
      safeSetState((prev) => ({
        ...prev,
        chat: {
          ...prev.chat,
          connecting: true,
          ready: false,
          chatTitle: sessionTitle,
        },
      }));

      try {
        // Release collection before switching sessions
        if (knowledgeBatchId) {
          try {
            await knowledgeBaseService.releaseCollection({
              batch_id: knowledgeBatchId,
            });
          } catch (releaseError) {
            console.warn("Failed to release collection:", releaseError);
          }
        }

        const selectedExtensionId =
          (await resolveSelectedExtensionId({
            reason: "switch-session",
          })) || null;

        // Fetch and display history for the selected session
        const historyResp = await knowledgeBaseService.getChatHistory({
          visitor_id: visitorId,
          batch_id: knowledgeBatchId,
          user_uuid: userUuid ?? "None",
          session_id: sessionId,
        });
        const initialMessages = mapChatHistory(historyResp?.data ?? []);
        const initialSuggestions = extractLatestSuggestions(initialMessages);

        updateContext({
          sessionId,
          hasExistingSession: true,
          selectedExtensionId,
        });
        safeSetState((prev) => ({
          ...prev,
          chat: {
            ...prev.chat,
            messages:
              initialMessages.length > MAX_MESSAGES_IN_MEMORY
                ? initialMessages.slice(-MAX_MESSAGES_IN_MEMORY)
                : initialMessages,
            suggestions: initialSuggestions,
            awaitingResponse: false,
          },
        }));

        cleanupSocket(chatSocketRef, chatPingRef, true);
        openChatSocketConnection({
          knowledgeBatchId,
          visitorId,
          userUuid,
          sessionId,
          extensionId: selectedExtensionId,
          shouldUpdateSessionStep: false,
          source: "switchSession",
        });

        // Let any listeners refresh session lists
        try {
          window.dispatchEvent(
            new CustomEvent("webmap:sessions-updated", {
              detail: { knowledgeBatchId },
            })
          );
        } catch {}
      } catch (e) {
        safeSetState((prev) => ({
          ...prev,
          error: prev.error ?? {
            message: e?.message || "Failed to switch session.",
          },
          chat: { ...prev.chat, connecting: false, ready: false },
        }));
      }
    },
    [
      cleanupSocket,
      openChatSocketConnection,
      resolveSelectedExtensionId,
      safeSetState,
      updateContext,
      user?.uuid,
    ]
  );

  // Create a brand-new chat session for the current KB and switch to it
  const createNewChatSession = useCallback(async () => {
    const knowledgeBatchId = stateRef.current?.context?.knowledgeBatchId;
    const visitorId = stateRef.current?.context?.visitorId;
    const userUuid = stateRef.current?.context?.userUuid ?? user?.uuid ?? null;
    if (!knowledgeBatchId) return;

    try {
      const selectedExtensionId =
        (await resolveSelectedExtensionId({
          reason: "create-new-session",
        })) || null;
      // Ask backend to initialize a new session by omitting session_id
      const resp = await knowledgeBaseService.getChatHistory({
        visitor_id: visitorId,
        batch_id: knowledgeBatchId,
        user_uuid: userUuid ?? "None",
        session_id: null,
      });
      const newSessionId =
        resp?.session_id || resp?.data?.[0]?.chat_session_id || null;
      if (!newSessionId) {
        throw new Error("Failed to create a new chat session.");
      }

      // Refresh session cache listeners
      try {
        const cacheKey = `sessions-cache:${
          selectedExtensionId || ""
        }:${knowledgeBatchId}`;
        await writeExtensionStorage(cacheKey, {
          sessions: null,
          savedAt: Date.now(),
        });
        window.dispatchEvent(
          new CustomEvent("webmap:sessions-updated", {
            detail: { knowledgeBatchId },
          })
        );
      } catch {}

      await switchSession(newSessionId);
    } catch (e) {
      safeSetState((prev) => ({
        ...prev,
        error: prev.error ?? {
          message: e?.message || "Unable to create new chat.",
        },
      }));
    }
  }, [resolveSelectedExtensionId, switchSession, user?.uuid]);

  const previousExtensionIdRef = useRef(null);
  useEffect(() => {
    const context = stateRef.current?.context ?? {};
    const currentExtensionId = context.selectedExtensionId ?? null;
    const prevExtensionId = previousExtensionIdRef.current;

    if (currentExtensionId === prevExtensionId) {
      return;
    }

    previousExtensionIdRef.current = currentExtensionId;

    const knowledgeBatchId = context.knowledgeBatchId;
    const sessionId = context.sessionId;
    const visitorId = context.visitorId;
    const userUuid = context.userUuid ?? user?.uuid ?? null;
    const socket = chatSocketRef.current;
    const hasSocket =
      socket &&
      (socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING);

    if (!knowledgeBatchId || !sessionId || !hasSocket) {
      console.log(
        "[useKnowledgeWorkflow] Agent change effect skipped (no active socket)",
        {
          previousExtensionId: prevExtensionId,
          nextExtensionId: currentExtensionId,
          hasSocket,
          knowledgeBatchId,
          sessionId,
        }
      );
      return;
    }

    console.log(
      "[useKnowledgeWorkflow] Agent change effect reconnecting socket",
      {
        previousExtensionId: prevExtensionId,
        nextExtensionId: currentExtensionId,
        knowledgeBatchId,
        sessionId,
      }
    );

    safeSetState((prev) => ({
      ...prev,
      chat: { ...prev.chat, connecting: true },
    }));

    cleanupSocket(chatSocketRef, chatPingRef, true);
    openChatSocketConnection({
      knowledgeBatchId,
      visitorId,
      userUuid,
      sessionId,
      extensionId: currentExtensionId,
      shouldUpdateSessionStep: false,
      source: "selected-extension-effect",
    });
  }, [
    cleanupSocket,
    openChatSocketConnection,
    safeSetState,
    state.context.selectedExtensionId,
    state.context.knowledgeBatchId,
    state.context.sessionId,
    state.context.visitorId,
    state.context.userUuid,
    user?.uuid,
  ]);

  const currentUrl = window.location.href;

  console.log(currentUrl);

  // ---------- Public API ----------

  const resolveHtmlSelectionPreference = useCallback(async () => {
    const userUuid = stateRef.current?.context?.userUuid || user?.uuid || null;
    if (!userUuid) return false;

    try {
      const cached = await readStoredHtmlSelection(userUuid);
      if (cached && typeof cached.cleaned_html === "boolean") {
        return Boolean(cached.cleaned_html);
      }
    } catch (error) {
      console.warn("[useKnowledgeWorkflow] Failed to read cached HTML selection", error);
    }

    try {
      const remote = await scrapperService.getHtmlSelectionPreference(userUuid, {
        accessToken,
        refreshToken,
        logLabel: "last-html-selection:get (workflow)",
      });
      if (remote && typeof remote.cleaned_html === "boolean") {
        const normalized = Boolean(remote.cleaned_html);
        await writeStoredHtmlSelection(userUuid, normalized);
        return normalized;
      }
    } catch (error) {
      console.warn("[useKnowledgeWorkflow] Failed to fetch HTML selection preference", error);
    }

    return false;
  }, [accessToken, refreshToken, user?.uuid]);

  const startKnowledgeChat = useCallback(
    async ({ title, note, url }) => {
      // reset & guard
      cancel();
      autoPromptSentRef.current = false;

      const normalizedTitle = title?.trim();
      const normalizedNote = note?.trim() ?? "";
      if (!normalizedTitle) {
        safeSetState((prev) => ({
          ...prev,
          status: "error",
          error: { message: "A title is required to start the chat." },
        }));
        return;
      }

      const runId = Date.now();
      runRef.current = { id: runId, cancelled: false };
      const abortController = new AbortController();
      abortRef.current = abortController;

      // initial state
      safeSetState(() => ({
        status: "running",
        steps: createInitialSteps().map((s) =>
          s.key === "fingerprint" ? { ...s, status: "in-progress" } : s
        ),
        error: null,
        knowledgeSummary: null,
        context: {
          url,
          title: normalizedTitle,
          note: normalizedNote,
          visitorId: "",
          requestId: "",
          userUuid: user?.uuid ?? null,
          toolBatchId: null,
          knowledgeBatchId: null,
          sessionId: null,
          selectedExtensionId: null,
          hasExistingSession: false,
        },
        chat: {
          ready: false,
          connecting: false,
          messages: [],
          suggestions: [],
          awaitingResponse: false,
        },
      }));

      try {
        // Fingerprint
        const identity = await readExtensionVisitorIdentity();
        const visitorId = identity?.visitorId ?? null;
        const requestId = identity?.requestId ?? null;
        if (!visitorId)
          throw new Error(
            "Unable to locate visitor ID. Please sign in again to continue."
          );

        updateContext({ visitorId, requestId: requestId ?? "" });
        setStepStatus("fingerprint", "done");

        // Close previous tasks (best effort)
        const domainHost = safeHostname(url);
        try {
          await usersService.closeAllTask({
            ...(user?.uuid
              ? { user_uuid: user.uuid }
              : { visitor_id: visitorId }),
            ...(domainHost ? { domain: domainHost } : {}),
          });
        } catch {}

        // Decide ingestion mode (HTML vs PDF/Google Docs)
        const docContentType =
          (typeof document !== "undefined" && document.contentType) || "";
        const pdfLike =
          docContentType?.toLowerCase() === "application/pdf" ||
          isProbablyPdfUrl(url) ||
          isGoogleDocsUrl(url);

        let uploadFile = null;
        let uploadContentType = "";
        let uploadName = "";

        if (pdfLike) {
          // PDF or Google Docs → download file and upload to S3
          const sourceUrl = isGoogleDocsUrl(url)
            ? toGoogleDocsPdfExport(url) || url
            : url;

          // Inform user that we detected a PDF-type webpage
          const docType = isGoogleDocsUrl(url) ? "Google Doc" : "PDF document";
          setStepStatus("llm", "pending", {
            note: `${docType} detected - preparing to download`
          });

          let pdfBlob;
          try {
            // Update status to show we're actively downloading
            setStepStatus("llm", "in-progress", {
              note: `Downloading ${docType}...`
            });

            const res = await fetch(sourceUrl, {
              method: "GET",
              credentials: "include",
              cache: "no-store",
              signal: abortController.signal,
            });
            if (!res.ok) throw new Error(`Download failed: ${res.status}`);

            pdfBlob = await res.blob();
            if (!isActive(runId)) return;

            // Show file size for better UX
            const fileSizeMB = (pdfBlob.size / (1024 * 1024)).toFixed(2);
            setStepStatus("llm", "in-progress", {
              note: `Download complete (${fileSizeMB} MB) - preparing file`
            });

            uploadName = makeFilename(url, normalizedTitle, "pdf");
            uploadContentType = "application/pdf";
            uploadFile = new File([pdfBlob], uploadName, {
              type: uploadContentType,
            });

            // Update status for upload phase
            setStepStatus("llm", "in-progress", {
              note: `Uploading ${docType} to server...`
            });
          } catch (e) {
            // Reverted: no Drive OAuth/extra retries; simply fall back to HTML
            console.warn(
              "[Webmap] PDF/Docs download failed; falling back to HTML:",
              e
            );
            setStepStatus("llm", "pending", {
              note: "Download failed - switching to HTML capture mode",
            });
            uploadFile = null; // Force HTML flow
          }
        } else {
          // HTML path (existing behavior)
          // The actual HTML path is implemented below after the try/fallback
        }

        // If we don’t have a prepared file (e.g., PDF failed or HTML path), use HTML fallback path
        if (!uploadFile) {
          // Read captured HTML from storage, or capture on the fly
          let sourceHtml = null;
          let sourceFilename = null;
          try {
            const capturedHtmlData = await readExtensionStorage(
              STORAGE_KEYS.CAPTURED_HTML
            );
            if (capturedHtmlData?.htmlContent) {
              sourceHtml = capturedHtmlData.htmlContent;
              sourceFilename =
                capturedHtmlData.filename ||
                makeFilename(url, normalizedTitle, "html");
            }
          } catch {}

          if (!sourceHtml) {
            // Capture now as a last resort
            try {
              sourceHtml = captureRenderedHtml();
              sourceFilename = generateHtmlFilename(url, normalizedTitle);
            } catch (e) {
              setStepStatus("llm", "error", {
                message: "Failed to capture HTML fallback.",
              });
              throw e;
            }
          }

          const useCleanedHtml = await resolveHtmlSelectionPreference();
          if (!isActive(runId)) return;

          safeSetState((prev) => ({
            ...prev,
            htmlChoice: {
              waiting: false,
              selected: useCleanedHtml ? "cleaned" : "original",
            },
          }));

          setStepStatus("llm", "pending", {
            note: useCleanedHtml
              ? "Using cleaned HTML automatically"
              : "Using original HTML automatically",
          });

          // Process according to stored preference
          let processedHtml = useCleanedHtml
            ? cleanHtmlString(sourceHtml)
            : removeAdsOnlyFromHtml(sourceHtml);

          // Safety: if cleaning produced an unexpectedly tiny or empty document,
          // fall back to the captured HTML to avoid uploading a bare template.
          try {
            const tooSmall = !processedHtml || processedHtml.length < 400;
            const looksTemplateOnly = /<body[^>]*>\s*<\/body>/i.test(processedHtml);
            if (tooSmall || looksTemplateOnly) {
              console.warn(
                "[Webmap] Processed HTML looks empty; falling back to captured HTML",
                {
                  cleaned: useCleanedHtml,
                  processedLength: processedHtml ? processedHtml.length : 0,
                  sourceLength: sourceHtml ? sourceHtml.length : 0,
                }
              );
              processedHtml = String(sourceHtml || "");
            }
          } catch {}

          const htmlBlob = new Blob([processedHtml], { type: "text/html" });
          uploadName =
            sourceFilename || makeFilename(url, normalizedTitle, "html");
          uploadContentType = "text/html";
          uploadFile = new File([htmlBlob], uploadName, {
            type: uploadContentType,
          });

          setStepStatus("llm", "in-progress", { note: "Using HTML fallback" });

          // Inform the user in chat after setup that we fell back to HTML
          try {
            safeSetState((prev) => {
              const newMessages = [
                ...prev.chat.messages,
                {
                  id: createMessageId(),
                  role: "system",
                  type: "info",
                  text: "Could not download the document (blocked by site/CORS). Using an HTML snapshot so the chatbot can still start.",
                  timestamp: new Date().toISOString(),
                },
              ];
              const trimmed =
                newMessages.length > MAX_MESSAGES_IN_MEMORY
                  ? newMessages.slice(-MAX_MESSAGES_IN_MEMORY)
                  : newMessages;
              return { ...prev, chat: { ...prev.chat, messages: trimmed } };
            });
          } catch {}
        }

        // Presign (both HTML and PDF)
        let presigned;
        try {
          presigned = await scrapperService.getPresignedUploadUrl(
            {
              file_names: [uploadName],
              file_sizes: [uploadFile.size],
              user_uuid: user?.uuid ?? null,
              visitor_id: visitorId,
              is_extension: true,
            },
            { signal: abortController.signal, accessToken, refreshToken }
          );
        } catch (e) {
          setStepStatus("llm", "error", {
            message: e?.message || "Failed to get upload URL.",
          });
          throw e;
        }
        if (!isActive(runId)) return;

        const files = presigned?.files ?? presigned?.data?.files;
        const toolBatchId = presigned?.batch_id ?? presigned?.data?.batch_id;
        if (!files?.length || !toolBatchId)
          throw new Error("Failed to get upload URL from server.");

        // Upload to S3
        const uploadInfo = files[0];
        try {
          const putRes = await fetch(uploadInfo.upload_url, {
            method: "PUT",
            headers: {
              "Content-Type": uploadInfo.content_type || uploadContentType,
            },
            body: uploadFile,
          });
          if (!putRes.ok)
            throw new Error(
              `S3 upload failed: ${putRes.status} ${putRes.statusText}`
            );

          // Confirm successful upload
          const fileType = uploadContentType === "application/pdf" ? "PDF" : "HTML";
          setStepStatus("llm", "in-progress", {
            note: `${fileType} uploaded successfully - processing content`
          });
        } catch (e) {
          setStepStatus("llm", "error", {
            message: e?.message || "Failed to upload to storage.",
          });
          throw e;
        }

        updateContext({ toolBatchId });

        // Trigger server-side processing
        setStepStatus("llm", "in-progress");

        // Get the cleaned_html preference for the upload payload
        const cleanedHtmlPreference = await resolveHtmlSelectionPreference();
        if (!isActive(runId)) return;

        try {
          await scrapperService.uploadMarkdown(
            {
              visitor_id: visitorId,
              batch_id: toolBatchId,
              is_extension: true,
              link_url: normalizeFullUrlNoTrailing(currentUrl),
              domain: safeHostname(url)
                ? `https://${safeHostname(url)}`
                : "https://unknown-domain",
              ...(user?.uuid ? { user_uuid: user.uuid } : {}),
              onlyHtmlContent: uploadContentType === "text/html",
              onlymainContent: false,
              title: normalizedTitle,
              note: normalizedNote,
              cleaned_html: cleanedHtmlPreference,
            },
            { signal: abortController.signal, accessToken, refreshToken }
          );
        } catch (e) {
          setStepStatus("llm", "error", {
            message: e?.message || "Failed to trigger markdown processing.",
          });
          throw e;
        }
        if (!isActive(runId)) return;

        // LLM WebSocket (non-blocking on error, but wait for a terminal signal)
        await waitForLlmViaWebSocket({
          batchId: toolBatchId,
          taskId: toolBatchId, // if you have a task_id, pass it; using batchId as placeholder
          visitorId,
          runId,
        });

        // KB trigger - get selected extension_id from storage
        setStepStatus("knowledge", "in-progress");
        let kbResp;
        try {
          const selectedExtensionId =
            (await resolveSelectedExtensionId({
              reason: "knowledge-build",
            })) || null;
          updateContext({ selectedExtensionId });

          // Read the latest value from ref to avoid closure issues
          let currentIsOpenAI = isOpenAIRef.current;
          // Also hydrate from extension/local storage in case the toggle was changed elsewhere
          try {
            const storedModel = await readExtensionStorage(STORAGE_KEYS.EMBEDDING_MODEL);
            if (
              storedModel &&
              typeof storedModel === "string" &&
              Object.values(EMBEDDING_MODELS).includes(storedModel)
            ) {
              currentIsOpenAI = storedModel === EMBEDDING_MODELS.OPENAI;
            } else {
              const storedFlag = await readExtensionStorage(STORAGE_KEYS.IS_OPENAI);
              if (typeof storedFlag === "boolean") {
                currentIsOpenAI = storedFlag;
              } else if (typeof storedFlag === "string") {
                const normalized = storedFlag.trim().toLowerCase();
                if (normalized === "true" || normalized === "false") {
                  currentIsOpenAI = normalized === "true";
                }
              }
            }
          } catch (error) {
            console.warn("[useKnowledgeWorkflow] Failed to read embedding model from storage", error);
          }
          console.log("[useKnowledgeWorkflow] Using embedding model setting", {
            is_openai: currentIsOpenAI,
          });

          kbResp = await knowledgeBaseService.processKnowledgeBase(
            {
              visitor_id: visitorId,
              ...(user?.uuid ? { user_uuid: user.uuid } : {}),
              request_id: requestId || undefined,
              batch_id_list: [toolBatchId],
              link_url_list: [normalizeFullUrlNoTrailing(url ?? currentUrl)],
              domain: KNOWLEDGE_DOMAIN,
              is_faiss: false,
              is_extension: "true",
              title: normalizedTitle,
              note: normalizedNote,
              multi_project: false,
              // Both keys are sent to align with backend expectations
              is_openai: currentIsOpenAI,
              open_ai: currentIsOpenAI,
              ...(selectedExtensionId
                ? { extension_id: selectedExtensionId }
                : {}),
            },
            { signal: abortController.signal }
          );
        } catch (e) {
          setStepStatus("knowledge", "error", {
            message: e?.message || "Failed to start knowledge base build.",
          });
          throw e;
        }
        if (!isActive(runId)) return;

        const knowledgeBatchId =
          kbResp?.batch_id ?? kbResp?.data?.batch_id ?? null;
        if (!knowledgeBatchId)
          throw new Error("Knowledge base did not return a batch identifier.");
        updateContext({ knowledgeBatchId });

        // KB WebSocket (blocking)
        await waitForKbViaWebSocket({
          batchId: knowledgeBatchId,
          taskId: knowledgeBatchId, // if you have a task_id, pass it; using batchId as placeholder
          visitorId,
          runId,
        });
        if (!isActive(runId)) return;

        // Chat
        try {
          await connectChatSocket({
            knowledgeBatchId,
            visitorId,
            userUuid: user?.uuid ?? null,
            runId,
          });
        } catch (e) {
          setStepStatus("session", "error", {
            message: e?.message || "Failed to connect chat session.",
          });
          throw e;
        }
      } catch (error) {
        abortController.abort();
        runRef.current.cancelled = true;
        cleanupAll();
        if (!isActive(runId)) return;

        const message =
          error?.message ?? "Something went wrong while starting the chat.";

        // Mark most likely failing step if not already marked
        const { toolBatchId, knowledgeBatchId } =
          stateRef.current?.context ?? {};
        try {
          if (!toolBatchId) {
            setStepStatus("llm", "error", { message });
          } else if (!knowledgeBatchId) {
            setStepStatus("knowledge", "error", { message });
          } else {
            setStepStatus("session", "error", { message });
          }
        } catch {}

        safeSetState((prev) => ({
          ...prev,
          status: "error",
          error: { message },
          chat: { ...prev.chat, ready: false, connecting: false },
        }));
      }
    },
    [
      cancel,
      cleanupAll,
      connectChatSocket,
      isActive,
      accessToken,
      refreshToken,
      resolveSelectedExtensionId,
      resolveHtmlSelectionPreference,
      safeSetState,
      setStepStatus,
      updateContext,
      user?.uuid,
      waitForKbViaWebSocket,
      waitForLlmViaWebSocket,
    ]
  );

  const sendMessage = useCallback(
    (text, { mode = "chat", kValue } = {}) => {
      if (!isMountedRef.current) return;

      const trimmed = text?.trim();
      if (!trimmed) return;

      // Do not send while awaiting a response
      if (stateRef.current?.chat?.awaitingResponse) {
        return;
      }

      const socket = chatSocketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN) {
        safeSetState((prev) => ({
          ...prev,
          error: prev.error ?? {
            message: "Chat is not connected yet. Please wait a moment.",
          },
        }));
        return;
      }

      const payload =
        mode === "suggested"
          ? {
              prompt: trimmed,
              type: "chat",
              is_suggestion: true,
              ...(kValue ? { k_value: kValue } : {}),
            }
          : {
              prompt: trimmed,
              type: "chat",
              ...(kValue ? { k_value: kValue } : {}),
            };

      try {
        socket.send(JSON.stringify(payload));
      } catch {
        safeSetState((prev) => ({
          ...prev,
          error: prev.error ?? { message: "Unable to send message." },
        }));
        return;
      }

      safeSetState((prev) => {
        const newMessages = [
          ...prev.chat.messages,
          {
            id: createMessageId(),
            role: "user",
            text: trimmed,
            timestamp: new Date().toISOString(),
          },
        ];
        // Limit messages to prevent memory overflow
        const trimmedMessages =
          newMessages.length > MAX_MESSAGES_IN_MEMORY
            ? newMessages.slice(-MAX_MESSAGES_IN_MEMORY)
            : newMessages;

        return {
          ...prev,
          chat: {
            ...prev.chat,
            awaitingResponse: true,
            suggestions: [],
            messages: trimmedMessages,
          },
        };
      });
    },
    [safeSetState]
  );

  const resetWorkflow = useCallback(() => {
    cancel();
  }, [cancel]);

  // Visibility change detection for silent reconnection after tab is idle
  useEffect(() => {
    let hiddenAt = null;
    const RECONNECT_INTERVAL_MS = 30000; // 30 seconds

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab became hidden, track the time
        hiddenAt = Date.now();
      } else {
        // Tab is visible again
        if (hiddenAt) {
          const hiddenDuration = Date.now() - hiddenAt;
          hiddenAt = null;

          // If hidden for more than 30 seconds, silently reconnect socket
          if (hiddenDuration > RECONNECT_INTERVAL_MS) {
            const socket = chatSocketRef.current;
            const currentState = stateRef.current;

            // Only reconnect if we have an active chat session
            if (
              currentState?.status === "ready" &&
              currentState?.context?.knowledgeBatchId &&
              currentState?.context?.sessionId
            ) {
              // Silently reconnect without changing UI state
              if (socket) {
                // Close existing socket using cleanupSocket (notify server)
                cleanupSocket(chatSocketRef, chatPingRef, true);

                // Reconnect silently if mounted
                if (isMountedRef.current) {
                  const { knowledgeBatchId, visitorId, userUuid } =
                    currentState.context;

                  connectChatSocket({
                    knowledgeBatchId,
                    visitorId,
                    userUuid,
                    runId: runRef.current?.id,
                  }).catch(() => {
                    // Silently fail, don't disrupt UI
                  });
                }
              }
            }
          }
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [cleanupSocket, connectChatSocket]);

  // New function to handle chat panel close - closes socket but keeps state
  const handlePanelClose = useCallback(() => {
    if (!isMountedRef.current) return;

    // Only cleanup socket if we have an active chat session
    const socket = chatSocketRef.current;
    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      console.log('[useKnowledgeWorkflow] Panel closed - closing socket connection');
      cleanupSocket(chatSocketRef, chatPingRef, true);
    }
  }, [cleanupSocket]);

  // New function to handle chat panel open - reconnects socket
  const handlePanelOpen = useCallback(async () => {
    if (!isMountedRef.current) return;

    const currentState = stateRef.current;
    const { knowledgeBatchId, sessionId, visitorId, userUuid } = currentState?.context ?? {};

    // Only reconnect if we have an existing session but no active socket
    if (knowledgeBatchId && sessionId && currentState?.status === "ready") {
      const socket = chatSocketRef.current;
      const hasActiveSocket = socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING);

      if (!hasActiveSocket) {
        console.log('[useKnowledgeWorkflow] Panel opened - reconnecting socket');
        try {
          await connectChatSocket({
            knowledgeBatchId,
            visitorId,
            userUuid,
            runId: runRef.current?.id,
          });
        } catch (error) {
          console.warn('[useKnowledgeWorkflow] Failed to reconnect socket on panel open:', error);
        }
      }
    }
  }, [connectChatSocket]);

  return useMemo(
    () => ({
      state,
      startKnowledgeChat,
      startChatForExistingKb,
      sendMessage,
      switchSession,
      createNewChatSession,
      resetWorkflow,
      handlePanelClose,
      handlePanelOpen,
    }),
    [
      state,
      startKnowledgeChat,
      startChatForExistingKb,
      sendMessage,
      switchSession,
      createNewChatSession,
      resetWorkflow,
      handlePanelClose,
      handlePanelOpen,
    ]
  );
}
