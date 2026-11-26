# Syntext Smith (formerly AI Copilot)

**Syntext Smith** is the assistant built into the Universal Diagram Generator. Smith creates, edits and fixes diagrams from requests in plain language, and from pictures such as whiteboard photos. Smith writes native diagram code (Mermaid, PlantUML, BPMN XML and the other supported notations) through tools. The same parsers that the editor uses check every change before the user sees the change. The user then reviews each change in the editor and can undo the change with Ctrl+Z.

This page describes the code as of 26 November 2026, at the end of the Smith rebuild.

## Measured results

The evaluation set in `evals/` holds 64 cases: create, edit and fix tasks for every diagram group, plus four cases that start from a picture. A case passes when the result parses, renders and meets the case's own checks, for example "keeps every shape in place after a rename". Each run's report is committed in `evals/results/`.

| Date | Cases run | Passed | Report |
|---|---|---|---|
| 25 Nov 2026 | All 60 cases at the time | 57 of 60, and 59 of 60 once re-scored with a corrected `no-removals` check. The remaining case was a reply cut off at the length limit. | `2026-11-25-loop-gemini-3.8-flash.json` |
| 25 Nov 2026 | The 12 BPMN cases, after the fix for cut-off replies | 12 of 12 | `2026-11-25-loop-bpmn-rerun-gemini-3.8-flash.json` |
| 26 Nov 2026 | The 4 picture cases, after render-and-look and picture input | 4 of 4 | `2026-11-26-loop-image-gemini-3.8-flash.json` |
| 26 Nov 2026 | The 4 picture cases, after the cost cuts for looking | 4 of 4 | `2026-11-26-loop-image-rerun-gemini-3.8-flash.json` |
| 26 Nov 2026 | The 12 BPMN cases and the 4 picture cases, after the BPMN pipeline | 16 of 16 | `2026-11-26-loop-bpmn-image-gemini-3.8-flash.json` |

Every run used Google's `gemini-3.8-flash` at temperature 0.7, with each case run once.

- **The latest result for each group:** BPMN passed 12 of 12 and the picture cases 4 of 4 on the current prompt. The other 48 cases (Mermaid, PlantUML, C4, Vega, Graphviz, the Kroki long tail and the choice of notation) all passed on 25 November, once re-scored.
- **What has not been measured:** those 48 cases have not been run since the prompt gained the rules for looking at the render and for pictures. Anthropic and the OpenAI-compatible endpoint have not been run against the evaluation set.
- **The cost of the BPMN pipeline:** against the earlier runs of the same 12 BPMN cases, input tokens fell from 76,986 to 51,879, output tokens from 39,021 to 16,005, and time from 347 to 147 seconds.

