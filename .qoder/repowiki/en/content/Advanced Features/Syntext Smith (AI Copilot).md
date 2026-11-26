# Syntext Smith (formerly AI Copilot)

**Syntext Smith** is the assistant built into the Universal Diagram Generator. Smith helps users create, edit and fix diagrams through natural language. Smith writes native diagram code (Mermaid, PlantUML, BPMN XML and so on) with tools, and the real parser checks every edit before the user sees the result.

This page describes the code as of 26 November 2026, after Phase 5 of the Smith rebuild (render-and-look, and pictures in the chat). A later phase adds a BPMN layout pipeline.

## How a chat request works

1. The chat panel (`js/components/AICopilot.jsx`) calls `askSmith()` in `js/services/smith/index.js`.
2. `askSmith()` runs the agent loop (`js/services/smith/agent-loop.js`). The loop sends the model a short system prompt (`js/services/smith/prompt.js`), the earlier turns as text, and a user turn that holds the editor's diagram type, the current code and the request. Pictures the user attached go into the same user turn, before the text.
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
| `render_diagram` | Renders the draft, converts the picture to a PNG of at most 1,568 pixels on the long side, and returns the PNG for the model to look at. The system prompt asks the model to look once after a new diagram or a structural change, to fix overlaps, crossing lines and labels that cannot be read, and never after a rename. |
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

The **Auto-Fix (AI)** button in the preview's error panel calls `fixWithSmith()`, which runs the same tool loop with the preview error, at temperature 0, without the suggestions tool and without `render_diagram`. The button works for every diagram type.

- A verified repair in the same notation is written straight into the editor, without a review step. The repair is one undo step, so Ctrl+Z (Cmd+Z on Mac) in the editor restores the earlier code.
- Every other outcome leaves the code unchanged and shows a message in the error panel: a repair that still fails, a check that could not run, a rewrite into another notation, or a turn with no change.

## Pictures

Two kinds of picture reach the model: the render that `render_diagram` returns, and pictures the user attaches in the chat. `js/services/diagram-tools/rasterise.js` turns both into image parts.

- **The render:** `lookAtDiagram()` in `js/services/diagram-tools/look.js` renders the draft with the same renderer as the preview, then draws the SVG on a white canvas as a PNG. Small diagrams are drawn up to twice their size, so their labels stay readable. A diagram type that only its own visual editor draws returns an error to the model instead of a picture.
- **How each provider receives the render:** Anthropic receives the PNG inside the tool result. Gemini receives the PNG as an image part right after the function response, in the same turn. The OpenAI-compatible endpoint receives a "tool" message with the result text, then a user message with the PNG, because "tool" messages hold text only.
- **Attached pictures:** the user can paste a picture into the message box, drop one on the chat panel, or pick one with the paperclip button. The panel accepts PNG, JPEG, WebP and GIF files up to 20 MB, and at most four pictures per message. Each picture is scaled down to at most 1,568 pixels on the long side; PNG files stay PNG, and other formats become JPEG. Pressing Enter with pictures and no text sends "Turn this picture into a diagram."
- **Storage:** pictures stay in the panel's memory until the page reloads. The stored conversation keeps only each picture's name, and after a reload the message shows "1 picture attached". Earlier turns go to the model as text, with a note that the user attached pictures; Regenerate sends the pictures again while the page is open.
- **Dropped files:** a file dropped on the chat panel becomes an attachment and is not opened in the editor. A file that is not a picture is refused with a message.

## Measured results

On `gemini-3.8-flash`, the tool loop passed 57 of 60 evaluation cases on 25 November 2026, against 54 of 60 for the older text-only path. After a fix for replies cut off at the length limit, the tool loop passed all 12 BPMN cases and matched or beat the older path in every diagram group, so the older path, the auto-fix service and its rule-based patches were removed. The reports are in `evals/results/`.

Phase 5 added four image cases, making 64 in all. As of 26 November 2026 the image cases, and the token cost of `render_diagram`, have not yet been measured with a live model.

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

- **Validation trail:** under each reply, a short list shows what Smith checked, for example "Wrote Mermaid: parse error", then "Edited: parsed", then "Looked at the render".
- **Proposal card:** a reply that changed the diagram shows a card with the notation, the check result ("Checked: the diagram is valid", "Not checked" or "Not verified" with the last error), and a **Review and apply** button. When the editor has changed since the proposal, the card says so, and the review compares the proposal with the current code.
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
2. **Prompt:** type a request, for example "Create a sequence diagram for a login flow". To start from a whiteboard photo, a sketch or a screenshot, paste or drop the picture into the chat and say which notation to use.
3. **Refine:** use the suggestion chips or a follow-up prompt to adjust the result.
4. **Review:** press **Review and apply** on the proposal card. The code pane shows a review over the editor (`js/components/editors/DiffReviewPane.jsx`):
    - A Monaco diff editor shows the current code against the proposal, with removed lines in red and added lines in green.
    - A list names each change (hunk), for example "Line 4 changed" or "1 line added after line 5". Each change has **Accept** and **Reject**; clicking the name scrolls to the change. A rejected change leaves the diff at once, so the diff always shows what **Apply** writes.
    - When a change is rejected, the review notes that Smith checked only the full proposal. The preview shows whether the result still works once applied.
    - **Visual diff** (BPMN, Mermaid and PlantUML) opens the "Verify Changes" dialog for the same result. In that dialog, BPMN shapes that were added get a green frame, and changed shapes an amber frame.
5. **Apply:** writes the accepted changes into the editor as one undo step. Ctrl+Z (Cmd+Z on Mac) restores the earlier diagram, and redo applies the changes again. A proposal in another notation replaces the whole diagram and switches the editor's type; per-change review does not apply to that case.

## File map

| File | Role |
|---|---|
| `js/components/AICopilot.jsx` | Chat panel, validation trail and proposal card |
| `js/hooks/useCopilot.js` | Panel visibility, and applying a proposal in another notation |
| `js/components/editors/DiffReviewPane.jsx` | Review of each change in the code pane |
| `js/utils/hunks.js` | Merging accepted changes, and the smallest edit between two texts |
| `js/services/smith/index.js` | `askSmith()` and `fixWithSmith()` |
| `js/services/smith/agent-loop.js` | The agent loop |
| `js/services/smith/tools.js` | Tool definitions, the draft and exact-text edits |
| `js/services/smith/prompt.js` | System prompt and per-type notes |
| `js/services/smith/conversation-store.js` | Conversation storage |
| `js/services/llm/` | Provider-neutral model layer: `index.js`, `types.js`, `sse.js` and one adapter per provider |
| `js/services/ai-service.js` | Settings and running token totals |
| `js/services/diagram-tools/validate.js`, `render.js` | Shared validator and renderer wrapper |
| `js/services/diagram-tools/rasterise.js`, `look.js` | SVG to PNG, attached pictures to image parts, and the render that `render_diagram` returns |
| `evals/` | Evaluation set, checks and runner (see `evals/README.md`) |
| `js/components/dialogs/AISettingsModal.jsx` | Settings dialog |
| `js/components/dialogs/SemanticDiffModal.jsx` | "Verify Changes" dialog |
