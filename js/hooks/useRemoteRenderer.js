import { useState, useEffect } from 'react';
import { rendererAdapter } from '../services/RendererAdapter.js';

export const useRemoteRenderer = (textInput, diagramType, editorRef, isC4PlantUML, bpmnMissingDI) => {
    const [url, setUrl] = useState('');
    const [stats, setStats] = useState({ length: 0, method: 'GET' });
    const [loading, setLoading] = useState(false);
    const [previewError, setPreviewError] = useState(null);
    const [errorLine, setErrorLine] = useState(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [svgContent, setSvgContent] = useState(null);

    useEffect(() => {
        if (!textInput.trim()) {
            setUrl('');
            setPreviewImage(null);
            setSvgContent(null);
            setPreviewError(null);
            setStats({ length: 0, method: '' });
            return;
        }

        // Use Adapter for rendering
        setLoading(true);
        setPreviewError(null);
        setErrorLine(null);
        if (editorRef.current?.clearMarkers) editorRef.current.clearMarkers();

        const fetchPreview = async () => {
             // Logic delegated to adapter
             const result = await rendererAdapter.render(textInput, diagramType, {
                 isC4PlantUML,
                 bpmnMissingDI // Pass this info if needed, though Adapter has checks
             });

             if (result.skipped) {
                 setSvgContent(null);
                 setPreviewImage(null);
                 setLoading(false);
                 return;
             }

             if (result.error) {
                 setPreviewError(result.error.message);
                 setSvgContent(null);
                 setPreviewImage(null);
                 
                 const line = result.errorLine;
                 const errorInfo = result.error.info;

                 if (line) {
                    setErrorLine(line);
                    if (editorRef.current?.setMarkers) {
                        editorRef.current.setMarkers([{
                            startLineNumber: line,
                            startColumn: errorInfo?.column || 1,
                            endLineNumber: line,
                            endColumn: errorInfo?.endColumn || 1000,
                            message: errorInfo?.shortMessage || result.error.message,
                            severity: 8,
                            code: errorInfo?.code || 'syntax-error',
                            source: 'kroki',
                            relatedInformation: errorInfo ? [{
                                expected: errorInfo.expected,
                                found: errorInfo.found,
                                column: errorInfo.column,
                                diagramType: diagramType
                            }] : [{ diagramType: diagramType }]
                        }]);
                    }
                }
             } else {
                 setSvgContent(result.svg);
                 setPreviewImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(result.svg)}`);
                 setUrl(result.url);
                 setStats({ length: textInput.length, method: result.url.length > 4000 ? 'POST' : 'GET' });
             }
             setLoading(false);
        };

        const timer = setTimeout(fetchPreview, 500);
        return () => clearTimeout(timer);
    }, [textInput, diagramType, isC4PlantUML, bpmnMissingDI, editorRef]);

    const handleDownloadSvg = () => {
        rendererAdapter.downloadSvg(svgContent, diagramType);
    };

    const handleDownloadPng = () => {
        rendererAdapter.downloadPng(svgContent, diagramType);
    };

    return {
        url,
        stats,
        loading,
        previewError, setPreviewError,
        errorLine,
        previewImage,
        svgContent,
        handleDownloadSvg,
        handleDownloadPng
    };
};
