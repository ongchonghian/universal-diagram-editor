
import { useState, useEffect, useRef, useCallback } from 'react';
import { DIAGRAM_TYPES } from '../config.js';
import { detectSpecificModel } from '../utils.js';
import { getCursorContext } from '../context-detection.js';
import { createMermaidSyncController } from '../components/editors/mermaid/utils.js';

export const useDiagramState = () => {
    const [textInput, setTextInput] = useState('');
    const [diagramType, setDiagramType] = useState('bpmn');
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
    
    // Check if visual editor is supported for current type AND content
    // We need to export this or recalculate it in App, but checking here is good for viewMode effects
    const isC4PlantUML = diagramType === 'c4' && (detectedModel === 'C4 Model (PlantUML)' || (textInput && textInput.includes('@startuml')));
    const isVisualSupported = DIAGRAM_TYPES[diagramType]?.hasVisualEditor === true && !isC4PlantUML;

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

    // Update detected model
    useEffect(() => {
        if (!textInput.trim()) return;
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
        handleDownloadSource
    };
};
