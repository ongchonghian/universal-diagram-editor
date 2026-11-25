import React, { useState, useEffect } from 'react';
import { Button } from '../common.jsx';
import { DEFAULT_MODEL } from '../../services/ai-service.js';
import { rendererAdapter, normaliseKrokiUrl } from '../../services/RendererAdapter.js';
import { KROKI_BASE_URL } from '../../config.js';

// Stopgap list, checked against Google's model documentation on 25 November 2026.
// Phase 2 of the Smith rebuild replaces this list with the provider's live model list.
const MODEL_GROUPS = [
    { label: 'Flash (recommended)', models: [
        { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (default)' },
        { id: 'gemini-4-hydrogen', name: 'Gemini 4 Hydrogen' },
        { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash' }
    ] },
    { label: 'Flash-Lite (fastest)', models: [
        { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite' },
        { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash-Lite' }
    ] },
    { label: 'Pro (paid tier only)', models: [
        { id: 'gemini-4-carbon', name: 'Gemini 4 Carbon' }
    ] }
];
const KNOWN_MODELS = MODEL_GROUPS.flatMap(group => group.models.map(m => m.id));

export const AISettingsModal = ({ isOpen, onClose, aiService }) => {
    const [settings, setSettings] = useState({
        provider: 'gemini',
        model: DEFAULT_MODEL,
        apiKey: '',
        temperature: 0.7
    });

    // Empty means the public default server
    const [krokiUrl, setKrokiUrl] = useState('');
    const krokiUrlInvalid = krokiUrl.trim() !== '' && !normaliseKrokiUrl(krokiUrl);

    useEffect(() => {
        if (isOpen) {
            const currentSettings = aiService.getSettings();
            const isCustom = !KNOWN_MODELS.includes(currentSettings.model);
            
            setSettings({
                ...currentSettings,
                model: isCustom ? 'custom' : currentSettings.model,
                customModel: isCustom ? currentSettings.model : ''
            });
            const currentKroki = rendererAdapter.getBaseUrl();
            setKrokiUrl(currentKroki === KROKI_BASE_URL ? '' : currentKroki);
        }
    }, [isOpen, aiService]);


    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSave = () => {
        if (krokiUrlInvalid) return;
        const { customModel, ...rest } = settings;
        const modelToSave = settings.model === 'custom' ? customModel : settings.model;
        aiService.updateSettings({ ...rest, model: modelToSave });
        rendererAdapter.setBaseUrl(krokiUrl);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
                
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <i className="fas fa-robot text-indigo-600"></i>
                        AI Assistant Settings
                    </h3>
                    <button 
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    
                    {/* Provider (Read-only/Future proof) */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Provider</label>
                        <select 
                            name="provider" 
                            value={settings.provider} 
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-slate-50 text-slate-700 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                            disabled // Only Gemini for now
                        >
                            <option value="gemini">Google Gemini</option>
                            <option value="openai" disabled>OpenAI (Coming Soon)</option>
                            <option value="anthropic" disabled>Anthropic (Coming Soon)</option>
                        </select>
                    </div>

                    {/* Model Selection */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Model</label>
                        <select 
                            name="model" 
                            value={settings.model} 
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-white text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        >
                            {MODEL_GROUPS.map(group => (
                                <optgroup key={group.label} label={group.label}>
                                    {group.models.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </optgroup>
                            ))}
                            <option value="custom">Custom Model...</option>
                        </select>
                        {settings.model === 'custom' && (
                            <input
                                type="text"
                                placeholder="Enter model name (e.g. gemini-flash-latest)"
                                value={settings.customModel || ''}
                                onChange={(e) => setSettings(prev => ({ ...prev, customModel: e.target.value }))}
                                className="mt-2 w-full px-3 py-2 bg-slate-50 text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                            />
                        )}
                    </div>

                    {/* API Key */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">API Key</label>
                        <div className="relative">
                            <input 
                                type="password" 
                                name="apiKey" 
                                value={settings.apiKey} 
                                onChange={handleChange}
                                placeholder="Enter your Gemini API Key"
                                className="w-full px-3 py-2 pl-9 bg-white text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono"
                            />
                            <i className="fas fa-key absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        </div>
                        <p className="mt-1.5 text-xs text-slate-500">
                            Key is stored locally in your browser. 
                            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800 ml-1 hover:underline">
                                Get a key here
                            </a>
                        </p>
                    </div>

                    {/* Temperature */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Creativity (Temperature)</label>
                            <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{settings.temperature}</span>
                        </div>
                        <input 
                            type="range" 
                            name="temperature" 
                            min="0" 
                            max="1" 
                            step="0.1" 
                            value={settings.temperature} 
                            onChange={handleChange}
                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                            <span>Precise</span>
                            <span>Balanced</span>
                            <span>Creative</span>
                        </div>
                    </div>

                    {/* Diagram server (Kroki) */}
                    <div>
                        <label htmlFor="kroki-url" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Diagram server (Kroki)</label>
                        <input
                            id="kroki-url"
                            type="url"
                            value={krokiUrl}
                            onChange={(e) => setKrokiUrl(e.target.value)}
                            placeholder={KROKI_BASE_URL}
                            aria-invalid={krokiUrlInvalid}
                            className={`w-full px-3 py-2 bg-white text-slate-800 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono ${krokiUrlInvalid ? 'border-red-400' : 'border-slate-300'}`}
                        />
                        {krokiUrlInvalid && (
                            <p className="mt-1.5 text-xs text-red-600">The address must start with http:// or https://</p>
                        )}
                        <p className="mt-1.5 text-xs text-slate-500">
                            Every diagram type except Mermaid is sent to this server, both for the code preview and for Syntext Smith's checks.
                            Leave the field empty to use the public server at kroki.io, or enter the address of your own Kroki server to keep diagrams private.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={krokiUrlInvalid}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm transition-colors flex items-center gap-2"
                    >
                        <i className="fas fa-check"></i>
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
};
