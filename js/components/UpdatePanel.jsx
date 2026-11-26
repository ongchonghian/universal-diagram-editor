import React, { useState, useEffect } from 'react';
import { getCheckableLibraries } from '../library-registry.js';
import { updateManager } from '../update-manager.js';
import { Modal, ModalHeader, ModalFooter, Button, Spinner } from './common.jsx';

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
        setStatus('Checking for updates…');
        try {
            const updatable = await updateManager.checkForUpdates();
            setUpdates(updatable);
            setStatus(updatable.length === 0
                ? 'Every library is up to date.'
                : updatable.length === 1 ? '1 update is available.' : `${updatable.length} updates are available.`);
        } catch (err) {
            console.error(err);
            setStatus('The update check failed. Check the network connection, then try again.');
        } finally {
            setChecking(false);
        }
    };

    const handleUpdateAll = async () => {
        setUpdating(true);
        setStatus('Updating the libraries…');
        try {
            await updateManager.updateAll(updates);
            setStatus('The libraries are updated. The page reloads now.');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (err) {
            setStatus(`The update failed: ${err.message}`);
        } finally {
            setUpdating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Modal onClose={onClose} labelledBy="library-updates-title" className="max-w-lg">
            <ModalHeader id="library-updates-title" icon="fas fa-sync-alt" tone="slate" title="Library updates" subtitle="Newer versions of the libraries that draw and edit diagrams" onClose={onClose} closeLabel="Close library updates" />

            <div className="px-5 py-5">
                <div className="mb-4 flex items-center gap-2 min-h-5">
                    {checking ? <Spinner text={status} /> : <p className="text-[13px] text-slate-700" role="status">{status}</p>}
                </div>

                {updates.length > 0 && (
                    <ul className="rounded-lg border border-slate-200 max-h-60 overflow-y-auto ui-scroll divide-y divide-slate-100">
                        {updates.map(lib => (
                            <li key={lib.id || lib.key || lib.name} className="flex justify-between items-center gap-3 px-3 py-2.5">
                                <div className="min-w-0">
                                    <p className="text-[13px] font-medium text-slate-900 truncate">{lib.name}</p>
                                    <p className="text-xs text-slate-500 tabular-nums">
                                        {lib.current || lib.currentVersion || 'Unknown version'}
                                        <i className="fas fa-arrow-right text-[9px] mx-1.5 text-slate-400" aria-hidden="true"></i>
                                        <span className="font-medium text-slate-800">{lib.latest || lib.latestVersion}</span>
                                    </p>
                                </div>
                                <span className={`text-[11px] font-medium px-1.5 h-5 inline-flex items-center rounded shrink-0 ${lib.isMajor ? 'bg-amber-50 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                                    {lib.isMajor ? 'Major update' : 'Update available'}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <ModalFooter className="justify-between">
                <span className="text-xs text-slate-500">Updating rewrites the library versions in config.js.</span>
                <div className="flex gap-2">
                    <Button variant="ghost" onClick={checkUpdates} disabled={checking || updating}>
                        Check again
                    </Button>
                    {updates.length > 0 && (
                        <Button variant="primary" icon={updating ? undefined : 'fas fa-cloud-download-alt'} onClick={handleUpdateAll} disabled={updating}>
                            {updating ? <><span className="ui-spinner !border-indigo-300 !border-t-white mr-1.5 align-[-2px]"></span>Updating…</> : 'Update all'}
                        </Button>
                    )}
                </div>
            </ModalFooter>
        </Modal>
    );
};
