# Syntext Smith review

25 November 2026 · BMad review · content class: code · lenses: Adversarial, Edge-Case Hunter, Verification Gap

Scope: `js/services/ai-service.js`, `js/services/auto-fix-service.js`, `js/services/auto-fix/**`, `js/services/diagram-compiler.js`, `js/components/AICopilot.jsx`, `js/components/dialogs/AISettingsModal.jsx`, `js/hooks/useCopilot.js`, and the Syntext Smith wiki page. The review read the code and ran no live model calls.

## Verdict: is the implementation outdated?

Yes, in three separate ways.

1. **The founding premise is outdated, and the code has already abandoned the premise.** Smith was designed around a "neuro-symbolic" pipeline: the model writes a JSON tree, and a compiler turns the tree into diagram syntax. That design assumed models could not write valid syntax. The pipeline has no caller today. The chat panel sends free text to the model and extracts code with a regular expression. Current models write Mermaid and PlantUML directly with high reliability, and a real parser catches the remaining faults.
2. **The provider integration follows early-2024 practice.** One provider, a default model from the 1.5 series, the system prompt pasted into the user message, no structured output, no tool calls, no streaming, no image input, and the API key in the URL.
3. **The interaction model is chat-and-paste.** The model rewrites the whole diagram on each turn, and the user applies the result by hand. Current assistants work as a tool loop: the model edits, validates, renders, looks at the result and repairs before the user sees the answer.

## What to keep

- The real validators: `mermaid.parse`, `bpmn-moddle` and Kroki. In a tool loop, the validators become the tools that the model calls.
- The semantic diff modal. Reviewing what the AI changed before applying is the right trust feature.
- BPMN auto-layout. Models still write poor layout coordinates, so a deterministic layout step still earns its place.
- The bring-your-own-key, browser-only design.

## Reading the findings

Findings carry no severity or ranking. Two lenses flagging the same area is a signal: code-fence extraction, the Apply Code path and the auto-fix loop each appear under more than one lens. The Verification Gap lens normally reviews a change; here the lens reviewed the whole feature, and the repository holds no tests.

The same findings are available as JSON in `syntext-smith-review-2026-11-25.json`.


## Adversarial lens (17 findings)

### A1. The neuro-symbolic path (generateDiagram, _generateInitialCode, getJSONSystemPrompt, diagramCompiler) has no caller; the chat panel only calls aiService.chat().

- **Location:** `js/services/ai-service.js:118-195, js/services/diagram-compiler.js:1-249`
- **Fix or guard:** Delete the AST path and the compiler, or wire the path in and measure it. Correct the wiki page either way.
- **Consequence:** The wiki promises '100% runnable code' from a pipeline that users never reach. About 330 lines of code stay unmaintained and mislead the next developer.

### A2. The AST schema holds only flat nodes and edges, so the schema cannot express subgraphs, alt/loop blocks, class members, BPMN lanes or gateways.

- **Location:** `js/services/ai-service.js:373-427`
- **Fix or guard:** Let the model write native syntax and check the output with the real parser (mermaid.parse, bpmn-moddle, Kroki). Keep a symbolic stage only for BPMN layout.
- **Consequence:** If the AST path were switched on, Smith would draw simpler diagrams than a current model writes unaided.

### A3. The default model is gemini-1.5-flash and the model menu is a hard-coded list from early 2026.

- **Location:** `js/services/ai-service.js:26, js/components/dialogs/AISettingsModal.jsx:7-21,94-112`
- **Fix or guard:** Fetch the model list from the provider's models endpoint, and default to the provider's current alias. Confirm the retirement date of the 1.5 series before release.
- **Consequence:** A new user's first message fails with a provider error once the default model is retired, and every new model needs a code change.

### A4. callLLM joins the system prompt onto the latest user message, and the request omits the systemInstruction field.

- **Location:** `js/services/ai-service.js:587-596`
- **Fix or guard:** payload.systemInstruction = { parts: [{ text: systemInstructions }] }; contents.push({ role: 'user', parts: [{ text: userContent }] })
- **Consequence:** The model treats the rules as user text, earlier turns carry no rules, and the stable prompt cannot be cached.

### A5. The request uses neither structured output nor function calling. The app recovers code, suggestions and regenerate intent with regular expressions and a magic string.

- **Location:** `js/services/ai-service.js:467,598-604; js/components/AICopilot.jsx:342; js/services/ai-service.js:438`
- **Fix or guard:** Define tools (edit_diagram, validate, suggest_next_steps) or a response schema { explanation, language, code, suggestions[] } and read typed fields.
- **Consequence:** A reply that formats a fence or the [SUGGESTIONS] tag slightly differently loses its code or its chips, and prose can reach the editor as code.

