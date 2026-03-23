# Webmap React Extension - Working Notes (Deep Detail)

Scope: React-based extension only. `angular-implementation/` is excluded.

---

## 1) High-level architecture (descriptive)

### What this extension does

Webmap is a Chrome extension that lets a user chat with a knowledge base built from the page they are currently viewing. It captures page HTML in real time and sends it to the backend, or downloads a file (PDF / Google Docs / Sheets / Slides) when possible, then uploads that file for processing. Once processing completes, a chat session opens and the user can ask questions about the page content.

### Where it runs

The system is split into three runtime surfaces that work together:

1. Popup UI (extension action)

- The popup is where users sign in, pick an extension agent, and configure settings (embedding model, HTML cleaning preference).
- Tokens and user details live in localStorage, and are mirrored into `chrome.storage.local` so content scripts can read them.

2. Content script (chat widget on every page)

- A lightweight loader runs on every page. If the user is authenticated, it shows the right-bottom launcher button.
- When opened, the chat widget mounts into a Shadow DOM, captures the page content, checks for existing KBs, and triggers the KB build + chat workflow.

3. Background service worker

- Provides a CORS helper so file downloads (PDFs, Google Docs exports) can succeed.
- Injects the chat widget if dynamic import fails.

### End-to-end user flow

1. User signs in via popup.
2. Tokens are stored and mirrored into extension storage.
3. Launcher appears on pages.
4. User opens launcher, which captures page HTML.
5. The extension checks if the KB exists and whether the page changed.
6. User starts a new KB or reuses an existing one.
7. Backend builds KB -> chat socket connects -> user chats with the page.

---

## 2) File connection graph (ASCII with visible lines)

```
public/manifest.json
|
+-- action -> index.html
|   |
|   +-- src/main.jsx
|       |
|       +-- src/App.jsx
|           |
|           +-- src/context/AuthContext.jsx
|           |   |
|           |   +-- src/utils/storage.js
|           |
|           +-- src/components/auth/AuthGate.jsx
|           |   |
|           |   +-- src/hooks/auth/useAuthFlow.js
|           |   |   |
|           |   |   +-- src/api/authService.js
|           |   |   +-- src/utils/deviceFingerprint.js
|           |   |   +-- src/utils/storage.js
|           |   |
|           |   +-- src/hooks/auth/useAuth.js
|           |   +-- src/utils/google.js
|           |   +-- src/components/auth/*
|           |
|           +-- src/components/auth/LoggedInView.jsx
|               |
|               +-- src/api/extensionAgentService.js
|               +-- src/components/auth/SettingsView.jsx
|               |   |
|               |   +-- src/context/SettingsContext.jsx
|               |   +-- src/hooks/common/useHtmlSelectionPreference.js
|               |
|               +-- src/utils/storage.js
|
+-- content_scripts -> public/content-loader.js
|   |
|   +-- dynamic import -> src/content/index.jsx
|       |
|       +-- Shadow DOM + CSS injection
|       +-- mounts -> src/components/chat/ChatWidget.jsx
|           |
|           +-- src/hooks/chat/useExtensionAuthState.js
|           +-- src/hooks/chat/useKnowledgeWorkflow.js
|           |   |
|           |   +-- src/api/scrapperService.js
|           |   +-- src/api/knowledgeBaseService.js
|           |   +-- src/api/usersService.js
|           |   +-- src/utils/html*
|           |
|           +-- src/hooks/common/useSelectedExtensionAgent.js
|           +-- src/hooks/common/useHtmlSelectionPreference.js
|           +-- src/components/chat/panel/ChatPanel.jsx
|               |
|               +-- src/components/chat/panel/KbList.jsx
|               |   |
|               |   +-- src/api/scrapperService.js
|               |   +-- src/api/extensionAgentService.js
|               |   +-- src/utils/html*
|               |
|               +-- src/components/chat/panel/SessionMenu.jsx
|               |   |
|               |   +-- src/api/knowledgeBaseService.js
|               |
|               +-- src/components/chat/panel/ViewAllSheet.jsx
|
+-- background -> src/background/index.js
    |
    +-- src/background/cors.js
```

---

## 3) Auth flow (screens + payloads)

### 3.1 Auth screen sequence (UI flow)

1. **Gate screen** (`AuthGate`)
   - Buttons: Sign in, Sign up, Google Sign-in.
2. **Sign In screen** (`SignInForm`)
   - Input: `email`.
   - Submit triggers `useAuthFlow.handleSignIn({ email })`.
3. **Sign Up screen** (`SignUpForm`)
   - Inputs: `first_name`, `last_name`, `email`.
   - Email availability checked via `authService.checkEmail`.
   - Submit triggers `useAuthFlow.handleSignUpDetails(values)`.
