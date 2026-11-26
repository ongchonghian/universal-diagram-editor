import React, { useRef, useState, useEffect, useCallback } from 'react';

export const ZoomPanWrapper = React.forwardRef(({ children, className = "" }, ref) => {
    const containerRef = useRef(null);
    const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
    const [isDragging, setIsDragging] = useState(false);
    const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });

    const handleWheel = useCallback((e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const zoomSensitivity = 0.001;
            const delta = -e.deltaY * zoomSensitivity;
            const newScale = Math.min(Math.max(0.1, transform.k + delta), 10);
            
            setTransform(prev => ({ ...prev, k: newScale }));
        } else {
            e.preventDefault();
            const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
            
            setTransform(prev => ({
                ...prev,
                k: Math.min(Math.max(0.1, prev.k * scaleFactor), 10)
            }));
        }
    }, [transform.k]);

    const handleMouseDown = useCallback((e) => {
        // Middle mouse button is 1
        if (e.button === 1) {
            e.preventDefault();
            setIsDragging(true);
            setLastPosition({ x: e.clientX, y: e.clientY });
        }
    }, []);

    const handleMouseMove = useCallback((e) => {
        if (isDragging) {
            e.preventDefault();
            const dx = e.clientX - lastPosition.x;
            const dy = e.clientY - lastPosition.y;
            
            setTransform(prev => ({
                ...prev,
                x: prev.x + dx,
                y: prev.y + dy
            }));
            
            setLastPosition({ x: e.clientX, y: e.clientY });
        }
    }, [isDragging, lastPosition]);

    const handleMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    const resetZoom = () => setTransform({ x: 0, y: 0, k: 1 });
    const zoomIn = () => setTransform(prev => ({ ...prev, k: Math.min(prev.k * 1.2, 10) }));
    const zoomOut = () => setTransform(prev => ({ ...prev, k: Math.max(prev.k * 0.8, 0.1) }));

    const fitToScreen = () => {
        const container = containerRef.current;
        if (!container) return;
        
        // Find the content element (first child of the transform wrapper)
        // The transform wrapper is the second child of container (first is controls)
        // Actually, we can just look for the SVG or content inside.
        const contentWrapper = container.querySelector('.zoom-content-wrapper');
        const content = contentWrapper?.firstElementChild;
        
        if (container && content) {
            const containerRect = container.getBoundingClientRect();
            // We need natural size of content. If it's SVG, getBBox might be better if accessible, but getBoundingClientRect works if scale is 1
            // To get unscaled size, we temporarily need to know current scale or assume content ref logic
            // Simplified: Reset to 1, measure, then scale? Or Calculate based on current.
            
            // Getting rect of content currently:
            const contentRect = content.getBoundingClientRect();
            // Adjust for current scale to get natural size
            const currentScale = transform.k;
            const naturalWidth = contentRect.width / currentScale;
            const naturalHeight = contentRect.height / currentScale;
            
            if (naturalWidth === 0 || naturalHeight === 0) return;

            const padding = 40;
            const availableWidth = containerRect.width - padding;
            const availableHeight = containerRect.height - padding;
            
            const scaleX = availableWidth / naturalWidth;
            const scaleY = availableHeight / naturalHeight;
            const newScale = Math.min(scaleX, scaleY, 1); // Don't zoom in past 100% just to fit? Or allow it? usually max 1 is good to prevent huge blurry items.

            // Center it
            // transform origin is center center.
            // translation is applied after scaling? CSS transform order: translate then scale usually if defined string order.
            // Our style: translate(...) scale(...)
            // If origin is center, we just need x=0 y=0 to be centered?
            // Yes, because flex center justifies content.
            
            setTransform({ x: 0, y: 0, k: newScale });
        }
    };

    React.useImperativeHandle(ref, () => ({
        resetZoom,
        fitToScreen,
        zoomIn,
        zoomOut
    }));

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Wheel event needs to be non-passive to prevent default scrolling
        container.addEventListener('wheel', handleWheel, { passive: false });
        
        return () => {
            container.removeEventListener('wheel', handleWheel);
        };
    }, [handleWheel]);

    return (
        <div 
            ref={containerRef}
            className={`relative overflow-hidden ${className} ${isDragging ? 'cursor-grabbing' : 'cursor-default'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            <div className="absolute top-2 right-2 flex flex-col gap-1 z-10 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm border border-slate-200 p-1">
                <button onClick={zoomIn} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Zoom In">
                    <i className="fas fa-plus w-3 h-3 text-xs flex items-center justify-center"></i>
                </button>
                <button onClick={zoomOut} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Zoom Out">
                    <i className="fas fa-minus w-3 h-3 text-xs flex items-center justify-center"></i>
                </button>
                <button onClick={fitToScreen} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Fit to Screen">
                    <i className="fas fa-expand w-3 h-3 text-xs flex items-center justify-center"></i>
                </button>
                <button onClick={resetZoom} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Reset View (100%)">
                    <i className="fas fa-compress w-3 h-3 text-xs flex items-center justify-center"></i>
                </button>
            </div>
            
            <div 
                className="zoom-content-wrapper" // Marker class for finding content
                style={{ 
                    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.k})`,
                    transformOrigin: 'center center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                {children}
            </div>
            
            {/* Helper text for middle mouse pan */}
             <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 pointer-events-none select-none bg-white/50 px-2 py-0.5 rounded">
                Middle-click to pan • Scroll to zoom
            </div>
        </div>
    );
});
