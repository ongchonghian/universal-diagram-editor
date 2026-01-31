
import { useState, useCallback } from 'react';
import { applyBpmnAutoLayout } from '../utils.js';

export const useAutoLayout = (textInput, setTextInput, setPreviewError, bpmnMissingDI) => {
    const [showAutoLayoutDialog, setShowAutoLayoutDialog] = useState(false);
    const [pendingBpmnXml, setPendingBpmnXml] = useState(null);
    const [autoLayoutProcessing, setAutoLayoutProcessing] = useState(false);

    // Handle auto-layout dialog actions
    const handleApplyAutoLayout = useCallback(async () => {
        if (!pendingBpmnXml) return;
        setAutoLayoutProcessing(true);
        try {
            const layoutedXml = await applyBpmnAutoLayout(pendingBpmnXml);
            setTextInput(layoutedXml);
            setShowAutoLayoutDialog(false);
            setPendingBpmnXml(null);
        } catch (err) {
            console.error('Auto-layout failed:', err);
            if (setPreviewError) setPreviewError('Auto-layout failed: ' + err.message);
            // Load original XML anyway on failure
            setTextInput(pendingBpmnXml);
            setShowAutoLayoutDialog(false);
            setPendingBpmnXml(null);
        } finally {
            setAutoLayoutProcessing(false);
        }
    }, [pendingBpmnXml, setTextInput, setPreviewError]);

    const handleSkipAutoLayout = useCallback(() => {
        if (pendingBpmnXml) {
            setTextInput(pendingBpmnXml);
        }
        setShowAutoLayoutDialog(false);
        setPendingBpmnXml(null);
    }, [pendingBpmnXml, setTextInput]);

    // Handle inline auto-layout from error panel
    const handleInlineAutoLayout = useCallback(async () => {
        if (!textInput || !bpmnMissingDI) return;
        setAutoLayoutProcessing(true);
        if (setPreviewError) setPreviewError('Generating layout...');
        try {
            const layoutedXml = await applyBpmnAutoLayout(textInput);
            setTextInput(layoutedXml);
            // bpmnMissingDI will automatically become false on next render as textInput changes
            if (setPreviewError) setPreviewError(null);
        } catch (err) {
            console.error('Auto-layout failed:', err);
            if (setPreviewError) setPreviewError('Auto-layout failed: ' + err.message);
        } finally {
            setAutoLayoutProcessing(false);
        }
    }, [textInput, bpmnMissingDI, setTextInput, setPreviewError]);

    // Function to trigger the flow from file drop (App logic decides when to call this)
    // Actually simpler: App calls this ONLY if DI is missing.
    // So this function just sets the dialog state.
    const promptAutoLayout = useCallback((content) => {
        setPendingBpmnXml(content);
        setShowAutoLayoutDialog(true);
    }, []);

    return {
        showAutoLayoutDialog, setShowAutoLayoutDialog,
        pendingBpmnXml,
        autoLayoutProcessing,
        handleApplyAutoLayout,
        handleSkipAutoLayout,
        handleInlineAutoLayout,
        promptAutoLayout
    };
};
