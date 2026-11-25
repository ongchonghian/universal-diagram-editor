# Syntext Smith (formerly AI Copilot)

**Syntext Smith** is the assistant built into the Universal Diagram Generator. Smith helps users create, edit and fix diagrams through natural language. Smith writes native diagram code (Mermaid, PlantUML, BPMN XML and so on) with tools, and the real parser checks every edit before the user sees the result.

This page describes the code as of 25 November 2026, after Phase 3 of the Smith rebuild and the removal of the older text-only path. Later phases add per-hunk review with undo, image input and a BPMN layout pipeline.

## How a chat request works

1. The chat panel (`js/components/AICopilot.jsx`) calls `askSmith()` in `js/services/smith/index.js`.
2. `askSmith()` runs the agent loop (`js/services/smith/agent-loop.js`). The loop sends the model a short system prompt (`js/services/smith/prompt.js`), the earlier turns as text, and a user turn that holds the editor's diagram type, the current code and the request.
3. The model changes a **draft**, a working copy of the diagram, through tools. The editor stays untouched until the user applies the change.
4. Every `edit_diagram` and `write_diagram` call validates the draft and returns the parser's verdict to the model in the same step. When the verdict is "invalid", the model reads the error and fixes the draft with another call.
5. The loop ends when the model stops calling tools, or after eight model steps. When a reply reaches the length limit before a tool call is complete, the loop asks the model once to make the change in smaller steps; a second cut-off ends the turn with an error.
6. The reply streams into the panel as the model writes it. While Smith works, the send button becomes a **Stop** button. Stop ends the turn and keeps the text so far, marked "(Stopped before the end.)"; the model never sees a stopped reply again.

### The tools

| Tool | What the tool does |
|---|---|
| `read_diagram` | Returns the draft with line numbers |
| `edit_diagram` | Applies exact `old_text` → `new_text` replacements in order. Each `old_text` must appear exactly once; otherwise the tool applies none of the replacements and tells the model why. |
| `write_diagram` | Replaces the whole draft. The call names the notation (`type`), so the diagram type travels as a typed value rather than a guess from the code. |
| `suggest_next_steps` | Sets the follow-up suggestion chips. When this call is the only call in a step, the turn ends without another model call. |

## Validation

One validator, `validateDiagram()` in `js/services/diagram-tools/validate.js`, serves the tool loop and the evaluation set. The validator checks each language as follows:

| Language | Check |
|---|---|
| Mermaid | `mermaid.parse`, a check for colons in timeline sections, then a full render |
| BPMN | `bpmn-moddle` reads the XML and returns its warnings. The tool loop does not require layout data; the evaluation set's layout check does. |
| Vega-Lite | `vegaLite.compile` |
| Vega | `vega.parse` |
| PlantUML, C4 and every other type | Rendered by the Kroki server. C4 code goes to the `c4plantuml` endpoint. |

Each result has one of three states: valid, invalid, or unverified. "Unverified" means the check could not run, for example because the Kroki server could not be reached. The system prompt tells the model to keep editing only on "invalid".

Every type except Mermaid is sent to the Kroki server, both for the code preview and for Smith's checks. The default server is the public `https://kroki.io` (`KROKI_BASE_URL` in `js/config.js`). Users can enter the address of their own Kroki server under "Diagram server (Kroki)" in the settings dialog; the address is stored under `universal_diagram_kroki_url`.

## The Fix button

The **Auto-Fix (AI)** button in the preview's error panel calls `fixWithSmith()`, which runs the same tool loop with the preview error, at temperature 0 and without the suggestions tool. The button works for every diagram type.

- A verified repair in the same notation is written straight into the editor, without a review step.
- Every other outcome leaves the code unchanged and shows a message in the error panel: a repair that still fails, a check that could not run, a rewrite into another notation, or a turn with no change.

## Measured results

On `gemini-3.8-flash`, the tool loop passed 57 of 60 evaluation cases on 25 November 2026, against 54 of 60 for the older text-only path. After a fix for replies cut off at the length limit, the tool loop passed all 12 BPMN cases and matched or beat the older path in every diagram group, so the older path, the auto-fix service and its rule-based patches were removed. The reports are in `evals/results/`.

## Provider and settings

Model calls go through a provider-neutral layer in `js/services/llm/`. The layer's `streamTurn()` sends one turn and yields text, tool-call and done events; each provider has one adapter file.

