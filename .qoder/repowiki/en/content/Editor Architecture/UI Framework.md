# UI Architecture & Framework

This document outlines the standardized User Interface (UI) framework and patterns used in the Universal Diagram Editor.

## Overview

The application aims to provide a consistent and intuitive user experience across different diagram editor types (e.g., Vega, C4, Mermaid). To achieve this, we employ shared UI components and consistent layout patterns.

## Core Components

### EditorToolbar

The `EditorToolbar` is the primary component for standardizing editor headers. It provides a consistent location for titles, status badges, and common actions.

-   **Location**: `js/components/editors/common/EditorToolbar.jsx`
-   **Usage**: Should be placed at the top of every visual editor component.

#### Props

| Prop | Type | Description |
| :--- | :--- | :--- |
| `title` | `string` | The title of the editor (e.g., "Vega Editor"). |
| `subTitle` | `string` | Optional subtitle or badge (e.g., "Visual Mode"). |
| `onImport` | `function` | Handler for the standard "Import" action. |
| `onExport` | `function` | Handler for the standard "Export" action. |
| `onAutoLayout` | `function` | Handler for the standard "Auto Layout" action. |
| `actions` | `array` | Array of custom action objects `{ label, icon, onClick, primary }`. |
| `children` | `ReactNode` | Custom controls (like view toggles) to display in the left/center. |

#### Example

```jsx
import { EditorToolbar } from './common/EditorToolbar.jsx';

const MyEditor = () => {
    return (
        <div className="flex flex-col h-full">
            <EditorToolbar
                title="My Editor"
                onImport={handleImport}
                actions={[
                    { label: "Custom Action", icon: "fas fa-star", onClick: doSomething }
                ]}
            />
            <div className="flex-1">
                {/* Editor Content */}
            </div>
        </div>
    );
};
```

## Design Guidelines

1.  **Consistency**: Use `EditorToolbar` for all visual editors instead of creating custom headers.
2.  **Actions**:
    -   Group primary actions (like "Save" or specific editor modes) in the toolbar.
    -   Use the `primary: true` flag for the main call-to-action in `actions`.
3.  **Layout**: Ensure the editor container uses `flex-col` so the toolbar stays at the top and content fills the remaining space.

## Toolbar Principles

To ensure a clear separation of concerns, follow these principles when deciding where to place a button or function:

### 1. Global App Header (Top Bar)
*   **Scope**: Document-level. Actions here affect the entire file or application state.
*   **Examples**:
    *   **I/O**: Open file, Save file.
    *   **Global Export**: SVG, PNG (generated from the code source of truth).
    *   **View Modes**: Switching between Code and Design views.
    *   **Help & Settings**: Documentation, Update checks.
*   **Disabled State**: Buttons here (like SVG/PNG export) should be disabled if the source code is invalid or cannot be compiled by the backend service.

### 2. Editor Toolbar (Local Component)
*   **Scope**: Context-specific. Actions here apply to the *active visual editor* and its internal state.
*   **Examples**:
    *   **Canvas Operations**: Auto Layout, Reset View.
    *   **Data Injection**: Import Data (CSV/JSON into a chart), unrelated to opening the diagram file itself.
    *   **Visual-Specific Export**: "Save to Diagram" (converting visual state to code), or exporting a specific visual artifact that doesn't rely on the global compiler.
    *   **View Toggles**: Switching sub-views (e.g., Chart Preview vs Data Explorer).

## Future Enhancements

-   **Theming**: Support for dark mode in the toolbar.
-   **Contextual Menus**: Add support for dropdown menus in actions.
