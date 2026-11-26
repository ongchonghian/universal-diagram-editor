# Troubleshooting and FAQ

<cite>
**Referenced Files in This Document**
- [index.html](file://index.html)
- [js/error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js)
- [js/error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js)
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js)
- [js/components/editors/MonacoWrapper.jsx](file://js/components/editors/MonacoWrapper.jsx)
- [js/components/editors/mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [js/components/editors/mermaid/MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [js/components/editors/mermaid/MermaidEditors.jsx](file://js/components/editors/mermaid/MermaidEditors.jsx)
- [js/components/editors/BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)
- [js/components/PlantUmlComponents.js](file://js/components/PlantUmlComponents.js)
- [js/utils.js](file://js/utils.js)
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
10. [Appendices](#appendices)

## Introduction
This document provides comprehensive troubleshooting and FAQ guidance for the Universal Diagram Generator. It focuses on diagnosing and resolving common issues across diagram formats (Mermaid, PlantUML, BPMN, GraphViz, and others), editor functionality, integration scenarios, and best practices. It also documents the error explanation system, diagnostic tools, and self-help resources to help you quickly identify and fix problems.

## Project Structure
The application is a single-page React-based editor that supports multiple diagram formats. Key areas relevant to troubleshooting:
- Monaco editor integration with syntax highlighting and error diagnostics
- Error explanation and quick-fix systems
- Mermaid visual editor and AST sync controller
- BPMN visual editor powered by bpmn-js
- Utilities for encoding, detection, and debouncing

```mermaid
graph TB
UI["UI Shell<br/>index.html"] --> Monaco["MonacoWrapper<br/>Monaco Editor"]
UI --> MermaidEditor["Mermaid Visual Editor<br/>Pie editor, placeholders, Universal Mode"]
UI --> BpmnEditor["BpmnVisualEditor<br/>bpmn-js"]
Monaco --> Diagnostics["Error Diagnostics<br/>Explanations + Fixes"]
Monaco --> Utils["Utilities<br/>encodeKroki, detectType, debounce"]
MermaidEditor --> Utils
BpmnEditor --> Utils
```

**Diagram sources**
- [index.html](file://index.html)
- [js/components/editors/MonacoWrapper.jsx](file://js/components/editors/MonacoWrapper.jsx)
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js#L1-L303)
- [js/components/editors/mermaid/MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [js/components/editors/BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)
- [js/utils.js](file://js/utils.js#L1-L177)

**Section sources**
- [index.html](file://index.html)

## Core Components
- MonacoWrapper integrates Monaco Editor with custom language support and registers error providers for hover explanations and quick fixes.
- Error diagnostics module parses raw errors, extracts locations, categorizes them, and provides explanations and suggested fixes.
- The Mermaid visual editor routes to a sub-editor by detected diagram model. Only the pie chart sub-editor edits the diagram; the others show a code-only note, and unsupported types show a "Universal Mode" message.
- BPMN visual editor uses the bundled bpmn-js modeler and synchronizes XML changes back to the code editor.
- Utilities provide encoding for Kroki URLs, diagram type detection, and helper functions.

**Section sources**
- [js/components/editors/MonacoWrapper.jsx](file://js/components/editors/MonacoWrapper.jsx)
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js#L1-L303)
- [js/components/editors/mermaid/MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [js/components/editors/BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)
- [js/utils.js](file://js/utils.js#L1-L177)

## Architecture Overview
The system orchestrates user input, real-time previews, and error feedback:
- Users edit code in Monaco.
- The app detects diagram type and model, encodes to a Kroki URL, and fetches SVG.
- Errors are parsed, markers are applied in Monaco, and hover explanations are shown.
- The BPMN visual editor synchronizes XML both ways, and the Mermaid pie chart editor writes its edits back to the code.

```mermaid
sequenceDiagram
participant User as "User"
participant Monaco as "MonacoWrapper"
participant App as "App Logic"
participant Kroki as "Kroki API"
participant Editor as "Specialized Editor"
User->>Monaco : Edit code
Monaco-->>App : onChange(value)
App->>App : detectSpecificModel(type)
App->>App : encodeKroki(value)
App->>Kroki : Fetch SVG (GET/POST)
Kroki-->>App : SVG or Error
App->>Monaco : setMarkers(error)
App->>Editor : Render preview or visual editor
Note over Monaco,Editor : Hover explanations and quick fixes available
```

**Diagram sources**
- [index.html](file://index.html)
- [js/components/editors/MonacoWrapper.jsx](file://js/components/editors/MonacoWrapper.jsx)
- [js/utils.js](file://js/utils.js#L14-L85)

## Detailed Component Analysis

### Error Diagnostics System
The diagnostics system provides:
- Error parsing: extracts line/column and assigns a categorized code
- Explanations: human-readable descriptions with examples per error family
- Quick fixes: actionable suggestions with auto-edit capabilities
- Monaco integration: code actions and hover provider

```mermaid
flowchart TD
Start(["Error Received"]) --> Parse["Parse Error<br/>extractLocation + categorizeError"]
Parse --> Explain["Get Explanation<br/>getErrorExplanation"]
Parse --> Fixes["Get Fixes<br/>getFixSuggestions"]
Explain --> Hover["Hover Provider<br/>formatForHover"]
Fixes --> CodeAction["Code Action Provider<br/>applyFix if needed"]
Hover --> Monaco["Monaco Hover Display"]
CodeAction --> Monaco
```

**Diagram sources**
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js#L13-L276)
- [js/error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js#L237-L299)
- [js/error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L332-L366)
- [js/components/editors/MonacoWrapper.jsx](file://js/components/editors/MonacoWrapper.jsx)

**Section sources**
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js#L13-L276)
- [js/error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js)
- [js/error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L11-L403)
- [js/components/editors/MonacoWrapper.jsx](file://js/components/editors/MonacoWrapper.jsx)

### Monaco Editor Integration
MonacoWrapper:
- Registers PlantUML, Mermaid and LikeC4 languages with Monarch tokens
- Registers error providers for code actions and hover explanations
- Exposes methods to set/clear markers, scroll to line, insert text at the cursor or a chosen location, and find and select text

Key capabilities for troubleshooting:
- Squiggly underlines for errors
- Quick Fix lightbulb actions
- Hover tooltips with explanations and examples

**Section sources**
- [js/components/editors/MonacoWrapper.jsx](file://js/components/editors/MonacoWrapper.jsx)

### Mermaid Editors and Sync Controller
The sync controller (`createMermaidSyncController`):
- Parses code to AST (Code → Visual), with a 300 ms debounce
- Renders an AST back to code (Visual → Code)
- Skips parsing while a visual edit is being written back, which prevents sync loops
- Reports whether the Mermaid AST library has loaded (`isLoaded`)

Mermaid visual editor (`MermaidVisualEditor`):
- Pie chart editor: edits the title, labels and values and adds slices
- Flowchart editor: a "coming soon" note; edit flowcharts in the code view
- Sequence, Gantt, timeline, journey and mindmap editors: a code-only message
- Universal Mode message for every other Mermaid type
- The visual editor shows no preview or AST view of its own; the preview panel in the code view renders the diagram

```mermaid
sequenceDiagram
participant Code as "Code Editor"
participant Sync as "createMermaidSyncController"
participant AST as "Mermaid AST"
participant Visual as "Mermaid Editor"
Code->>Sync : parseCode(code)
Sync->>AST : parse(code)
AST-->>Sync : ast
Sync-->>Visual : ast
Visual->>Sync : renderToCode(updatedAst)
Sync-->>Code : code
Note over Sync : Debounce + loop prevention
```

**Diagram sources**
- [js/components/editors/mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [js/components/editors/mermaid/MermaidEditors.jsx](file://js/components/editors/mermaid/MermaidEditors.jsx)
- [js/components/editors/mermaid/MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)

**Section sources**
- [js/components/editors/mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [js/components/editors/mermaid/MermaidEditors.jsx](file://js/components/editors/mermaid/MermaidEditors.jsx)
- [js/components/editors/mermaid/MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)

### BPMN Visual Editor
BpmnVisualEditor:
- Uses the npm bpmn-js modeler, bundled by Vite together with its CSS
- Imports initial XML and listens for changes
- Saves XML back to the code editor on command stack changes
- Handles initial import and external updates, and falls back to an empty diagram if the import fails

Common issues:
- XML import errors (the editor reports the message and shows an empty diagram)
- Bundle or build problems after a dependency change

**Section sources**
- [js/components/editors/BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)

### PlantUML Components
PlantUML toolbar and template gallery:
- Snippet toolbar for quick insertion
- Template gallery modal with predefined templates
- Interactive SVG preview in the code view's preview panel, with click and context actions

**Section sources**
- [js/components/PlantUmlComponents.js](file://js/components/PlantUmlComponents.js)

### Utilities
Utilities include:
- Encoding for Kroki URLs using compression
- Diagram type detection from extension and content
- Error line extraction helpers
- Debounce and script/CSS loading helpers

**Section sources**
- [js/utils.js](file://js/utils.js#L14-L177)

## Dependency Analysis
The error diagnostics module depends on:
- Monaco editor APIs for markers and code actions
- Diagram-specific parsers and libraries (Mermaid AST, bpmn-js)
- Utility functions for encoding and detection

```mermaid
graph TB
Explanations["explanations.js"] --> Index["index.js"]
Fixes["fixes.js"] --> Index
Index --> Monaco["MonacoWrapper.jsx"]
Index --> Utils["utils.js"]
Monaco --> Explanations
Monaco --> Fixes
Mermaid["Mermaid Visual Editor"] --> Utils
Bpmn["BpmnVisualEditor"] --> Utils
```

**Diagram sources**
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js#L4-L6)
- [js/components/editors/MonacoWrapper.jsx](file://js/components/editors/MonacoWrapper.jsx)
- [js/utils.js](file://js/utils.js#L1-L3)

**Section sources**
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js#L1-L303)
- [js/components/editors/MonacoWrapper.jsx](file://js/components/editors/MonacoWrapper.jsx)
- [js/utils.js](file://js/utils.js#L1-L177)

## Performance Considerations
- Debouncing: The Mermaid sync controller debounces parse calls to avoid excessive re-renders.
- Loading: Monaco and the Mermaid AST library load from CDNs, and bpmn-js is bundled with the app by Vite.
- Preview throttling: `useRemoteRenderer` waits 500 ms after the last edit before it fetches the preview.
- Compression: Diagram source is compressed before sending to Kroki to minimize payload size.

Best practices:
- Keep diagram code concise and well-formatted to improve parsing speed.
- Prefer incremental edits to avoid triggering full re-parses.
- Use templates and snippets to reduce manual typing and errors.

**Section sources**
- [js/components/editors/mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [js/components/editors/BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)
- [js/utils.js](file://js/utils.js#L14-L28)
- [index.html](file://index.html)

## Troubleshooting Guide

### Browser Compatibility Problems
Symptoms:
- Monaco editor not rendering
- BPMN visual editor not loading
- Scripts failing to load

Resolutions:
- Ensure modern browsers with ES module support and dynamic imports.
- Verify CDN availability for Monaco and the Mermaid AST library (`esm.sh`), and check that `npm install` completed so bpmn-js is bundled.
- Check for mixed-content warnings if using HTTPS.

Diagnostic steps:
- Open browser dev tools and inspect Network tab for failed script loads.
- Confirm that the Monaco loader and library scripts are being fetched successfully.
- For bpmn-js, confirm the Vite build or dev server reports no errors.

**Section sources**
- [js/components/editors/MonacoWrapper.jsx](file://js/components/editors/MonacoWrapper.jsx)
- [js/components/editors/BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)
- [index.html](file://index.html)

### Performance Issues
Symptoms:
- Slow preview generation
- Editor lag during editing
- Frequent re-renders

Resolutions:
- Reduce diagram complexity and remove unnecessary comments.
- Use snippets/templates to minimize manual edits.
- Avoid extremely long lines or very large diagrams.

Diagnostic steps:
- Monitor network requests for large payloads.
- Use the debounced preview delay to your advantage—avoid rapid back-to-back edits.
- Consider switching to a simpler diagram type temporarily to isolate performance bottlenecks.

**Section sources**
- [js/components/editors/mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [js/utils.js](file://js/utils.js#L14-L28)
- [index.html](file://index.html)

### Error Resolution Strategies
Common error families and resolutions:
- Missing closing bracket/paren/brace
  - Use the quick fix suggestions in Monaco to auto-insert missing delimiters.
  - Hover over the error marker to see a human-readable explanation and example.
- Unknown diagram type or missing declaration
  - Add the appropriate diagram declaration at the top of the code.
  - Use the quick fix lightbulb to insert the correct declaration.
- Unexpected token or syntax error
  - Review the highlighted line and surrounding context.
  - Use the hover explanation to understand the likely cause and correct syntax.

Diagnostic steps:
- Identify the error line number from the Monaco marker.
- Hover over the marker to read the explanation and example.
- Apply the suggested quick fix if available.

**Section sources**
- [js/error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js)
- [js/error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L11-L403)
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js#L13-L276)
- [js/components/editors/MonacoWrapper.jsx](file://js/components/editors/MonacoWrapper.jsx)

### Feature Limitations
- The Mermaid visual editor edits only pie charts today. The flowchart, sequence, Gantt, timeline, journey and mindmap sub-editors are placeholders, and every other Mermaid type shows a "Universal Mode" message. Edit those diagrams in the code view.
- BPMN visual editor requires XML; non-XML content will not render visually.
- Some diagram formats may have limited export options; prefer SVG/PNG downloads when available.

Workarounds:
- Use the Code view for advanced editing when visual editors are unavailable.
- Switch to supported formats for visual editing.

**Section sources**
- [js/components/editors/mermaid/MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [js/components/editors/BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)

### Frequently Asked Questions

Q: How do I fix “Missing @enduml”?
A: Ensure your PlantUML code ends with the required directive. Use the quick fix suggestion to append it automatically.

Q: Why does my Mermaid diagram not render visually?
A: The Mermaid visual editor edits pie charts only. For other types, use the Code view and rely on the live preview.

Q: How do I add a new participant or node quickly?
A: Use the toolbar snippets, or right-click in the preview panel, to insert boilerplate code.

Q: How do I export my diagram?
A: Use the SVG and PNG buttons in the header, or Save for the source file.

Q: How do I navigate to the code from an error?
A: Use the error line number in the preview panel (its "go to line" button scrolls the editor to that line), or click an element in the interactive preview to select its text in the code.

Q: How do I insert a snippet?
A: Use the Insert toolbar buttons to paste commonly used blocks.

Q: How do I switch between code and visual views?
A: Toggle the view mode in the UI controls.

Q: How do I reset the editor?
A: Use the template gallery to load a starter template.

**Section sources**
- [js/error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L111-L137)
- [js/components/editors/mermaid/MermaidEditors.jsx](file://js/components/editors/mermaid/MermaidEditors.jsx)
- [js/components/PlantUmlComponents.js](file://js/components/PlantUmlComponents.js#L9-L47)
- [index.html](file://index.html)

### Step-by-Step Solutions

#### Loading Problems
Steps:
1. Check browser console for script load errors.
2. Verify CDN availability for Monaco and Mermaid AST, and that the Vite server or build is running without errors.
3. Reload the page and try again.

#### Rendering Failures
Steps:
1. Inspect the error message and line number.
2. Hover over the error marker to read the explanation.
3. Apply the suggested quick fix if available.
4. Retry preview generation.

#### Synchronization Issues (Mermaid)
Steps:
1. Ensure the Mermaid AST library is loaded.
2. Avoid making visual edits while code is changing.
3. Make incremental edits, because the sync controller debounces parsing by 300 ms.

#### Export Problems
Steps:
1. Confirm that an SVG/PNG is available.
2. Use the download buttons to export.
3. If the image is blank, review the error markers and fix the code.

**Section sources**
- [js/components/editors/mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [js/components/editors/MonacoWrapper.jsx](file://js/components/editors/MonacoWrapper.jsx)
- [index.html](file://index.html)

### Debugging Techniques and Diagnostic Commands
- Use the Monaco error markers to locate syntax issues.
- Use the hover provider to read explanations and examples.
- Use the quick fix actions to apply corrections.
- Rely on the 500 ms preview delay to stabilize frequent edits.
- Use the template gallery to validate your diagram type and structure.

Support resources:
- Diagram documentation links embedded in explanations.
- Template gallery for format-specific examples.
- Browser dev tools for network and console diagnostics.

**Section sources**
- [js/error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js#L278-L299)
- [js/error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L332-L400)
- [js/utils.js](file://js/utils.js#L166-L177)

## Conclusion
This guide consolidates the tools and workflows to diagnose and resolve common issues across diagram formats and editors. By leveraging Monaco’s error markers, hover explanations, quick fixes, and the specialized editors, most problems can be identified and resolved quickly. For persistent issues, use the diagnostic commands and support resources outlined above.

## Appendices

### Error Categories and Examples
- Missing closing delimiter: brackets, parentheses, braces
- Unknown diagram type or missing declaration
- Unexpected token or syntax error
- XML parsing errors (BPMN)
- Missing start/end directives (PlantUML)

**Section sources**
- [js/error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js)
- [js/error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L11-L403)