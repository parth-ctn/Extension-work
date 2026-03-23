export const CHAT_HEADER_TEXT = {
  idle: "Preparing chat for this page",
  running: "Setting things up.",
  error: "Something went wrong",
  ready: "Chat is ready",
  connecting: "Connecting to chat.",
  preparing: "Preparing chat.",
};

export const CHAT_FOOTER_TEXT = {
  idle: "Conversation becomes available after we build a knowledge base or you select previous knowledge base for this page.",
  running: "Setting things up.",
  error: "Need help? Try again in a moment.",
  connecting: "Connecting to chat.",
  preparing: "Preparing chat.",
};

export const CHAT_EMPTY_STATE = {
  idleTitle: "Prepare chat again",
  idleDescription:
    "We're setting up a knowledge base for this page. If it doesn't start, try again below.",
  readyDescription: "Knowledge base ready. Send a message to get started.",
};

export const CHAT_START_PROMPT =
  "Introduce the overall concepts within your knowledge and highlight the main points, as an overview, covered in your knowledge from different areas and topics that I could discuss about and explore.";

export const CHAT_START_PROMPT_K_VALUE = 5;

export const CHAT_SUGGESTION_LABELS = {
  toggleShow: "Show suggested prompts",
  toggleHide: "Hide suggestions",
};
