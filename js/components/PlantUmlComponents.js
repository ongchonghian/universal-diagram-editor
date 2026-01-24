// PlantUML Toolbar and Template Gallery Components
import { html, useState, useEffect, useRef } from '../react-helpers.js';
import { PLANTUML_SNIPPETS, PLANTUML_TEMPLATES } from '../config.js';

/**
 * PlantUML snippet toolbar for quick insertion
 */
export const PlantUmlToolbar = ({ detectedModel, onInsert }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    const snippets = PLANTUML_SNIPPETS[detectedModel] || PLANTUML_SNIPPETS['default'];
    const visibleSnippets = isExpanded ? snippets : snippets.slice(0, 6);
    const hasMore = snippets.length > 6;
    
    return html`
        <div className="flex-none bg-slate-50 border-b border-slate-200 px-2 py-1.5">
            <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-slate-400 uppercase font-semibold mr-1">Insert:</span>
                ${visibleSnippets.map((snippet, idx) => html`
                    <button
                        key=${idx}
                        onClick=${() => onInsert(snippet.code)}
                        className="inline-flex items-center px-2 py-1 text-[11px] font-medium text-slate-600 bg-white border border-slate-200 rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                        title=${`Insert ${snippet.label}`}
                    >
                        <i className=${`fas ${snippet.icon} mr-1 text-[10px] opacity-60`}></i>
                        ${snippet.label}
                    </button>
                `)}
                ${hasMore && html`
                    <button
                        onClick=${() => setIsExpanded(!isExpanded)}
                        className="inline-flex items-center px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-indigo-600 transition-colors"
                        title=${isExpanded ? "Show less" : "Show more"}
                    >
                        <i className=${`fas ${isExpanded ? 'fa-chevron-up' : 'fa-chevron-down'} mr-1 text-[10px]`}></i>
                        ${isExpanded ? 'Less' : `+${snippets.length - 6}`}
                    </button>
                `}
                <span className="ml-auto text-[10px] text-slate-400">
                    <i className="fas fa-info-circle mr-1"></i>
                    ${detectedModel || 'PlantUML'}
                </span>
            </div>
        </div>
    `;
};

/**
 * Template gallery modal for PlantUML templates
 */
export const TemplateGalleryModal = ({ isOpen, onClose, onSelect }) => {
    if (!isOpen) return null;
    
    return html`
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick=${onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] overflow-hidden mx-4">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">
                            <i className="fas fa-th-large mr-2 text-indigo-500"></i>
                            PlantUML Templates
                        </h2>
                        <p className="text-sm text-slate-500 mt-0.5">Choose a template to get started quickly</p>
                    </div>
                    <button onClick=${onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                        <i className="fas fa-times text-lg"></i>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        ${PLANTUML_TEMPLATES.map((template) => html`
                            <button
                                key=${template.id}
                                onClick=${() => { onSelect(template.code); onClose(); }}
                                className="group p-4 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-left transition-all hover:shadow-md"
                            >
                                <div className="w-10 h-10 bg-white group-hover:bg-indigo-100 rounded-lg flex items-center justify-center mb-3 border border-slate-200 group-hover:border-indigo-200 transition-colors">
                                    <i className=${`fas ${template.icon} text-slate-500 group-hover:text-indigo-600 transition-colors`}></i>
                                </div>
                                <h3 className="font-semibold text-slate-800 group-hover:text-indigo-700 text-sm mb-1 transition-colors">
                                    ${template.label}
                                </h3>
                                <p className="text-xs text-slate-500 line-clamp-2">
                                    ${template.description}
                                </p>
                            </button>
                        `)}
                    </div>
                </div>
            </div>
        </div>
    `;
};

/**
 * Context menu for SVG element interactions
 */