### A6. The API key travels in the URL query string and sits in localStorage as plain text.

- **Location:** `js/services/ai-service.js:38,584`
- **Fix or guard:** Send the key in the x-goog-api-key header. Default to sessionStorage, with an opt-in to remember the key.
- **Consequence:** The key appears in proxy logs, browser tooling and error reports, and any script on the page can read the key.

### A7. callLLM waits for the whole reply. The call has no streaming, no timeout and no AbortController.

- **Location:** `js/services/ai-service.js:606-627`
- **Fix or guard:** Use streamGenerateContent with an AbortController, show partial text, and add a Stop button.
- **Consequence:** The user watches three dots for the full length of a long BPMN reply and has no way to cancel the request.

### A8. maxOutputTokens is fixed at 8192 and the code never reads finishReason.

- **Location:** `js/services/ai-service.js:598-604,620-627`
- **Fix or guard:** if (candidate.finishReason === 'MAX_TOKENS') throw new Error('The reply was cut off'); raise the limit to the model's maximum.
- **Consequence:** A long BPMN file arrives cut off part-way, and Smith presents the partial XML as a finished answer.

### A9. Two validation layers apply different rules. BPMN without layout data passes aiService.validateSyntax and fails BpmnAdapter.validate.

- **Location:** `js/services/ai-service.js:203-269 versus js/services/auto-fix/adapters/*.js`
- **Fix or guard:** Keep one validation module per language and call that module from chat, auto-fix and the preview.
- **Consequence:** The chat reports a diagram as valid while the fix loop treats the same diagram as broken, or the reverse.

### A10. Every PlantUML or C4 reply is sent to the public kroki.io service for validation, and the interface gives no notice.

- **Location:** `js/services/ai-service.js:297-327`
- **Fix or guard:** Add a Kroki base URL setting, state in the settings dialog where diagrams are sent, and reuse RendererAdapter.render so long diagrams go by POST.
- **Consequence:** A user who pastes a confidential architecture into Smith sends that architecture to a third party without knowing.

### A11. Auto-fix has adapters for Mermaid, PlantUML and BPMN only. The 'c4' hint is not mapped, and both callers ignore the fixed flag.

- **Location:** `js/services/auto-fix-service.js:19-26,37-51; js/components/editors/CodeEditorView.jsx:93-97`
- **Fix or guard:** Map c4 to the PlantUML adapter, fall back to a plain LLM repair for other types, and tell the user when the fix did not succeed.
- **Consequence:** For C4, Vega, Graphviz and about fifteen other types, the Fix button spins and then leaves the code unchanged without a message.

### A12. The heuristic patchers run before the LLM. The Mermaid patcher appends 'end' whenever the error text contains 'Expecting', and most Mermaid parse errors contain that word.

- **Location:** `js/services/auto-fix/strategies/mermaid-patcher.js:8-21, plantuml-patcher.js:8-22`
- **Fix or guard:** Remove the regex patchers. Send the real parser error to the model first, and keep the deterministic step only for BPMN auto-layout.
- **Consequence:** The fix loop spends an attempt adding a stray 'end' line to a diagram whose real fault lies elsewhere.

### A13. Apply Code appears on every assistant reply and passes the whole reply, prose included, to the diff modal as the new code.

- **Location:** `js/components/AICopilot.jsx:390-401,486-497`
- **Fix or guard:** Extract the fenced block once in the service, store the block as message.code, show Apply only when message.code exists, and pass message.code to the modal.
- **Consequence:** The diff preview tries to render prose plus a fence, so the preview fails or misleads the user at the moment the user decides to accept the change.

### A14. Error replies are saved as assistant turns and replayed to the model. The history has no size limit and holds no earlier diagram states.

- **Location:** `js/components/AICopilot.jsx:113,121-129`
- **Fix or guard:** Filter out messages with isError before the call, cap or summarise the history, and store a diagram snapshot with each turn.
- **Consequence:** The model reads 'Error: API Error: 429' as its own earlier answer, and long conversations grow in cost on every turn.

### A15. Smith accepts text only. The user cannot attach an image, and the model never sees the rendered diagram.

- **Location:** `general`
- **Fix or guard:** Accept pasted images as inlineData parts, and send the rendered PNG back to the model for a layout check after generation.
- **Consequence:** Smith cannot turn a whiteboard photo into a diagram and cannot notice overlapping or unreadable output, which current general chat assistants can do.

