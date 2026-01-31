# Syntext Smith (formerly AI Copilot)

**Syntext Smith** is the intelligent assistant integrated into the Universal Diagram Generator. It leverages Neuro-Symbolic AI to help users generate, edit, and understand diagrams through natural language.

## Key Features

### 1. Neuro-Symbolic Generation
Unlike standard LLM chat interfaces, Syntext Smith uses a two-stage process:
1.  **Semantic Parsing**: Converts user intent into a strict JSON Abstract Syntax Tree (AST).
2.  **Deterministic Compilation**: Compiles the AST into valid diagram syntax (Mermaid, BPMN, PlantUML).
This approach ensures 100% runnable code by avoiding syntax hallucinations.

### 2. Self-Correction Loop
If the generated code fails validation (e.g., Mermaid syntax error), Syntext Smith automatically:
1.  Detects the error using client-side parsers or Kroki.
2.  Feeds the error back to the AI.
3.  Fixes the code without user intervention.
4.  Repeats up to 2 times to ensure success.

### 3. Interactive UI
-   **input Expansion**: Click "Expand" to enlarge the input area for drafting complex prompts.
-   **Values Suggestion Chips**: The AI proactively suggests next steps or specific values (e.g., diagram types) as clickable chips.
-   **Chat Timeline (Minimap)**: A subtle floating timeline on the right edge allows quick navigation through long conversations.
    -   **Blue Dots**: User messages.
    -   **Gray Dots**: AI responses.
    -   **Hover**: Preview message content.
    -   **Scrollable**: Automatically handles long histories without clutter.

## Usage

1.  **Open**: Click the "Syntext Smith" button in the header.
2.  **Prompt**: Type a request (e.g., "Create a sequence diagram for a login flow").
3.  **Refine**: Use the suggestion chips or follow-up prompts to adjust the result.
4.  **Apply**: Click "Apply Code" to insert the generated diagram into the editor.
