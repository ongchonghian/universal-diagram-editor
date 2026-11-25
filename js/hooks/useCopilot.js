
import { useState, useCallback } from 'react';
import { DIAGRAM_TYPES } from '../config.js';
import { rendererAdapter } from '../services/RendererAdapter.js';
import { extractCodeBlock } from '../utils/code-extract.js';

export const useCopilot = (setTextInput, setDiagramType, setViewMode, currentDiagramType) => {
    const [showCopilot, setShowCopilot] = useState(false);

    const handleAiCodeApply = useCallback((code) => {
        // Clean markdown code blocks if present
        const block = extractCodeBlock(code);
        let cleanCode = block ? block.code : (code || '');
        
        cleanCode = cleanCode.trim();
        if (!cleanCode) return;

        // Auto-detect and switch diagram type
        // We use a generic filename to trigger content-based detection
        const detectedType = rendererAdapter.detectType('ai_snippet.txt', cleanCode);
        
        // Check if we should switch (only if detected type is valid and supported)
        if (detectedType && detectedType !== currentDiagramType && DIAGRAM_TYPES[detectedType]) {
             // Avoid switching to 'bpmn' default if detection wasn't strong, unless it really looks like XML
             const isRealBpmn = cleanCode.includes('<definitions') || cleanCode.includes('bpmn:');
             if (detectedType === 'bpmn' && !isRealBpmn) {
                 // Ignore false positive fallbacks
             } else {
                 console.log(`[AI Apply] Auto-switching from ${currentDiagramType} to ${detectedType}`);
                 setDiagramType(detectedType);
                 setViewMode('code'); 
             }
        }

        setTextInput(cleanCode);
    }, [currentDiagramType, setTextInput, setDiagramType, setViewMode]);

    return {
        showCopilot, setShowCopilot,
        handleAiCodeApply
    };
};