### A16. The feature has no evaluation set, so the team cannot measure how often a model produces a diagram that parses and renders.

- **Location:** `general`
- **Fix or guard:** Keep a set of about fifty prompts across diagram types, run the set against each candidate model, and record the pass rate.
- **Consequence:** A change of model or prompt can lower quality unnoticed, and the '100% runnable' claim stays unproven.

### A17. The wiki says the compiler targets BPMN and that the correction loop repeats up to 2 times. The compiler has no BPMN target, the chat retries once, and auto-fix tries three times.

- **Location:** `.qoder/repowiki/en/content/Advanced Features/Syntext Smith (AI Copilot).md`
- **Fix or guard:** Rewrite the page from the code: one chat retry (ai-service.js:476), three auto-fix attempts (auto-fix-service.js:16), no AST path in use.
- **Consequence:** Readers of the wiki plan work on features that do not exist.


## Edge-Case Hunter lens (17 findings)

### E1. Regenerate keeps the last user message in history and appends the same message again

- **Location:** `js/services/ai-service.js:438-447,587-596`
- **Fix or guard:** const i = history.findLastIndex(m => m.role === 'user'); message = history[i].content; history = history.slice(0, i);
- **Consequence:** The request holds the question twice as consecutive user turns

### E2. Regenerate appends the new answer and leaves the old answer in storage

- **Location:** `js/components/AICopilot.jsx:179-186`
- **Fix or guard:** aiService.updateConversation(id, { messages: [...history, botMessage] })
- **Consequence:** Both answers reappear after reload and both go to the model as history

### E3. The user presses Enter while a reply is still pending

- **Location:** `js/components/AICopilot.jsx:92-94,200-205`
- **Fix or guard:** if (isTyping || !textToSend.trim() || !currentConversationId) return;
- **Consequence:** Two requests run at once and their replies interleave in the conversation

### E4. localStorage.setItem throws a quota error before the try block starts

- **Location:** `js/components/AICopilot.jsx:101-106`
- **Fix or guard:** Move addMessageToConversation inside the try block, and catch the quota error in saveConversations
- **Consequence:** The typing indicator stays on and the send button stays disabled

### E5. Stored settings or conversations hold invalid JSON

- **Location:** `js/services/ai-service.js:19-23,52-55,636`
- **Fix or guard:** try { return JSON.parse(stored); } catch { localStorage.removeItem(key); return defaults; }
- **Consequence:** The module throws on import and the whole editor fails to load

### E6. The user switches conversation while a reply is pending

- **Location:** `js/components/AICopilot.jsx:115-119`
- **Fix or guard:** const id = currentConversationId; ... if (id === currentIdRef.current) setMessages(prev => [...prev, botMessage]);
- **Consequence:** The reply shows in the wrong conversation until the panel reloads

### E7. The reply is in a different language from the editor's current diagram type

- **Location:** `js/services/ai-service.js:467-484`
- **Fix or guard:** const lang = fenceLabel || LanguageDetector.detectLanguage(extractedCode); validation = await this.validateSyntax(extractedCode, lang);
- **Consequence:** Valid Mermaid is judged as broken BPMN and the fix loop then alters the Mermaid

### E8. The reply holds two or more fenced code blocks

- **Location:** `js/services/ai-service.js:467-468`
- **Fix or guard:** const blocks = [...responseText.matchAll(/```[\w]*\n([\s\S]*?)```/g)]; validate each block or keep the last diagram block
- **Consequence:** Only the first block is checked and applied, which may be a short example

### E9. A patch or LLM fix lands on the third and final attempt

- **Location:** `js/services/auto-fix-service.js:55-127`
- **Fix or guard:** After the loop: const final = await adapter.validate(currentCode); return { fixed: final.valid, code: currentCode, log: fixLog };
- **Consequence:** The service reports fixed:false for code that may now be valid, and returns unchecked code

### E10. The chat path passes the error as a string, and normalizeError reads result.error

- **Location:** `js/services/auto-fix/adapters/plantuml-adapter.js:21-22; js/services/ai-service.js:483`
- **Fix or guard:** const msg = typeof result === 'string' ? result : (result?.error || result?.message || 'Unknown PlantUML Error');
- **Consequence:** The model receives 'Unknown PlantUML Error' in place of the real Kroki message

### E11. The user clicks Fix in the editor before saving an API key

- **Location:** `js/services/auto-fix-service.js:130-140; js/components/editors/CodeEditorView.jsx:85-101`
- **Fix or guard:** if (!aiService.hasApiKey()) throw new Error('API Key is missing. Please configure it in settings.');
- **Consequence:** The request goes out with an empty key and the fix quietly stops

