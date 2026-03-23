# Refactor Plan

## Goals
- consolidate API clients, constants, and hooks so each lives in a single, predictable location
- modularise chat UI logic into reusable components to avoid a monolithic implementation
- tighten knowledge-base workflow polling so the `markdown-history/` endpoint is called only as needed
- clean up incidental inline constants and magic strings that crept into components during recent changes

## Target Structure
```
src/
  api/
    clients/httpClient.js
    authService.js
    knowledgeBaseService.js
    toolService.js
    usersService.js
  components/
    auth/
      AuthGate.jsx
      CreateUsernameForm.jsx
      GoogleSignInButton.jsx
      LoggedInView.jsx
      SignInForm.jsx
      SignUpForm.jsx
      VerifyOtpForm.jsx
    common/
      Spinner.jsx
      Spinner.css
      ToastStack.jsx
      ToastStack.css
    chat/
      ChatWidget.jsx
      ChatLauncher.jsx
      panel/
        ChatPanel.jsx
        ChatPanelHeader.jsx
        ChatPanelBody.jsx
        ChatPanelFooter.jsx
        ChatProgress.jsx
        ChatMessageList.jsx
        ChatSuggestionStrip.jsx
        ChatStartForm.jsx
        ChatErrorState.jsx
        ChatEmptyState.jsx
  constants/
    authSteps.js
    chat.js
    extension.js
    knowledgeWorkflow.js
    patterns.js
    storageKeys.js
    toastMessages.js
  context/
    AuthContext.jsx
    authContext.js
    ToastContext.jsx
    toastContext.js
  hooks/
    auth/
      useAuth.js
      useAuthFlow.js
    chat/
      useExtensionAuthState.js
      useKnowledgeWorkflow.js
    common/
      useDebouncedValue.js
      useToast.js
  utils/
    deviceFingerprint.js
    extensionState.js
    google.js
    polling.js
    storage.js
  content/
    index.jsx
    chat-widget.css
  background/
    index.js
```

## Execution Steps
1. **Re-home modules**
   - Move existing chat components/hooks into the new structure and update all import paths.
   - Promote shared assets (spinner, toast stack) into `components/common`.

2. **Centralise constants & helpers**
   - Create `constants/chat.js` and `constants/knowledgeWorkflow.js` for UI labels, poll timings, domains, etc.
   - Extract polling helpers into `utils/polling.js` so both LLM and knowledge checks share backoff logic.

3. **Refactor chat panel**
   - Split the current `ChatPanel.jsx` into focused child components inside `components/chat/panel`.
   - Ensure state mutations remain in the parent while view-only logic lives in child components.

4. **Reduce redundant API calls**
   - Update `useKnowledgeWorkflow` to use the shared poll helper with exponential backoff and early exit when state stabilises.
   - Track the latest known batch status so we skip unnecessary hits to `markdown-history/` once the response signals completion.

5. **Validation & cleanup**
   - Run lint/build (or at minimum a type-free dry build) to confirm there are no broken imports.
   - Manually sanity check the knowledge workflow by reviewing key branches.

This plan provides the guardrails before making any structural changes.