| Provider | Adapter | API | Notes |
|---|---|---|---|
| Google Gemini (default) | `providers/gemini.js` | `streamGenerateContent` with server-sent events | The key travels in the `x-goog-api-key` header. Default model `gemini-3.8-flash`. Thought signatures are sent back unchanged within a turn. The output cap is the model's own `outputTokenLimit`, read once per page load, because Gemini counts thinking within the cap; when the lookup fails, the cap is 16,384 tokens. |
| Anthropic | `providers/anthropic.js` | Messages API with streaming | Sends `anthropic-dangerous-direct-browser-access: true`. Organisations with zero data retention cannot use browser access. Temperature is never sent, because current Claude models reject the setting. For the models that support the server-side fallback, the request asks Anthropic to re-run a declined request on a fallback model (`fallbacks: "default"`). Default model `claude-opus-5-5`. |
| OpenAI-compatible endpoint | `providers/openai-compatible.js` | Chat Completions with streaming, at a base address the user sets | For OpenRouter, Ollama, LM Studio and similar servers. The key is optional. When the endpoint rejects temperature, the adapter retries once without temperature. |

- **Settings dialog:** `js/components/dialogs/AISettingsModal.jsx`. The user chooses the provider, and each provider keeps its own key, model and (for the compatible endpoint) base address. The model menu comes from the provider's own model list; "Other model id…" accepts any id.
- **Retired models:** a stored Gemini model from the 1.0, 1.5, 2.0 or 2.5 series falls back to the default when the app loads.
- **Storage:** settings are kept in `localStorage` under `universal_diagram_ai_settings`. API keys are kept in `sessionStorage` under `universal_diagram_ai_keys`, so a key lasts until the browser tab closes. With "Remember keys in this browser" ticked, keys are also stored as plain text in `localStorage`. Settings saved before November 2026 are moved to the new shape on load, and a key saved then stays remembered.
- **Conversations:** kept in `localStorage` under `universal_diagram_ai_conversations` by `js/services/smith/conversation-store.js`. A reply stores its text, its proposal, its validation trail and its suggestions.

## The chat panel

- **Validation trail:** under each reply, a short list shows what Smith checked, for example "Wrote Mermaid: parse error" then "Edited: parsed".
- **Proposal card:** a reply that changed the diagram shows a card with the notation, the check result ("Checked: the diagram is valid", "Not checked" or "Not verified" with the last error), and a **Review and apply** button. When the editor has changed since the proposal, the card says so.
- **Suggestion chips:** the chips under the latest reply come from `suggest_next_steps`. Replies saved before the tool loop held a `[SUGGESTIONS]` line; the store turns that line into chips when a conversation loads. Those older replies offer no Apply button.
- **Regenerate:** on the latest reply, asks again for that answer and replaces the answer in the stored conversation.
- **Expand:** click "Expand" to enlarge the input area for long prompts.
- **Chat timeline:** a floating timeline on the right edge jumps between messages in a long conversation.
    - Indigo dots mark user messages.
    - Grey dots mark Smith's replies.
    - Red dots mark error replies.
    - Hovering a dot shows the first 30 characters of the message.

## Usage

1. **Open:** click the "Syntext Smith" button in the header.
2. **Prompt:** type a request, for example "Create a sequence diagram for a login flow".
3. **Refine:** use the suggestion chips or a follow-up prompt to adjust the result.
4. **Apply:** press **Review and apply** on the proposal card. The "Verify Changes" dialog shows the current and proposed diagrams. Accepting replaces the whole editor content with the proposal, and switches the editor to the proposal's notation when the notation differs.

## File map

| File | Role |
|---|---|
| `js/components/AICopilot.jsx` | Chat panel, validation trail and proposal card |
| `js/hooks/useCopilot.js` | Panel visibility and applying a proposal with its diagram type |
| `js/services/smith/index.js` | `askSmith()` and `fixWithSmith()` |
| `js/services/smith/agent-loop.js` | The agent loop |
| `js/services/smith/tools.js` | Tool definitions, the draft and exact-text edits |
| `js/services/smith/prompt.js` | System prompt and per-type notes |
| `js/services/smith/conversation-store.js` | Conversation storage |
| `js/services/llm/` | Provider-neutral model layer: `index.js`, `types.js`, `sse.js` and one adapter per provider |
| `js/services/ai-service.js` | Settings and running token totals |
| `js/services/diagram-tools/validate.js`, `render.js` | Shared validator and renderer wrapper |
| `evals/` | Evaluation set, checks and runner (see `evals/README.md`) |
| `js/components/dialogs/AISettingsModal.jsx` | Settings dialog |
| `js/components/dialogs/SemanticDiffModal.jsx` | "Verify Changes" dialog |