export const ContextMenu = ({ x, y, elementText, onClose, onAction }) => {
    const menuRef = useRef(null);
    
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);
    
    const adjustedX = Math.min(x, window.innerWidth - 200);
    const adjustedY = Math.min(y, window.innerHeight - 250);
    
    return html`
        <div ref=${menuRef} className="context-menu" style=${{ left: adjustedX, top: adjustedY }}>
            <div className="context-menu-header">
                ${elementText ? `"${elementText.substring(0, 20)}${elementText.length > 20 ? '...' : ''}"` : 'Element'}
            </div>
            <div className="context-menu-divider"></div>
            <div className="context-menu-item" onClick=${() => onAction('note-right', elementText)}>
                <i className="fas fa-sticky-note"></i> Add Note (Right)
            </div>
            <div className="context-menu-item" onClick=${() => onAction('note-left', elementText)}>
                <i className="fas fa-sticky-note"></i> Add Note (Left)
            </div>
            <div className="context-menu-divider"></div>
            <div className="context-menu-item" onClick=${() => onAction('message-to', elementText)}>
                <i className="fas fa-arrow-right"></i> Add Message To...
            </div>
            <div className="context-menu-item" onClick=${() => onAction('message-from', elementText)}>
                <i className="fas fa-arrow-left"></i> Add Message From...
            </div>
            <div className="context-menu-divider"></div>
            <div className="context-menu-item" onClick=${() => onAction('activate', elementText)}>
                <i className="fas fa-play"></i> Activate
            </div>
            <div className="context-menu-item" onClick=${() => onAction('deactivate', elementText)}>
                <i className="fas fa-stop"></i> Deactivate
            </div>
            <div className="context-menu-divider"></div>
            <div className="context-menu-item" onClick=${() => onAction('goto', elementText)}>
                <i className="fas fa-search"></i> Go to Definition
            </div>
        </div>
    `;
};

/**
 * Interactive SVG preview with clickable elements
 */
export const InteractiveSvgPreview = ({ svgContent, sourceCode, onElementClick, onContextAction, diagramType }) => {
    const containerRef = useRef(null);
    const [elements, setElements] = useState([]);
    const [contextMenu, setContextMenu] = useState(null);

    useEffect(() => {
        if (!svgContent || !containerRef.current) return;

        containerRef.current.innerHTML = svgContent;
        const svg = containerRef.current.querySelector('svg');
        if (!svg) return;

        svg.style.maxWidth = '100%';
        svg.style.height = 'auto';
        svg.removeAttribute('width');
        svg.removeAttribute('height');

        const textElements = svg.querySelectorAll('text');
        const extractedElements = [];

        textElements.forEach((el, idx) => {
            const text = el.textContent?.trim();
            if (text && text.length > 0) {
                extractedElements.push({ text, element: el, index: idx });
                
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (onElementClick) onElementClick(text, sourceCode);
                });
                
                el.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenu({ x: e.clientX, y: e.clientY, text });
                });

                el.style.cursor = 'pointer';
            }
        });

        const groupElements = svg.querySelectorAll('g[id]');
        groupElements.forEach((g) => {
            const id = g.getAttribute('id');
            if (id && !id.startsWith('_')) {
                g.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const groupText = g.querySelector('text')?.textContent?.trim() || id;
                    if (onElementClick) onElementClick(groupText, sourceCode);
                });
                
                g.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const groupText = g.querySelector('text')?.textContent?.trim() || id;
                    setContextMenu({ x: e.clientX, y: e.clientY, text: groupText });
                });
            }
        });

        setElements(extractedElements);
    }, [svgContent, sourceCode, onElementClick]);
    
    const handleContextAction = (action, elementText) => {
        setContextMenu(null);
        if (onContextAction) onContextAction(action, elementText);
    };

    if (!svgContent) {
        return html`
            <div className="text-center text-slate-400">
                <i className="fas fa-image text-4xl mb-3 opacity-30"></i>
                <p className="text-sm">Preview will appear here</p>
            </div>
        `;
    }

    return html`
        <${window.React.Fragment}>
            <div 
                ref=${containerRef} 
                className="interactive-svg-container bg-white shadow-lg"
                title="Click on elements to navigate to code. Right-click for more options."
                onContextMenu=${(e) => e.preventDefault()}
            />
            ${contextMenu && html`
                <${ContextMenu}
                    x=${contextMenu.x}
                    y=${contextMenu.y}
                    elementText=${contextMenu.text}
                    onClose=${() => setContextMenu(null)}
                    onAction=${handleContextAction}
                />
            `}
        <//>
    `;
};
