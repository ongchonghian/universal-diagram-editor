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

Cases run one at a time, with a pause between cases, so that the token count per case is exact and free-tier rate limits hold. A full run of 60 cases takes several minutes.

PlantUML, C4, Graphviz and the other Kroki types are sent to the diagram server set in the app's settings. The default is the public kroki.io service. The cases hold invented content only.

## Paths

| Path | What runs |
|---|---|
| `loop` | The tool loop that the chat panel and the Fix button use (`js/services/smith/`). `firstStatus` is the verdict on the first draft; repair attempts count the later drafts. |
| `chat` | The text-only path from before the tool loop: `aiService.chat()` and the older auto-fix service. Kept to produce the Phase 1 baseline. |

The `chat` path, the auto-fix service and its rule-based patches are deleted once the `loop` path's pass rate matches or beats the `chat` baseline on every diagram group, on the default model.

## Cases

`cases/` holds one JSON file per diagram group: 60 cases in all.

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

Each case has a `task`:

- `create` sends the prompt with an empty editor.
- `edit` sends the prompt with `startCode` in the editor.
- `fix` sends `startCode` and its real validation error to the path's repair.

`editorType` sets the editor's diagram type when the type differs from the expected output. `type: null` lets the reply choose the notation.

## Checks

| Check | Passes when |
|---|---|
| `parses` | `validateDiagram` returns valid for the output type |
| `renders` | The renderer returns an SVG with at least one shape or text element |
| `{ "contains": "text" }` | The code contains the text (case-insensitive) |
| `{ "keeps": ["A", "B"] }` | Each term still appears as a whole word |
| `{ "typeIn": ["mermaid", "plantuml"] }` | The reply chose one of the listed notations |
| `no-removals` | The semantic diff reports zero removed elements (Mermaid, PlantUML, BPMN) |
| `bpmn-layout` | The BPMN holds layout data |
| `bpmn-no-warnings` | bpmn-moddle reports zero warnings |
| `bounds-unchanged` | Every BPMN shape from `startCode` keeps its position and size |

A case passes when every check passes. A check that cannot run (for example, the diagram server is unreachable) makes the case "unverified". A provider or network fault makes the case "error". Pass rates leave out "error" cases.

## Report

The report records the provider (`gemini`, `anthropic` or `openai-compatible`), model, temperature, path, a fingerprint of the system prompts (`promptVersion`), and whether the public Kroki server was used. For each case, the report records the outcome, every check, the first-attempt validation result, repair attempts, tokens, seconds and the output code.

The headline numbers are the **pass rate** and the **first-attempt parse rate**: the share of create and edit answers that parsed before any repair. Both numbers are given overall and for each group.
