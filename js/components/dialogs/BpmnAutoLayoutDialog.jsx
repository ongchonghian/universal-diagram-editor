import React from 'react';

// Dialog for BPMN Auto-Layout confirmation
export const BpmnAutoLayoutDialog = ({ isOpen, onClose, onApplyLayout, onSkip, isProcessing }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={isProcessing ? null : onClose}></div>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative z-50 overflow-hidden transform transition-all">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                        <i className="fas fa-magic text-lg"></i>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Auto-Layout Diagram?</h3>
                        <p className="text-xs text-slate-500">BPMN Missing Presentation Info</p>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                        This BPMN file defines the process logic but is missing <strong>visual layout information (DI)</strong>.
                    </p>
                    <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                        We can attempt to automatically generate a layout for you, or you can open it as-is (which may not render correctly).
                    </p>

                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex gap-3 mb-2">
                        <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                        <p className="text-xs text-blue-700">
                            Auto-layout works best for simple to medium complexity processes. Complex flows might need manual adjustment.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button 
                        onClick={onSkip}
                        disabled={isProcessing}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Skip (Open As-Is)
                    </button>
                    <button 
                        onClick={onApplyLayout}
                        disabled={isProcessing}
                        className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 transition-colors flex items-center gap-2"
                    >
                        {isProcessing ? (
                            <><i className="fas fa-spinner fa-spin"></i> Processing...</>
                        ) : (
                            <><i className="fas fa-wand-magic-sparkles"></i> Auto-Layout</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
