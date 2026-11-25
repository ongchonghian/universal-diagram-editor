import { useState, useCallback } from 'react';
import { DIAGRAM_TYPES } from '../config.js';

export const useCopilot = (setTextInput, setDiagramType, setViewMode, currentDiagramType) => {
    const [showCopilot, setShowCopilot] = useState(false);

    /**
     * Apply a Smith proposal. The proposal names its own diagram type, so the editor switches to
     * that type without guessing from the code.
     */
    const handleAiCodeApply = useCallback((code, type) => {
        const cleanCode = (code || '').trim();
        if (!cleanCode) return;
        if (type && type !== currentDiagramType && DIAGRAM_TYPES[type]) {
            setDiagramType(type);
            setViewMode('code');
        }
        setTextInput(cleanCode);
    }, [currentDiagramType, setTextInput, setDiagramType, setViewMode]);

    return {
        showCopilot, setShowCopilot,
        handleAiCodeApply
    };
};