4. **Create Username screen** (`CreateUsernameForm`)
   - Input: `username`.
   - Availability checked via `authService.checkUsername`.
   - Submit triggers `useAuthFlow.handleUsername({ username })`.
5. **Verify OTP screen** (`VerifyOtpForm`)
   - Input: `otp`.
   - Submit triggers `useAuthFlow.handleVerify(otp)`.
6. **Logged In screen** (`LoggedInView`)
   - Shows list of extension agents.
   - User can open Settings or Logout.
7. **Settings screen** (`SettingsView`)
   - Toggle HTML cleaning preference.
   - Choose embedding model (OpenAI vs Paraphrase).

### 3.2 Auth payloads (exact shapes from code)

**Sign in (email)**

- Endpoint: `POST login/`

```json
{
  "email": "user@example.com",
  "visitor_ids": ["<visitorId>"],
  "fingerprint_ids": ["<requestId>"]
}
```

**Sign up (details)**

- Endpoint: `POST register/`

```json
{
  "first_name": "A",
  "last_name": "B",
  "email": "user@example.com",
  "visitor_ids": ["<visitorId>"],
  "fingerprint_ids": ["<requestId>"]
}
```

**Create username (email signup)**

- Endpoint: `POST register/`

```json
{
  "first_name": "A",
  "last_name": "B",
  "email": "user@example.com",
  "visitor_ids": ["<visitorId>"],
  "fingerprint_ids": ["<requestId>"],
  "username": "myusername"
}
```

**Google sign-in / sign-up**

- Endpoint: `POST signup-with-google/`

```json
{
  "token_id": "<google_id_token>",
  "visitor_ids": ["<visitorId>"],
  "fingerprint_ids": ["<requestId>"],
  "username": "optional_if_required"
}
```

**OTP verify**

- Endpoint: `POST login/` or `POST register/`

```json
{
  "email": "user@example.com",
  "visitor_ids": ["<visitorId>"],
  "fingerprint_ids": ["<requestId>"],
  "otp": "123456"
}
```

**Email availability check**

- Endpoint: `POST check-email/`

```json
{ "email": "user@example.com" }
```

**Username availability check**

- Endpoint: `POST check-username/`

```json
{ "username": "myusername" }
```

---

## 4) KB build pipeline (deep detail + payloads)

### 4.1 KB decision step (page changed or not)

Component: `KbList` (`src/components/chat/panel/KbList.jsx`)

Flow:

1. Read `captured-html` from extension storage.
2. Call `scrapperService.viewExistingHtml({ link_url, user_uuid })`.
3. If a previous HTML document exists, fetch it and compare bodies.
4. Set `comparison`: `none`, `same`, or `changed`.

**Payload for viewExistingHtml**

```json
{
  "link_url": "https://current.page/path",
  "user_uuid": "<user_uuid>"
}
```

---

### 4.2 Start New KB (main pipeline)

Function: `startKnowledgeChat({ title, note, url })` in `useKnowledgeWorkflow.js`.

Step-by-step:

1. Read visitor identity from `webmapVisitorIdentity` in extension storage.
2. Detect if page is PDF or Google Docs/Sheets/Slides.
3. If PDF-like:
   - Download file via fetch.
4. If HTML:
   - Use stored HTML or capture fresh (`captureRenderedHtml`).
   - Clean HTML based on preference.
5. Request presigned upload URL.
6. Upload file to S3.
7. Trigger markdown processing.
8. Wait for LLM socket.
9. Trigger KB build.
10. Wait for KB socket.
11. Connect chat socket.

---

### 4.3 Upload and processing (payloads)

**Presigned upload request**

- Endpoint: `POST get-presigned-upload-url/`

```json
{
  "file_names": ["page_1700000000.html"],
  "file_sizes": [123456],
  "user_uuid": "<user_uuid>",
  "visitor_id": "<visitorId>",
  "is_extension": true
}
```

**Trigger markdown processing**

- Endpoint: `POST upload-markdown/`

```json
{
  "visitor_id": "<visitorId>",
  "batch_id": "<toolBatchId>",
  "is_extension": true,
  "link_url": "https://current.page/path",
  "domain": "https://current.page",
  "user_uuid": "<user_uuid>",
  "onlyHtmlContent": true,
  "onlymainContent": false,
  "title": "<page title>",
  "note": "",
  "cleaned_html": true
}
```

**Process KB request**

- Endpoint: `POST chatbot/extension-agent/knowledge-base/`

