
import { useState, useEffect, useRef, useCallback } from 'react';
import { DIAGRAM_TYPES } from '../config.js';
import { detectSpecificModel } from '../utils.js';
import { getCursorContext } from '../context-detection.js';
import { createMermaidSyncController } from '../components/editors/mermaid/utils.js';
import { getDesignSupport } from '../notations.js';

// The diagram in progress is kept in the browser, so a refresh or a closed tab does not lose it
export const DRAFT_STORAGE_KEY = 'universal_diagram_draft';

const readDraft = () => {
    try {
        const draft = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || 'null');
        if (draft && typeof draft.code === 'string' && DIAGRAM_TYPES[draft.type]) return draft;
    } catch (e) { /* storage blocked or the draft is unreadable: start empty */ }
    return null;
};

export const useDiagramState = () => {
    const [initialDraft] = useState(readDraft);
    const [textInput, setTextInput] = useState(initialDraft?.code || '');
    const [diagramType, setDiagramType] = useState(initialDraft?.type || 'bpmn');
    // False when the browser refuses to keep the draft (for example, a private window with storage blocked)
    const [draftSaved, setDraftSaved] = useState(true);
    const [detectedModel, setDetectedModel] = useState('');
    const [contextModel, setContextModel] = useState({ model: '', isInsideBlock: false });
    const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
    const [viewMode, setViewMode] = useState('code');
    const [showTemplates, setShowTemplates] = useState(false);
    const [readOnly, setReadOnly] = useState(false);
    
    // Mermaid state
    const [mermaidAst, setMermaidAst] = useState(null);
    const [mermaidAstLoaded, setMermaidAstLoaded] = useState(!!window.MermaidASTLoaded);
    const mermaidSyncRef = useRef(createMermaidSyncController());
    
    // Whether Design view can edit the current diagram; the reason is shown when it cannot
    const designSupport = getDesignSupport(diagramType, detectedModel, textInput);
    const isVisualSupported = designSupport.supported;

    // Force code view if visual is not supported
    useEffect(() => {
        if (!isVisualSupported && viewMode === 'visual') {
            setViewMode('code');
        }
    }, [isVisualSupported, viewMode]);

    // Listen for MermaidAST load
    useEffect(() => {
        if (window.MermaidASTLoaded) setMermaidAstLoaded(true);
        else {
            const handler = () => setMermaidAstLoaded(true);
            window.addEventListener('mermaid-ast-loaded', handler, { once: true });
            return () => window.removeEventListener('mermaid-ast-loaded', handler);
        }
    }, []);

    // Sync Mermaid AST
    useEffect(() => {
        if (diagramType !== 'mermaid' || !textInput.trim()) {
            setMermaidAst(null);
            return;
        }
        mermaidSyncRef.current.parseCode(
            textInput,
            (ast) => setMermaidAst(ast),
            (error) => console.log('Mermaid parse error:', error)
        );
    }, [textInput, diagramType]);

    // Update cursor context
    useEffect(() => {
        const context = getCursorContext(textInput, cursorPos.line, cursorPos.col, diagramType);
        setContextModel(context);
    }, [textInput, cursorPos, diagramType]);

    // Keep the draft in the browser, a moment after the user stops typing
    useEffect(() => {
        const timer = setTimeout(() => {
            try {
                if (textInput.trim()) localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ type: diagramType, code: textInput }));
                else localStorage.removeItem(DRAFT_STORAGE_KEY);
                setDraftSaved(true);
            } catch (e) {
                setDraftSaved(false);
            }
        }, 400);
        return () => clearTimeout(timer);
    }, [textInput, diagramType]);

    // Only when the browser could not keep the draft, ask before the page closes with code in the editor
    useEffect(() => {
        if (draftSaved || !textInput.trim()) return undefined;
        const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ''; };
        window.addEventListener('beforeunload', onBeforeUnload);
        return () => window.removeEventListener('beforeunload', onBeforeUnload);
    }, [draftSaved, textInput]);

    // Update detected model
    useEffect(() => {
        if (!textInput.trim()) { setDetectedModel(''); return; }
        const detected = detectSpecificModel(textInput, diagramType);
        setDetectedModel(detected);
    }, [textInput, diagramType]);

    const handleDownloadSource = useCallback(() => {
        if (!textInput.trim()) return;
        const ext = DIAGRAM_TYPES[diagramType]?.extensions?.[0] || '.txt';
        const mimeType = ext === '.json' ? 'application/json' : (ext === '.xml' || ext === '.bpmn' ? 'application/xml' : 'text/plain');
        const blob = new Blob([textInput], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `diagram${ext}`;
        a.click();
        URL.revokeObjectURL(url);
    }, [textInput, diagramType]);

    return {
        textInput, setTextInput,
        diagramType, setDiagramType,
        detectedModel,
        contextModel,
        cursorPos, setCursorPos,
        viewMode, setViewMode,
        showTemplates, setShowTemplates,
        readOnly, setReadOnly,
        mermaidAst,
        mermaidAstLoaded,
        mermaidSyncRef,
        isVisualSupported,
        designSupport,
        handleDownloadSource
    };
};
