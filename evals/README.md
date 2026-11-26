# Syntext Smith evaluation set

The evaluation set measures how often Smith produces a diagram that parses and renders. Run the set for every change of model, prompt or path, and commit the report with the pull request.

## Run the unit tests

```bash
npm test
```

The unit tests make no model calls and no network calls. They cover the shared validator, the checks, code extraction, the settings migration, and the case files themselves.

## Run the evaluation

1. Start the evaluation page:

   ```bash
   npm run eval
   ```

2. The page starts from the provider, model and base address saved in Smith's settings. Smith keeps keys for one browser tab unless "Remember keys in this browser" is ticked, so a tab-only key is not visible on the evaluation page. Either tick that option in Smith's settings, or paste the key into the page's "API key" field. The page holds a pasted key in memory only, and changes made on the page are not saved.
3. Choose the path, the provider, the model and, if needed, a filter. Press **Run**.
4. When the run finishes, press **Download report** and save the file in `evals/results/`.

Cases run one at a time, with a pause between cases, so that the token count per case is exact and free-tier rate limits hold. A full run of 64 cases takes several minutes.

PlantUML, C4, Graphviz and the other Kroki types are sent to the diagram server set in the app's settings. The default is the public kroki.io service. The cases hold invented content only.

## Paths

| Path | What runs |
|---|---|
| `loop` | The tool loop that the chat panel and the Fix button use (`js/services/smith/`). `firstStatus` is the verdict on the first draft; repair attempts count the later drafts. |

The text-only `chat` path from before the tool loop, with the older auto-fix service and its rule-based patches, was removed on 25 November 2026. On `gemini-3.8-flash` the `chat` path passed 54 of 60 cases and the `loop` path passed 57 of 60. The `loop` path matched or beat the `chat` path in every group once a cut-off fix brought BPMN to 12 of 12. The three reports from that comparison are in `results/` and record the gate.

Those reports were scored before the `no-removals` check was corrected. With the corrected check, `bpmn-add-gateway` and `mermaid-flowchart-edit` pass on both paths: the `chat` path scores 56 of 60, and the `loop` path 59 of 60, where the one remaining case is the cut-off that the BPMN re-run passed.

## Cases

`cases/` holds one JSON file per diagram group: 64 cases in all.

| Group | Cases |
|---|---|
| mermaid | 14 |
| plantuml | 8 |
| c4 | 4 |
| bpmn | 12 |
| vega | 6 |
| graphviz | 4 |
| kroki | 10 |
| type-choice | 2 |
| image | 4 |

Each case has a `task`:

- `create` sends the prompt with an empty editor.
- `edit` sends the prompt with `startCode` in the editor.
- `fix` sends `startCode` and its real validation error to the path's repair.

An `image` case also names a picture in `fixtures/`, which goes to the model with the prompt, as a picture the user attached would. The four pictures imitate a whiteboard photo, two paper sketches and a screenshot marked up in red pen. `fixtures/make-fixtures.py` draws them with invented labels; run `python3 evals/fixtures/make-fixtures.py` on macOS to draw them again. The model must support image input for these cases to pass.

`editorType` sets the editor's diagram type when the type differs from the expected output. `type: null` lets the reply choose the notation.

## Checks

| Check | Passes when |
|---|---|
| `parses` | `validateDiagram` returns valid for the output type |
| `renders` | The renderer returns an SVG with at least one shape or text element |
| `{ "contains": "text" }` | The code contains the text (case-insensitive) |
| `{ "keeps": ["A", "B"] }` | Each term still appears as a whole word |
| `{ "typeIn": ["mermaid", "plantuml"] }` | The reply chose one of the listed notations |
| `no-removals` | The semantic diff reports zero removed elements (Mermaid, PlantUML, BPMN). For Mermaid and PlantUML, an element counts as removed only when its id is missing from the new code. `{ "no-removals": ["Flow_3"] }` allows the ids that the requested change replaces. |
| `bpmn-layout` | The BPMN holds layout data |
| `bpmn-no-warnings` | bpmn-moddle reports zero warnings |
| `bounds-unchanged` | Every BPMN shape from `startCode` keeps its position and size |

A case passes when every check passes. A check that cannot run (for example, the diagram server is unreachable) makes the case "unverified". A provider or network fault makes the case "error". Pass rates leave out "error" cases.

## Report

The report records the provider (`gemini`, `anthropic` or `openai-compatible`), model, temperature, path, a fingerprint of the system prompts (`promptVersion`), and whether the public Kroki server was used. For each case, the report records the outcome, every check, the first-attempt validation result, repair attempts, how often Smith looked at the render (`looks`), tokens, seconds and the output code. Looking at the render does not count as a repair attempt.

Since Phase 5 (26 November 2026), Smith can call `render_diagram` to look at its draft. Each look adds a model step and an image to the conversation, so compare the tokens per case with the Phase 4 reports to check the cost of looking.

The headline numbers are the **pass rate** and the **first-attempt parse rate**: the share of create and edit answers that parsed before any repair. Both numbers are given overall and for each group.
