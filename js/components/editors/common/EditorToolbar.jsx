import React from 'react';

/**
 * Standardized Editor Toolbar
 * 
 * @param {Object} props
 * @param {string} [props.title] - Title of the editor (e.g., "Vega Editor")
 * @param {string} [props.subTitle] - Subtitle or badge text (e.g., "Visual Mode")
 * @param {Function} [props.onImport] - Handler for general import action
 * @param {Function} [props.onExport] - Handler for general export action
 * @param {Function} [props.onAutoLayout] - Handler for auto-layout action
 * @param {Array<{label: string, icon: string, onClick: Function, primary?: boolean, title?: string}>} [props.actions] - Custom actions
 * @param {React.ReactNode} [props.children] - Custom controls (e.g., view toggles) to display in the center or left
 * @param {string} [props.className] - Additional classes
 */
export const EditorToolbar = ({ 
    title, 
    subTitle,
    onImport, 
    onExport, 
    onAutoLayout, 
    onAiAssist,
    actions = [], 
    children,
    className = ""
}) => {
    return (
        <div className={`flex items-center justify-between gap-3 h-10 px-3 bg-white border-b border-slate-200 shrink-0 z-10 ${className}`}>
            
            {/* Left Section: Title & Logo */}
            <div className="flex items-center gap-3">
                {title && (
                    <div className="flex items-center">
                        <span className="text-[13px] font-semibold text-slate-900">{title}</span>
                        {subTitle && (
                            <span className="ml-2 h-5 px-1.5 inline-flex items-center text-[11px] font-medium text-slate-500 bg-slate-100 rounded">
                                {subTitle}
                            </span>
                        )}
                    </div>
                )}
                
                {/* Custom Left/Center Children (e.g. Toggles) */}
                {children && (
                    <div className={title ? "ml-3 border-l border-slate-200 pl-3" : ""}>
                        {children}
                    </div>
                )}
            </div>

            {/* Right Section: Actions */}
            <div className="flex items-center gap-1.5">
                
                {/* Custom Actions */}
                {actions.map((action, idx) => (
                    <button
                        key={idx}
                        onClick={action.onClick}
                        className={`flex items-center h-7 px-2.5 text-xs font-medium rounded-md transition-colors shadow-sm ${
                            action.primary 
                            ? 'text-white bg-indigo-600 hover:bg-indigo-700' 
                            : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                        title={action.title || action.label}
                    >
                        {action.icon && <i className={`${action.icon} ${action.label ? 'mr-1.5' : ''}`} aria-hidden="true"/>}
                        {action.label}
                    </button>
                ))}

                {/* Standard Actions */}
                {/* AI Assist Button */}
                {onAiAssist && (
                    <button
                        onClick={onAiAssist}
                        className="flex items-center h-7 px-2.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors"
                        title="AI Copilot"
                    >
                        <i className="fas fa-magic mr-1.5 text-indigo-600" aria-hidden="true"></i>
                        AI Assist
                    </button>
                )}

                {onAutoLayout && (
                    <button
                        onClick={onAutoLayout}
                        className="flex items-center h-7 px-2.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors"
                        title="Lay out the diagram automatically"
                    >
                        <i className="fas fa-sitemap mr-1.5"/>
                        Auto layout
                    </button>
                )}

                {onImport && (
                    <button
                        onClick={onImport}
                        className="flex items-center h-7 px-2.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors"
                        title="Import File"
                    >
                        <i className="fas fa-file-import mr-1.5"/>
                        Import
                    </button>
                )}

                {onExport && (
                    <button
                        onClick={onExport}
                        className="flex items-center h-7 px-2.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-md shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors"
                        title="Export"
                    >
                        <i className="fas fa-download mr-1.5"/>
                        Export
                    </button>
                )}
            </div>
        </div>
    );
};
