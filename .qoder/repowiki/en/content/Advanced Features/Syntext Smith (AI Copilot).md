# Syntext Smith (formerly AI Copilot)

**Syntext Smith** is the assistant built into the Universal Diagram Generator. Smith helps users create, edit and fix diagrams through natural language. Smith sends the request and the current diagram code to a language model, and reads native diagram code (Mermaid, PlantUML, BPMN XML and so on) from the model's reply.

This page describes the code as of 25 November 2026. A rebuild of Smith is planned in phases; this page will be rewritten when the rebuild lands.

## How a chat request works

1. The chat panel (`js/components/AICopilot.jsx`) calls `aiService.chat()` in `js/services/ai-service.js`.
2. `chat()` sends three things to the model: a system instruction from `getSystemPrompt()`, the earlier turns of the conversation, and a user turn that holds the diagram type, the current editor code and the request. Error notices from earlier turns are left out of the history.
3. `chat()` takes the longest fenced code block from the reply and works out the block's language with `resolveLanguage()`.
4. `chat()` validates the block (see the next section).
5. If the block fails validation, `chat()` makes one repair attempt through the auto-fix service. A successful repair replaces the block in the reply.
6. If the block still fails, `chat()` appends a warning with the parser error to the reply.

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

- **Provider:** Google Gemini only, through the `generateContent` REST method. The API key travels in the `x-goog-api-key` request header.
- **Default model:** `gemini-3.8-flash`. A stored setting that names a retired model (the 1.0, 1.5, 2.0 and 2.5 series) falls back to the default when the app loads.
- **Settings dialog:** `js/components/dialogs/AISettingsModal.jsx` offers a short list of current Gemini models and a free-text field for any other model id.
- **Storage:** settings, including the API key, are kept as plain text in the browser's `localStorage` under `universal_diagram_ai_settings`. Conversations are kept under `universal_diagram_ai_conversations`.

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
| `js/services/ai-service.js` | Settings, conversation storage, prompts, model calls and chat validation |
| `js/services/auto-fix-service.js`, `js/services/auto-fix/` | Repair loop, rule-based patches and per-language checks |
| `js/services/diagram-tools/validate.js`, `render.js` | Shared validator and renderer wrapper |
| `js/utils/code-extract.js` | Extracting fenced code blocks from a reply |
| `evals/` | Evaluation set, checks and runner (see `evals/README.md`) |
| `js/components/dialogs/AISettingsModal.jsx` | Settings dialog |
| `js/components/dialogs/SemanticDiffModal.jsx` | "Verify Changes" dialog |
