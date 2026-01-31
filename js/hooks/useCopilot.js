
import { useState, useCallback } from 'react';
import { DIAGRAM_TYPES } from '../config.js';
import { rendererAdapter } from '../services/RendererAdapter.js';

export const useCopilot = (setTextInput, setDiagramType, setViewMode, currentDiagramType) => {
    const [showCopilot, setShowCopilot] = useState(false);

    const handleAiCodeApply = useCallback((code) => {
        // Clean markdown code blocks if present
        let cleanCode = code;
        if (code.includes('```')) {
            // Match content between ```...```
            const match = code.match(/```(?:\w+)?\n([\s\S]*?)```/);
            if (match && match[1]) {
                cleanCode = match[1];
            }
        }
        
        cleanCode = cleanCode.trim();

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
