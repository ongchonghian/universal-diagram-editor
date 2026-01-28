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

## Future Enhancements

-   **Theming**: Support for dark mode in the toolbar.
-   **Contextual Menus**: Add support for dropdown menus in actions.