```json
{
  "visitor_id": "<visitorId>",
  "user_uuid": "<user_uuid>",
  "request_id": "<requestId>",
  "batch_id_list": ["<toolBatchId>"],
  "link_url_list": ["https://current.page/path"],
  "domain": "WEBMAP-EXTENSION",
  "is_faiss": false,
  "is_extension": "true",
  "title": "<page title>",
  "note": "",
  "multi_project": false,
  "is_openai": true,
  "open_ai": true,
  "extension_id": "<selected_extension_id>"
}
```

---

## 5) History sessions (deep detail)

This section describes how “Previous Sessions” and chat history work.

### 5.1 Where history appears in the UI

- **KbList** shows “Previous Session” when KBs already exist for this URL.
- **SessionMenu** shows both:
  - Threads (chat sessions inside a KB), and
  - Previous KBs for this URL.
- **ViewAllSheet** shows the full list when there are more than 3 entries.

### 5.2 KB history (per URL)

- API: `extensionAgentService.getKbDomainList({ user_uuid, link_url })`.
- Returns list of KBs for the same URL.
- KbList and SessionMenu display the same KB list, limited to 3 by default.

### 5.3 Chat history (per KB)

- API: `knowledgeBaseService.getChatSessions({ batch_id, user_uuid })`.
- Returns chat sessions (threads) for the current KB.

### 5.4 Session cache

- After first socket message in a chat session, a cache refresh is triggered:
  - Key: `sessions-cache:<extensionId>:<knowledgeBatchId>`
  - Stored in extension storage.
- `SessionMenu` reads this cache to avoid re-fetching on every open.

### 5.5 Switching sessions

- When a user selects a thread:
  - `switchSession(session)` loads history via `getChatHistory` and reconnects socket.
  - The previous collection is released (best-effort) via `releaseCollection`.

### 5.6 Creating a new session

- `createNewChatSession()`:
  - Calls `getChatHistory` with `session_id: null`.
  - The backend returns a new session ID.
  - Then `switchSession` is called to load it.

### 5.7 Events tied to history

- Event: `webmap:sessions-updated` is dispatched after sessions refresh.
- SessionMenu listens for that event and triggers re-render.

---

## 6) Sockets (deep detail)

### 6.1 LLM socket (markdown processing)

- URL: `wss://<SCRAPER>/ws/markdown/<batchId>/`
- Ping payload:

```json
{ "type": "ping", "visitor_id": "<visitorId>", "task_id": "<taskId>" }
```

- Success condition:
  - `status_code=201` and `message="Markdown process finished successfully"`.
- Other status:
  - `status_code=210` -> credit exhausted.
  - `status_code=500` -> task terminated.
- Timeout: 90 seconds. If it times out, UI marks LLM step as error but continues.

### 6.2 KB socket (knowledge build)

- URL: `wss://<KNOWLEDGE>/ws/chatbot/<knowledgeBatchId>/`
- Ping payload:

```json
{ "type": "ping", "visitor_id": "<visitorId>", "task_id": "<taskId>" }
```

- Success condition:
  - `status_code=200` and `message="Knowledgebase built"`.
- Other status:
  - `status_code=210` -> credit exhausted.
  - `status_code=500` -> task terminated.
- Timeout: 120 seconds. If it times out, KB step is marked as error.

### 6.3 Chat socket (conversation)

- URL:
  `wss://<KNOWLEDGE>/ws/extension-chat/<knowledgeBatchId>/?domain=WEBMAP-EXTENSION&visitor_id=<visitorId>&user_uuid=<user_uuid>&session_id=<sessionId>&extension_id=<extensionId>`

- On open:
  - Marks session step as done.
  - Updates UI to “ready”.

- On message (important cases):
  - `info: "ChatBot is ready to explore!"` -> triggers auto prompt send.
  - `chat_type: "error"` or `error` -> inserts a system error message.
  - Streaming payloads:
    - `stream: START_OF_STREAM` -> creates a new assistant message placeholder.
    - `stream: <chunk>` -> appends to streaming buffer and updates UI.
    - `stream: END_OF_STREAM` or `type: STREAM` -> finalizes message.
  - Non-stream payload with `response` -> converted from Markdown to HTML.

- Chat send payloads:

```json
{ "prompt": "Hello", "type": "chat" }
```

```json
{ "prompt": "Suggested Q", "type": "chat", "is_suggestion": true }
```

```json
{ "prompt": "<conversation starter>", "type": "chat", "k_value": 5 }
```

- Ping payload:

```json
{ "prompt": "ping", "type": "ping" }
```

---

## 7) CORS overrides + network permissions (deep detail)

### 7.1 Manifest permissions + CSP

From `public/manifest.json`:

