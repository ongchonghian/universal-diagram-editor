# Diagram Types and Formats

<cite>
**Referenced Files in This Document**
- [index.html](file://index.html)
- [config.js](file://js/config.js)
- [utils.js](file://js/utils.js)
- [BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)
- [PlantUmlToolbar.jsx](file://js/components/PlantUmlToolbar.jsx)
- [TemplateGalleryModal.jsx](file://js/components/dialogs/TemplateGalleryModal.jsx)
- [PreviewPanel.jsx](file://js/components/editors/PreviewPanel.jsx)
- [mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [MermaidEditors.jsx](file://js/components/editors/mermaid/MermaidEditors.jsx)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js)
- [error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js)
- [error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js)
</cite>

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)

## Introduction
This document describes all supported diagram types and formats in the Universal Diagram Generator, along with their syntax, capabilities, configuration, and best practices. It also explains the declarative configuration system that registers new diagram types and manages language-specific settings.

## Project Structure
The application is a single-page React app built with Vite from JSX modules. Key areas:
- Configuration registry for diagram types, snippets, and templates
- Editor components for BPMN, PlantUML, and Mermaid
- Error diagnostics and quick-fix engine
- Monaco editor integration with language support and error providers

```mermaid
graph TB
subgraph "UI Shell"
Root["index.html + App.jsx<br/>Vite shell and main app"]
end
subgraph "Configuration"
Config["js/config.js<br/>DIAGRAM_TYPES, snippets, templates"]
Utils["js/utils.js + RendererAdapter.js<br/>Detection, encoding, loaders"]
end
subgraph "Editors"
BPMN["BpmnVisualEditor.jsx<br/>bpmn-js modeler"]
Mermaid["MermaidVisualEditor.jsx<br/>router by detected model"]
MermaidUniversal["Universal Mode fallback<br/>(inside MermaidVisualEditor)"]
MermaidSub["MermaidEditors.jsx<br/>Pie, Flowchart, Sequence, Gantt,<br/>Timeline, Journey, Mindmap"]
PlantUML["PlantUmlToolbar.jsx, TemplateGalleryModal.jsx,<br/>PreviewPanel.jsx"]
end
subgraph "Diagnostics"
DiagCore["error-diagnostics/index.js<br/>parser, markers, actions"]
DiagExplan["explanations.js<br/>human-readable explanations"]
DiagFix["fixes.js<br/>quick-fix patterns"]
end
Root --> Config
Root --> Utils
Root --> BPMN
Root --> Mermaid
Mermaid --> MermaidUniversal
Mermaid --> MermaidSub
Root --> PlantUML
Root --> DiagCore
DiagCore --> DiagExplan
DiagCore --> DiagFix
```

**Diagram sources**
- [index.html](file://index.html)
- [config.js](file://js/config.js#L1-L116)
- [utils.js](file://js/utils.js#L1-L177)
- [BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [MermaidEditors.jsx](file://js/components/editors/mermaid/MermaidEditors.jsx)
- [PlantUmlToolbar.jsx](file://js/components/PlantUmlToolbar.jsx)
- [PreviewPanel.jsx](file://js/components/editors/PreviewPanel.jsx)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L1-L303)
- [error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js)
- [error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L1-L403)

**Section sources**
- [index.html](file://index.html)
- [config.js](file://js/config.js#L1-L116)

## Core Components
- Diagram registry: Defines supported formats, file extensions, editor language bindings, documentation links, and example content.
- Editor routing: `MermaidVisualEditor` selects the Mermaid sub-editor from the detected model name, and `App.jsx` chooses between the BPMN, Mermaid and other visual editors.
- Visual editors: A bpmn-js editor for BPMN, and a Mermaid visual editor whose sub-editors cover flowcharts, sequences, Gantt, pie, timelines, journeys and mindmaps (only the pie editor edits anything today). PlantUML has a toolbar, template gallery and interactive preview instead of a visual editor.
- Error diagnostics: Parses errors, extracts locations, categorizes issues, and provides quick fixes and explanations.

**Section sources**
- [config.js](file://js/config.js#L6-L116)
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L13-L44)

## Architecture Overview
The system integrates Monaco editor with language-specific tokens, error providers, and quick fixes. Diagrams are rendered by the preview panel through the renderer adapter. For Mermaid, a sync controller in `useDiagramState` parses the code into an AST, and the visual editor receives the code, the detected model name and the AST-loaded flag.

```mermaid
sequenceDiagram
participant User as "User"
participant Monaco as "Monaco Editor"
participant State as "useDiagramState"
participant AST as "Mermaid AST"
participant Router as "MermaidVisualEditor"
User->>Monaco : Edit diagram code
Monaco-->>State : onChange(code)
State->>AST : parseCode(code) after 300 ms
AST-->>State : ast
State->>State : detectSpecificModel(code)
User->>Router : Switch to visual mode
State-->>Router : code, detectedModel, astLoaded
Router-->>User : Render sub-editor or Universal Mode
```

**Diagram sources**
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [index.html](file://index.html)

## Detailed Component Analysis

### BPMN (Business Process Model and Notation)
- Purpose: Visual modeling of business processes with swimlanes, tasks, gateways, and flows.
- Editor: bpmn-js modeler (imported from the npm package) with live XML export and import.
- Features:
  - Visual editing with drag-and-drop.
  - Real-time XML synchronization.
  - Error reporting via callbacks.
- Limitations:
  - Requires valid BPMN XML; malformed XML causes import errors.
- Best practices:
  - Keep namespaces and IDs consistent.
  - Validate against BPMN schema externally if needed.

```mermaid
flowchart TD
Start(["Open BPMN XML"]) --> Load["Create bpmn-js modeler"]
Load --> Edit["Visual editing"]
Edit --> Export["Export formatted XML"]
Export --> Save["Persist to storage"]
Error["Import/Export Error"] --> Notify["onError callback"]
```

**Diagram sources**
- [BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)

**Section sources**
- [BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)
- [config.js](file://js/config.js#L6-L57)

### Mermaid (Flowcharts, Sequences, Classes, States, ER, Gantt, Pie, Timelines, Journeys, Mindmaps, Git Graphs, Quadrant Charts)
- Purpose: Text-based diagrams with a rendered preview and a code-driven visual editor (Beta).
- Registry:
  - Diagram types include flowchart, sequence, class, state, er, gantt, pie, timeline, journey, mindmap, gitgraph, quadrant, requirement, sankey, xychart, kanban, and c4.
- Editors:
  - `MermaidVisualEditor` selects the sub-editor by matching the detected model name (Flowchart, Sequence, Pie, Gantt, Timeline, Journey, Mindmap).
  - The sub-editors live in `MermaidEditors.jsx`. Only `MermaidPieEditor` edits the diagram: it reads slices from the code, edits labels and values, adds a slice and writes the code back.
  - `MermaidFlowchartEditor` shows an "interactive node editing coming soon" note, and the sequence, Gantt, timeline, journey and mindmap editors show a "Code-Only Editing" message.
  - Any other diagram type shows the Universal Mode panel, which says structure editing is best done in code.
  - The sub-editors receive only `code` and `onChange`, not the AST.
- AST synchronization:
  - Debounced parsing (300 ms) from code to AST in `useDiagramState`.
  - Rendering from AST to code with loop prevention exists in the sync controller, but no sub-editor calls it today.
- Limitations:
  - Most diagram types lack visual editing; use the code view.
  - The visual editor shows a loading spinner until the Mermaid AST library has loaded.
- Best practices:
  - Start with diagram type declaration.
  - Use subgraphs and sections for complex diagrams.
  - Prefer Mermaid AST for bidirectional editing when available.

```mermaid
classDiagram
class MermaidVisualEditor {
+ast
+code
+astLoaded
+detectedModel
+onChange()
+onCodeChange()
+onError()
}
class MermaidEditors {
+MermaidPieEditor
+MermaidFlowchartEditor
+MermaidSequenceEditor
+MermaidGanttEditor
+MermaidTimelineEditor
+MermaidJourneyEditor
+MermaidMindmapEditor
+VisualEditingNotAvailable
}
class MermaidSyncController {
+parseCode()
+renderToCode()
+getAst()
+isLoaded()
}
MermaidVisualEditor --> MermaidEditors : code, onChange
note for MermaidVisualEditor "Other types show the Universal Mode panel"
```

**Diagram sources**
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [MermaidEditors.jsx](file://js/components/editors/mermaid/MermaidEditors.jsx)
- [mermaid/utils.js](file://js/components/editors/mermaid/utils.js)

**Section sources**
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [MermaidEditors.jsx](file://js/components/editors/mermaid/MermaidEditors.jsx)
- [mermaid/utils.js](file://js/components/editors/mermaid/utils.js)

### PlantUML and C4-PlantUML
- Purpose: UML and architecture diagrams (sequences, classes, activities, states, components, deployments, ER, mindmaps, WBS).
- Features:
  - Snippet toolbar with icons and labels.
  - Template gallery with descriptions and search.
  - Interactive SVG preview with click and context actions.
  - Context menu supports renaming a selected element and inserting snippets.
- Limitations:
  - Requires @startuml/@enduml blocks.
  - Syntax-sensitive; missing start/end tags cause errors.
- Best practices:
  - Use templates as starting points.
  - Insert snippets for common constructs.
  - Leverage interactive preview to jump to code.

```mermaid
sequenceDiagram
participant User as "User"
participant Toolbar as "PlantUmlToolbar"
participant Templates as "TemplateGalleryModal"
participant Preview as "PreviewPanel"
participant Editor as "Monaco"
User->>Toolbar : Click snippet
Toolbar->>Editor : Insert code
User->>Templates : Choose template
Templates->>Editor : Insert code
Editor-->>Preview : Render SVG
User->>Preview : Click element
Preview->>Editor : Scroll to definition
User->>Preview : Right-click
Preview->>Editor : Context actions (rename/insert snippet)
```

**Diagram sources**
- [PlantUmlToolbar.jsx](file://js/components/PlantUmlToolbar.jsx)
- [TemplateGalleryModal.jsx](file://js/components/dialogs/TemplateGalleryModal.jsx)
- [PreviewPanel.jsx](file://js/components/editors/PreviewPanel.jsx)

**Section sources**
- [config.js](file://js/config.js#L118-L565)
- [PlantUmlToolbar.jsx](file://js/components/PlantUmlToolbar.jsx)
- [TemplateGalleryModal.jsx](file://js/components/dialogs/TemplateGalleryModal.jsx)
- [PreviewPanel.jsx](file://js/components/editors/PreviewPanel.jsx)

### GraphViz DOT Language
- Purpose: Graph layouts using nodes and edges with attributes.
- Supported via registry; syntax similar to digraph/graph with attributes and edges.
- Best practices:
  - Close braces and brackets.
  - Use semicolons for statements.
  - Define ranks and styles explicitly for clarity.

**Section sources**
- [config.js](file://js/config.js#L104-L116)

### Excalidraw Freehand Drawing
- Purpose: Hand-drawn diagrams stored as JSON.
- Editor: JSON-based with example content.
- Best practices:
  - Keep JSON valid.
  - Use official Excalidraw schema.

**Section sources**
- [config.js](file://js/config.js#L82-L88)

### Structurizr DSL
- Purpose: Architectural diagrams using Structurizr DSL or JSON.
- Best practices:
  - Follow Structurizr DSL syntax.
  - Validate structure and relationships.

**Section sources**
- [config.js](file://js/config.js#L110-L111)

### Vega and Vega-Lite Visualizations
- Purpose: Declarative grammar of graphics (Vega) and high-level grammar (Vega-Lite).
- Best practices:
  - Validate JSON schema.
  - Use scales, axes, and marks appropriately.

**Section sources**
- [config.js](file://js/config.js#L112-L114)

### ERD Tools
- Purpose: Entity-relationship diagrams.
- Supported via registry; syntax similar to ER notation.
- Best practices:
  - Define primary keys and foreign keys clearly.
  - Use cardinalities consistently.

**Section sources**
- [config.js](file://js/config.js#L106)

### Other Supported Formats (Registry)
- ditaa, blockdiag, bytefield, nomnoml, pikchr, svgbob, wavedrom, wireviz.
- Each has associated extensions and language bindings for syntax highlighting.

**Section sources**
- [config.js](file://js/config.js#L103-L116)

## Dependency Analysis
- Monaco editor is extended with PlantUML and Mermaid language providers and error actions.
- Error diagnostics module parses raw errors, extracts locations, categorizes, and suggests fixes.
- The renderer adapter compresses source for Kroki URLs and detects the type from a file name, and `utils.js` provides model detection and resource loaders.

```mermaid
graph LR
Monaco["Monaco Editor"] --> Providers["CodeAction/Hover Providers"]
Providers --> Diag["Error Diagnostics"]
Diag --> Explan["Explanations"]
Diag --> Fixes["Quick Fixes"]
Adapter["RendererAdapter"] --> Encode["encodeKroki"]
Adapter --> Detect["detectType"]
Utils["Utils"] --> Load["loadScript/loadCSS"]
Hook["useDiagramState"] --> Sync["MermaidSyncController"]
Hook --> Mermaid["MermaidVisualEditor"]
```

**Diagram sources**
- [index.html](file://index.html)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L13-L44)
- [error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js#L12-L229)
- [error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L11-L296)
- [utils.js](file://js/utils.js#L14-L41)
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [mermaid/utils.js](file://js/components/editors/mermaid/utils.js)

**Section sources**
- [index.html](file://index.html)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L13-L44)
- [utils.js](file://js/utils.js#L14-L41)

## Performance Considerations
- Debounce AST parsing to avoid excessive re-renders.
- Revoke object URLs for previews to prevent memory leaks.
- Load the Mermaid AST library from the CDN module script in `index.html`; bpmn-js is bundled by Vite.
- Use minimal diffs when updating code from visual changes.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
- Error parsing:
  - Extracts line/column from diagram-specific patterns.
  - Categorizes errors (missing brackets, arrows, unknown diagram types, XML errors).
- Quick fixes:
  - Provides automated edits for common issues (add start/end tags, close brackets, insert declarations).
- Hover explanations:
  - Offers human-readable explanations with examples and documentation links.
- Monaco integration:
  - Registers code actions and hover providers for mermaid, plantuml, and xml.

```mermaid
flowchart TD
Raw["Raw error text"] --> Parse["parseError()"]
Parse --> Location["extractLocation()"]
Parse --> Category["categorizeError()"]
Category --> Code["Assign error code"]
Location --> Marker["toMonacoMarker()"]
Code --> Marker
Code --> Suggestions["getFixSuggestions()"]
Suggestions --> Actions["toMonacoCodeAction()"]
Code --> Explain["getErrorExplanation()"]
Explain --> Hover["formatForHover()"]
```

**Diagram sources**
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L13-L276)
- [error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js#L237-L299)
- [error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L332-L366)

**Section sources**
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L13-L276)
- [error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js#L12-L299)
- [error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L11-L366)

## Conclusion
The Universal Diagram Generator provides a unified interface for multiple diagram formats with robust configuration, powerful editors, and intelligent diagnostics. The declarative registry makes it straightforward to add new formats, while Monaco integration, a rendered preview and Mermaid AST parsing support the authoring experience.