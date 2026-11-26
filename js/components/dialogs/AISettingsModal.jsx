import React, { useState, useEffect, useRef } from 'react';
import { PROVIDERS, PROVIDER_IDS, listModels, normaliseBaseUrl } from '../../services/llm/index.js';
import { rendererAdapter, normaliseKrokiUrl } from '../../services/RendererAdapter.js';
import { KROKI_BASE_URL } from '../../config.js';
import { Modal, ModalHeader, ModalFooter, Button, inputClass } from '../common.jsx';

const OTHER = '__other__';

const labelClass = 'block text-xs font-medium text-slate-700 mb-1.5';
const hintClass = 'mt-1.5 text-xs leading-relaxed text-slate-500';
const errorClass = 'mt-1.5 text-xs leading-relaxed text-red-600';

const KEY_PLACEHOLDERS = {
    gemini: 'Enter your Gemini API key',
    anthropic: 'Enter your Anthropic API key',
    'openai-compatible': 'Optional. Leave empty for a local server such as Ollama.'
};

export const AISettingsModal = ({ isOpen, onClose, aiService }) => {
    const [draft, setDraft] = useState(() => aiService.getSettings());
    // Empty means the public default server
    const [krokiUrl, setKrokiUrl] = useState('');
    // Live model lists by provider: { status: 'idle' | 'loading' | 'ready' | 'error', models, error }
    const [modelLists, setModelLists] = useState({});
    const [typingModel, setTypingModel] = useState(false);
    const listRequest = useRef(null);

    const providerId = draft.provider;
    const provider = PROVIDERS[providerId];
    const config = draft.providers[providerId];
    const modelList = modelLists[providerId] || { status: 'idle', models: [] };

    const krokiUrlInvalid = krokiUrl.trim() !== '' && !normaliseKrokiUrl(krokiUrl);
    const baseUrlInvalid = provider.needsBaseUrl && (config.baseUrl || '').trim() !== '' &&!normaliseBaseUrl(config.baseUrl);
    const canSave = !krokiUrlInvalid && !baseUrlInvalid;

    useEffect(() => {
        if (!isOpen) return;
        setDraft(aiService.getSettings());
        setModelLists({});
        setTypingModel(false);
        const currentKroki = rendererAdapter.getBaseUrl();
        setKrokiUrl(currentKroki === KROKI_BASE_URL ? '' : currentKroki);
    }, [isOpen, aiService]);

    // Load the provider's model list once the provider has what listing needs
    const canList = provider.needsBaseUrl ? !!normaliseBaseUrl(config.baseUrl) : !!config.apiKey;
    const loadModels = () => {
        listRequest.current?.abort();
        const controller = new AbortController();
        listRequest.current = controller;
        const id = providerId;
        setModelLists(prev => ({ ...prev, [id]: { status: 'loading', models: prev[id]?.models || [] } }));
        listModels({ provider: id, ...draft.providers[id] }, { signal: controller.signal })
            .then(models => setModelLists(prev => ({ ...prev, [id]: { status: 'ready', models } })))
            .catch(error => {
                if (error?.name === 'AbortError') return;
                setModelLists(prev => ({ ...prev, [id]: { status: 'error', models: [], error: error.message } }));
            });
    };

    useEffect(() => {
        if (!isOpen || !canList || modelList.status !== 'idle') return;
        const timer = setTimeout(loadModels, 400);
        return () => clearTimeout(timer);
    }, [isOpen, providerId, canList, modelList.status]);

    useEffect(() => () => listRequest.current?.abort(), []);

    const setProviderField = (field, value) => {
        setDraft(prev => ({ ...prev, providers: { ...prev.providers, [providerId]: { ...prev.providers[providerId], [field]: value } } }));
        // A new key or address can change which models are listed
        if (field === 'apiKey' || field === 'baseUrl') setModelLists(prev => ({ ...prev, [providerId]: undefined }));
    };

    const handleSave = () => {
        if (!canSave) return;
        aiService.updateSettings({
            ...draft,
            providers: Object.fromEntries(PROVIDER_IDS.map(id => {
                const values = { ...draft.providers[id], model: (draft.providers[id].model || '').trim(), apiKey: (draft.providers[id].apiKey || '').trim() };
                if (PROVIDERS[id].needsBaseUrl) values.baseUrl = normaliseBaseUrl(values.baseUrl) || '';
                return [id, values];
            }))
        });
        rendererAdapter.setBaseUrl(krokiUrl);
        onClose();
    };

    if (!isOpen) return null;

    // The model menu: the live list, plus the saved model when the list does not include the saved model
    const listed = modelList.models;
    const savedIsListed = listed.some(m => m.id === config.model);
    const options = config.model && !savedIsListed ? [{ id: config.model, name: config.model }, ...listed] : listed;
    const showModelInput = typingModel || options.length === 0;

    return (
        <Modal onClose={onClose} labelledBy="ai-settings-title" className="max-w-md max-h-[90vh]" closeOnBackdrop={false}>

                <ModalHeader
                    id="ai-settings-title"
                    icon="fas fa-magic"
                    title="Syntext Smith settings"
                    subtitle="The AI model and the diagram server"
                    onClose={onClose}
                    closeLabel="Close settings"
                />

                {/* Body */}
                <div className="px-5 py-5 space-y-5 overflow-y-auto ui-scroll">

                    {/* Provider */}
                    <div>
                        <label htmlFor="ai-provider" className={labelClass}>Provider</label>
                        <select
                            id="ai-provider"
                            value={providerId}
                            onChange={(e) => { setDraft(prev => ({ ...prev, provider: e.target.value })); setTypingModel(false); }}
                            className={inputClass}
                        >
                            {PROVIDER_IDS.map(id => <option key={id} value={id}>{PROVIDERS[id].label}</option>)}
                        </select>
                        {providerId === 'anthropic' && (
                            <p className={hintClass}>
                                Requests go straight from this browser to Anthropic. Organisations with zero data retention cannot use browser access.
                            </p>
                        )}
                        {providerId === 'openai-compatible' && (
                            <p className={hintClass}>
                                For any server that offers OpenAI's Chat Completions API, such as OpenRouter, Ollama or LM Studio. The server must accept requests from this page.
                            </p>
                        )}
                    </div>

                    {/* Base address (OpenAI-compatible only) */}
                    {provider.needsBaseUrl && (
                        <div>
                            <label htmlFor="ai-base-url" className={labelClass}>Base address</label>
                            <input
                                id="ai-base-url"
                                type="url"
                                value={config.baseUrl || ''}
                                onChange={(e) => setProviderField('baseUrl', e.target.value)}
                                placeholder="https://openrouter.ai/api/v1"
                                aria-invalid={baseUrlInvalid}
                                spellCheck={false}
                                className={`${inputClass} font-mono text-xs ${baseUrlInvalid ? '!border-red-400 !ring-red-500/20' : ''}`}
                            />
                            {baseUrlInvalid
                                ? <p className={errorClass}>The address must start with http:// or https://</p>
                                : <p className={hintClass}>For Ollama on this computer, use http://localhost:11434/v1</p>}
                        </div>
                    )}

                    {/* API Key */}
                    <div>
                        <label htmlFor="ai-api-key" className={labelClass}>API key</label>
                        <div className="relative">
                            <input
                                id="ai-api-key"
                                type="password"
                                autoComplete="off"
                                value={config.apiKey || ''}
                                onChange={(e) => setProviderField('apiKey', e.target.value)}
                                placeholder={KEY_PLACEHOLDERS[providerId]}
                                className={`${inputClass} pl-9 font-mono text-xs`}
                            />
                            <i className="fas fa-key absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs" aria-hidden="true"></i>
                        </div>
                        {provider.keyUrl && (
                            <p className={hintClass}>
                                <a href={provider.keyUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-700 font-medium hover:underline underline-offset-2">
                                    Get a {provider.label} key
                                </a>
                            </p>
                        )}
                    </div>

                    {/* Model */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label htmlFor="ai-model" className="text-xs font-medium text-slate-700">Model</label>
                            {canList && (
                                <button
                                    type="button"
                                    onClick={loadModels}
                                    disabled={modelList.status === 'loading'}
                                    className="h-6 px-1.5 -mr-1.5 rounded text-xs font-medium text-indigo-700 hover:bg-indigo-50 disabled:text-slate-400 flex items-center gap-1.5 transition-colors"
                                >
                                    <i className={`fas fa-sync-alt ${modelList.status === 'loading' ? 'animate-spin' : ''}`}></i>
                                    {modelList.status === 'loading' ? 'Loading the models…' : 'Refresh the list'}
                                </button>
                            )}
                        </div>
                        {!showModelInput && (
                            <select
                                id="ai-model"
                                value={config.model || ''}
                                onChange={(e) => {
                                    if (e.target.value === OTHER) setTypingModel(true);
                                    else setProviderField('model', e.target.value);
                                }}
                                className={inputClass}
                            >
                                {options.map(m => (
                                    <option key={m.id} value={m.id}>{m.name === m.id ? m.id : `${m.name} (${m.id})`}</option>
                                ))}
                                <option value={OTHER}>Other model id…</option>
                            </select>
                        )}
                        {showModelInput && (
                            <input
                                id="ai-model"
                                type="text"
                                value={config.model || ''}
                                onChange={(e) => setProviderField('model', e.target.value)}
                                placeholder={provider.defaultModel || 'Enter the model id'}
                                spellCheck={false}
                                className={`${inputClass} font-mono text-xs`}
                            />
                        )}
                        {modelList.status === 'error' && (
                            <p className={errorClass}>Could not load the model list: {modelList.error} You can still type a model id.</p>
                        )}
                        {!canList && (
                            <p className={hintClass}>
                                {provider.needsBaseUrl ? 'Enter the base address to load the list of models.' : 'Enter the API key to load the list of models.'}
                            </p>
                        )}
                    </div>

                    {/* Remember keys */}
                    <div>
                        <label className="flex items-start gap-2.5 text-[13px] font-medium text-slate-800 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={!!draft.rememberKeys}
                                onChange={(e) => setDraft(prev => ({ ...prev, rememberKeys: e.target.checked }))}
                                className="mt-0.5 w-4 h-4 accent-indigo-600"
                            />
                            <span>Remember keys in this browser</span>
                        </label>
                        <p className="mt-1 ml-[26px] text-xs leading-relaxed text-slate-500">
                            Without this option, keys are kept for this browser tab only and are cleared when the tab closes.
                            Remembered keys are stored as plain text in this browser, where other scripts on this page can read them.
                        </p>
                    </div>

                    {/* Temperature */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label htmlFor="ai-temperature" className="text-xs font-medium text-slate-700">Creativity (temperature)</label>
                            <span className="text-xs tabular-nums font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">{draft.temperature}</span>
                        </div>
                        <input
                            id="ai-temperature"
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={draft.temperature}
                            onChange={(e) => setDraft(prev => ({ ...prev, temperature: e.target.value }))}
                            className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="flex justify-between text-[11px] text-slate-400 mt-1.5">
                            <span>Precise</span>
                            <span>Balanced</span>
                            <span>Creative</span>
                        </div>
                        {providerId === 'anthropic' && (
                            <p className={hintClass}>Current Claude models do not accept a temperature, so Smith leaves the setting out for Anthropic.</p>
                        )}
                    </div>

                    {/* Diagram server (Kroki) */}
                    <div className="pt-5 border-t border-slate-100">
                        <label htmlFor="kroki-url" className={labelClass}>Diagram server (Kroki)</label>
                        <input
                            id="kroki-url"
                            type="url"
                            value={krokiUrl}
                            onChange={(e) => setKrokiUrl(e.target.value)}
                            placeholder={KROKI_BASE_URL}
                            aria-invalid={krokiUrlInvalid}
                            className={`${inputClass} font-mono text-xs ${krokiUrlInvalid ? '!border-red-400 !ring-red-500/20' : ''}`}
                        />
                        {krokiUrlInvalid && (
                            <p className={errorClass}>The address must start with http:// or https://</p>
                        )}
                        <p className={hintClass}>
                            Every diagram type except Mermaid is sent to this server, both for the code preview and for Syntext Smith's checks.
                            Leave the field empty to use the public server at kroki.io, or enter the address of your own Kroki server to keep diagrams private.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <ModalFooter>
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button variant="primary" icon="fas fa-check" onClick={handleSave} disabled={!canSave}>
                        Save settings
                    </Button>
                </ModalFooter>
        </Modal>
    );
};
