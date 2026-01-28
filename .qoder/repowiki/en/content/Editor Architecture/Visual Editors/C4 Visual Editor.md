# C4 Visual Editor

## Introduction
The C4 Visual Editor allows users to create Structurizr C4 models diagrammatically. The latest version, **SynergyEditor**, integrates high-performance UI components and advanced graph capabilities.

## Key Features
- **Synergy UI**: Utilizes `@synergycodes/overflow-ui` for professional-grade node aesthetics (`NodePanel`, `NodeIcon`, `NodeDescription`).
- **React Flow**: Core canvas management powered by `@xyflow/react`.
- **Advanced Auto-Layout**: Integrated **ELK** (Eclipse Layout Kernel) connection via `useAutoLayout` hook for hierarchical graph arrangement.
- **Smart Grouping**: 
    - Drag-and-drop grouping (nesting nodes).
    - Auto-movement: Children move with parents.
    - Shortcuts: `Cmd+G` (Group), `Cmd+Shift+G` (Ungroup).
- **Productivity Tools**:
    - **Smart Copy/Paste**: `Cmd+C`/`Cmd+V` supports copying entire hierarchies (Parent + Children).
    - **Undo/Redo**: Robust history management using `useUndoRedo`.
    - **Export**: Built-in generic PNG export.

## Architecture
- **SynergyEditor.jsx**: The core editor component. It manages the `nodes`, `edges`, and `reactFlowInstance`.
    - Wraps `ReactFlow` in a `div` to handle native HTML5 Drag and Drop events reliably.
- **SynergySidebar.jsx**: A custom sidebar using `NodePanel` previews as draggable items.
- **SynergyNode**: A unified component rendering different C4 types (Person, System, etc.) using data-driven styling.

## Implementation Details

### Drag and Drop (Crucial)
To avoid event capturing issues, the Drag and Drop implementation follows a specific pattern:
1.  **Sidebar**: Uses standard HTML5 `draggable={true}`.
    - `onDragStart`: Sets `event.dataTransfer` with:
        - `application/reactflow`: The node type (e.g., 'person').
        - `application/reactflow-label`: The default label.
2.  **Editor (Drop Zone)**:
    - The **Wrapper DIV** (surrounding `<ReactFlow>`) handles `onDrop` and `onDragOver`.
    - **Reasoning**: Attaching handlers directly to the `ReactFlow` component can sometimes lead to events being swallowed by internal canvas elements or prevent correct bubbling. The wrapper ensures the event is caught at the container level.
    - `onDragOver`: Must call `event.preventDefault()` AND `event.stopPropagation()` to ensure the browser allows the drop.

### Smart Grouping Logic
Grouping is handled via a custom `onNodesChange` handler (`onNodesChangeWithGrouping`):
- It intercepts `position` changes.
- If a **parent node** is dragged, it calculates the delta.
- It automatically creates dependent `position` updates for all children nodes (`data.parentId === parent.id`).
- This ensures visual consistency without relying on React Flow's native `parentNode` feature which acts as a coordinate system container (we use a flat coordinate system with manual sync for better control over layouting).

### ELK Auto-Layout
- Uses `elkjs` to calculate node positions.
- Runs on a web worker (implicitly or explicitly depending on setup) to prevent UI freezing.
- Triggered manually via the "Magic Layout" button.
