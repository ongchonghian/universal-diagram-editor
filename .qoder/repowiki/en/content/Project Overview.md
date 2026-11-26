# Project Overview

<cite>
**Referenced Files in This Document**
- [index.html](file://index.html)
- [js/config.js](file://js/config.js)
- [js/utils.js](file://js/utils.js)
- [js/react-helpers.js](file://js/react-helpers.js)
- [js/components/editors/MonacoWrapper.jsx](file://js/components/editors/MonacoWrapper.jsx)
- [js/components/PlantUmlComponents.js](file://js/components/PlantUmlComponents.js)
- [js/components/ui.js](file://js/components/ui.js)
- [js/components/editors/mermaid/MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [js/components/editors/mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [js/components/editors/BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js)
- [js/error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js)
- [js/error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js)
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
Universal Diagram Generator is a web-based, unified diagramming tool that supports 20+ diagram formats through a single interface. It combines React for UI composition, Monaco Editor for code editing, and external rendering services (via Kroki) to deliver a dual-mode editing experience: code-first and visual-preview. The platform emphasizes intelligent error detection, a robust template system, and flexible export capabilities, targeting both beginners who want simple diagram creation and advanced users who require complex visual modeling.

Key benefits:
- Dual-mode editing: write code or manipulate visuals. BPMN synchronizes both ways; the Mermaid pie chart editor writes its edits back to the code.
- Intelligent error detection: real-time parsing, structured error extraction, and actionable quick fixes.
- Template system: curated snippets and templates for PlantUML and Mermaid to accelerate creation.
- Export-ready previews: live SVG rendering via Kroki for instant visual feedback.
- **NEW** [Syntext Smith](file://Advanced Features/Syntext Smith (AI Copilot).md): AI assistant that creates, edits and fixes diagrams from natural language requests and from pictures. The real parsers check every change, and the user reviews each change in the editor. An evaluation set of 64 cases measures the pass rate for each diagram group.

Supported diagram families include BPMN, Mermaid (flowcharts, sequences, class/state/ER charts, Gantt, pie, timelines, journeys, mindmaps, git graphs, quadrants), PlantUML and C4 PlantUML (UML diagrams, ERDs, component diagrams, deployment diagrams, WBS), GraphViz, Excalidraw, Structurizr, Vega/Vega-Lite, ERD, and more.

Technology stack highlights:
- React, compiled with Vite from `.jsx` files (older components use a lightweight `htm` helper for JSX-like syntax).
- Monaco Editor with custom language support for PlantUML, Mermaid and LikeC4.
- Google Gemini (default model `gemini-3.8-flash`), Anthropic Claude, or any OpenAI-compatible endpoint for **Syntext Smith** AI services.
- Mermaid rendered in the browser; external rendering via Kroki for the other formats.
- bpmn-js for BPMN visual editing.
- Tailwind CSS for responsive UI.
- Mermaid AST for parsing Mermaid code into an AST.

## Project Structure
The project is organized into modular JavaScript modules under js/, with a Vite HTML shell and CSS at the root. The structure separates concerns across configuration, UI components, editors, diagnostics, and utilities.

```mermaid
graph TB
Root["index.html<br/>Vite shell and CDN libraries"]
Config["js/config.js<br/>Diagram types, snippets, templates"]
Utils["js/utils.js<br/>Encoding, detection, loaders"]
ReactHelpers["js/react-helpers.js<br/>JSX-like bindings"]
Monaco["js/components/editors/MonacoWrapper.jsx<br/>Monaco editor wrapper"]
PlantUml["js/components/PlantUmlComponents.js<br/>PlantUML UI (toolbar, templates)"]
UI["js/components/ui.js<br/>Shared UI components"]
MermaidIndex["js/components/editors/mermaid/MermaidVisualEditor.jsx<br/>Mermaid router and Universal Mode fallback"]
MermaidSync["js/components/editors/mermaid/utils.js<br/>AST sync controller"]
BpmnEditor["js/components/editors/BpmnVisualEditor.jsx<br/>BPMN visual editor"]
Diagnostics["js/error-diagnostics/index.js<br/>Error parsing and markers"]
Explanations["js/error-diagnostics/explanations.js<br/>Error explanations"]
Fixes["js/error-diagnostics/fixes.js<br/>Quick fixes"]
Root --> Config
Root --> Utils
Root --> ReactHelpers
Root --> Monaco
Root --> PlantUml
Root --> UI
Root --> MermaidIndex
Root --> MermaidSync
Root --> BpmnEditor
Root --> Diagnostics
Root --> Explanations
Root --> Fixes
```

**Diagram sources**
- [index.html](file://index.html)
- [js/config.js](file://js/config.js#L1-L120)
- [js/utils.js](file://js/utils.js#L1-L60)
- [js/react-helpers.js](file://js/react-helpers.js#L1-L39)
- [js/components/editors/MonacoWrapper.jsx](file://js/components/editors/MonacoWrapper.jsx)
- [js/components/PlantUmlComponents.js](file://js/components/PlantUmlComponents.js#L1-L60)
- [js/components/ui.js](file://js/components/ui.js#L1-L60)
- [js/components/editors/mermaid/MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [js/components/editors/mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [js/components/editors/BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js#L1-L40)
- [js/error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js#L1-L40)
- [js/error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L1-L40)

**Section sources**
- [index.html](file://index.html)
- [js/config.js](file://js/config.js#L1-L120)

## Core Components
- Diagram configuration and catalog: centralized definitions of supported diagram types, file extensions, Monaco language mappings, and documentation links.
- Monaco Editor wrapper: integrates Monaco with custom PlantUML and Mermaid language support, registers error providers, and exposes imperative editor methods.
- Mermaid visual editor: routes to specialized editors based on AST type and renders previews via Kroki.
- BPMN visual editor: integrates bpmn-js for visual BPMN editing with XML sync.
- Error diagnostics: parses raw errors, extracts structured information, categorizes error codes, and generates Monaco markers and quick fixes.
- UI components: reusable buttons, badges, loaders, empty states, and inline editable fields.
- Utilities: encoding for Kroki URLs, type detection from filenames and code content, script/CSS loaders, and debouncing.

**Section sources**
- [js/config.js](file://js/config.js#L1-L120)
- [js/components/editors/MonacoWrapper.jsx](file://js/components/editors/MonacoWrapper.jsx)
- [js/components/editors/mermaid/MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [js/components/editors/BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js#L1-L60)
- [js/components/ui.js](file://js/components/ui.js#L1-L60)
- [js/utils.js](file://js/utils.js#L1-L60)

## Architecture Overview
The application is a single-page React app that dynamically loads external libraries and services. The core flow:
- Users select a diagram type and open the editor.
- The Monaco editor provides syntax highlighting and error diagnostics.
- For Mermaid, an AST sync controller parses the code into an AST (debounced by 300 ms). The Mermaid visual editor routes to a sub-editor by detected diagram model.
- For BPMN, the visual editor integrates with bpmn-js and syncs XML to code.
- Rendering is delegated to external services (e.g., Kroki) for Mermaid and other formats. The `useRemoteRenderer` hook sends the code and the preview panel shows the SVG.

```mermaid
sequenceDiagram
participant User as "User"
participant UI as "React UI"
participant Monaco as "Monaco Editor"
participant MermaidAST as "Mermaid AST"
participant MermaidEditor as "Mermaid Visual Editor"
participant Kroki as "Kroki Service"
User->>UI : Select diagram type
UI->>Monaco : Initialize editor with language
Monaco-->>UI : Content changes
UI->>MermaidAST : Parse code (when applicable)
MermaidAST-->>UI : AST
UI->>Kroki : Request SVG preview (useRemoteRenderer)
Kroki-->>UI : SVG
UI-->>User : Live preview in the code view
User->>MermaidEditor : Switch to Visual mode
MermaidEditor-->>User : Sub-editor or Universal Mode message
```

**Diagram sources**
- [js/components/editors/MonacoWrapper.jsx](file://js/components/editors/MonacoWrapper.jsx)
- [js/components/editors/mermaid/MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [js/components/editors/mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [index.html](file://index.html)

## Detailed Component Analysis

### Monaco Editor Integration
MonacoWrapper encapsulates the Monaco editor lifecycle, registers PlantUML, Mermaid and LikeC4 languages with Monarch tokenizers, and wires up error providers for quick fixes and hover explanations. It exposes imperative methods to scroll to errors, insert text at the cursor or a chosen location, find and select text, and manage markers.

```mermaid
classDiagram
class MonacoWrapper {
+forwardRef ref
+useState editorReady
+useEffect init
+useEffect syncValue
+useEffect setLanguage
+scrollToLine(lineNumber)
+setValue(newValue)
+insertAtCursor(text)
+insertAtLocation(text, mode)
+findAndSelect(text)
+setMarkers(markers)
+clearMarkers()
+getModel()
+getMonaco()
}
class ErrorProviders {
+registerErrorProviders()
+registerCodeActionProvider()
+registerHoverProvider()
}
MonacoWrapper --> ErrorProviders : "registers"
```

**Diagram sources**
- [js/components/editors/MonacoWrapper.jsx](file://js/components/editors/MonacoWrapper.jsx)

**Section sources**
- [js/components/editors/MonacoWrapper.jsx](file://js/components/editors/MonacoWrapper.jsx)

### Mermaid Visual Editor and AST Sync
The Mermaid visual editor routes to a sub-editor by the detected diagram model. Flowchart, sequence, pie, Gantt, timeline, journey and mindmap each have a sub-editor in `MermaidEditors.jsx`, and every other Mermaid type shows a "Universal Mode" message that points back to the code view. Only the pie chart sub-editor edits the diagram today: it reads the slices from the code, lets you change labels and values or add a slice, and writes the new code back. The sync controller parses the code into an AST with a 300 ms debounce and skips parsing while a visual edit is being written back, which prevents infinite loops. Previews are not part of the Mermaid visual editor: the preview panel in the code view renders them via Kroki.

```mermaid
sequenceDiagram
participant Code as "Mermaid Code"
participant Sync as "createMermaidSyncController"
participant AST as "Mermaid AST"
participant Visual as "MermaidVisualEditor"
Code->>Sync : parseCode(code)
Sync->>AST : parse(code)
AST-->>Sync : ast
Sync-->>Visual : ast
User->>Visual : Edit in the pie chart sub-editor
Visual-->>Code : onCodeChange(newCode)
```

**Diagram sources**
- [js/components/editors/mermaid/MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [js/components/editors/mermaid/utils.js](file://js/components/editors/mermaid/utils.js)

**Section sources**
- [js/components/editors/mermaid/MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [js/components/editors/mermaid/utils.js](file://js/components/editors/mermaid/utils.js)

### BPMN Visual Editor
The BPMN editor uses the bpmn-js modeler from the npm package (bundled by Vite, with its CSS), adds `bpmn-js-task-resize` and custom lane, context-pad and renderer modules, and synchronizes XML changes back to the code editor. It imports the XML, falls back to an empty diagram if the import fails, and skips re-importing XML that it has just saved.

```mermaid
sequenceDiagram
participant XML as "BPMN XML"
participant Bpmn as "BpmnVisualEditor"
participant Modeler as "bpmn-js"
participant Monaco as "Monaco Editor"
Bpmn->>Modeler : new BpmnModeler(container)
Modeler-->>Bpmn : ready
Bpmn->>Modeler : importXML(XML)
Modeler-->>Bpmn : commandStack.changed
Bpmn->>Modeler : saveXML({format : true})
Modeler-->>Bpmn : {xml}
Bpmn-->>Monaco : onChange(xml)
```

**Diagram sources**
- [js/components/editors/BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)

**Section sources**
- [js/components/editors/BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)

### Error Diagnostics Pipeline
The error diagnostics module parses raw error messages, extracts line/column information, categorizes errors, and produces Monaco markers and quick fixes. It also formats human-readable explanations for hover tooltips.

```mermaid
flowchart TD
Start(["Error received"]) --> Parse["parseError(errorText, diagramType)"]
Parse --> Extract["extractLocation(errorText, diagramType)"]
Parse --> Categorize["categorizeError(errorText, diagramType)"]
Categorize --> Code["Assign error code"]
Extract --> Marker["toMonacoMarker(errorInfo)"]
Code --> Suggestions["getFixSuggestions(errorText, diagramType, line)"]
Suggestions --> Actions["toMonacoCodeAction(suggestion, marker, model)"]
Marker --> End(["Monaco markers"])
Actions --> End
```

**Diagram sources**
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js#L13-L44)
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js#L52-L145)
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js#L153-L254)
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js#L261-L276)
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js#L285-L298)

**Section sources**
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js#L1-L303)
- [js/error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js)
- [js/error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L1-L403)

### PlantUML Template Gallery and Snippets
The PlantUML UI provides a toolbar of contextual snippets and a modal gallery of templates to help users jumpstart diagrams. It detects the diagram model from code and adapts the snippet set accordingly.

```mermaid
classDiagram
class PlantUmlToolbar {
+detectedModel
+onInsert(code)
+toggleExpand()
}
class TemplateGalleryModal {
+isOpen
+onClose()
+onSelect(code)
}
class Config {
+PLANTUML_SNIPPETS
+PLANTUML_TEMPLATES
}
PlantUmlToolbar --> Config : "reads"
TemplateGalleryModal --> Config : "reads"
```

**Diagram sources**
- [js/components/PlantUmlComponents.js](file://js/components/PlantUmlComponents.js#L8-L47)
- [js/components/PlantUmlComponents.js](file://js/components/PlantUmlComponents.js#L52-L95)
- [js/config.js](file://js/config.js#L118-L192)
- [js/config.js](file://js/config.js#L194-L565)

**Section sources**
- [js/components/PlantUmlComponents.js](file://js/components/PlantUmlComponents.js)
- [js/config.js](file://js/config.js#L118-L565)

### Conceptual Overview
The application’s design balances simplicity and power:
- Beginners benefit from templates, contextual snippets, and hover explanations.
- Advanced users leverage dual-mode editing, precise error markers, and visual editors for complex models.

```mermaid
graph TB
Beginner["Beginner"] --> Templates["Templates & Snippets"]
Beginner --> Hover["Hover Explanations"]
Advanced["Advanced User"] --> Sync["Code and Visual Sync"]
Advanced --> Visual["Visual Editors"]
Templates --> UI["Unified UI"]
Hover --> UI
Sync --> UI
Visual --> UI
```

[No sources needed since this diagram shows conceptual workflow, not actual code structure]

[No sources needed since this section doesn't analyze specific source files]

## Dependency Analysis
External dependencies and integration points:
- React, compiled by Vite, with `htm` for JSX-like syntax in the older `.js` components.
- Monaco Editor with custom language registrations and error providers.
- Mermaid AST for parsing and rendering Mermaid code.
- bpmn-js for BPMN visual editing.
- Kroki service for rendering Mermaid and other formats.
- Tailwind CSS for styling.

```mermaid
graph TB
React["React 18"]
Monaco["Monaco Editor"]
MermaidAST["Mermaid AST"]
BpmnJS["bpmn-js"]
Kroki["Kroki Service"]
Tailwind["Tailwind CSS"]
React --> Monaco
React --> MermaidAST
React --> BpmnJS
React --> Kroki
React --> Tailwind
```

**Diagram sources**
- [index.html](file://index.html#L8-L45)
- [js/components/editors/MonacoWrapper.jsx](file://js/components/editors/MonacoWrapper.jsx)
- [js/components/editors/BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)
- [js/components/editors/mermaid/MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)

**Section sources**
- [index.html](file://index.html#L8-L45)
- [js/utils.js](file://js/utils.js#L116-L146)

## Performance Considerations
- Debounce Mermaid parsing (300 ms) to reduce re-renders during rapid typing.
- Revoke object URLs for previews to prevent memory leaks.
- Load heavy external libraries such as Monaco and the Mermaid AST library from CDNs, outside the Vite bundle.
- Use minimaps and folding judiciously to balance usability and performance.
- Batch Monaco editor updates and clear decorations after navigation to keep UI responsive.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Missing @startuml/@enduml in PlantUML: Quick fix adds the missing directive; hover explanation provides examples.
- Unclosed brackets/parentheses: Quick fix inserts the missing delimiter; hover explains correct syntax.
- Unknown diagram type in Mermaid: Quick fix suggests adding a diagram declaration; hover explains valid diagram types.
- XML parsing errors in BPMN: Hover explanation guides fixing unclosed tags and quoting attributes.
- Missing Mermaid AST: The Mermaid visual editor shows "Loading visual editor..." until the AST library is available.

**Section sources**
- [js/error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L11-L110)
- [js/error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L111-L176)
- [js/error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L178-L238)
- [js/error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L240-L278)
- [js/error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js#L89-L131)
- [js/error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js#L133-L166)
- [js/error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js#L168-L192)
- [js/error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js#L237-L271)
- [js/components/editors/mermaid/MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)

## Conclusion
Universal Diagram Generator delivers a cohesive, web-native diagramming experience by unifying diverse diagram formats behind a single interface. Its architecture blends React, Monaco Editor, and external rendering services to offer dual-mode editing, intelligent diagnostics, and a rich template ecosystem. Whether you are a beginner seeking quick templates or an advanced user crafting complex visual models, the platform provides the tools to create, iterate, and export diagrams efficiently.