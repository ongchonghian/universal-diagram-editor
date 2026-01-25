# Project Rules

> [!IMPORTANT]
> These rules must be followed by all agents working on this workspace.

## 1. Consulting Repowiki
**Before starting any implementation plan or executing tasks**, you MUST consult the documentation in `.qoder/repowiki/en`.
-   **Path**: `.qoder/repowiki/en/content`
-   **Purpose**: Contains the source of truth for project architecture, patterns, and guides.
-   **Action**: Read relevant files in this directory to understand the existing system before proposing changes.

## 2. Maintaining Repowiki
**When making key changes to the application**, you MUST update the Repowiki to reflect these changes.
-   **Key Changes Include**:
    -   New architectural patterns or components.
    -   New utilities or shared libraries.
    -   Changes to build/deployment workflows.
    -   Major refactors.
-   **Action**: Update existing markdown files in `.qoder/repowiki/en/content` or create new ones if a new domain is introduced. Ensure the documentation remains accurate and helpful for future agents.

## 3. Repowiki Structure
-   `content/`: Markdown files documenting the project.
-   `meta/`: Metadata for the wiki system.
