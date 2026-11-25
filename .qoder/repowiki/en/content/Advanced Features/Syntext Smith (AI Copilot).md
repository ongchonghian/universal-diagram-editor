# Syntext Smith (formerly AI Copilot)

**Syntext Smith** is the assistant built into the Universal Diagram Generator. Smith helps users create, edit and fix diagrams through natural language. Smith sends the request and the current diagram code to a language model, and reads native diagram code (Mermaid, PlantUML, BPMN XML and so on) from the model's reply.

This page describes the code as of 25 November 2026. A rebuild of Smith is planned in phases; this page will be rewritten when the rebuild lands.

## How a chat request works

1. The chat panel (`js/components/AICopilot.jsx`) calls `aiService.chat()` in `js/services/ai-service.js`.
2. `chat()` sends three things to the model: a system instruction from `getSystemPrompt()`, the earlier turns of the conversation, and a user turn that holds the diagram type, the current editor code and the request. Error notices and stopped replies from earlier turns are left out of the history.
3. The reply streams into the panel as the model writes the reply. While a reply streams, the send button becomes a **Stop** button. Stop ends the reply and keeps the text so far, marked "(Stopped before the end.)"; the model never sees a stopped reply again.
4. `chat()` takes the longest fenced code block from the reply and works out the block's language with `resolveLanguage()`. The panel shows "Checking the code…" while the block is validated, and "Repairing the code…" during a repair.
5. `chat()` validates the block (see the next section).
6. If the block fails validation, `chat()` makes one repair attempt through the auto-fix service. A successful repair replaces the block in the reply.
7. If the block still fails, `chat()` appends a warning with the parser error to the reply.

## Validation

One validator, `validateDiagram()` in `js/services/diagram-tools/validate.js`, serves the chat, the Auto-Fix button and the evaluation set. The validator checks each language as follows:

| Language | Check |
|---|---|
| Mermaid | `mermaid.parse`, a check for colons in timeline sections, then a full render |
| BPMN | `bpmn-moddle` reads the XML and returns its warnings. The Auto-Fix button also requires layout data; the chat does not. |
| Vega-Lite | `vegaLite.compile` |
| Vega | `vega.parse` |
| PlantUML, C4 and every other type | Rendered by the Kroki server. C4 code goes to the `c4plantuml` endpoint. |

Each result has one of three states: valid, invalid, or unverified. "Unverified" means the check could not run, for example because the Kroki server could not be reached. An unverified diagram is not sent for repair, and the chat adds a note saying the code is not verified.

Every type except Mermaid is sent to the Kroki server, both for the code preview and for Smith's checks. The default server is the public `https://kroki.io` (`KROKI_BASE_URL` in `js/config.js`). Users can enter the address of their own Kroki server under "Diagram server (Kroki)" in the settings dialog; the address is stored under `universal_diagram_kroki_url`.

## Auto-fix

The auto-fix service (`js/services/auto-fix-service.js`) repairs code in two places: the one chat repair attempt, and the **Auto-Fix (AI)** button in the preview's error panel.

- The service supports Mermaid, PlantUML, C4 and BPMN. For other types the service stops and reports the type as unsupported. When a check cannot run, the service stops and leaves the code unchanged.
- The service makes up to three attempts.
- Each attempt first tries the rule-based patches in `js/services/auto-fix/strategies/`. The model is asked for a fix only when no rule-based patch applies.
- The service validates the code once more after the last attempt.
- The auto-fix BPMN check, unlike the chat check, requires layout data. When layout data is missing, the service runs the BPMN auto-layout (`applyBpmnAutoLayout` in `js/utils.js`).
- The Auto-Fix button writes a successful fix straight into the editor, without the review step that Apply Code uses.

## Provider and settings

Model calls go through a provider-neutral layer in `js/services/llm/`. The layer's `streamTurn()` sends one turn and yields text, tool-call and done events; each provider has one adapter file. The chat uses text only today; the tool-call support is there for the tool loop in a later phase.

| Provider | Adapter | API | Notes |
|---|---|---|---|
| Google Gemini (default) | `providers/gemini.js` | `streamGenerateContent` with server-sent events | The key travels in the `x-goog-api-key` header. Default model `gemini-3.8-flash`. |
| Anthropic | `providers/anthropic.js` | Messages API with streaming | Sends `anthropic-dangerous-direct-browser-access: true`. Organisations with zero data retention cannot use browser access. Temperature is never sent, because current Claude models reject the setting. For the models that support the server-side fallback, the request asks Anthropic to re-run a declined request on a fallback model (`fallbacks: "default"`). Default model `claude-opus-5-5`. |
| OpenAI-compatible endpoint | `providers/openai-compatible.js` | Chat Completions with streaming, at a base address the user sets | For OpenRouter, Ollama, LM Studio and similar servers. The key is optional. When the endpoint rejects temperature, the adapter retries once without temperature. |

- **Settings dialog:** `js/components/dialogs/AISettingsModal.jsx`. The user chooses the provider, and each provider keeps its own key, model and (for the compatible endpoint) base address. The model menu comes from the provider's own model list; "Other model id…" accepts any id.
- **Retired models:** a stored Gemini model from the 1.0, 1.5, 2.0 or 2.5 series falls back to the default when the app loads.
- **Storage:** settings are kept in `localStorage` under `universal_diagram_ai_settings`. API keys are kept in `sessionStorage` under `universal_diagram_ai_keys`, so a key lasts until the browser tab closes. With "Remember keys in this browser" ticked, keys are also stored as plain text in `localStorage`. Settings saved before November 2026 are moved to the new shape on load, and a key saved then stays remembered. Conversations are kept under `universal_diagram_ai_conversations`.

## The chat panel

- **Expand:** click "Expand" to enlarge the input area for long prompts.
- **Suggestion chips:** the system instruction asks the model to end each reply with a `[SUGGESTIONS]` line. The panel turns that line into clickable chips.
- **Regenerate:** asks the model again for the last answer and replaces that answer in the stored conversation.
- **Chat timeline:** a floating timeline on the right edge jumps between messages in a long conversation.
    - Indigo dots mark user messages.
    - Grey dots mark Smith's replies.
    - Red dots mark error replies.
    - Hovering a dot shows the first 30 characters of the message.

## Usage

1. **Open:** click the "Syntext Smith" button in the header.
2. **Prompt:** type a request, for example "Create a sequence diagram for a login flow".
3. **Refine:** use the suggestion chips or a follow-up prompt to adjust the result.
4. **Apply:** the "Apply Code" button appears on replies that hold a code block. The button opens the "Verify Changes" dialog, which shows the old and new diagrams side by side. Accepting replaces the whole editor content with the new code, and can switch the editor to a different diagram type.

## File map

| File | Role |
|---|---|
| `js/components/AICopilot.jsx` | Chat panel |
| `js/hooks/useCopilot.js` | Panel visibility and applying code to the editor |
| `js/services/ai-service.js` | Settings, conversation storage, prompts and chat validation |
| `js/services/llm/` | Provider-neutral model layer: `index.js`, `types.js`, `sse.js` and one adapter per provider |
| `js/services/auto-fix-service.js`, `js/services/auto-fix/` | Repair loop, rule-based patches and per-language checks |
| `js/services/diagram-tools/validate.js`, `render.js` | Shared validator and renderer wrapper |
| `js/utils/code-extract.js` | Extracting fenced code blocks from a reply |
| `evals/` | Evaluation set, checks and runner (see `evals/README.md`) |
| `js/components/dialogs/AISettingsModal.jsx` | Settings dialog |
| `js/components/dialogs/SemanticDiffModal.jsx` | "Verify Changes" dialog |
