// Monaco Editor Wrapper Component
// Integrates Monaco Editor with custom language support for PlantUML and Mermaid
// Enhanced with error diagnostics, quick fixes, and hover explanations

import { html, useState, useEffect, useRef, forwardRef, useImperativeHandle } from '../react-helpers.js';
import { getErrorExplanation, formatForHover } from '../error-diagnostics/explanations.js';
import { getFixSuggestions } from '../error-diagnostics/fixes.js';

/**
 * Monaco Editor wrapper with syntax highlighting for diagram languages
 * Uses forwardRef to expose editor methods to parent components
 */
export const MonacoWrapper = forwardRef(({ value, onChange, language, onCursorChange, theme = "vs-light", height = "100%" }, ref) => {
    const containerRef = useRef(null);
    const editorRef = useRef(null);
    const decorationsRef = useRef([]);
    const latestValueRef = useRef(value);
    const [editorReady, setEditorReady] = useState(false);

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => ({
        scrollToLine: (lineNumber) => {
            if (editorRef.current) {
                editorRef.current.revealLineInCenter(lineNumber);
                const newDecorations = [{
                    range: new window.monaco.Range(lineNumber, 1, lineNumber, 1),
                    options: {
                        isWholeLine: true,
                        className: 'errorLineDecoration',
                        linesDecorationsClassName: 'errorLineGutter'
                    }
                }];
                decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, newDecorations);
                editorRef.current.focus();
            }
        },
        setValue: (newValue) => {
            if (editorRef.current && newValue !== editorRef.current.getValue()) {
                editorRef.current.setValue(newValue);
            }
        },
        insertAtCursor: (text) => {
            if (editorRef.current) {
                const editor = editorRef.current;
                const position = editor.getPosition();
                const range = new window.monaco.Range(
                    position.lineNumber, position.column,
                    position.lineNumber, position.column
                );
                editor.executeEdits('insert-snippet', [{
                    range: range,
                    text: text,
                    forceMoveMarkers: true
                }]);
                editor.focus();
            }
        },
        // Set error markers with squiggly underlines
        setMarkers: (markers) => {
            if (editorRef.current && window.monaco) {
                const model = editorRef.current.getModel();
                if (model) {
                    window.monaco.editor.setModelMarkers(model, 'diagram-errors', markers);
                }
            }
        },
        // Clear all error markers
        clearMarkers: () => {
            if (editorRef.current && window.monaco) {
                const model = editorRef.current.getModel();
                if (model) {
                    window.monaco.editor.setModelMarkers(model, 'diagram-errors', []);
                }
            }
        },
        // Get current editor model for external use
        getModel: () => {
            return editorRef.current?.getModel();
        },
        // Get Monaco instance
        getMonaco: () => {
            return window.monaco;
        }
    }));

    // Track latest value for Monaco initialization
    useEffect(() => {
        latestValueRef.current = value;
    }, [value]);

    // Initialize Monaco Editor
    useEffect(() => {
        let editor;
        
        // Configure Monaco AMD loader
        window.require.config({ 
            paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' }
        });
        
        window.require(['vs/editor/editor.main'], function() {
            if (!containerRef.current) return;
            
            // Register PlantUML language
            registerPlantUMLLanguage();
            
            // Register Mermaid language
            registerMermaidLanguage();
            
            // Register error providers (code actions, hover)
            registerErrorProviders();
            
            // Create editor instance
            const currentValue = latestValueRef.current || "";
            editor = window.monaco.editor.create(containerRef.current, {
                value: currentValue,
                language: language || "xml",
                theme: theme,
                automaticLayout: true,
                minimap: { enabled: true, scale: 0.75 },
                scrollBeyondLastLine: false,
                fontSize: 13,
                fontFamily: "'Fira Code', 'Monaco', monospace",
                lineNumbers: "on",
                glyphMargin: true,  // Enable for error icons
                folding: true,
                renderLineHighlight: "all",
                lightbulb: { enabled: true },  // Enable lightbulb for quick fixes
            });
            
            editorRef.current = editor;
            setEditorReady(true);
            
            // Handle content changes
            editor.onDidChangeModelContent(() => {
                const val = editor.getValue();
                onChange(val);
                if (decorationsRef.current.length > 0) {
                    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, []);
                }
            });
            
            // Handle cursor changes
            editor.onDidChangeCursorPosition((e) => {
                if (onCursorChange) {
                    onCursorChange(e.position.lineNumber, e.position.column);
                }
            });
        });
        
        return () => { if (editor) editor.dispose(); };
    }, []);

    // Sync value when editor is ready or value changes externally
    useEffect(() => {
        if (editorReady && editorRef.current && value !== editorRef.current.getValue()) {
            editorRef.current.setValue(value);
        }
    }, [value, editorReady]);

    // Update language when it changes
    useEffect(() => {
        if (editorRef.current && window.monaco) {
            const model = editorRef.current.getModel();
            window.monaco.editor.setModelLanguage(model, language);
        }
    }, [language]);

    return html`<div ref=${containerRef} className="monaco-editor-container" style=${{ height }} />`;
});

