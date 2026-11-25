import React, { useState, useEffect, useRef } from 'react';
import { DIAGRAM_TYPES } from '../config.js';
import { askSmith } from '../services/smith/index.js';
import { conversationStore } from '../services/smith/conversation-store.js';
import { aiService } from '../services/ai-service.js';
import { AISettingsModal } from './dialogs/AISettingsModal.jsx';
import { SemanticDiffModal } from './dialogs/SemanticDiffModal.jsx';

const typeName = (type) => DIAGRAM_TYPES[type]?.name || type;

/** One entry of the validation trail, in words. */
function describeStep(step) {
    const action = step.action === 'write' ? `Wrote ${typeName(step.type)}` : 'Edited';
    if (step.status === 'rejected') return { icon: 'fa-undo', tone: 'text-slate-500', text: `${action}: the edit did not match the draft` };
    if (step.status === 'valid') return { icon: 'fa-check', tone: 'text-emerald-600', text: `${action}: parsed` };
    if (step.status === 'unverified') return { icon: 'fa-question', tone: 'text-amber-600', text: `${action}: could not check` };
    return { icon: 'fa-times', tone: 'text-red-600', text: `${action}: parse error` };
}

const ValidationTrail = ({ trail }) => (
    <ul className="mt-2 space-y-0.5 text-[11px]" aria-label="What Smith checked">
        {trail.map((step, i) => {
            const d = describeStep(step);
            return (
                <li key={i} className={`flex items-center gap-1.5 ${d.tone}`}>
                    <i className={`fas ${d.icon} w-3 text-center`}></i>
                    <span>{d.text}</span>
                </li>
            );
        })}
    </ul>
);

/** The proposed change under a reply, with its check result and the Review button. */
const ProposalCard = ({ proposal, editorCode, editorType, onReview }) => {
    const stale = proposal.baseCode !== editorCode || proposal.baseType !== editorType;
    const status = proposal.verified
        ? { tone: 'bg-emerald-50 text-emerald-700', icon: 'fa-check-circle', text: 'Checked: the diagram is valid' }
        : proposal.status === 'unverified'
            ? { tone: 'bg-amber-50 text-amber-700', icon: 'fa-question-circle', text: 'Not checked: the diagram server could not be reached' }
            : { tone: 'bg-red-50 text-red-700', icon: 'fa-exclamation-circle', text: 'Not verified: the diagram still has an error' };
    return (
        <div className="mt-2 w-full max-w-[90%] rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <i className="fas fa-code-branch text-indigo-500"></i>
                    Proposed change · {typeName(proposal.type)}
                    {proposal.type !== proposal.baseType && proposal.baseCode && (
                        <span className="font-normal text-slate-500">(from {typeName(proposal.baseType)})</span>
                    )}
                </span>
                <button
                    onClick={onReview}
                    className="text-xs flex items-center gap-1 text-white font-medium px-2.5 py-1 bg-indigo-600 rounded hover:bg-indigo-700 transition-colors shrink-0"
                >
                    <i className="fas fa-eye"></i>
                    Review and apply
                </button>
            </div>
            <div className={`px-3 py-1.5 text-xs ${status.tone} flex items-start gap-1.5`}>
                <i className={`fas ${status.icon} mt-0.5`}></i>
                <span>
                    {status.text}
                    {!proposal.verified && proposal.error && <span className="block font-mono text-[11px] mt-0.5 whitespace-pre-wrap">{proposal.error}</span>}
                </span>
            </div>
            {stale && (
                <div className="px-3 py-1.5 text-[11px] text-slate-500 bg-slate-50 border-t border-slate-100">
                    The editor has changed since Smith made this proposal. Applying the proposal replaces the current code.
                </div>
            )}
        </div>
    );
};