### E12. The code contains '-->' or starts with '<?xml' and is neither Mermaid nor BPMN

- **Location:** `js/services/auto-fix/language-detector.js:24,74-77`
- **Fix or guard:** Prefer the editor's diagram type when the type is known; use content detection only when the type is unknown
- **Consequence:** An SVG or a Nomnoml diagram is validated and patched as BPMN or Mermaid

### E13. The user applies a reply that holds prose and no code fence

- **Location:** `js/hooks/useCopilot.js:11-39; js/components/AICopilot.jsx:393-396`
- **Fix or guard:** if (!match) return; // apply only an extracted code block
- **Consequence:** The editor's diagram is replaced with a paragraph of prose

### E14. The candidate is blocked or empty, so candidates[0].content has no parts

- **Location:** `js/services/ai-service.js:622-626`
- **Fix or guard:** const text = data.candidates[0]?.content?.parts?.map(p => p.text || '').join(''); if (!text) throw new Error(`No text returned (${data.candidates[0]?.finishReason})`);
- **Consequence:** The user sees 'Cannot read properties of undefined' as the error message

### E15. A long PlantUML diagram makes the Kroki GET address exceed the server's limit

- **Location:** `js/services/ai-service.js:305-315`
- **Fix or guard:** Call rendererAdapter.validateSyntax(code, krokiType), which already switches to POST above 4000 characters
- **Consequence:** A valid long diagram is reported as a syntax error and sent to the fix loop

### E16. The suggestions JSON parses to objects or to a non-array value

- **Location:** `js/components/AICopilot.jsx:342-350,374-384`
- **Fix or guard:** if (Array.isArray(parsed)) suggestions = parsed.filter(s => typeof s === 'string');
- **Consequence:** React throws while rendering the chips and the panel goes blank

### E17. The AST omits edges, or uses type 'decision' as the prompt instructs

- **Location:** `js/services/diagram-compiler.js:62,83,89; js/services/ai-service.js:180,424`
- **Fix or guard:** (ast.edges || []).forEach(...); else if (node.type === 'decision' || node.type === 'condition')
- **Consequence:** The compiler throws on a missing edge list, and decisions never draw as diamonds


## Verification Gap lens (3 findings)

### V1. The repository holds no test that inspects the request payload built by callLLM.

- **Location:** `js/services/ai-service.js:580-604 (request construction in callLLM)`
- **Fix or guard:** A unit test that stubs fetch and asserts the URL, the headers, the role mapping of history and the place of the system prompt.
- **Consequence:** A change that drops the history, or maps roles wrongly, ships unnoticed because the request is still accepted by the provider.
- **Gap shape:** regression-gap
- **Consumer:** aiService.chat at js/services/ai-service.js:462 and AutoFixService._llmFix at js/services/auto-fix-service.js:140
- **Evidence:** A search for *.test.* and *.spec.* files outside node_modules returned no files. package.json defines only the dev, build and preview scripts.

### V2. Three different regular expressions extract fenced code, and the repository holds no test for any of the three.

- **Location:** `js/services/ai-service.js:467, js/services/auto-fix-service.js:144, js/hooks/useCopilot.js:14 (code-fence extraction)`
- **Fix or guard:** One shared extractCode(text) helper with table tests: no fence, one fence, two fences, a fence without a language label, a fence without a final newline.
- **Consequence:** The three expressions already disagree on a fence without a final newline, so the chat can validate one string while Apply inserts another.
- **Gap shape:** regression-gap
- **Consumer:** handleAiCodeApply at js/hooks/useCopilot.js:9 and the chat validation loop at js/services/ai-service.js:470
- **Evidence:** The same file search and package.json check as above. No test file imports ai-service, auto-fix-service or useCopilot.

### V3. The repair loop is deterministic apart from the model call, and the repository holds no test for the loop.

- **Location:** `js/services/auto-fix-service.js:34-128 (attemptAutoFix loop)`
- **Fix or guard:** A test with a fake adapter and a fake LLM that asserts the attempt count, the final validation and the fixed flag.
- **Consequence:** The loop already returns fixed:false after a successful last-attempt fix, and no check exposes that result.
- **Gap shape:** regression-gap
- **Consumer:** aiService.fixDiagram at js/services/ai-service.js:530, used by the editor's Fix button at js/components/editors/CodeEditorView.jsx:93
- **Evidence:** The same file search and package.json check as above.