- **permissions**: `storage`, `identity`, `scripting`, `downloads`, `activeTab`, `webRequest`, `declarativeNetRequest`, `declarativeNetRequestWithHostAccess`
- **host_permissions**: `<all_urls>`
- **CSP (extension pages)**: `connect-src *` (allows backend + socket connections)

These permissions are required so the extension can:

- Inject the content script when needed.
- Download files (PDFs, Docs exports) from arbitrary sites.
- Modify network response headers via `declarativeNetRequest`.
- Open WebSocket connections to the scraper/knowledge backend.

### 7.2 Background CORS handler (what is overwritten)

**Files:** `src/background/index.js`, `src/background/cors.js`

The background worker installs a CORS ?header patcher? using the `declarativeNetRequest` API. This is what allows PDF / Docs downloads and cross-site fetches to succeed from content scripts.

CORS handler behavior:

1. **Global rules are installed on startup**

- Runs on extension install and on browser startup.
- Applies rules to _all_ URLs and relevant resource types (main_frame, sub_frame, xhr, websocket, script, etc).

2. **Headers injected** (global and per-tab)

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, HEAD, POST, PUT, DELETE, OPTIONS, PATCH`
- `Access-Control-Allow-Headers: Authorization, Content-Type, X-Requested-With, Range, Accept, Origin, Referer, *`
- `Access-Control-Allow-Credentials: true`
- `Access-Control-Expose-Headers: *`

3. **Security headers stripped** (for specific requests)

- Removes `X-Frame-Options`
- Removes `Content-Security-Policy`

This is required because some sites block cross-origin fetches and embedded downloads with strict CSP/XFO.

### 7.3 Rule types and IDs (from code)

From `cors.js`:

- Global rule IDs: `100` (CORS), `101` (preflight), `102` (strip headers)
- Per-tab rule IDs: `1000 + tabId`

Rule types:

- **GLOBAL_RULE_ID (100)**: injects permissive CORS headers for all relevant resource types.
- **PREFLIGHT_RULE_ID (101)**: handles OPTIONS preflight by adding `Access-Control-Max-Age: 86400`.
- **STRIP_RULE_ID (102)**: removes CSP/XFO headers for main_frame/sub_frame/xhr.

### 7.4 Per-tab origin rules (dynamic overrides)

The CORS handler also adds tab-scoped rules:

- When a tab is opened or navigated, its origin is detected.
- A tab-specific rule is installed using that origin.
- This makes responses look like they allow that tab?s origin explicitly (in addition to `*`).

Listeners used:

- `webRequest.onBeforeRequest` (main_frame) -> update per-tab origin
- `tabs.onUpdated` -> update per-tab origin
- `tabs.onRemoved` -> remove tab rule

### 7.5 Storage cleanup related to captures

From `src/background/index.js`:

- On browser startup, the extension checks `WEBMAP_CAPTURED_HTML` (legacy key).
- If older than 1 hour, it is removed to save memory.
- There is also a storage-change listener that logs HTML capture size for monitoring.

### 7.6 Why this matters for KB pipeline

Without these CORS overrides:

- PDF or Docs downloads often fail due to CORS restrictions.
- The KB pipeline falls back to HTML, which may be incomplete for document-based pages.
- Socket connections could be blocked by CSP on extension pages if `connect-src` wasn?t open.

This is why the CORS handler + manifest permissions are essential for the ?download PDF / Google Sheets / Docs? part of your flow.

## 8) Endpoint catalog (all APIs)

### Auth service

- `POST register/`
- `POST signup-with-google/`
- `POST login/`
- `POST verify-otp`
- `POST resend/otp/`
- `POST check-email/`
- `POST check-username/`
- `POST plans/join-waitlist/`
- `POST plans/check-waitlist/`

### Users service (scraper base)

- `POST user-request/create/`
- `POST close-user-all-task/`

### Scrapper service (scraper base)

- `POST get-presigned-upload-url/`
- `POST upload-markdown/`
- `POST view-existing-html/`
- `GET last-html-selection/?user_uuid=`
- `PUT last-html-selection/`
- `POST https://scrapper-api.blockverse.tech/auth/token/refresh/`

### Knowledge service (knowledge base)

- `POST chatbot/extension-agent/knowledge-base/`
- `GET chatbot/knowledge-history/`
- `GET markdown-history/` (scraper base)
- `GET chatbot/extension-agent/chatbot-history/`
- `GET chatbot/extension-agent/chatbot-session/`
- `POST chatbot/release-collection/`

### Extension agent service

- `GET https://knowledge-base.blockverse.tech/chatbot/extension-agent/list/`
- `GET chatbot/extension-agent/kb-domain-list/`

---
