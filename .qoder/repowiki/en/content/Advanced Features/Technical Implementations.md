# Technical Implementations

<cite>
**Referenced Files in This Document**
- [index.html](file://index.html)
- [js/utils.js](file://js/utils.js)
- [js/react-helpers.js](file://js/react-helpers.js)
- [js/components/MonacoWrapper.js](file://js/components/MonacoWrapper.js)
- [js/config.js](file://js/config.js)
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js)
- [js/error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js)
- [js/error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js)
- [js/components/PlantUmlComponents.js](file://js/components/PlantUmlComponents.js)
- [js/components/ui.js](file://js/components/ui.js)
- [js/editors/bpmn/BpmnVisualEditor.js](file://js/editors/bpmn/BpmnVisualEditor.js)
- [js/editors/mermaid/MermaidFlowchartEditor.js](file://js/editors/mermaid/MermaidFlowchartEditor.js)
- [js/editors/mermaid/MermaidSequenceEditor.js](file://js/editors/mermaid/MermaidSequenceEditor.js)
- [js/editors/mermaid/MermaidGenericEditor.js](file://js/editors/mermaid/MermaidGenericEditor.js)
- [js/editors/mermaid/MermaidSyncController.js](file://js/editors/mermaid/MermaidSyncController.js)
- [js/library-registry.js](file://js/library-registry.js)
- [js/cdn-version-checker.js](file://js/cdn-version-checker.js)
- [js/update-manager.js](file://js/update-manager.js)
- [js/update-tester.js](file://js/update-tester.js)
- [js/html-rewriter.js](file://js/html-rewriter.js)
</cite>

## Update Summary
**Changes Made**
- Enhanced library registry with comprehensive version tracking, peer dependency validation, and linked version management
- Improved update manager with better error handling, state management, and comprehensive testing workflows
- Expanded update tester with sophisticated iframe-based sandbox testing, URL validation, and visual rendering verification
- Added comprehensive dependency conflict detection and resolution
- Enhanced HTML rewriter with precise URL pattern matching and change tracking
- Integrated update system into main application with React component subscriptions and reactive state updates

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Library Update Management System](#library-update-management-system)
7. [Dependency Analysis](#dependency-analysis)
8. [Performance Considerations](#performance-considerations)
9. [Troubleshooting Guide](#troubleshooting-guide)
10. [Conclusion](#conclusion)

## Introduction
This document explains the advanced technical implementations and architectural patterns used in the Universal Diagram Editor. It covers the utility function architecture (encoding/decoding, error handling, cross-platform compatibility), React helper utilities for DOM/event/lifecycle management, the Monaco wrapper implementation (syntax highlighting, error markers, custom languages), integration patterns for external libraries and CDNs, configuration and plugin/extensibility points, advanced JavaScript patterns, asynchronous programming, state management strategies, and the comprehensive library update management system with enhanced error handling and testing scenarios.

## Project Structure
The application is a single-page React application with a hybrid module approach:
- The main HTML loads React, ReactDOM, Babel, Monaco, and other libraries via CDN.
- Core logic is split into modular JS files under js/ for utilities, React helpers, Monaco wrapper, configuration, error diagnostics, specialized editors, and the enhanced library update management system.
- The main application is bootstrapped inside a Babel-enabled script tag in index.html.
- The library update system is integrated as an ES module with a dedicated UI panel featuring reactive state management.

```mermaid
graph TB
A["index.html<br/>CDN scripts, Babel, Monaco, Update System"] --> B["React App Root<br/>(App component)"]
B --> C["MonacoWrapper<br/>(Monaco Editor)"]
B --> D["BpmnVisualEditor<br/>(bpmn-js)"]
B --> E["Mermaid Editors<br/>(Flowchart, Sequence, Generic)"]
B --> F["UI Components<br/>(Buttons, Badges, Update Panel)"]
B --> G["PlantUML Components<br/>(Toolbar, Gallery, Context Menu)"]
H["js/utils.js<br/>Encoding, Error Parsing, Script/CSS Loading"] --> C
I["js/config.js<br/>Diagram Types, Snippets, Templates"] --> B
J["js/error-diagnostics/*<br/>Parsing, Fixes, Explanations"] --> C
K["js/react-helpers.js<br/>htm + React bindings"] --> F
L["js/editors/*<br/>Specialized editors"] --> B
M["js/library-registry.js<br/>Enhanced CDN Dependencies, Version Tracking"] --> N["Update System"]
N["js/update-manager.js<br/>Improved Workflow Orchestration"] --> O["js/update-tester.js<br/>Advanced Sandbox Testing"]
N --> P["js/html-rewriter.js<br/>Precise URL Replacement, Validation"]
Q["js/cdn-version-checker.js<br/>Multi-Provider API Integration"] --> N
```

**Diagram sources**
- [index.html](file://index.html#L1-L80)
- [js/utils.js](file://js/utils.js#L1-L177)
- [js/config.js](file://js/config.js#L1-L566)
- [js/react-helpers.js](file://js/react-helpers.js#L1-L39)
- [js/components/MonacoWrapper.js](file://js/components/MonacoWrapper.js#L1-L426)
- [js/editors/bpmn/BpmnVisualEditor.js](file://js/editors/bpmn/BpmnVisualEditor.js#L1-L106)
- [js/editors/mermaid/MermaidFlowchartEditor.js](file://js/editors/mermaid/MermaidFlowchartEditor.js#L1-L276)
- [js/editors/mermaid/MermaidSequenceEditor.js](file://js/editors/mermaid/MermaidSequenceEditor.js#L1-L110)
- [js/editors/mermaid/MermaidGenericEditor.js](file://js/editors/mermaid/MermaidGenericEditor.js#L1-L101)
- [js/library-registry.js](file://js/library-registry.js#L1-L487)
- [js/update-manager.js](file://js/update-manager.js#L1-L461)
- [js/update-tester.js](file://js/update-tester.js#L1-L706)
- [js/html-rewriter.js](file://js/html-rewriter.js#L1-L274)
- [js/cdn-version-checker.js](file://js/cdn-version-checker.js#L1-L270)

**Section sources**
- [index.html](file://index.html#L1-L120)
- [js/config.js](file://js/config.js#L1-L120)

## Core Components
- Utility functions: Encoding (Kroki URL-safe base64), MIME/type detection, error extraction, regex escaping, dynamic script/CSS loading, debouncing.
- React helpers: htm-based JSX-like syntax bound to React globals loaded from CDN.
- Monaco wrapper: AMD-configured Monaco editor with custom PlantUML/Mermaid Monarch tokens, error providers, and imperative methods.
- Error diagnostics: Parser for extracting line/column, categorization, and conversion to Monaco markers; fix suggestions and explanations.
- Configuration: Central registry of diagram types, language mappings, snippets, and templates.
- Specialized editors: BPMN visual editor (bpmn-js), Mermaid editors (flowchart, sequence, generic), and UI components.
- **Syntext Smith**: Neuro-symbolic AI service with semantic parsing, deterministic compilation, and self-correction loops.
- **Enhanced**: Library update management system: Comprehensive dependency tracking, CDN version checking, automated testing, and HTML rewriting with advanced validation.

**Section sources**
- [js/utils.js](file://js/utils.js#L1-L177)
- [js/react-helpers.js](file://js/react-helpers.js#L1-L39)
- [js/components/MonacoWrapper.js](file://js/components/MonacoWrapper.js#L1-L170)
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js#L1-L303)
- [js/error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js#L1-L302)
- [js/error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L1-L403)
- [js/config.js](file://js/config.js#L1-L120)
- [js/editors/bpmn/BpmnVisualEditor.js](file://js/editors/bpmn/BpmnVisualEditor.js#L1-L106)
- [js/editors/mermaid/MermaidFlowchartEditor.js](file://js/editors/mermaid/MermaidFlowchartEditor.js#L1-L276)
- [js/editors/mermaid/MermaidSequenceEditor.js](file://js/editors/mermaid/MermaidSequenceEditor.js#L1-L110)
- [js/editors/mermaid/MermaidGenericEditor.js](file://js/editors/mermaid/MermaidGenericEditor.js#L1-L101)
- [js/library-registry.js](file://js/library-registry.js#L1-L487)
- [js/update-manager.js](file://js/update-manager.js#L1-L461)
- [js/update-tester.js](file://js/update-tester.js#L1-L706)
- [js/html-rewriter.js](file://js/html-rewriter.js#L1-L274)
- [js/cdn-version-checker.js](file://js/cdn-version-checker.js#L1-L270)

## Architecture Overview
High-level architecture:
- Frontend: React + Monaco + specialized editors.
- External integrations: CDN-hosted libraries (React, Monaco, bpmn-js, Mermaid AST), Kroki backend for rendering.
- Data flow: Code changes trigger debounced preview generation; errors are parsed and surfaced via Monaco markers and hover explanations; visual editors update code and vice versa via a sync controller.
- **Enhanced**: Update system: Comprehensive dependency version tracking, testing, and HTML rewriting with sandboxed validation and error handling.

```mermaid
sequenceDiagram
participant U as "User"
participant App as "App (index.html)"
participant UM as "UpdateManager"
participant CV as "CDNVersionChecker"
participant UT as "UpdateTester"
participant HR as "HTMLRewriter"
U->>App : "Open Update Panel"
App->>UM : "checkForUpdates()"
UM->>HR : "fetchCurrentHtml()"
HR-->>UM : "Current HTML content"
UM->>CV : "checkAllUpdates(actualVersions)"
CV-->>UM : "Available updates"
UM->>UT : "testSelectedUpdates()"
UT-->>UM : "Test results"
UM->>HR : "updateLibraryUrls()"
HR-->>UM : "Updated HTML + changes"
UM-->>App : "State updates"
App-->>U : "Display update results"
```

**Diagram sources**
- [index.html](file://index.html#L2200-L2237)
- [js/update-manager.js](file://js/update-manager.js#L63-L98)
- [js/cdn-version-checker.js](file://js/cdn-version-checker.js#L191-L214)
- [js/update-tester.js](file://js/update-tester.js#L398-L444)
- [js/html-rewriter.js](file://js/html-rewriter.js#L66-L99)

## Detailed Component Analysis

### Utility Function Architecture
- Encoding/Decoding: Converts text to bytes, compresses with pako, base64-encodes, and URL-safes the result for Kroki URLs.
- Type Detection: Infers diagram type from file extension and content.
- Error Extraction: Parses line/column from various error formats.
- Regex Escaping: Safe construction of RegExp from user-provided strings.
- Dynamic Loading: Loads external scripts/CSS avoiding AMD conflicts; deduplicates existing resources.
- Debounce: Throttles expensive operations (e.g., Mermaid AST parsing).

```mermaid
flowchart TD
Start(["User Input"]) --> Detect["Detect Type by Extension/Content"]
Detect --> Encode["Compress + Base64 + URL-Safe"]
Encode --> Fetch["Fetch from Kroki"]
Fetch --> Ok{"Success?"}
Ok --> |Yes| Preview["Render Preview"]
Ok --> |No| ParseErr["Parse Error Text"]
ParseErr --> Markers["Convert to Monaco Markers"]
Markers --> Hover["Hover Provider"]
Preview --> End(["Done"])
Hover --> End
```

**Diagram sources**
- [js/utils.js](file://js/utils.js#L14-L85)
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js#L13-L145)
- [js/error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js#L237-L271)

**Section sources**
- [js/utils.js](file://js/utils.js#L1-L177)
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js#L1-L303)
- [js/error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js#L1-L302)
- [js/error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L1-L403)

### React Helper Utilities
- Uses htm to enable JSX-like syntax without a bundler, binding to globally loaded React.
- Exports React hooks and html tagged template for consistent component creation.
- Enables zero-build development while maintaining modern React patterns.

```mermaid
graph LR
CDN["CDN React + Babel"] --> RH["react-helpers.js"]
RH --> Cmp["Components using html`...`"]
```

**Diagram sources**
- [js/react-helpers.js](file://js/react-helpers.js#L1-L39)
- [index.html](file://index.html#L8-L13)

**Section sources**
- [js/react-helpers.js](file://js/react-helpers.js#L1-L39)

### Monaco Wrapper Implementation
Key capabilities:
- AMD configuration for Monaco loader.
- Registers PlantUML and Mermaid Monarch grammars with keywords, operators, and tokenizer rules.
- Registers error providers: CodeActionProvider for quick fixes and HoverProvider for explanations.
- Exposes imperative methods: setValue, insertAtCursor, setMarkers, clearMarkers, scrollToLine, getModel, getMonaco.
- Synchronizes language and value changes; clears decorations on content change.

```mermaid
classDiagram
class MonacoWrapper {
+ref : forwardRef
+state : editorReady
+methods : scrollToLine(), setValue(), insertAtCursor(), setMarkers(), clearMarkers(), getModel(), getMonaco()
+effects : initialize editor, register languages/providers, sync language/value
}
class Providers {
+registerErrorProviders()
+CodeActionProvider
+HoverProvider
}
class Languages {
+registerPlantUMLLanguage()
+registerMermaidLanguage()
}
MonacoWrapper --> Providers : "uses"
MonacoWrapper --> Languages : "registers"
```

**Diagram sources**
- [js/components/MonacoWrapper.js](file://js/components/MonacoWrapper.js#L13-L169)
- [js/components/MonacoWrapper.js](file://js/components/MonacoWrapper.js#L309-L423)

**Section sources**
- [js/components/MonacoWrapper.js](file://js/components/MonacoWrapper.js#L1-L426)

### Error Diagnostics System
- Parsing: Extracts line/column from error text using diagram-type-aware patterns; categorizes errors and assigns codes.
- Conversion: Translates parsed errors into Monaco markers and code actions.
- Explanations: Human-readable explanations with examples and documentation links.
- Fixes: Automated quick fixes with auto-edit ranges; handles special EOF marker positions.

```mermaid
flowchart TD
E["Raw Error Text"] --> P["parseError()"]
P --> L["extractLocation()"]
P --> C["categorizeError()"]
C --> M["toMonacoMarker()"]
L --> M
P --> S["getFixSuggestions()"]
S --> CA["toMonacoCodeAction()"]
```

**Diagram sources**
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js#L13-L276)
- [js/error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js#L237-L299)
- [js/error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L332-L366)

**Section sources**
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js#L1-L303)
- [js/error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js#L1-L302)
- [js/error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L1-L403)

### Configuration and Plugin Architecture
- Central configuration defines diagram types, extensions, Monaco language mappings, docs links, and example templates.
- Snippets and templates are organized per diagram type for quick insertion and onboarding.
- Extensibility: Adding a new diagram type requires updating the configuration and registering a Monaco language/provider if needed.

```mermaid
graph TB
CFG["DIAGRAM_TYPES"] --> MW["MonacoWrapper<br/>language mapping"]
CFG --> APP["App<br/>type selection"]
CFG --> PU["PlantUML Snippets/Templates"]
CFG --> MR["Mermaid Snippets/Templates"]
```

**Diagram sources**
- [js/config.js](file://js/config.js#L6-L116)
- [js/config.js](file://js/config.js#L118-L192)
- [js/config.js](file://js/config.js#L194-L566)

**Section sources**
- [js/config.js](file://js/config.js#L1-L566)

### Advanced JavaScript Patterns and Asynchronous Programming
- Debouncing: Used for Mermaid AST parsing to avoid excessive re-renders.
- Promise-based dynamic loading: Ensures AMD compatibility and avoids conflicts.
- Controlled state updates: Change-source flag prevents feedback loops between code and visual editors.
- Event-driven editors: Monaco emits change/cursor events; bpmn-js emits command stack changes.

```mermaid
sequenceDiagram
participant MW as "MonacoWrapper"
participant SYNC as "MermaidSyncController"
participant AST as "MermaidAST"
MW->>SYNC : "parseCode(code)"
SYNC->>AST : "parse(code)"
AST-->>SYNC : "ast"
SYNC-->>MW : "ast"
Note over SYNC : "changeSource='visual' during renderToCode"
SYNC->>AST : "render(ast)"
AST-->>SYNC : "code"
```

**Diagram sources**
- [js/editors/mermaid/MermaidSyncController.js](file://js/editors/mermaid/MermaidSyncController.js#L9-L93)
- [index.html](file://index.html#L532-L557)

**Section sources**
- [js/utils.js](file://js/utils.js#L165-L177)
- [js/editors/mermaid/MermaidSyncController.js](file://js/editors/mermaid/MermaidSyncController.js#L1-L93)
- [index.html](file://index.html#L532-L557)

### State Management Strategies
- Local React state: App manages diagram type, detected model, text input, preview URL, stats, loading, errors, cursor position, view mode, and template modal visibility.
- Editor refs: Imperative methods on MonacoWrapper coordinate with App state.
- Visual editor state: BPMN visual editor maintains internal modeler state and syncs XML back to code.
- **Enhanced**: Update system state: UpdateManager maintains available updates, test results, and loading states with subscription-based notifications and comprehensive error handling.

```mermaid
stateDiagram-v2
[*] --> CodeView
CodeView --> VisualView : "Switch to Design"
VisualView --> CodeView : "Switch to Code"
CodeView --> CodeView : "Edit + Debounce + Preview"
VisualView --> VisualView : "Edit + Sync Controller"
[*] --> UpdatePanel
UpdatePanel --> Checking : "Check for Updates"
UpdatePanel --> Testing : "Test Selected"
UpdatePanel --> Downloading : "Apply Updates"
```

**Diagram sources**
- [index.html](file://index.html#L1398-L1751)
- [js/editors/bpmn/BpmnVisualEditor.js](file://js/editors/bpmn/BpmnVisualEditor.js#L14-L91)
- [js/update-manager.js](file://js/update-manager.js#L23-L58)

**Section sources**
- [index.html](file://index.html#L1398-L1751)
- [js/editors/bpmn/BpmnVisualEditor.js](file://js/editors/bpmn/BpmnVisualEditor.js#L1-L106)
- [js/update-manager.js](file://js/update-manager.js#L1-L461)

### Integration Patterns for External Libraries and CDNs
- React and ReactDOM loaded from CDN; Babel standalone enables JSX without build step.
- Monaco AMD loader configured to load from CDN; language providers registered post-load.
- bpmn-js dynamically loaded and initialized; CSS assets injected.
- Mermaid AST loaded as an ES module; event-driven readiness.
- Pako for zlib compression used in encoding.
- **Enhanced**: Library update system integrates with CDN APIs for version checking and automated updates with comprehensive validation.

```mermaid
graph TB
CDN["CDN Scripts"] --> R["React + ReactDOM"]
CDN --> B["Babel Standalone"]
CDN --> M["Monaco Loader"]
CDN --> PJ["bpmn-js"]
CDN --> PA["Mermaid AST (ESM)"]
CDN --> P["Pako"]
US["Update System"] --> CV["CDN Version APIs"]
US --> HT["HTML Rewriter"]
```

**Diagram sources**
- [index.html](file://index.html#L8-L59)
- [js/utils.js](file://js/utils.js#L116-L158)
- [js/editors/bpmn/BpmnVisualEditor.js](file://js/editors/bpmn/BpmnVisualEditor.js#L20-L30)
- [js/library-registry.js](file://js/library-registry.js#L16-L228)

**Section sources**
- [index.html](file://index.html#L1-L80)
- [js/utils.js](file://js/utils.js#L116-L158)
- [js/editors/bpmn/BpmnVisualEditor.js](file://js/editors/bpmn/BpmnVisualEditor.js#L1-L106)
- [js/library-registry.js](file://js/library-registry.js#L1-L487)

### React Helpers, DOM Manipulation, and Lifecycle
- DOM manipulation: Components use refs to attach to containers and inject SVG content for interactive previews.
- Event handling: Click, contextmenu, drag-and-drop handlers; controlled input for inline editing.
- Lifecycle: Effects manage initialization, cleanup, and synchronization; debouncing prevents thrashing.

```mermaid
sequenceDiagram
participant Comp as "InteractiveSvgPreview"
participant DOM as "DOM Container"
Comp->>DOM : "innerHTML = svgContent"
DOM-->>Comp : "querySelectorAll('text/g')"
Comp->>Comp : "Attach click/context listeners"
Comp->>Comp : "useState/setElements on mount"
```

**Diagram sources**
- [js/components/PlantUmlComponents.js](file://js/components/PlantUmlComponents.js#L153-L214)

**Section sources**
- [js/components/PlantUmlComponents.js](file://js/components/PlantUmlComponents.js#L1-L249)
- [js/components/ui.js](file://js/components/ui.js#L1-L175)

### Specialized Editors
- BPMN Visual Editor: Dynamically loads bpmn-js, initializes modeler, listens for changes, and imports XML.
- Mermaid Editors: Dedicated editors for flowchart, sequence, pie, gantt, timeline, journey, mindmap; generic fallback with AST explorer.
- Mermaid Sync Controller: Debounces parsing, prevents sync loops, and renders AST back to code.

```mermaid
graph TB
B["BpmnVisualEditor"] --> BJ["bpmn-js Modeler"]
MFlow["MermaidFlowchartEditor"] --> AST["Mermaid AST"]
MSeq["MermaidSequenceEditor"] --> AST
MGnr["MermaidGenericEditor"] --> AST
Sync["MermaidSyncController"] --> AST
```

**Diagram sources**
- [js/editors/bpmn/BpmnVisualEditor.js](file://js/editors/bpmn/BpmnVisualEditor.js#L14-L91)
- [js/editors/mermaid/MermaidFlowchartEditor.js](file://js/editors/mermaid/MermaidFlowchartEditor.js#L10-L59)
- [js/editors/mermaid/MermaidSequenceEditor.js](file://js/editors/mermaid/MermaidSequenceEditor.js#L4-L36)
- [js/editors/mermaid/MermaidGenericEditor.js](file://js/editors/mermaid/MermaidGenericEditor.js#L11-L97)
- [js/editors/mermaid/MermaidSyncController.js](file://js/editors/mermaid/MermaidSyncController.js#L9-L93)

**Section sources**
- [js/editors/bpmn/BpmnVisualEditor.js](file://js/editors/bpmn/BpmnVisualEditor.js#L1-L106)
- [js/editors/mermaid/MermaidFlowchartEditor.js](file://js/editors/mermaid/MermaidFlowchartEditor.js#L1-L276)
- [js/editors/mermaid/MermaidSequenceEditor.js](file://js/editors/mermaid/MermaidSequenceEditor.js#L1-L110)
- [js/editors/mermaid/MermaidGenericEditor.js](file://js/editors/mermaid/MermaidGenericEditor.js#L1-L101)
- [js/editors/mermaid/MermaidSyncController.js](file://js/editors/mermaid/MermaidSyncController.js#L1-L93)

### Syntext Smith (Neuro-Symbolic AI)
Syntext Smith moves beyond simple LLM text generation by implementing a Neuro-Symbolic pipeline:
1.  **Semantic Parsing**: The LLM outputs a strict JSON AST based on a defined schema, not raw code.
2.  **Deterministic Compilation**: A rule-based compiler converts the AST into valid Diagram Code (Mermaid/BPMN).
3.  **Self-Correction**: A feedback loop validates generated code against parsers (e.g., `mermaid.parse`) and automatically feeds errors back to the LLM for correction.

```mermaid
graph LR
User -->|Prompt| LLM
LLM -->|JSON AST| Compiler
Compiler -->|Raw Code| Validator
Validator -->|Success| Editor
Validator -->|Error| FixLoop
FixLoop -->|Error + Code| LLM
```

**Section sources**
- [js/services/ai-service.js](file://js/services/ai-service.js)
- [js/services/diagram-compiler.js](file://js/services/diagram-compiler.js)

## Library Update Management System

### Enhanced Library Registry
The library registry serves as the central configuration hub for all CDN dependencies, providing comprehensive version tracking, URL patterns, and testing configurations with advanced dependency management.

**Key Features:**
- **Multi-CDN support**: Unpkg, CDNJS, ESM.sh, JSR, and Tailwind CSS with specialized handling
- **Version tracking**: Current versions and URL patterns for automatic updates with semantic version comparison
- **Testing configurations**: Complex libraries with CSS requirements, import maps, and visual validation
- **Peer dependency validation**: Automatic conflict detection and resolution for version compatibility
- **Linked versions**: React and ReactDOM versions synchronized automatically
- **Skip version checks**: Libraries using 'latest' tags or special cases
- **Enhanced parsing**: Sophisticated URL pattern matching and version extraction from HTML

**Updated** Enhanced dependency conflict detection with comprehensive validation and error reporting.

**Section sources**
- [js/library-registry.js](file://js/library-registry.js#L1-L487)

### CDN Version Checker
Integrates with multiple CDN APIs to fetch the latest versions of libraries with intelligent caching, error handling, and comprehensive version comparison.

**Supported Providers:**
- **Unpkg**: Package.json endpoint for npm packages with version extraction
- **CDNJS**: Official API with version field and metadata
- **ESM.sh**: Mirrors npm packages through npm registry with latest version detection
- **JSR**: jsr.io package metadata with scope-based package resolution
- **Tailwind**: Special case - CDN always serves latest with skip version check

**Features:**
- **5-minute cache TTL**: Performance optimization with intelligent caching strategy
- **Semantic version comparison**: Accurate version comparison with major/minor/patch detection
- **Major version detection**: Identifies breaking changes and warns users appropriately
- **Changelog URL generation**: Direct links to release notes and change logs
- **Error handling**: Graceful degradation when API calls fail

**Updated** Improved error handling and caching mechanisms for better reliability.

**Section sources**
- [js/cdn-version-checker.js](file://js/cdn-version-checker.js#L1-L270)

### Enhanced Update Manager
Orchestrates the complete library update workflow with comprehensive state management, testing, and HTML rewriting with advanced error handling and user interaction.

**Core Workflow:**
1. **Check for Updates**: Parse current HTML, fetch latest versions, filter available updates with intelligent selection logic
2. **Test Updates**: Validate URLs and test in sandboxed iframe with comprehensive error reporting
3. **Apply Updates**: Rewrite HTML, validate, and generate download with change tracking
4. **State Management**: Reactive updates with subscription pattern, localStorage persistence, and user preferences

**Enhanced State Management:**
- **Available updates**: Selection state with auto-selection for non-major updates
- **Test results**: Detailed pass/fail status with error messages and visual indicators
- **Loading states**: Comprehensive checking and testing progress indicators
- **History tracking**: localStorage persistence with truncation to prevent quota issues
- **Ignored updates**: User preference management with reasons and re-enabling capabilities
- **Subscription pattern**: Real-time UI updates with listener management

**Enhanced Features:**
- **Auto-selection logic**: Non-major, non-skipped updates are automatically selected
- **Ignored update management**: Persistent user preferences with reason tracking
- **Linked version updates**: Automatic updates for synchronized libraries (e.g., react-esm linked to react)
- **Comprehensive error handling**: Detailed error reporting with user-friendly messages
- **Time-based last check**: Human-readable timestamps for update freshness

**Section sources**
- [js/update-manager.js](file://js/update-manager.js#L1-L461)

### Advanced Update Tester
Provides comprehensive sandboxed testing for library updates using iframe isolation, visual validation, and sophisticated dependency management.

**Testing Capabilities:**
- **URL Validation**: HEAD requests to verify accessibility with CORS handling
- **Import Map Testing**: Complex libraries like Excalidraw with external dependencies and React integration
- **Visual Rendering**: Libraries that require DOM rendering for validation with timeout handling
- **Timeout Handling**: 20-second timeout for test completion with graceful failure reporting
- **Result Aggregation**: Detailed pass/fail reports with error messages and visual indicators
- **Dependency Conflict Testing**: Pre-validation of peer dependencies before testing

**Supported Libraries:**
- **Excalidraw**: Complex ESM module with React dependencies, CSS requirements, and visual validation
- **BPMN-JS**: Visual modeler testing with diagram instantiation and import validation
- **Monaco Editor**: AMD loader and editor initialization with configuration testing
- **React/ReactDOM**: Basic rendering validation with ESM fallback support
- **Pako**: Compression functionality verification with deflate testing
- **Dagre**: Graph library validation with graphlib testing
- **Babel**: Transpilation capability testing with preset validation
- **Mermaid AST**: ES module loading and AST parsing validation
- **HTM**: JSX-like syntax testing with template literal support
- **Tailwind CSS**: CDN availability testing with style application verification
- **Font Awesome**: Icon font loading and styling verification
- **React Flow**: CSS stylesheet validation and availability checking

**Enhanced Features:**
- **Pre-validation**: Dependency conflicts are checked before URL validation and testing
- **URL validation**: Comprehensive HEAD request testing with CORS handling
- **Visual testing**: Library-specific rendering validation with timeout management
- **Error aggregation**: Comprehensive error reporting with library-specific details
- **Console filtering**: Noise reduction in test results with favicon and 404 filtering

**Section sources**
- [js/update-tester.js](file://js/update-tester.js#L1-L706)

### Enhanced HTML Rewriter
Handles precise URL replacement in HTML with sophisticated pattern matching, validation, and comprehensive change tracking.

**Enhanced URL Pattern Matching:**
- **Unpkg**: `@version/` pattern in package@version/ paths with regex escaping
- **CDNJS**: `/package/version/` pattern in library paths with package name validation
- **ESM.sh**: `@version` pattern at end of package names with import map support

**Enhanced Features:**
- **Regex-based pattern matching**: Sophisticated URL pattern extraction with escape handling
- **Multiple URL replacement**: Support for additional URLs and CSS files per library
- **Change tracking**: Detailed summaries with library names, version changes, and counts
- **HTML validation**: Pre-download validation to prevent broken updates
- **Blob-based file download**: Secure file generation with proper MIME types
- **Escape regex handling**: Safe pattern construction to prevent regex injection

**Enhanced Capabilities:**
- **Pattern building**: Dynamic regex construction for different CDN types
- **Version replacement**: Accurate version string replacement with boundary detection
- **Change summarization**: Detailed change reports for user review
- **URL categorization**: CDN provider identification for accurate pattern matching

**Section sources**
- [js/html-rewriter.js](file://js/html-rewriter.js#L1-L274)

### Integration with Main Application
The update system is seamlessly integrated into the main application with a dedicated UI panel, React component subscriptions, and comprehensive user interaction.

**Enhanced Integration Points:**
- ES module import in index.html with global exposure and event dispatching
- React component with subscription-based state updates and real-time UI refresh
- Modal interface with progress indicators, detailed results display, and user controls
- Error handling with user-friendly messaging and recovery options
- Download workflow with generated HTML files and change summaries
- Update history tracking with localStorage persistence and human-readable timestamps

**Enhanced Features:**
- **Real-time updates**: Subscription-based state management with automatic UI refresh
- **User preferences**: Ignored updates with reasons and re-enabling capabilities
- **Update history**: Comprehensive logging with truncated HTML previews
- **Human-readable timestamps**: Time since last check with day/hour/minute/second formatting
- **Progress indicators**: Loading states for checking, testing, and downloading operations
- **Error recovery**: Comprehensive error handling with user guidance and retry options

**Section sources**
- [index.html](file://index.html#L117-L132)
- [index.html](file://index.html#L2200-L2397)

## Dependency Analysis
- Internal dependencies:
  - MonacoWrapper depends on React helpers, error diagnostics, and config for language mapping.
  - App orchestrates MonacoWrapper, visual editors, and diagnostics.
  - Specialized editors depend on shared UI components and utils.
  - **Enhanced**: Update system components depend on each other in a coordinated workflow with comprehensive error handling.
- External dependencies:
  - CDN-hosted React, ReactDOM, Babel, Monaco, bpmn-js, Mermaid AST, Pako.
  - **Enhanced**: CDN APIs for version checking (unpkg, cdnjs, npm registry, jsr.io) with caching and error handling.
  - **Enhanced**: Third-party services for library testing and validation with sandboxed iframe isolation.

```mermaid
graph TB
App["App (index.html)"] --> MW["MonacoWrapper"]
App --> BVE["BpmnVisualEditor"]
App --> ME["Mermaid Editors"]
App --> UPS["Enhanced Update System Panel"]
MW --> ED["Error Diagnostics"]
UPS --> LM["UpdateManager"]
LM --> CV["CDNVersionChecker"]
LM --> UT["UpdateTester"]
LM --> HR["HTMLRewriter"]
LM --> LR["Enhanced LibraryRegistry"]
CV --> LR
UT --> LR
HR --> LR
App --> CFG["Config"]
App --> Utils["Utils"]
App --> UI["UI Components"]
App --> PU["PlantUML Components"]
```

**Diagram sources**
- [index.html](file://index.html#L1398-L1751)
- [js/components/MonacoWrapper.js](file://js/components/MonacoWrapper.js#L1-L426)
- [js/editors/bpmn/BpmnVisualEditor.js](file://js/editors/bpmn/BpmnVisualEditor.js#L1-L106)
- [js/editors/mermaid/MermaidFlowchartEditor.js](file://js/editors/mermaid/MermaidFlowchartEditor.js#L1-L276)
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js#L1-L303)
- [js/config.js](file://js/config.js#L1-L566)
- [js/utils.js](file://js/utils.js#L1-L177)
- [js/components/ui.js](file://js/components/ui.js#L1-L175)
- [js/components/PlantUmlComponents.js](file://js/components/PlantUmlComponents.js#L1-L249)
- [js/update-manager.js](file://js/update-manager.js#L1-L461)
- [js/cdn-version-checker.js](file://js/cdn-version-checker.js#L1-L270)
- [js/update-tester.js](file://js/update-tester.js#L1-L706)
- [js/html-rewriter.js](file://js/html-rewriter.js#L1-L274)
- [js/library-registry.js](file://js/library-registry.js#L1-L487)

**Section sources**
- [index.html](file://index.html#L1398-L1751)
- [js/components/MonacoWrapper.js](file://js/components/MonacoWrapper.js#L1-L426)
- [js/editors/bpmn/BpmnVisualEditor.js](file://js/editors/bpmn/BpmnVisualEditor.js#L1-L106)
- [js/editors/mermaid/MermaidFlowchartEditor.js](file://js/editors/mermaid/MermaidFlowchartEditor.js#L1-L276)
- [js/error-diagnostics/index.js](file://js/error-diagnostics/index.js#L1-L303)
- [js/config.js](file://js/config.js#L1-L566)
- [js/utils.js](file://js/utils.js#L1-L177)
- [js/components/ui.js](file://js/components/ui.js#L1-L175)
- [js/components/PlantUmlComponents.js](file://js/components/PlantUmlComponents.js#L1-L249)
- [js/update-manager.js](file://js/update-manager.js#L1-L461)
- [js/cdn-version-checker.js](file://js/cdn-version-checker.js#L1-L270)
- [js/update-tester.js](file://js/update-tester.js#L1-L706)
- [js/html-rewriter.js](file://js/html-rewriter.js#L1-L274)
- [js/library-registry.js](file://js/library-registry.js#L1-L487)

## Performance Considerations
- Debouncing: Applied to Mermaid AST parsing and preview fetching to reduce network and CPU usage.
- Lazy loading: Visual editors and libraries are loaded on demand to minimize initial payload.
- Efficient Monaco updates: Imperative setValue and deltaDecorations used to avoid full re-renders.
- CDN caching: Leveraging CDN-hosted libraries improves load times and reduces bandwidth.
- **Enhanced**: Update system caching: 5-minute TTL for version checks to minimize API calls with intelligent error handling.
- **Enhanced**: Sandbox testing: Isolated iframe testing prevents DOM pollution and improves reliability with timeout management.
- **Enhanced**: Incremental HTML rewriting: Only modified URLs are replaced, reducing processing overhead with comprehensive validation.
- **Enhanced**: Subscription-based state management: Efficient UI updates with minimal re-renders and optimal memory usage.

## Troubleshooting Guide
- Monaco AMD conflicts: Dynamic script loader temporarily removes window.define to avoid conflicts; restores it on load/error.
- Error markers: If markers do not appear, verify diagram type mapping and ensure error providers are registered.
- Visual editor failures: Check console logs for bpmn-js load errors; ensure CORS allows external CSS/JS.
- Encoding issues: If preview fails, confirm encodeKroki returns a non-empty string and URL length does not exceed GET limits.
- **Enhanced**: Update system failures: Check browser console for update system errors; verify CDN accessibility for version checking with detailed error messages.
- **Enhanced**: Test failures: Review test results in update panel; check sandbox iframe for rendering errors with specific library details.
- **Enhanced**: HTML rewrite issues: Verify generated HTML validates; check for blocked downloads or security restrictions with change summaries.
- **Enhanced**: Dependency conflicts: Review peer dependency validation errors; ensure compatible versions are selected for synchronized libraries.
- **Enhanced**: Ignored updates: Check localStorage for ignored updates with reasons; use unignore functionality to re-enable updates.

**Section sources**
- [js/utils.js](file://js/utils.js#L116-L146)
- [js/components/MonacoWrapper.js](file://js/components/MonacoWrapper.js#L309-L423)
- [js/editors/bpmn/BpmnVisualEditor.js](file://js/editors/bpmn/BpmnVisualEditor.js#L63-L75)
- [js/update-manager.js](file://js/update-manager.js#L94-L97)
- [js/update-tester.js](file://js/update-tester.js#L427-L438)

## Conclusion
The Universal Diagram Editor combines a CDN-first architecture with modular React components and a powerful Monaco-based editor. Its error diagnostics system, dynamic loading utilities, and specialized editors deliver a robust authoring experience across multiple diagram types. The enhanced comprehensive library update management system represents a significant architectural advancement, providing automated dependency version tracking, sophisticated sandboxed testing, and safe HTML rewriting capabilities with comprehensive error handling and user interaction. This system ensures the application stays current with library updates while maintaining stability and preventing breaking changes through comprehensive validation, testing workflows, and dependency conflict resolution. The design emphasizes extensibility (configuration-driven), maintainability (modular JS), and usability (imperative editor APIs, quick fixes, and hover explanations), now augmented with automated dependency management for long-term sustainability and enhanced user experience through comprehensive state management and real-time updates.