/**
 * Register PlantUML language with Monaco
 */
function registerPlantUMLLanguage() {
    if (window.monaco.languages.getLanguages().some(lang => lang.id === 'plantuml')) return;
    
    window.monaco.languages.register({ id: 'plantuml' });
    window.monaco.languages.setMonarchTokensProvider('plantuml', {
        defaultToken: '',
        tokenPostfix: '.plantuml',
        
        keywords: [
            'participant', 'actor', 'boundary', 'control', 'entity', 'database', 'collections', 'queue',
            'class', 'interface', 'enum', 'abstract', 'annotation',
            'package', 'namespace', 'node', 'folder', 'frame', 'cloud', 'component',
            'usecase', 'rectangle', 'hexagon', 'card', 'artifact', 'file', 'storage',
            'state', 'choice', 'fork', 'join', 'end',
            'if', 'then', 'else', 'elseif', 'endif', 'while', 'endwhile', 'repeat', 'repeatwhile',
            'start', 'stop', 'kill', 'detach',
            'note', 'legend', 'header', 'footer', 'title', 'caption',
            'left', 'right', 'top', 'bottom', 'over', 'of', 'on', 'link',
            'as', 'is', 'also', 'autonumber', 'newpage', 'box', 'alt', 'opt', 'loop', 'par', 'break', 'critical', 'group',
            'activate', 'deactivate', 'destroy', 'create', 'return',
            'skinparam', 'hide', 'show', 'remove', 'scale', 'rotate',
            'together', 'mainframe', 'across', 'stereotype', 'spot'
        ],
        
        tokenizer: {
            root: [
                [/[@]start\w+/, 'keyword.directive'],
                [/[@]end\w+/, 'keyword.directive'],
                [/!include\b/, 'keyword.directive'],
                [/!define\b/, 'keyword.directive'],
                [/'.*$/, 'comment'],
                [/\/\'/, 'comment', '@multiLineComment'],
                [/"([^"\\]|\\.)*$/, 'string.invalid'],
                [/"/, 'string', '@string'],
                [/#[0-9A-Fa-f]{6}\b/, 'constant.color'],
                [/#[0-9A-Fa-f]{3}\b/, 'constant.color'],
                [/#\w+/, 'constant.color'],
                [/--?>|<-?--|===?>|-.->?|<-.-|--\)|-->>/, 'operator.arrow'],
                [/\b(participant|actor|class|interface|enum|abstract|state|note|package)\b/, 'keyword'],
                [/<<\w+>>/, 'type.stereotype'],
                [/[a-zA-Z_]\w*/, 'identifier'],
                [/\d+/, 'number'],
                [/\s+/, 'white'],
            ],
            string: [
                [/[^\\"]+/, 'string'],
                [/\\./, 'string.escape'],
                [/"/, 'string', '@pop']
            ],
            multiLineComment: [
                [/[^']+/, 'comment'],
                [/\'\// , 'comment', '@pop'],
                [/'/, 'comment']
            ]
        }
    });
    
    window.monaco.languages.setLanguageConfiguration('plantuml', {
        comments: { lineComment: "'", blockComment: ["/'", "'/"] },
        brackets: [['{', '}'], ['[', ']'], ['(', ')']],
        autoClosingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
            { open: '<<', close: '>>' }
        ]
    });
}

/**
 * Register Mermaid language with Monaco
 */
function registerMermaidLanguage() {
    if (window.monaco.languages.getLanguages().some(lang => lang.id === 'mermaid')) return;
    
    window.monaco.languages.register({ id: 'mermaid' });
    window.monaco.languages.setMonarchTokensProvider('mermaid', {
        defaultToken: '',
        tokenPostfix: '.mermaid',
        
        keywords: [
            'graph', 'flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'stateDiagram-v2',
            'erDiagram', 'gantt', 'pie', 'mindmap', 'timeline', 'journey', 'gitGraph',
            'quadrantChart', 'xychart-beta', 'sankey-beta', 'block-beta', 'kanban',
            'requirementDiagram', 'C4Context', 'C4Container', 'C4Component',
            'participant', 'actor', 'activate', 'deactivate', 'Note', 'note',
            'loop', 'alt', 'else', 'opt', 'par', 'and', 'critical', 'break', 'rect', 'end',
            'class', 'interface', 'state', 'subgraph', 'section', 'entity',
            'commit', 'branch', 'checkout', 'merge', 'dateFormat', 'title', 'excludes'
        ],
        
        tokenizer: {
            root: [
                [/%%.*$/, 'comment'],
                [/"([^"\\]|\\.)*$/, 'string.invalid'],
                [/"/, 'string', '@string'],
                [/\[[^\]]*\]/, 'string.label'],
                [/\([^)]*\)/, 'string.label'],
                [/\{[^}]*\}/, 'string.label'],
                [/--?>|<-?--|===?>|-.->?|<-.-/, 'operator.arrow'],
                [/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap|timeline|journey|gitGraph)\b/, 'keyword.diagram'],
                [/\b(TB|TD|BT|RL|LR)\b/, 'keyword.direction'],
                [/\b(participant|actor|activate|deactivate|Note|loop|alt|else|opt|par|end|subgraph|section|class|state|entity|commit|branch|checkout|merge|dateFormat|title|excludes)\b/, 'keyword'],
                [/[a-zA-Z_][a-zA-Z0-9_]*/, 'identifier'],
                [/\d+/, 'number'],
                [/\d{4}-\d{2}-\d{2}/, 'number.date'],
                [/\s+/, 'white'],
                [/\|[^|]*\|/, 'string.edgelabel'],
            ],
            string: [
                [/[^\\"]+/, 'string'],
                [/\\./, 'string.escape'],
                [/"/, 'string', '@pop']
            ]
        }
    });
    
    window.monaco.languages.setLanguageConfiguration('mermaid', {
        comments: { lineComment: '%%' },
        brackets: [['{', '}'], ['[', ']'], ['(', ')'], ['[[', ']]'], ['((', '))']],
        autoClosingPairs: [
            { open: '{', close: '}' },
            { open: '[', close: ']' },
            { open: '(', close: ')' },
            { open: '"', close: '"' },
            { open: '|', close: '|' }
        ]
    });
}

/**
 * Register error diagnostic providers (Code Actions and Hover)
 * These provide quick fixes and detailed error explanations
 */
let providersRegistered = false;
function registerErrorProviders() {
    if (providersRegistered) return;
    providersRegistered = true;
    
    const languages = ['mermaid', 'plantuml', 'xml']; // xml for BPMN
    
    for (const lang of languages) {
        // Register Code Action Provider for quick fixes
        window.monaco.languages.registerCodeActionProvider(lang, {
            provideCodeActions: (model, range, context, token) => {
                const actions = [];
                
                // Get markers in the current range
                const markers = context.markers || [];
                
                for (const marker of markers) {
                    // Determine diagram type from language
                    let diagramType = lang;
                    if (lang === 'xml') diagramType = 'bpmn';
                    
                    // Get fix suggestions for this error
                    const fixes = getFixSuggestions(marker.message, diagramType, marker.startLineNumber);
                    
                    for (const fix of fixes) {
                        if (fix.edit) {
                            // Adjust the range if using special values
                            let editRange = fix.edit.range;
                            if (editRange) {
                                // Handle end-of-file marker (99999)
                                if (editRange.startLineNumber === 99999) {
                                    const lineCount = model.getLineCount();
                                    const lastLineLength = model.getLineMaxColumn(lineCount);
                                    editRange = {
                                        startLineNumber: lineCount,
                                        startColumn: lastLineLength,
                                        endLineNumber: lineCount,
                                        endColumn: lastLineLength
                                    };
                                }
                            }
                            
                            actions.push({
                                title: fix.title,
                                kind: 'quickfix',
                                diagnostics: [marker],
                                isPreferred: fix.isPreferred || false,
                                edit: {
                                    edits: [{
                                        resource: model.uri,
                                        edit: {
                                            range: new window.monaco.Range(
                                                editRange.startLineNumber,
                                                editRange.startColumn,
                                                editRange.endLineNumber,
                                                editRange.endColumn
                                            ),
                                            text: fix.edit.text
                                        }
                                    }]
                                }
                            });
                        } else {
                            // Suggestion without auto-edit (informational)
                            actions.push({
                                title: fix.title + ' (manual fix)',
                                kind: 'quickfix',
                                diagnostics: [marker],
                                isPreferred: false,
                                disabled: {
                                    reason: fix.description || 'Apply this fix manually'
                                }
                            });
                        }
                    }
                }
                
                return {
                    actions: actions,
                    dispose: () => {}
                };
            }
        });
        
        // Register Hover Provider for error explanations
        window.monaco.languages.registerHoverProvider(lang, {
            provideHover: (model, position, token) => {
                // Get markers at this position
                const markers = window.monaco.editor.getModelMarkers({ resource: model.uri });
                const relevantMarkers = markers.filter(m => 
                    m.startLineNumber <= position.lineNumber && 
                    m.endLineNumber >= position.lineNumber &&
                    m.startColumn <= position.column &&
                    m.endColumn >= position.column
                );
                
                if (relevantMarkers.length === 0) return null;
                
                const marker = relevantMarkers[0];
                const explanation = getErrorExplanation(marker.code, marker.message);
                const hoverContents = formatForHover(explanation);
                
                return {
                    contents: hoverContents,
                    range: new window.monaco.Range(
                        marker.startLineNumber,
                        marker.startColumn,
                        marker.endLineNumber,
                        marker.endColumn
                    )
                };
            }
        });
    }
}

export default MonacoWrapper;