export const AICopilot = ({
    isOpen,
    onClose,
    contextCode,
    diagramType,
    onApplyCode,
    isSidebar = false
}) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    // The reply as it streams in, and the checks made so far in this turn
    const [streamingText, setStreamingText] = useState('');
    const [liveTrail, setLiveTrail] = useState([]);
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [currentConversationId, setCurrentConversationId] = useState(null);
    const [conversations, setConversations] = useState({});
    const [reviewProposal, setReviewProposal] = useState(null);
    const [isInputExpanded, setIsInputExpanded] = useState(false);

    const messagesEndRef = useRef(null);
    const messageRefs = useRef({});
    const abortRef = useRef(null);
    // Tracks the open conversation, so a late reply is not shown in another conversation
    const currentConversationRef = useRef(null);

    useEffect(() => {
        currentConversationRef.current = currentConversationId;
    }, [currentConversationId]);

    useEffect(() => {
        if (isOpen) loadConversations();
    }, [isOpen]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping, liveTrail.length]);

    // Stop a reply that is still running when the panel unmounts
    useEffect(() => () => abortRef.current?.abort(), []);

    const refreshList = () => setConversations(conversationStore.getAll());

    const loadConversations = () => {
        const all = conversationStore.getAll();
        setConversations(all);
        if (!currentConversationId) {
            const sortedIds = Object.keys(all).sort((a, b) => all[b].lastModified - all[a].lastModified);
            if (sortedIds.length > 0) selectConversation(sortedIds[0]);
            else createNewConversation();
        } else {
            const convo = conversationStore.get(currentConversationId);
            if (convo) setMessages(convo.messages);
        }
    };

    const createNewConversation = () => {
        const id = conversationStore.create();
        refreshList();
        setCurrentConversationId(id);
        setMessages([]);
        setShowHistory(false);
    };

    const selectConversation = (id) => {
        const convo = conversationStore.get(id);
        if (convo) {
            setCurrentConversationId(id);
            setMessages(convo.messages);
            setShowHistory(false);
        }
    };

    const handleDeleteConversation = (e, id) => {
        e.stopPropagation();
        conversationStore.remove(id);
        const remaining = conversationStore.getAll();
        setConversations(remaining);
        if (id === currentConversationId) {
            const sorted = Object.keys(remaining).sort((a, b) => remaining[b].lastModified - remaining[a].lastModified);
            if (sorted.length > 0) selectConversation(sorted[0]);
            else createNewConversation();
        }
    };

    /**
     * Run Smith for a request and return the assistant message to store.
     * @param {Array} earlier  the chat messages before this request
     */
    const runReply = async (request, earlier, isStillOpen) => {
        const controller = new AbortController();
        abortRef.current = controller;
        setStreamingText('');
        setLiveTrail([]);
        let partial = '';
        try {
            const result = await askSmith({
                request,
                messages: earlier,
                code: contextCode,
                type: diagramType,
                signal: controller.signal,
                onEvent: (event) => {
                    if (!isStillOpen()) return;
                    if (event.type === 'text') {
                        partial = event.text;
                        setStreamingText(event.text);
                    } else if (event.type === 'step') {
                        setLiveTrail(prev => [...prev, event.step]);
                    }
                }
            });
            return {
                role: 'assistant',
                content: result.text || (result.proposal ? 'Here is the change.' : 'Smith finished without a reply.'),
                ...(result.proposal ? { proposal: result.proposal } : {}),
                ...(result.trail.length ? { trail: result.trail } : {}),
                ...(result.suggestions.length ? { suggestions: result.suggestions } : {}),
                ...(result.limitReached ? { limitReached: true } : {})
            };
        } catch (error) {
            if (error?.name === 'AbortError') {
                return { role: 'assistant', content: partial ? `${partial}\n\n(Stopped before the end.)` : 'Stopped.', isStopped: true };
            }
            if (error?.code === 'NOT_CONFIGURED') setShowSettings(true);
            return { role: 'assistant', content: `Error: ${error.message}`, isError: true };
        } finally {
            abortRef.current = null;
            setStreamingText('');
            setLiveTrail([]);
        }
    };

    const handleSend = async (textOverride = null) => {
        const textToSend = typeof textOverride === 'string' ? textOverride : input;
        if (isTyping || !textToSend.trim() || !currentConversationId) return;

        const conversationId = currentConversationId;
        const isStillOpen = () => currentConversationRef.current === conversationId;
        const userMessage = { role: 'user', content: textToSend };
        const earlier = messages;

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);
        conversationStore.append(conversationId, userMessage);
        refreshList();

        const reply = await runReply(textToSend, earlier, isStillOpen);
        if (isStillOpen()) setMessages(prev => [...prev, reply]);
        conversationStore.append(conversationId, reply);
        setIsTyping(false);
        refreshList();
    };

    /** Ask again for the last answer, and replace that answer. */
    const handleRegenerate = async () => {
        if (!currentConversationId || isTyping) return;
        const conversationId = currentConversationId;
        const isStillOpen = () => currentConversationRef.current === conversationId;
        const convo = conversationStore.get(conversationId);
        const lastUser = convo ? convo.messages.map(m => m.role).lastIndexOf('user') : -1;
        if (lastUser === -1) return;

        const kept = convo.messages.slice(0, lastUser + 1);
        setMessages(kept);
        setIsTyping(true);
        const reply = await runReply(convo.messages[lastUser].content, convo.messages.slice(0, lastUser), isStillOpen);
        if (isStillOpen()) setMessages([...kept, reply]);
        conversationStore.setMessages(conversationId, [...kept, reply]);
        setIsTyping(false);
        refreshList();
    };

    const handleStop = () => abortRef.current?.abort();

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) return null;

    const scrollToMessage = (index) => {
        messageRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const lastAssistantIndex = messages.map(m => m.role).lastIndexOf('assistant');

    const ChatTimeline = () => (
        <div className="absolute right-1 top-4 bottom-4 w-4 bg-transparent z-50 flex flex-col gap-1 items-center overflow-y-auto no-scrollbar pointer-events-auto pb-4">
            {messages.map((msg, idx) => (
                <div key={idx} className="group relative pointer-events-auto">
                    <button
                        onClick={() => scrollToMessage(idx)}
                        className={`w-2 h-2 rounded-full transition-all duration-200 ${
                            msg.role === 'user'
                                ? 'bg-indigo-400 hover:bg-indigo-600 hover:scale-125'
                                : msg.isError
                                    ? 'bg-red-400 hover:bg-red-600'
                                    : 'bg-slate-300 hover:bg-slate-500 hover:scale-125'
                        }`}
                        aria-label={`Jump to message ${idx + 1}`}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap max-w-[150px] truncate shadow-lg pointer-events-none z-20">
                        {msg.role === 'user' ? 'User: ' : 'AI: '}
                        {msg.content.slice(0, 30)}...
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className={
            isSidebar
            ? "w-full h-full flex flex-col bg-white overflow-hidden relative"
            : "fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-40 flex flex-col border-l border-slate-200 transform transition-transform duration-300 ease-in-out"
        }>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 shrink-0 z-10">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className={`p-2 rounded-full transition-colors ${showHistory ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-indigo-600 hover:bg-slate-200'}`}
                        title="Conversation History"
                    >
                        <i className="fas fa-history"></i>
                    </button>
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        Syntext Smith
                    </h3>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={createNewConversation}
                        disabled={isTyping}
                        className="p-2 text-slate-500 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition-colors disabled:opacity-40"
                        title="New Chat"
                    >
                        <i className="fas fa-plus"></i>
                    </button>
                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2 text-slate-400 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition-colors"
                        title="Settings"
                    >
                        <i className="fas fa-cog"></i>
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                        title="Close"
                    >
                        <i className="fas fa-times"></i>
                    </button>
                </div>
            </div>

            {/* History */}
            {showHistory && (
                <div className="absolute top-[60px] left-0 right-0 bottom-0 bg-white z-20 overflow-y-auto border-t border-slate-200 animate-fade-in">
                    <div className="p-2 space-y-1">
                        <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Recent Chats
                        </div>
                        {Object.values(conversations)
                            .sort((a, b) => b.lastModified - a.lastModified)
                            .map(convo => (
                            <div
                                key={convo.id}
                                onClick={() => !isTyping && selectConversation(convo.id)}
                                className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-sm ${
                                    convo.id === currentConversationId ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            >
                                <span className="truncate flex-1 pr-2">
                                    <i className="far fa-comment-alt mr-2 opacity-50"></i>
                                    {convo.title || 'New Conversation'}
                                </span>
                                <button
                                    onClick={(e) => handleDeleteConversation(e, convo.id)}
                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-opacity"
                                    aria-label="Delete conversation"
                                >
                                    <i className="fas fa-trash-alt text-xs"></i>
                                </button>
                            </div>
                        ))}
                        {Object.keys(conversations).length === 0 && (
                            <div className="text-center py-8 text-slate-400 text-sm">
                                No history yet.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 relative min-h-0 bg-slate-50/50">
                <ChatTimeline />

                <div className="absolute inset-0 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            ref={el => messageRefs.current[idx] = el}
                            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                        >
                            <div
                                className={`max-w-[90%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap shadow-sm ${
                                    msg.role === 'user'
                                    ? 'bg-indigo-600 text-white rounded-br-none'
                                    : msg.isError
                                        ? 'bg-red-50 text-red-700 border border-red-100'
                                        : msg.isStopped
                                            ? 'bg-slate-50 text-slate-500 border border-dashed border-slate-300 rounded-bl-none'
                                            : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                                }`}
                            >
                                {msg.content}
                                {msg.trail?.length > 0 && <ValidationTrail trail={msg.trail} />}
                                {msg.limitReached && (
                                    <p className="mt-2 text-[11px] text-amber-700">Smith stopped after the most steps allowed for one request.</p>
                                )}
                            </div>

                            {msg.proposal && (
                                <ProposalCard
                                    proposal={msg.proposal}
                                    editorCode={contextCode}
                                    editorType={diagramType}
                                    onReview={() => setReviewProposal(msg.proposal)}
                                />
                            )}

                            {msg.suggestions?.length > 0 && idx === lastAssistantIndex && (
                                <div className="mt-2 flex flex-wrap gap-2 max-w-[90%]">
                                    {msg.suggestions.map((suggestion, sIdx) => (
                                        <button
                                            key={sIdx}
                                            onClick={() => handleSend(suggestion)}
                                            disabled={isTyping}
                                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full border border-indigo-200 transition-colors shadow-sm disabled:opacity-50"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {msg.role === 'assistant' && !msg.isError && (
                                <div className="mt-1 flex gap-2">
                                    {idx === lastAssistantIndex && (
                                        <button
                                            onClick={handleRegenerate}
                                            disabled={isTyping}
                                            className="text-xs flex items-center gap-1 text-slate-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors disabled:opacity-50"
                                        >
                                            <i className="fas fa-sync-alt"></i>
                                            Regenerate
                                        </button>
                                    )}
                                    <button
                                        onClick={() => navigator.clipboard.writeText(msg.content)}
                                        className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                                    >
                                        <i className="fas fa-copy"></i>
                                        Copy
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}

                    {messages.length === 0 && !isTyping && (
                        <div className="text-center py-10 text-slate-400">
                            <i className="fas fa-robot text-4xl mb-3 opacity-20"></i>
                            <p className="text-sm">Start a new conversation</p>
                        </div>
                    )}

                    {isTyping && (
                        <div className="flex flex-col items-start" aria-live="polite">
                            <div className="max-w-[90%] bg-white px-4 py-3 rounded-lg rounded-bl-none border border-slate-200 shadow-sm text-sm text-slate-700 whitespace-pre-wrap">
                                {streamingText || (
                                    <div className="flex gap-1" aria-label="Smith is working">
                                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                                        <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                                    </div>
                                )}
                                {liveTrail.length > 0 && <ValidationTrail trail={liveTrail} />}
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                <div className="relative">
                    <button
                        onClick={() => setIsInputExpanded(!isInputExpanded)}
                        className="absolute right-2 top-[-30px] p-1 text-slate-400 hover:text-indigo-600 bg-white border border-slate-200 rounded shadow-sm text-xs flex items-center gap-1"
                        title={isInputExpanded ? "Collapse Input" : "Expand Input"}
                    >
                        <i className={`fas ${isInputExpanded ? 'fa-compress-alt' : 'fa-expand-alt'}`}></i>
                        {isInputExpanded ? 'Collapse' : 'Expand'}
                    </button>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Describe a diagram or ask for help..."
                        className={`w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm ${isInputExpanded ? 'h-64 resize-y' : 'resize-none max-h-32 min-h-[50px]'}`}
                        rows={isInputExpanded ? 10 : 1}
                        style={{ height: isInputExpanded ? undefined : 'auto' }}
                    />
                    {isTyping ? (
                        <button
                            onClick={handleStop}
                            title="Stop"
                            aria-label="Stop"
                            className="absolute right-2 bottom-2 p-2 bg-slate-700 text-white rounded-lg hover:bg-slate-900 transition-all shadow-sm w-8 h-8 flex items-center justify-center"
                        >
                            <i className="fas fa-stop text-xs"></i>
                        </button>
                    ) : (
                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim()}
                            title="Send"
                            aria-label="Send"
                            className="absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all shadow-sm w-8 h-8 flex items-center justify-center"
                        >
                            <i className="fas fa-paper-plane text-xs"></i>
                        </button>
                    )}
                </div>
                <div className="mt-2 flex justify-center text-[10px] text-slate-400 gap-4">
                    <span><i className="fas fa-keyboard mr-1"></i>Enter to send</span>
                    <span><i className="fas fa-level-up-alt mr-1"></i>Shift+Enter for new line</span>
                </div>
            </div>

            <AISettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                aiService={aiService}
            />

            {reviewProposal && (
                <SemanticDiffModal
                    isOpen={true}
                    onClose={() => setReviewProposal(null)}
                    onConfirm={() => {
                        onApplyCode(reviewProposal.code, reviewProposal.type);
                        setReviewProposal(null);
                    }}
                    oldCode={contextCode}
                    newCode={reviewProposal.code}
                    diagramType={reviewProposal.type}
                />
            )}
        </div>
    );
};
