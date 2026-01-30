# Visual Editor Strategy

## Overview
This document records the evaluation and decision-making process regarding the visual editor ecosystem for the Universal Diagram Editor, specifically focusing on the libraries provided by Synergy Codes.

## Analysis of Alternatives

### 1. `@synergycodes/overflow-ui`
*   **Type**: React Component Library.
*   **Technology**: React, TypeScript, CSS Variables.
*   **Purpose**: Provides specialized UI components (NodePanel, Handles, etc.) designed to work on top of React Flow (`@xyflow/react`).
*   **Fit**: **Perfect Match**.
    *   Our application uses React and React Flow.
    *   One of our editors (`SynergyC4Editor`) already utilizes this library successfully.
    *   It allows for custom editor construction without reinventing basic UI elements.

### 2. `@synergycodes/ng-diagram`
*   **Type**: Angular Library.
*   **Technology**: Angular (TypeScript).
*   **Purpose**: Creating interactive diagrams within Angular applications.
*   **Fit**: **Incompatible**.
    *   Our application is built on Vite + React.
    *   Integrating an Angular library would require significant architectural changes (Micro-frontends or iframes) with no tangible benefit over React alternatives.

### 3. `@synergycodes/workflowbuilder`
*   **Type**: High-level SDK / Product.
*   **Technology**: React SDK (built on top of `overflow-ui`).
*   **Purpose**: Rapid creation of *executable* workflow editors (e.g., Zapier-like automation builders with logic gates).
*   **Fit**: **Complementary / Specialized**.
    *   This is a higher-level abstraction than `overflow-ui`.
    *   It is ideal if the product roadmap shifts to "Workflow Automation" where users define logic that the backend executes.
    *   For general diagramming (C4, Entity Relationship, Freeform), it imposes too many constraints compared to building directly with `overflow-ui`.

## Decision

1.  **Standardize on `@synergycodes/overflow-ui`**: We will continue to use and enhance our implementation of this library for all React-based visual editors. It provides the right balance of pre-built UI and flexibility.
2.  **Reject `@synergycodes/ng-diagram`**: Removed from consideration due to technology stack mismatch.
3.  **Monitor `@synergycodes/workflowbuilder`**: We will not adopt this as a core dependency for now unless the product requirements specifically demand a robust "Automation Workflow" engine.

## Implementation Strategy
*   Refactor `SynergyC4Editor` to fully utilize `overflow-ui` capability.
*   Use `@synergycodes/axiom` (related library) to standardize toolbars and property panels across all editors (BPMN, Vega, C4).
