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
        <div className={`flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 shadow-sm shrink-0 z-10 ${className}`}>
            
            {/* Left Section: Title & Logo */}
            <div className="flex items-center gap-3">
                {title && (
                    <div className="flex items-center">
                        <span className="text-sm font-semibold text-slate-700">{title}</span>
                        {subTitle && (
                            <span className="ml-2 text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                {subTitle}
                            </span>
                        )}
                    </div>
                )}
                
                {/* Custom Left/Center Children (e.g. Toggles) */}
                {children && (
                    <div className={title ? "ml-4 border-l border-slate-200 pl-4" : ""}>
                        {children}
                    </div>
                )}
            </div>

            {/* Right Section: Actions */}
            <div className="flex items-center space-x-2">
                
                {/* Custom Actions */}
                {actions.map((action, idx) => (
                    <button
                        key={idx}
                        onClick={action.onClick}
                        className={`flex items-center px-3 py-1.5 text-xs font-medium rounded-lg transition-colors shadow-sm ${
                            action.primary 
                            ? 'text-white bg-indigo-600 hover:bg-indigo-700' 
                            : 'text-slate-600 bg-white border border-slate-300 hover:bg-slate-50'
                        }`}
                        title={action.title || action.label}
                    >
                        {action.icon && <i className={`${action.icon} ${action.label ? 'mr-1.5' : ''}`}/>}
                        {action.label}
                    </button>
                ))}

                {/* Standard Actions */}
                {/* AI Assist Button */}
                {onAiAssist && (
                    <button
                        onClick={onAiAssist}
                        className="flex items-center px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 rounded-lg shadow-sm transition-all border border-transparent"
                        title="AI Copilot"
                    >
                        <i className="fas fa-magic mr-1.5"></i>
                        AI Assist
                    </button>
                )}

                {onAutoLayout && (
                    <button
                        onClick={onAutoLayout}
                        className="flex items-center px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                        title="Auto Layout"
                    >
                        <i className="fas fa-sitemap mr-1.5"/>
                        Auto Layout
                    </button>
                )}

                {onImport && (
                    <button
                        onClick={onImport}
                        className="flex items-center px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                        title="Import File"
                    >
                        <i className="fas fa-file-import mr-1.5"/>
                        Import
                    </button>
                )}

                {onExport && (
                    <button
                        onClick={onExport}
                        className="flex items-center px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
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
