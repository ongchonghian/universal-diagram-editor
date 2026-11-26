# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Build & Development Commands
```bash
npm run dev        # Start Vite dev server (port 3000, auto-opens browser)
npm run build      # Production build to dist/
npm run preview    # Preview production build
```

## Required: Consult Repowiki First
**Before implementing any changes**, read the relevant documentation in `.qoder/repowiki/en/content/`:
- `Project Overview.md` - Architecture and component relationships
- `architecture.md` - Visual editor library decisions
- `Editor Architecture/` - Detailed editor implementation docs
- `Diagram Types and Formats/` - Format-specific documentation

When making key changes (new patterns, utilities, refactors), **update the Repowiki** to keep documentation in sync.

## Architecture Overview

### Entry Flow
`index.html` → `js/index.jsx` → `js/App.jsx` (main React component)

### State Management Pattern
The app uses custom hooks in `js/hooks/`:
- `useDiagramState.js` - Core state: text, diagram type, detected model, view mode, Mermaid AST
- `useRemoteRenderer.js` - Kroki rendering, preview URLs, SVG/PNG content
- `useAutoLayout.js` - BPMN auto-layout handling
- `useCopilot.js` - AI assistant integration

### Visual Editors (`js/components/editors/`)
- **BPMN** (`BpmnVisualEditor.jsx`) - Uses `bpmn-js`, syncs XML bidirectionally
- **Mermaid** (`mermaid/MermaidVisualEditor.jsx`) - AST-based, uses Mermaid AST library for code↔visual sync
- **Excalidraw** (`ExcalidrawVisualEditor.jsx`) - JSON-based freeform drawing
- **Vega/Vega-Lite** (`VegaVisualEditor.jsx`) - JSON spec visualization
- **C4** (`c4/`) - React Flow-based architecture diagrams with `@synergycodes/overflow-ui`

### Services (`js/services/`)
- `RendererAdapter.js` - Unified rendering interface (Kroki, PlantUML server, local)
- `ai-service.js` - Google Gemini API integration for Syntext Smith AI copilot
- `auto-fix-service.js` - Automated error correction using AI
- `diagram-compiler.js` - Diagram format conversion utilities

### Configuration (`js/config.js`)
Central registry of:
- `DIAGRAM_TYPES` - All supported formats with extensions, Monaco language, example code
- `PLANTUML_SNIPPETS` / `MERMAID_SNIPPETS` - Contextual code snippets by diagram subtype
- `PLANTUML_TEMPLATES` / `MERMAID_TEMPLATES` - Full diagram templates

### Error Diagnostics (`js/error-diagnostics/`)
- `index.js` - Parse errors, extract line/column, create Monaco markers
- `explanations.js` - Human-readable error explanations for hover tooltips
- `fixes.js` - Quick fix suggestions (code actions)

## Key Patterns

### Adding a New Diagram Type
1. Add entry to `DIAGRAM_TYPES` in `js/config.js`
2. If visual editor needed, create component in `js/components/editors/`
3. Update `isVisualSupported` logic in `useDiagramState.js`
4. Add snippets/templates if applicable
5. Update Repowiki documentation

### Visual Editor Contract
Visual editors receive:
- `value` - Current code/XML/JSON
- `onChange` - Callback when visual changes occur
- `readOnly` - Boolean for view-only mode

They must sync changes back via `onChange` for code↔visual parity.

### Rendering Flow
```
Code → rendererAdapter.render(type, code) → Kroki/PlantUML Server → SVG blob URL
```
For BPMN without diagram info (DI), the app prompts for auto-layout via `bpmn-auto-layout`.

## External Dependencies
- **Kroki** (`https://kroki.io`) - Multi-format diagram rendering
- **PlantUML Server** (`https://www.plantuml.com/plantuml`) - PlantUML rendering fallback
- **Monaco Editor** - Code editing (loaded via CDN in index.html)
- **Mermaid AST** (`@emily/mermaid-ast`) - Bidirectional Mermaid parsing (ESM from CDN)
