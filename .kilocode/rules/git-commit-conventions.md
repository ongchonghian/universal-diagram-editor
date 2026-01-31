## Brief overview

This rule defines the standard for generating git commit messages when working with this project. All commit messages must follow the Conventional Commits specification with semantic analysis of staged changes to ensure accurate, descriptive, and consistent commit history.

## Commit message format

- Follow the Conventional Commits specification (`<type>(<scope>): <description>`)
- Use imperative mood in the summary (e.g., "add feature" not "added feature")
- Keep summary under 50 characters when possible (hard limit: 72 characters)
- Include a blank line followed by a detailed body when changes are complex, breaking, or require additional context
- Do not infer commit messages from filenames alone—always analyze the actual diff content

## Commit types

- `feat` — New features or capabilities
- `fix` — Bug fixes
- `docs` — Documentation-only changes
- `style` — Code style changes (formatting, semicolons, etc.) that don't affect functionality
- `refactor` — Code restructuring without behavior changes
- `test` — Adding or updating tests
- `chore` — Maintenance tasks, dependency updates, build config changes

## Scope specification

- Include precise scope when applicable (e.g., `feat(bpmn-editor)`, `fix(c4-layout)`)
- Use lowercase, hyphenated component names for scopes
- Omit scope if the change affects multiple areas or no specific component

## Description requirements

- Reference specific functions, components, or behavioral changes (e.g., "fix pool lane resizing in BPMN editor")
- Avoid vague generalizations (e.g., "fix bugs" or "update code")
- Describe what the change does, not what was wrong
- For breaking changes, append `!` to type/scope and include "BREAKING CHANGE:" in the body

## Body and footer guidelines

- Add detailed body when changes are non-obvious or affect multiple systems
- Explain the "why" behind the change, not just the "what"
- Reference related issue numbers when applicable
- Include migration notes for breaking changes

## Verification

- Always verify the commit message accurately reflects the actual staged diff
- Re-read the diff before finalizing the commit message
- Ensure the type matches the semantic intent of the changes