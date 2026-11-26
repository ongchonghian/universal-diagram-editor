# Advanced Features

<cite>
**Referenced Files in This Document**
- [index.html](file://index.html)
- [mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [MermaidEditors.jsx](file://js/components/editors/mermaid/MermaidEditors.jsx)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js)
- [error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js)
- [error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js)
- [react-helpers.js](file://js/react-helpers.js)
- [utils.js](file://js/utils.js)
- [ui.js](file://js/components/ui.js)
- [update-manager.js](file://js/update-manager.js)
- [update-tester.js](file://js/update-tester.js)
- [library-registry.js](file://js/library-registry.js)
- [cdn-version-checker.js](file://js/cdn-version-checker.js)
- [html-rewriter.js](file://js/html-rewriter.js)
</cite>

## Update Summary
**Changes Made**
- Added comprehensive documentation for the new library update management system
- Documented sophisticated dependency version tracking and automated update workflow
- Added detailed coverage of the iframe-based testing framework for library updates
- Included advanced features for CDN version checking, HTML rewriting, and update validation
- Enhanced architecture overview to include the complete update management pipeline

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
11. [Appendices](#appendices)

## Introduction
This document explains the advanced features and technical implementations powering the diagramming platform, with a focus on:
- Bi-directional synchronization between code and visual modes using Mermaid AST
- Change detection, debouncing, and state management to prevent infinite loops
- Real-time preview generation via Kroki, with debounced requests (blob URLs are used only for downloads)
- Conflict resolution between code and visual modes
- Advanced editor features: cursor tracking, error highlighting, syntax validation, and quick fixes
- **NEW: Sophisticated library update management system with automated dependency version tracking**
- **NEW: Advanced iframe-based testing framework for safe library updates**
- Performance optimizations: memory management, debouncing, caching, and a Vite build
- Extensibility points for power users and developers

## Project Structure
The application is a single-page app built with React and Monaco Editor and bundled by Vite. It has a Mermaid visual editor (Beta) and robust error diagnostics. The new update management system integrates seamlessly with the existing architecture.

```mermaid
graph TB
subgraph "Browser Runtime"
A["index.html<br/>Vite shell, CDN scripts + Mermaid AST module"]
B["Monaco Editor"]
C["React + JSX (Vite build)"]
end
subgraph "Mermaid Editors"
D["MermaidVisualEditor<br/>(router)"]
D1["MermaidFlowchartEditor<br/>(placeholder)"]
D2["MermaidSequenceEditor<br/>(placeholder)"]
D3["MermaidPieEditor (working)<br/>Gantt, Timeline, Journey, Mindmap (placeholders)"]
D4["Universal Mode fallback"]
end
subgraph "Synchronization"
E["MermaidSyncController"]
end
subgraph "Diagnostics"
F["error-diagnostics/index.js"]
F1["fixes.js"]
F2["explanations.js"]
end
subgraph "Update Management System"
G["Update Manager<br/>(orchestrates updates)"]
G1["Library Registry<br/>(dependency tracking)"]
G2["CDN Version Checker<br/>(API integration)"]
G3["Update Tester<br/>(iframe sandbox)"]
G4["HTML Rewriter<br/>(URL manipulation)"]
end
subgraph "Utilities"
H["utils.js"]
I["react-helpers.js"]
J["ui.js"]
end
A --> C
C --> D
D --> D1
D --> D2
D --> D3
D --> D4
C --> E
C --> B
C --> F
F --> F1
F --> F2
C --> G
G --> G1
G --> G2
G --> G3
G --> G4
C --> H
C --> I
C --> J
```

**Diagram sources**
- [index.html](file://index.html)
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L13-L44)
- [utils.js](file://js/utils.js#L14-L28)
- [react-helpers.js](file://js/react-helpers.js#L4-L39)
- [ui.js](file://js/components/ui.js#L16-L66)
- [update-manager.js](file://js/update-manager.js#L1-L343)
- [library-registry.js](file://js/library-registry.js#L1-L409)
- [cdn-version-checker.js](file://js/cdn-version-checker.js)
- [update-tester.js](file://js/update-tester.js#L1-L505)
- [html-rewriter.js](file://js/html-rewriter.js)

**Section sources**
- [index.html](file://index.html)
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L13-L44)
- [utils.js](file://js/utils.js#L14-L28)
- [react-helpers.js](file://js/react-helpers.js#L4-L39)
- [ui.js](file://js/components/ui.js#L16-L66)
- [update-manager.js](file://js/update-manager.js#L1-L343)
- [library-registry.js](file://js/library-registry.js#L1-L409)
- [cdn-version-checker.js](file://js/cdn-version-checker.js)
- [update-tester.js](file://js/update-tester.js#L1-L505)
- [html-rewriter.js](file://js/html-rewriter.js)

## Core Components
- Mermaid AST synchronization controller: central state machine for bi-directional sync, debouncing, and loop prevention
- Mermaid visual editor router: routes to a sub-editor by the detected model name, or shows the Universal Mode fallback
- Sub-editors (in `MermaidEditors.jsx`): only the pie editor edits the diagram; the flowchart, sequence, Gantt, timeline, journey and mindmap editors are placeholders that point the user to the code editor
- Error diagnostics: structured error parsing, fix suggestions, and human-readable explanations
- **NEW: Library update management system: comprehensive dependency version tracking and automated update workflow**
- **NEW: Update tester: iframe-based sandbox testing for safe library updates**
- Utilities: model detection, regex escaping, script/CSS loaders, and debounce helpers (Kroki compression lives in the renderer adapter)
- UI primitives: reusable buttons, badges, loaders, and editable fields

**Section sources**
- [mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [MermaidEditors.jsx](file://js/components/editors/mermaid/MermaidEditors.jsx)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L13-L44)
- [error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L332-L366)
- [error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js#L237-L271)
- [update-manager.js](file://js/update-manager.js#L1-L343)
- [update-tester.js](file://js/update-tester.js#L1-L505)
- [library-registry.js](file://js/library-registry.js#L1-L409)
- [utils.js](file://js/utils.js#L14-L28)
- [react-helpers.js](file://js/react-helpers.js#L4-L39)
- [ui.js](file://js/components/ui.js#L16-L66)

## Architecture Overview
The system integrates three pillars:
- AST-based synchronization: parse code to AST (live) and render AST back to code (available in the controller, but not yet called by any sub-editor)
- Real-time preview pipeline: debounce user input, call Kroki through the renderer adapter, show the returned SVG
- Error diagnostics and quick fixes: parse errors, suggest fixes, and present explanations
- **NEW: Library update management pipeline: automated dependency version tracking and safe update application**

```mermaid
sequenceDiagram
participant U as "User"
participant M as "Monaco Editor"
participant ST as "useDiagramState"
participant SC as "MermaidSyncController"
participant AST as "Mermaid AST"
participant RR as "useRemoteRenderer"
participant KR as "Kroki API"
U->>M : "Edit code"
M->>ST : "onChange(code)"
ST->>SC : "parseCode(code)"
SC->>AST : "parse(code)"
AST-->>SC : "ast"
SC-->>ST : "ast"
ST->>RR : "textInput"
RR->>KR : "Request SVG (debounced 500 ms)"
KR-->>RR : "SVG"
RR-->>U : "Preview panel update"
Note over ST,SC : "renderToCode(ast) sets and resets changeSource, but no sub-editor calls it today"
Note over U,G : "Library Update Workflow"
U->>G : "Check for Updates"
G->>G2 : "Query CDN APIs"
G2-->>G : "Latest versions"
G->>G3 : "Test selected updates"
G3-->>G : "Test results"
G->>G4 : "Apply updates to HTML"
G4-->>U : "Download updated HTML"
```

**Diagram sources**
- [mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [index.html](file://index.html)
- [update-manager.js](file://js/update-manager.js#L63-L98)
- [cdn-version-checker.js](file://js/cdn-version-checker.js#L191-L214)
- [update-tester.js](file://js/update-tester.js#L398-L444)
- [html-rewriter.js](file://js/html-rewriter.js#L66-L99)

## Detailed Component Analysis

### Mermaid AST Synchronization Controller
The controller encapsulates:
- AST state and change-source tracking to avoid infinite loops
- Debounced parsing from code to AST
- AST rendering back to code for visual-mode edits
- MermaidAST readiness checks (diagram model detection is a separate function, `detectSpecificModel` in `utils.js`)

```mermaid
classDiagram
class MermaidSyncController {
-ast
-changeSource
-debounceTimer
+parseCode(code, onSuccess, onError)
+renderToCode(updatedAst) string|null
+getAst() Object|null
+isLoaded() boolean
}
```

**Diagram sources**
- [mermaid/utils.js](file://js/components/editors/mermaid/utils.js)

Key behaviors:
- Debounce parsing to reduce redundant AST computations
- Prevent re-entry when change originates from visual edits
- Reset changeSource asynchronously to allow subsequent code changes

**Section sources**
- [mermaid/utils.js](file://js/components/editors/mermaid/utils.js)

### Mermaid Visual Editor Router and Preview Pipeline
The router (`MermaidVisualEditor`):
- Shows a "Loading visual editor..." spinner until the Mermaid AST library has loaded
- Routes to a sub-editor by the detected model name (Flowchart, Sequence, Pie, Gantt, Timeline, Journey, Mindmap)
- Shows the Universal Mode fallback for any other model
- Passes only `code` and `onChange` to the sub-editor

The preview pipeline is separate and lives in `useRemoteRenderer`:
- Debounces code changes by 500 ms
- Requests the SVG from Kroki through the renderer adapter (GET, or POST when the URL exceeds 4000 characters)
- Stores the SVG for the preview panel and for the SVG and PNG downloads

```mermaid
flowchart TD
Start(["Code change"]) --> Debounce["Debounce 500ms"]
Debounce --> Fetch["Request SVG from Kroki"]
Fetch --> Ok{"Response OK?"}
Ok --> |Yes| Svg["Set svgContent and previewImage"]
Ok --> |No| Error["Set previewError and editor markers"]
Svg --> End(["Render preview"])
Error --> End
```

**Diagram sources**
- [useRemoteRenderer.js](file://js/hooks/useRemoteRenderer.js)
- [RendererAdapter.js](file://js/services/RendererAdapter.js)

**Section sources**
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [useRemoteRenderer.js](file://js/hooks/useRemoteRenderer.js)

### Flowchart Editor: Placeholder
The flowchart editor (`MermaidFlowchartEditor`):
- Shows a "Flowchart Editor: interactive node editing coming soon" note
- Shows the "Code-Only Editing" message from `VisualEditingNotAvailable`
- Does not edit nodes or edges; flowcharts are edited in the code editor

```mermaid
sequenceDiagram
participant R as "MermaidVisualEditor"
participant V as "MermaidFlowchartEditor"
participant U as "User"
R->>V : "code, onChange"
V-->>U : "Coming-soon note + Code-Only Editing message"
U->>U : "Edits flowchart in the code editor"
```

**Diagram sources**
- [MermaidEditors.jsx](file://js/components/editors/mermaid/MermaidEditors.jsx)

**Section sources**
- [MermaidEditors.jsx](file://js/components/editors/mermaid/MermaidEditors.jsx)

### Sequence Editor: Placeholder
The sequence editor (`MermaidSequenceEditor`) returns the "Code-Only Editing" message. Participants and messages are edited in the code editor.

**Section sources**
- [MermaidEditors.jsx](file://js/components/editors/mermaid/MermaidEditors.jsx)

### Data-Chart Editors: Pie, Gantt, Timeline, Mindmap, Journey
These editors are in `MermaidEditors.jsx`:
- `MermaidPieEditor` reads the title and slices from the code with regular expressions, lets the user edit the title, labels and values and add or remove a slice, and writes the regenerated pie code through `onChange`
- `MermaidGanttEditor`, `MermaidTimelineEditor`, `MermaidJourneyEditor` and `MermaidMindmapEditor` are one-line placeholders that return the "Code-Only Editing" message

**Section sources**
- [MermaidEditors.jsx](file://js/components/editors/mermaid/MermaidEditors.jsx)

### Universal Mode Fallback
For any diagram model without a sub-editor, `MermaidVisualEditor` shows a "Universal Mode" panel:
- Says "Visual editing for this diagram type is generic. Structure editing is best done via code."
- Has no AST explorer, preview panel or property panel
- Keeps the editor toolbar titled "<model> Editor" with the sub-title "Visual Mode (Beta)"

**Section sources**
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)

### Error Diagnostics: Parsing, Fix Suggestions, and Explanations
The diagnostics system:
- Parses raw error text to extract line/column and categorize errors
- Provides Monaco-compatible markers and quick-fix actions
- Supplies human-readable explanations with examples and links

```mermaid
flowchart TD
E0["Raw error text"] --> E1["extractLocation()"]
E1 --> E2["categorizeError()"]
E2 --> E3["Assign error code"]
E3 --> E4["getFixSuggestions()"]
E4 --> E5["toMonacoMarker()"]
E4 --> E6["toMonacoCodeAction()"]
E2 --> E7["getErrorExplanation()"]
E7 --> E8["formatForHover()"]
```

**Diagram sources**
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L13-L44)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L52-L145)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L153-L254)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L261-L298)
- [error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L332-L366)
- [error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js#L237-L271)

**Section sources**
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L13-L44)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L52-L145)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L153-L254)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L261-L298)
- [error-diagnostics/fixes.js](file://js/error-diagnostics/fixes.js#L332-L366)
- [error-diagnostics/explanations.js](file://js/error-diagnostics/explanations.js#L237-L271)

### Utilities and Helpers
- Compression for Kroki URLs (in the renderer adapter, `js/services/RendererAdapter.js`)
- Regex escaping and debounce helpers
- Script/CSS loaders with AMD compatibility handling
- React helpers (`react-helpers.js`) that bind htm tagged templates to React for the older components

**Section sources**
- [utils.js](file://js/utils.js#L14-L28)
- [utils.js](file://js/utils.js#L107-L110)
- [utils.js](file://js/utils.js#L166-L176)
- [utils.js](file://js/utils.js#L116-L146)
- [react-helpers.js](file://js/react-helpers.js#L4-L39)
- [ui.js](file://js/components/ui.js#L16-L66)

## Library Update Management System

### Overview
The library update management system provides a sophisticated solution for tracking and updating CDN dependencies across the application. It features automated version checking, safe testing in sandboxed environments, and comprehensive update validation.

```mermaid
classDiagram
class UpdateManager {
-availableUpdates : Array
-testResults : Object
-isChecking : boolean
-isTesting : boolean
-listeners : Set
+checkForUpdates() Promise~Array~
+testSelectedUpdates() Promise~Object~
+applyUpdates() Promise~Object~
+toggleUpdate(id) void
+subscribe(callback) Function
+getState() Object
}
class LibraryRegistry {
+LIBRARY_REGISTRY : Object
+CDN_TYPES : Object
+getCheckableLibraries() Array
+buildLibraryUrl(id, version) string
+compareVersions(v1, v2) number
+isMajorUpdate(current, new) boolean
}
class CDNVersionChecker {
+checkAllUpdates(options) Promise~Array~
+checkLibraryVersion(library, actualVersion) Promise~Object~
+getChangelogUrl(library) string
}
class UpdateTester {
+testLibraryUpdates(updates) Promise~Object~
+validateUrls(updates) Promise~Object~
+testSingleLibraryUpdate(id, version) Promise~Object~
}
class HtmlRewriter {
+updateLibraryUrls(html, updates) Object
+downloadUpdatedHtml(html, filename) void
+generateChangeSummary(changes) string
+validateHtml(html) Object
}
UpdateManager --> LibraryRegistry
UpdateManager --> CDNVersionChecker
UpdateManager --> UpdateTester
UpdateManager --> HtmlRewriter
```

**Diagram sources**
- [update-manager.js](file://js/update-manager.js#L23-L335)
- [library-registry.js](file://js/library-registry.js#L15-L228)
- [cdn-version-checker.js](file://js/cdn-version-checker.js#L191-L214)
- [update-tester.js](file://js/update-tester.js#L398-L444)
- [html-rewriter.js](file://js/html-rewriter.js#L66-L99)

### Key Features

#### Automated Version Tracking
The system automatically tracks library versions from HTML content and compares them against CDN APIs to identify available updates.

**Section sources**
- [library-registry.js](file://js/library-registry.js#L297-L345)
- [cdn-version-checker.js](file://js/cdn-version-checker.js#L141-L182)

#### Safe Testing Framework
Before applying updates, the system tests library versions in isolated iframe sandboxes to ensure compatibility and proper functionality.

**Section sources**
- [update-tester.js](file://js/update-tester.js#L398-L444)
- [update-tester.js](file://js/update-tester.js#L19-L362)

#### Comprehensive Update Validation
The system validates HTML integrity, performs URL accessibility checks, and generates detailed change summaries before downloading updated files.

**Section sources**
- [html-rewriter.js](file://js/html-rewriter.js#L240-L264)
- [update-tester.js](file://js/update-tester.js#L458-L497)

#### Major Version Detection
The system identifies major version changes and flags them appropriately to prevent breaking updates.

**Section sources**
- [library-registry.js](file://js/library-registry.js#L382-L394)
- [cdn-version-checker.js](file://js/cdn-version-checker.js#L219-L228)

### Update Workflow Process

```mermaid
flowchart TD
A["User clicks Check for Updates"] --> B["Fetch current HTML"]
B --> C["Parse actual versions from HTML"]
C --> D["Query CDN APIs for latest versions"]
D --> E{"Has update available?"}
E --> |Yes| F["Add to available updates"]
E --> |No| G["Skip library"]
F --> H["Filter ignored updates"]
H --> I["Auto-select non-major updates"]
I --> J["Display update panel"]
J --> K["User selects updates"]
K --> L["Test selected updates in sandbox"]
L --> M{"All tests pass?"}
M --> |Yes| N["Generate change summary"]
M --> |No| O["Show test failures"]
N --> P["Apply updates to HTML"]
P --> Q["Validate HTML integrity"]
Q --> R["Download updated HTML"]
```

**Diagram sources**
- [update-manager.js](file://js/update-manager.js#L63-L98)
- [update-manager.js](file://js/update-manager.js#L103-L153)
- [update-manager.js](file://js/update-manager.js#L158-L197)

**Section sources**
- [update-manager.js](file://js/update-manager.js#L63-L197)

## Dependency Analysis
High-level dependencies:
- index.html loads Mermaid AST module and initializes window.MermaidAST
- `useDiagramState` depends on MermaidSyncController and passes the code, detected model and AST-loaded flag to MermaidVisualEditor
- Sub-editors depend on the code they receive (the pie editor regenerates the code; the others are placeholders)
- Error diagnostics depend on Monaco markers and code actions
- **NEW: Update system components depend on each other in a coordinated workflow**
- Utilities support compression, debouncing, and dynamic asset loading

```mermaid
graph LR
IDX["index.html"] --> AST["window.MermaidAST"]
IDX --> MON["Monaco Editor"]
IDX --> REACT["React (Vite build)"]
REACT --> HOOK["useDiagramState"]
HOOK --> MSC["MermaidSyncController"]
REACT --> MVE["MermaidVisualEditor"]
MVE --> ED1["FlowchartEditor (placeholder)"]
MVE --> ED2["SequenceEditor (placeholder)"]
MVE --> ED3["Pie editor + placeholders"]
MVE --> EDF["Universal Mode fallback"]
REACT --> ERR["Error Diagnostics"]
REACT --> UTM["Update Manager"]
UTM --> LR["Library Registry"]
UTM --> CVC["CDN Version Checker"]
UTM --> UT["Update Tester"]
UTM --> HR["HTML Rewriter"]
REACT --> UTL["Utils"]
REACT --> UI["UI Components"]
```

**Diagram sources**
- [index.html](file://index.html)
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L13-L44)
- [update-manager.js](file://js/update-manager.js#L1-L343)
- [library-registry.js](file://js/library-registry.js#L1-L409)
- [cdn-version-checker.js](file://js/cdn-version-checker.js)
- [update-tester.js](file://js/update-tester.js#L1-L505)
- [html-rewriter.js](file://js/html-rewriter.js)
- [utils.js](file://js/utils.js#L14-L28)
- [ui.js](file://js/components/ui.js#L16-L66)

**Section sources**
- [index.html](file://index.html)
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L13-L44)
- [update-manager.js](file://js/update-manager.js#L1-L343)
- [library-registry.js](file://js/library-registry.js#L1-L409)
- [cdn-version-checker.js](file://js/cdn-version-checker.js)
- [update-tester.js](file://js/update-tester.js#L1-L505)
- [html-rewriter.js](file://js/html-rewriter.js)
- [utils.js](file://js/utils.js#L14-L28)
- [ui.js](file://js/components/ui.js#L16-L66)

## Performance Considerations
- Memory management
  - Revoke object URLs after use to prevent memory leaks (the download helpers create and revoke them)
  - Clear Monaco markers and decorations when switching contexts
  - **NEW: Manage iframe sandbox memory for update testing**
- Debouncing
  - Debounce AST parsing and preview generation to reduce redundant work
  - Debounce preview fetches to limit network calls
  - **NEW: Cache CDN version checks to reduce API calls**
- Lazy loading
  - Dynamically load external scripts and CSS only when needed
  - Initialize Monaco and visual editors on demand
  - **NEW: Load update system components on-demand for better performance**
- Bundle size optimization
  - Vite bundles the npm packages; a few libraries (Monaco loader, Mermaid AST, pako, dagre) load from CDNs
  - **NEW: Minimize update system bundle size with selective imports**
- Caching
  - The preview reuses the last SVG until the debounced request returns
  - The sync controller keeps the latest parsed AST in memory
  - **NEW: Cache CDN version responses for 5 minutes to improve performance**

## Troubleshooting Guide
- Infinite sync loops
  - Ensure changeSource is set when rendering from visual mode and reset asynchronously
- Missing MermaidAST
  - Check MermaidAST readiness before parsing or rendering
- Preview not updating
  - Confirm the 500 ms debounce has elapsed and read the preview error message from the renderer
- Error markers not appearing
  - Verify Monaco language registration and provider registration
  - Ensure markers are attached to the correct model and diagnostic code matches
- **NEW: Update system issues**
  - **CDN API failures**: Check network connectivity and CDN availability
  - **Test failures**: Review iframe sandbox errors and library compatibility
  - **HTML validation errors**: Verify generated HTML structure and syntax
  - **Version parsing issues**: Check library registry configuration and URL patterns

**Section sources**
- [mermaid/utils.js](file://js/components/editors/mermaid/utils.js)
- [MermaidVisualEditor.jsx](file://js/components/editors/mermaid/MermaidVisualEditor.jsx)
- [error-diagnostics/index.js](file://js/error-diagnostics/index.js#L261-L298)
- [update-manager.js](file://js/update-manager.js#L93-L97)
- [update-tester.js](file://js/update-tester.js#L427-L438)
- [html-rewriter.js](file://js/html-rewriter.js#L240-L264)

## Conclusion
The platform combines AST-driven synchronization, real-time previews, and intelligent diagnostics to deliver a seamless authoring experience. Its architecture emphasizes correctness (loop prevention), responsiveness (debouncing), and efficiency (revoked download URLs, a Vite bundle, and a few CDN scripts). **The new library update management system adds powerful automation capabilities for dependency version tracking and safe updates, while the iframe-based testing framework ensures compatibility and stability.** Developers can extend editors, add new diagram types, integrate additional diagnostics, and leverage the comprehensive update system for maintaining modern, secure dependencies.

## Appendices

### Advanced Usage Scenarios and Power User Tips
- Visual-to-code editing
  - Use the pie editor to edit slices; it regenerates the pie code. Edit other Mermaid types in the code editor
- Quick fixes
  - Apply Monaco quick fixes to add missing declarations or brackets
- Cursor tracking
  - Monaco's cursor change callback reports the cursor position, which the app uses to work out the diagram context for snippets
- Error explanations
  - Hover over markers to see contextual help with examples and documentation links
- **NEW: Library updates**
  - **Use the update panel to check for and apply library updates safely**
  - **Review test results before applying major version updates**
  - **Monitor update history and manage ignored updates**
  - **Leverage changelog links to understand breaking changes**