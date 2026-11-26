# Configuration and Customization

<cite>
**Referenced Files in This Document**
- [config.js](file://js/config.js)
- [index.html](file://index.html)
- [utils.js](file://js/utils.js)
- [react-helpers.js](file://js/react-helpers.js)
- [mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [MermaidEditors.jsx](file://js/components/editors/mermaid/MermaidEditors.jsx)
- [BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js)
- [error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js)
- [error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js)
- [PlantUmlComponents.js](file://js/components/PlantUmlComponents.js)
- [ui.js](file://js/components/ui.js)
- [styles.css](file://styles.css)
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
This document explains how to configure and customize the Universal Diagram application. It covers:
- Diagram type configuration and how to add new diagram types
- Language configuration for editors and syntax highlighting
- Template registration and snippet systems
- Extension management for external libraries and services
- Application settings for themes, styling, editor preferences, and export behavior
- Runtime configuration changes and dependency injection patterns
- Utility functions for encoding, compression, and external service integration
- Practical examples for extending the app, customizing the UI, and integrating additional services
- Best practices, performance tips, and troubleshooting common configuration issues

## Project Structure
The application is a single-page React-based editor that supports multiple diagramming languages. Configuration is centralized in shared modules and HTML, with modular editor components and utilities.

```mermaid
graph TB
subgraph "Entry Point"
HTML["index.html"]
end
subgraph "Configuration"
CFG["js/config.js"]
DIAG["DIAGRAM_TYPES<br/>PlantUML/mermaid templates/snippets"]
end
subgraph "Utilities"
UTILS["js/utils.js<br/>encodeKroki, detectTypeFromExtension,<br/>detectSpecificModel, loadScript/loadCSS,<br/>debounce, escapeRegex"]
ERR["js/error-diagnostics/index.js<br/>parseError, toMonacoMarker,<br/>toMonacoCodeAction"]
EXPL["js/error-diagnostics/explanations.js<br/>ERROR_EXPLANATIONS"]
FIX["js/error-diagnostics/fixes.js<br/>getFixSuggestions, applyFix"]
end
subgraph "React Helpers"
RH["js/react-helpers.js<br/>htm bindings"]
end
subgraph "UI Components"
UI["js/components/ui.js<br/>Button, StatusBadge, Loader,<br/>EmptyState, EditableText"]
PU["js/components/PlantUmlComponents.js<br/>Toolbar, TemplateGalleryModal,<br/>InteractiveSvgPreview, ContextMenu"]
end
subgraph "Editors"
MVE["js/components/editors/mermaid/MermaidVisualEditor.jsx<br/>MermaidVisualEditor router<br/>and Universal Mode fallback"]
MSC["js/components/editors/mermaid/utils.js<br/>parseCode/renderToCode"]
MED["js/components/editors/mermaid/MermaidEditors.jsx<br/>Pie editor and placeholder editors"]
BVE["js/components/editors/BpmnVisualEditor.jsx"]
end
subgraph "Styles"
CSS["styles.css"]
end
HTML --> CFG
HTML --> UTILS
HTML --> ERR
HTML --> UI
HTML --> PU
HTML --> MVE
HTML --> BVE
MVE --> MSC
MVE --> MED
CFG --> PU
CFG --> MVE
CFG --> BVE
UTILS --> MVE
UTILS --> BVE
ERR --> UI
EXPL --> ERR
FIX --> ERR
CSS --> HTML
```

**Diagram sources**
- [index.html](file://index.html)
- [config.js](file://js/config.js#L1-L566)
- [utils.js](file://js/utils.js#L1-L177)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L1-L303)
- [error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js)
- [error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L1-L403)
- [react-helpers.js](file://js/react-helpers.js#L1-L39)
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [MermaidEditors.jsx](file://js/components/editors/mermaid/MermaidEditors.jsx)
- [BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)
- [PlantUmlComponents.js](file://js/components/PlantUmlComponents.js)
- [ui.js](file://js/components/ui.js)
- [styles.css](file://styles.css#L1-L370)

**Section sources**
- [index.html](file://index.html)
- [config.js](file://js/config.js#L1-L116)
- [utils.js](file://js/utils.js#L1-L177)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L1-L303)
- [error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js)
- [error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L1-L403)
- [react-helpers.js](file://js/react-helpers.js#L1-L39)
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [MermaidEditors.jsx](file://js/components/editors/mermaid/MermaidEditors.jsx)
- [BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)
- [PlantUmlComponents.js](file://js/components/PlantUmlComponents.js)
- [ui.js](file://js/components/ui.js)
- [styles.css](file://styles.css#L1-L370)

## Core Components
- Diagram type registry: Centralized configuration of supported diagram types, extensions, language IDs, documentation links, and example content.
- Editor routing: A Mermaid visual editor router that selects the sub-editor from the detected diagram model, and shows a "Universal Mode" message when no sub-editor matches.
- Error diagnostics: Structured error parsing, categorization, suggestions, and Monaco integration.
- Utilities: Encoding, compression, detection helpers, external script/CSS loaders, debouncing, and regex escaping.
- UI components: Reusable buttons, badges, loaders, editable text, and section headers.
- PlantUML components: Snippet toolbar, template gallery, interactive SVG preview, and context menus.
- Styling: Tailwind-based theme overrides and component-specific styles.

**Section sources**
- [config.js](file://js/config.js#L6-L116)
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L13-L44)
- [utils.js](file://js/utils.js#L14-L85)
- [ui.js](file://js/components/ui.js)
- [PlantUmlComponents.js](file://js/components/PlantUmlComponents.js)
- [styles.css](file://styles.css#L1-L370)

## Architecture Overview
The application uses a modular architecture:
- Configuration is declared in a central module and optionally duplicated in the HTML for inline demos.
- Utilities encapsulate cross-cutting concerns (encoding, detection, external loading).
- Editors are composed of small, focused components with clear responsibilities.
- Error diagnostics integrate with Monaco to provide actionable feedback.
- Styling leverages Tailwind with targeted overrides.

```mermaid
sequenceDiagram
participant User as "User"
participant HTML as "index.html"
participant CFG as "config.js"
participant UTIL as "utils.js"
participant ERR as "error-diagnostics"
participant MVE as "MermaidVisualEditor"
participant BVE as "BpmnVisualEditor"
User->>HTML : Open page
HTML->>CFG : Load DIAGRAM_TYPES, snippets, templates
HTML->>UTIL : Initialize encodeKroki, loadScript, loadCSS
HTML->>ERR : Register Monaco providers (code actions, hover)
User->>MVE : Select Mermaid diagram
MVE-->>User : Render the matching sub-editor or the Universal Mode message
User->>BVE : Select BPMN diagram
BVE-->>User : Render visual BPMN editor (bpmn-js bundled from npm)
```

**Diagram sources**
- [index.html](file://index.html)
- [config.js](file://js/config.js#L60-L116)
- [utils.js](file://js/utils.js#L14-L146)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L474-L509)
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)

## Detailed Component Analysis

### Diagram Type Configuration System
The diagram type configuration defines:
- Keys for diagram families (e.g., mermaid, plantuml, bpmn)
- Display label, supported file extensions, Monaco language ID, documentation link
- Example content for quick start
- Special flags (e.g., hasVisualEditor for BPMN)
- Subtypes detection for Mermaid and PlantUML/C4

Key responsibilities:
- Adding a new diagram family: Extend the registry with label, extensions, monacoLang, docs, and example.
- Enabling visual editor: Set hasVisualEditor for families supporting visual editing.
- Subtype detection: Use detection helpers to infer subtype from code content.

Practical steps to add a new diagram type:
- Define metadata in the registry (extensions, monacoLang, docs, example).
- If a visual editor exists, wire it into the routing or create a new editor component.
- Register Monaco language tokens if needed.
- Optionally add subtype detection logic.

**Section sources**
- [config.js](file://js/config.js#L6-L116)
- [utils.js](file://js/utils.js#L35-L85)
- [index.html](file://index.html)

### Language Configuration and Syntax Highlighting
Monaco language registration and token providers are set up per diagram type:
- PlantUML, Mermaid and LikeC4 languages are registered with Monarch tokenizers.
- Error providers and hover providers are registered for these languages.
- The Monaco wrapper sets language dynamically and applies theme and editor options.

Customization points:
- Add new language registrations by registering the language and tokenizer.
- Extend error providers for new languages.
- Adjust Monaco options (theme, fonts, minimap, etc.) in the wrapper.

**Section sources**
- [index.html](file://index.html)
- [utils.js](file://js/utils.js)

### Template Registration and Snippet Systems
Template and snippet systems enable rapid authoring:
- PlantUML templates: A gallery of ready-to-use diagrams with icons and descriptions.
- PlantUML snippets: Per-model snippet collections for quick insertion.
- Mermaid templates: A curated set of Mermaid diagram templates.

Customization points:
- Add new PlantUML templates by extending the template array with id, label, icon, description, and code.
- Add new snippet groups by adding entries to the snippet map under appropriate model keys.
- Extend Mermaid templates similarly for Mermaid diagrams.

**Section sources**
- [config.js](file://js/config.js#L118-L192)
- [config.js](file://js/config.js#L194-L565)
- [PlantUmlComponents.js](file://js/components/PlantUmlComponents.js#L52-L95)

### Extension Management
External libraries and services are loaded dynamically:
- External scripts: loadScript handles AMD conflict mitigation and caching.
- External CSS: loadCSS prevents duplicate link tags.
- Visual editors: the BPMN editor imports bpmn-js from the npm package, so Vite bundles bpmn-js and its CSS with the app. The Mermaid editors load the Mermaid AST library (`window.MermaidAST`) from `esm.sh` in `index.html`.
- Preview generation: the hook `js/hooks/useRemoteRenderer.js` fetches SVG previews from Kroki through the renderer adapter. The Mermaid visual editor has no preview of its own.

Best practices:
- Check for existing resources before loading.
- Handle load failures gracefully.
- Revoke object URLs to avoid memory leaks.

**Section sources**
- [utils.js](file://js/utils.js#L116-L158)
- [BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)

### Application Settings and UI Customization
Theme and styling options:
- Tailwind configuration extends colors and monospace font family.
- Component-specific CSS overrides for Monaco, BPMN, interactive SVG, and layout elements.
- Reusable UI components provide consistent styling and behavior.

Editor preferences:
- Monaco wrapper exposes theme, language, and editor options.
- The Mermaid visual editor shows a loading spinner until the Mermaid AST library has loaded.

Export settings:
- Encoding and compression pipeline uses pako for URL-safe base64 encoding.
- Preview fetching in `useRemoteRenderer` uses Kroki endpoints for rendering.

**Section sources**
- [index.html](file://index.html#L32-L45)
- [styles.css](file://styles.css#L1-L370)
- [utils.js](file://js/utils.js#L14-L28)
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)

### Configuration Object Structure
The configuration object structure includes:
- DIAGRAM_TYPES: keyed by diagram family with label, extensions, monacoLang, docs, hasVisualEditor, example.
- PLANTUML_TEMPLATES: array of template objects with id, label, icon, description, code.
- PLANTUML_SNIPPETS: grouped snippet arrays by diagram model.
- MERMAID_TEMPLATES: Mermaid templates.
- MERMAID_SNIPPETS: Mermaid snippets.

These structures are consumed by:
- Editor routing and subtype detection
- Template galleries and snippet toolbars
- Error diagnostics and explanations

**Section sources**
- [config.js](file://js/config.js#L6-L116)
- [config.js](file://js/config.js#L118-L565)
- [index.html](file://index.html)

### Dependency Injection Patterns
The application uses minimal dependency injection:
- React helpers bind htm to React.createElement for JSX-like syntax.
- Monaco is globally available after loader initialization.
- Utilities are imported and used directly by components.

Where to inject:
- Replace Monaco provider registration with a factory if needed.
- Wrap utilities in factories for testability.
- Pass configuration objects as props to components for decoupling.

**Section sources**
- [react-helpers.js](file://js/react-helpers.js#L4-L38)
- [index.html](file://index.html)

### Runtime Configuration Changes
Runtime behaviors:
- Monaco language switching via model.setLanguage.
- Preview URL updates trigger re-renders.
- Visual editor readiness gates prevent inconsistent states.
- Debounce timers manage expensive operations (for example, the 300 ms debounce on Mermaid AST parsing).

How to change:
- Update Monaco language dynamically by passing language prop.
- Change the debounce timing for Mermaid AST parsing in `createMermaidSyncController`.
- Toggle visual editor availability based on feature flags.

**Section sources**
- [index.html](file://index.html)
- [mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)

### Utility Functions: Encoding, Compression, and External Services
Encoding and compression:
- textToBytes converts text to Uint8Array.
- encodeKroki compresses with pako, base64 encodes, and URL-safes the result.

External services:
- loadScript and loadCSS load external resources safely.
- debounced operations reduce unnecessary computations.
- escapeRegex prepares strings for RegExp.

Integration examples:
- Use encodeKroki to prepare source for Kroki endpoints.
- Use loadScript to initialize third-party libraries.
- Use debounce to optimize frequent updates.

**Section sources**
- [utils.js](file://js/utils.js#L7-L28)
- [utils.js](file://js/utils.js#L116-L176)
- [index.html](file://index.html)

### Practical Examples

#### Example 1: Extending with a New Diagram Format
Steps:
- Add a new entry to DIAGRAM_TYPES with label, extensions, monacoLang, docs, and example.
- If visual editing is needed, create or wire a visual editor component.
- Register Monaco language tokens if the language is not already supported.
- Optionally add subtype detection logic in detectSpecificModel.

Outcome:
- Users can select the new format, open files with supported extensions, and use syntax highlighting.

**Section sources**
- [config.js](file://js/config.js#L6-L116)
- [utils.js](file://js/utils.js#L35-L85)
- [index.html](file://index.html)

#### Example 2: Customizing the User Interface
Steps:
- Extend Tailwind theme colors and fonts in the HTML head.
- Override component-specific styles in styles.css.
- Use reusable UI components (Button, StatusBadge, EditableText) for consistency.

Outcome:
- Consistent look-and-feel across editors and dialogs.

**Section sources**
- [index.html](file://index.html#L32-L45)
- [styles.css](file://styles.css#L1-L370)
- [ui.js](file://js/components/ui.js)

#### Example 3: Integrating Additional External Services
Steps:
- Use loadScript to load external libraries.
- Use loadCSS to inject styles.
- Implement a fetch-based preview mechanism similar to `useRemoteRenderer`.

Outcome:
- Seamless integration of new rendering engines or tools.

**Section sources**
- [utils.js](file://js/utils.js#L116-L158)
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)

## Dependency Analysis
The following diagram shows key dependencies among modules:

```mermaid
graph TB
CFG["config.js"] --> PU["PlantUmlComponents.js"]
APP["App.jsx"] --> MVE["MermaidVisualEditor.jsx"]
APP --> BVE["BpmnVisualEditor.jsx"]
MVE --> MED["MermaidEditors.jsx"]
MVE --> MSC["mermaid/utils.js"]
UTIL["utils.js"] --> MSC
ERR["error-diagnostics/index.js"]
EXPL["explanations.js"] --> ERR
FIX["fixes.js"] --> ERR
UI["ui.js"] --> PU
CSS["styles.css"] --> HTML["index.html"]
```

**Diagram sources**
- [config.js](file://js/config.js#L6-L116)
- [PlantUmlComponents.js](file://js/components/PlantUmlComponents.js)
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [BpmnVisualEditor.jsx](file://js/components/editors/BpmnVisualEditor.jsx)
- [utils.js](file://js/utils.js#L1-L177)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L1-L303)
- [error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js)
- [error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L1-L403)
- [ui.js](file://js/components/ui.js)
- [styles.css](file://styles.css#L1-L370)
- [index.html](file://index.html)

**Section sources**
- [config.js](file://js/config.js#L6-L116)
- [utils.js](file://js/utils.js#L1-L177)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L1-L303)
- [error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js)
- [error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L1-L403)
- [PlantUmlComponents.js](file://js/components/PlantUmlComponents.js)
- [ui.js](file://js/components/ui.js)
- [styles.css](file://styles.css#L1-L370)
- [index.html](file://index.html)

## Performance Considerations
- Debounce expensive operations: Use debounce for Mermaid AST parsing and similar work.
- Lazy loading: Load external libraries only when needed (for example, the Mermaid AST library).
- Memory management: Revoke object URLs and dispose editors to prevent leaks.
- Minimize re-renders: Keep configuration immutable and pass only necessary props.
- Compression: Use pako compression for efficient URL encoding of diagram sources.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common configuration issues and resolutions:
- Missing @startuml/@enduml: Use fix suggestions to add missing directives.
- Unclosed brackets/parentheses: Apply bracket fixes or rely on Monaco quick fixes.
- Unknown diagram type: Insert a diagram declaration (e.g., flowchart TD).
- XML parsing errors (BPMN): Ensure all tags are closed and attributes are quoted.
- External library load failures: Check network connectivity and script URLs.

Diagnostic workflow:
- Parse error text into structured information.
- Extract line/column and categorize error.
- Provide fix suggestions and explanations.
- Register Monaco code actions and hover providers.

**Section sources**
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L13-L44)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L52-L145)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L261-L276)
- [error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L332-L366)
- [error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js#L237-L271)
- [index.html](file://index.html)

## Conclusion
The Universal Diagram application provides a flexible configuration and customization framework:
- Centralized diagram type configuration enables easy addition of new formats.
- Modular editor components and utilities support robust runtime behavior.
- Error diagnostics and Monaco integration improve developer experience.
- Styling and UI components ensure a consistent, customizable appearance.
Adhering to the patterns and best practices outlined here will help you extend the application effectively and maintain high performance and reliability.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Appendix A: Configuration Object Reference
- DIAGRAM_TYPES: keys map to diagram families with label, extensions, monacoLang, docs, hasVisualEditor, example.
- PLANTUML_TEMPLATES: array of template objects with id, label, icon, description, code.
- PLANTUML_SNIPPETS: grouped snippet arrays by diagram model.
- MERMAID_TEMPLATES: Mermaid templates.
- MERMAID_SNIPPETS: Mermaid snippets.

**Section sources**
- [config.js](file://js/config.js#L6-L116)
- [config.js](file://js/config.js#L118-L565)
- [index.html](file://index.html)

### Appendix B: Error Parsing Flow
```mermaid
flowchart TD
Start(["Error Text"]) --> Extract["Extract Location<br/>extractLocation()"]
Extract --> Categorize["Categorize Error<br/>categorizeError()"]
Categorize --> Suggestions["Get Fix Suggestions<br/>getFixSuggestions()"]
Suggestions --> MonacoMarker["Convert to Monaco Marker<br/>toMonacoMarker()"]
MonacoMarker --> Done(["Structured Error Info"])
```

**Diagram sources**
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L52-L145)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L153-L254)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L261-L276)
- [error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L332-L366)