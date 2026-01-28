import React, { useState, useEffect } from 'react';
import { getCheckableLibraries } from '../library-registry.js';
import { updateManager } from '../update-manager.js';

// Update Management Panel
export const UpdatePanel = ({ isOpen, onClose }) => {
    const [updates, setUpdates] = useState([]);
    const [checking, setChecking] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [status, setStatus] = useState('');

    useEffect(() => {
        if (isOpen) {
            checkUpdates();
        }
    }, [isOpen]);

    const checkUpdates = async () => {
        setChecking(true);
        setStatus('Checking for updates...');
        try {
            const updatable = await updateManager.checkForUpdates();
            setUpdates(updatable);
            setStatus(updatable.length > 0 
                ? `Found ${updatable.length} available updates.` 
                : 'All libraries are up to date.');
        } catch (err) {
            console.error(err);
            setStatus('Failed to check updates.');
        } finally {
            setChecking(false);
        }
    };

    const handleUpdateAll = async () => {
        setUpdating(true);
        setStatus('Updating libraries...');
        try {
            await updateManager.updateAll(updates);
            setStatus('Updates completed successfully. Please reload.');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (err) {
            setStatus('Update failed: ' + err.message);
        } finally {
            setUpdating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}></div>
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg relative z-50">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="font-bold text-slate-800">Library Updates</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <i className="fas fa-times"></i>
                    </button>
                </div>
                
                <div className="p-6">
                    <div className="mb-4 flex items-center gap-3">
                        {checking && <i className="fas fa-spinner fa-spin text-indigo-500"></i>}
                        <p className="text-sm text-slate-600">{status}</p>
                    </div>

                    {updates.length > 0 && (
                        <div className="bg-slate-50 rounded-lg p-3 max-h-60 overflow-y-auto mb-6 border border-slate-100">
                            {updates.map(lib => (
                                <div key={lib.key} className="flex justify-between items-center py-2 border-b border-slate-200 last:border-0">
                                    <div>
                                        <p className="font-medium text-sm text-slate-800">{lib.name}</p>
                                        <p className="text-xs text-slate-500">{lib.currentVersion} → <span className="text-green-600 font-bold">{lib.latestVersion}</span></p>
                                    </div>
                                    <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">Update Available</span>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex justify-between items-center">
                        <div className="text-xs text-slate-400">
                            Updates updates config.js
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={checkUpdates} 
                                disabled={checking || updating}
                                className="px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Check Again
                            </button>
                            {updates.length > 0 && (
                                <button 
                                    onClick={handleUpdateAll}
                                    disabled={updating}
                                    className="px-4 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
                                >
                                    {updating ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-cloud-download-alt"></i>}
                                    Update All
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