**Section sources**
- [evals/README.md](file://evals/README.md)
- [evals/results/](file://evals/results/)
- [evals/cases/](file://evals/cases/)
- [evals/checks.js](file://evals/checks.js)

## How a chat request works

1. The chat panel calls `askSmith()`.
2. `askSmith()` runs the agent loop. The loop sends the model a short system prompt, the earlier turns as text, and a user turn. The user turn holds any attached pictures, then the editor's diagram type, the current code and the request.
3. The model changes a **draft**, a working copy of the diagram, through tools. The editor stays as it is until the user applies the change.
4. Every `edit_diagram` and `write_diagram` call checks the draft and returns the parser's verdict to the model in the same step. When the verdict is "invalid", the model reads the error and fixes the draft with another call.
5. The loop ends when the model stops calling tools, or after eight model steps.
6. When a reply reaches the length limit before a tool call is complete, the call is lost. The loop then asks the model once to make the change in smaller steps. A second cut-off ends the turn with an error.
7. The reply streams into the panel as the model writes it. While Smith works, the send button becomes a **Stop** button. Stop ends the turn and keeps the text so far, marked "(Stopped before the end.)". Later turns leave a stopped reply out.

**Section sources**
- [js/components/AICopilot.jsx](file://js/components/AICopilot.jsx)
- [js/services/smith/index.js](file://js/services/smith/index.js)
- [js/services/smith/agent-loop.js](file://js/services/smith/agent-loop.js)
- [js/services/smith/prompt.js](file://js/services/smith/prompt.js)

## The tools

| Tool | What the tool does |
|---|---|
| `read_diagram` | Returns the draft with line numbers. For BPMN, the draft leaves out the layout section (see "BPMN"). |
| `edit_diagram` | Applies exact `old_text` → `new_text` replacements in order. Each `old_text` must appear exactly once. When one replacement fails, the tool applies none of them and tells the model why. |
| `write_diagram` | Replaces the whole draft. The call names the notation (`type`), so the diagram type travels as a typed value rather than a guess from the code. |
| `render_diagram` | Renders the draft as a PNG and returns the PNG for the model to look at (see "Looking at the render"). Not available for BPMN, because the app owns the BPMN layout. |
| `suggest_next_steps` | Sets the follow-up suggestion chips. When this call is the only call in a step, the turn ends without another model call. |

**Section sources**
- [js/services/smith/tools.js](file://js/services/smith/tools.js)

## Validation

One validator, `validateDiagram()`, serves the tool loop, the Fix button and the evaluation set.

| Notation | Check |
|---|---|
| Mermaid | `mermaid.parse`, a check for colons in timeline sections, then a full render |
| BPMN | `bpmn-moddle` reads the XML and returns its warnings. The loop checks the XML without its layout section; the BPMN pipeline then adds the layout and lints the process. |
| Vega-Lite | `vegaLite.compile` |
| Vega | `vega.parse` |
| PlantUML, C4 and every other notation | Rendered by the Kroki server. C4 code goes to the `c4plantuml` endpoint. |

- **Three states:** each result is valid, invalid or unverified. "Unverified" means the check could not run, for example because the Kroki server could not be reached. The system prompt tells the model to keep editing only on "invalid".
- **Where diagrams are sent:** every notation except Mermaid goes to the Kroki server, for the preview and for Smith's checks. The default server is the public `https://kroki.io` (`KROKI_BASE_URL`). Users can enter their own server's address under "Diagram server (Kroki)" in the settings dialog. The address is stored under `universal_diagram_kroki_url`.

**Section sources**
- [js/services/diagram-tools/validate.js](file://js/services/diagram-tools/validate.js)
- [js/services/RendererAdapter.js](file://js/services/RendererAdapter.js)
- [js/config.js](file://js/config.js)

## BPMN

Smith reads and writes semantic BPMN only, and the app owns the layout.

- **What Smith sees:** the user turn and `read_diagram` show the XML without its layout section (`bpmndi:BPMNDiagram`), with a note that the layout is hidden. A layout section that Smith writes anyway is dropped. For a typical diagram, the XML without its layout is about a third of the full text, and Smith resends that text at every step.
- **Keeping the user's layout:** after each change, the pipeline compares the structure with the diagram the turn began with. The structure is the elements and their kinds, the connections, the lanes with their elements, the pools and the message flows. Names and other attributes are not part of the structure. When the structure is unchanged, for example after a rename, the original layout section goes back exactly, so every shape stays where the user put it.
- **A new layout:** when elements are added, removed or reconnected, the app lays the diagram out again.
    - `bpmn-auto-layout` arranges each process.
    - The pipeline places each lane as a horizontal band that holds its own elements, because `bpmn-auto-layout` draws no lanes.
    - The pipeline wraps each pool around its process, stacks the pools at one width, and routes message flows between the pools.
    - The semantic XML stays exactly as Smith wrote it; only the layout section is new.
- **What the user sees:** the trail says "layout kept", "laid out again" or "laid out". When the layout was made again, the proposal card and the review warn that shapes arranged by hand move.
- **Lint:** the lint step reports these modelling mistakes, which the parser accepts:
    - dead ends, and steps that cannot be reached
    - splitting gateways without a name, and unnamed branches of a splitting gateway
    - flows without a source or a target
    - lanes without elements, and processes without a start event

  Smith receives the findings with each tool result and fixes them unless the user asked for the diagram that way. The proposal card lists any findings that remain.
- **The editor's layout button:** **Auto-Generate Layout** in the preview, and the app's other BPMN auto-layout, use the same layout through `applyBpmnAutoLayout()`.

**Section sources**
- [js/services/diagram-tools/bpmn-pipeline.js](file://js/services/diagram-tools/bpmn-pipeline.js)
- [js/services/diagram-tools/bpmn-lint.js](file://js/services/diagram-tools/bpmn-lint.js)
- [js/services/smith/tools.js](file://js/services/smith/tools.js)
- [js/utils.js](file://js/utils.js)
- [js/hooks/useAutoLayout.js](file://js/hooks/useAutoLayout.js)

## Pictures

Two kinds of picture reach the model: the render that `render_diagram` returns, and pictures the user attaches in the chat. Both become image parts.

### Looking at the render

- **The render:** `lookAtDiagram()` renders the draft with the same renderer as the preview, then draws the SVG on a white canvas as a PNG. The long side is at most 1,568 pixels, and small diagrams are drawn up to twice their size, so their labels stay readable. A notation that only its own visual editor draws returns an error to the model instead of a picture.
- **When Smith looks:** the system prompt asks Smith to look once after a new diagram or a structural change, and never after a rename. Smith fixes only real problems: overlapping shapes, crossing lines and labels that cannot be read. Smith looks again only after changing the layout because of what the picture showed.
- **Limits on cost:** a turn allows two looks. When a newer render arrives, older renders leave the conversation, and a short note takes their place, because every step resends the whole conversation.
- **How each provider receives the render:** Anthropic receives the PNG inside the tool result. Gemini receives the PNG as an image part right after the function response, in the same turn. The OpenAI-compatible endpoint receives a "tool" message with the result text, then a user message with the PNG, because "tool" messages hold text only.

### Attached pictures

- **Adding a picture:** the user can paste a picture into the message box, drop one on the chat panel, or pick one with the paperclip button. The panel accepts PNG, JPEG, WebP and GIF files up to 20 MB, and at most four pictures per message.
- **Size:** each picture is scaled down to at most 1,568 pixels on the long side. PNG files stay PNG, so screenshots keep sharp text; other formats become JPEG.
- **Sending:** pressing Enter with pictures and no text sends "Turn this picture into a diagram."
- **Storage:** pictures stay in the panel's memory until the page reloads. The stored conversation keeps only each picture's name, and after a reload the message shows "1 picture attached". Earlier turns go to the model as text, with a note that the user attached pictures. Regenerate sends the pictures again while the page is open.
- **Dropped files:** a file dropped on the chat panel becomes an attachment and is not opened in the editor. A file that is not a picture is refused with a message.

**Section sources**
- [js/services/diagram-tools/look.js](file://js/services/diagram-tools/look.js)
- [js/services/diagram-tools/rasterise.js](file://js/services/diagram-tools/rasterise.js)
- [js/services/smith/agent-loop.js](file://js/services/smith/agent-loop.js)
- [js/services/llm/types.js](file://js/services/llm/types.js)
- [js/services/smith/conversation-store.js](file://js/services/smith/conversation-store.js)
- [js/components/AICopilot.jsx](file://js/components/AICopilot.jsx)

## Reviewing and applying a change

1. **Review:** **Review and apply** on the proposal card opens a review over the code pane.
    - A Monaco diff editor shows the current code against the proposal, with removed lines in red and added lines in green.
    - A list names each change (hunk), for example "Line 4 changed" or "1 line added after line 5". Each change has **Accept** and **Reject**, and clicking a change's name scrolls the diff to that change.
    - A rejected change leaves the diff at once, so the diff always shows what **Apply** writes. The review then notes that Smith checked only the full proposal; the preview shows whether the result still works once applied.
    - **Visual diff** (BPMN, Mermaid and PlantUML) opens the "Verify Changes" dialog for the same result. In that dialog, added BPMN shapes get a green frame, and changed shapes an amber frame.
2. **Apply:** **Apply** writes the accepted changes into the editor as one undo step. Ctrl+Z (Cmd+Z on Mac) restores the earlier diagram, and redo applies the changes again.
3. **Another notation:** a proposal in another notation replaces the whole diagram and switches the editor's diagram type. Per-change review does not apply to that case.
4. **Undo for every outside change:** applying a proposal, the Fix button, templates and auto-layout each arrive as one undo step that changes only the lines that differ, so the cursor and scroll position stay where they were.

**Section sources**
- [js/components/editors/DiffReviewPane.jsx](file://js/components/editors/DiffReviewPane.jsx)
- [js/utils/hunks.js](file://js/utils/hunks.js)
- [js/components/editors/MonacoWrapper.jsx](file://js/components/editors/MonacoWrapper.jsx)
- [js/components/editors/CodeEditorView.jsx](file://js/components/editors/CodeEditorView.jsx)
- [js/components/dialogs/SemanticDiffModal.jsx](file://js/components/dialogs/SemanticDiffModal.jsx)
- [js/components/diff/BpmnDiffView.jsx](file://js/components/diff/BpmnDiffView.jsx)
- [js/hooks/useCopilot.js](file://js/hooks/useCopilot.js)

## The Fix button

The **Auto-Fix (AI)** button in the preview's error panel calls `fixWithSmith()`. `fixWithSmith()` runs the same tool loop with the preview's error, at temperature 0, without the suggestions tool and without `render_diagram`. The button works for every notation.

- **BPMN without a layout:** BPMN that parses but has no layout section needs no model. The app lays the diagram out, and the trail shows "Laid out the diagram".
- **A verified repair:** a verified repair in the same notation goes straight into the editor, without a review step, as one undo step.
- **Every other outcome:** the code stays as it is, and the error panel says why: a repair that still fails, a check that could not run, a rewrite into another notation, or a turn with no change.

**Section sources**
- [js/services/smith/index.js](file://js/services/smith/index.js)
- [js/components/editors/CodeEditorView.jsx](file://js/components/editors/CodeEditorView.jsx)

## Providers and settings

Model calls go through a provider-neutral layer. The layer's `streamTurn()` sends one turn and yields text, tool-call and done events. Each provider has one adapter file.

| Provider | API | Notes |
|---|---|---|
| Google Gemini (default) | `streamGenerateContent` with server-sent events | The key travels in the `x-goog-api-key` header. Default model `gemini-3.8-flash`. Thought signatures go back unchanged within a turn. The output cap is the model's own `outputTokenLimit`, read once per page load, because Gemini counts thinking within the cap; when the lookup fails, the cap is 16,384 tokens. |
| Anthropic | Messages API with streaming | Sends `anthropic-dangerous-direct-browser-access: true`. Organisations with zero data retention cannot use browser access. Temperature is never sent, because current Claude models reject the setting. For models that support the server-side fallback, a declined request is re-run on a fallback model (`fallbacks: "default"`). Default model `claude-opus-5-5`. |
| OpenAI-compatible endpoint | Chat Completions with streaming, at a base address the user sets | For OpenRouter, Ollama, LM Studio and similar servers. The key is optional. When the endpoint rejects temperature, the adapter retries once without temperature. |

- **Settings dialog:** the user chooses the provider. Each provider keeps its own key, model and, for the compatible endpoint, base address. The model menu comes from the provider's own model list, and "Other model id…" accepts any id.
- **Retired models:** a stored Gemini model from the 1.0, 1.5, 2.0 or 2.5 series falls back to the default when the app loads.
- **Keys:** settings are kept in `localStorage` under `universal_diagram_ai_settings`. API keys are kept in `sessionStorage` under `universal_diagram_ai_keys`, so a key lasts until the browser tab closes. With "Remember keys in this browser" ticked, keys are also stored as plain text in `localStorage`.
- **Conversations:** kept in `localStorage` under `universal_diagram_ai_conversations`. A reply stores its text, its proposal, its validation trail and its suggestions.

**Section sources**
- [js/services/llm/index.js](file://js/services/llm/index.js)
- [js/services/llm/providers/gemini.js](file://js/services/llm/providers/gemini.js)
- [js/services/llm/providers/anthropic.js](file://js/services/llm/providers/anthropic.js)
- [js/services/llm/providers/openai-compatible.js](file://js/services/llm/providers/openai-compatible.js)
- [js/services/ai-service.js](file://js/services/ai-service.js)
- [js/components/dialogs/AISettingsModal.jsx](file://js/components/dialogs/AISettingsModal.jsx)
- [js/services/smith/conversation-store.js](file://js/services/smith/conversation-store.js)

## The chat panel

- **Validation trail:** under each reply, a short list shows what Smith checked, for example "Wrote Mermaid: parse error", then "Edited: parsed", then "Looked at the render". BPMN entries add the layout outcome and the number of lint findings, for example "Edited: parsed, layout kept".
- **Proposal card:** a reply that changed the diagram shows a card with the notation, the check result and a **Review and apply** button. The check result is "Checked: the diagram is valid", "Not checked", or "Not verified" with the last error. When the editor has changed since the proposal, the card says so, and the review compares the proposal with the current code.
- **Suggestion chips:** the chips under the latest reply come from `suggest_next_steps`. Replies saved before the tool loop held a `[SUGGESTIONS]` line, which the store turns into chips when a conversation loads. Those older replies offer no **Review and apply** button.
- **Regenerate:** on the latest reply, asks again for that answer and replaces the answer in the stored conversation.
- **Chat timeline:** a floating timeline on the right edge jumps between messages in a long conversation. Indigo dots mark the user's messages, grey dots Smith's replies, and red dots error replies.

**Section sources**
- [js/components/AICopilot.jsx](file://js/components/AICopilot.jsx)
- [js/services/smith/conversation-store.js](file://js/services/smith/conversation-store.js)

## History

The rebuild of 25 and 26 November 2026 replaced the earlier design in seven phases, on the branch `claude/smith-rebuild-plan-351f2d`.

- **Removed:**
    - a JSON syntax-tree path with a separate compiler, which had no caller
    - a Gemini-only model call with a retired default model
    - a text-only chat that rewrote the whole diagram each turn
    - an auto-fix service with rule-based patches
- **Gate for removal:** the older chat path and the auto-fix service were removed only after the tool loop matched or beat them in every diagram group of the evaluation set.

**Section sources**
- [evals/README.md](file://evals/README.md)
