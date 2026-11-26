import React, { useState, useEffect, useRef } from 'react';
import { DIAGRAM_TYPES } from '../config.js';
import { askSmith } from '../services/smith/index.js';
import { conversationStore } from '../services/smith/conversation-store.js';
import { aiService } from '../services/ai-service.js';
import { AISettingsModal } from './dialogs/AISettingsModal.jsx';
import { imageFileToPart, ACCEPTED_IMAGE_TYPES } from '../services/diagram-tools/rasterise.js';
import { IconButton, Button } from './common.jsx';

// Pictures attached to one message, at most
const MAX_PICTURES = 4;
const DEFAULT_PICTURE_REQUEST = 'Turn this picture into a diagram.';
const imageSrc = (image) => `data:${image.mimeType};base64,${image.data}`;

const typeName = (type) => DIAGRAM_TYPES[type]?.label || DIAGRAM_TYPES[type]?.name || type;

/** One entry of the validation trail, in words. */
function describeStep(step) {
    if (step.action === 'look') {
        return step.status === 'rendered'
            ? { icon: 'fa-eye', tone: 'text-slate-500', text: 'Looked at the render' }
            : { icon: 'fa-eye-slash', tone: 'text-slate-500', text: 'Could not render the draft to look at' };
    }
    if (step.action === 'layout') {
        return step.status === 'valid'
            ? { icon: 'fa-project-diagram', tone: 'text-emerald-600', text: 'Laid out the diagram' }
            : { icon: 'fa-times', tone: 'text-red-600', text: 'Laid out the diagram, but the result has an error' };
    }
    const action = step.action === 'write' ? `Wrote ${typeName(step.type)}` : 'Edited';
    if (step.status === 'rejected') return { icon: 'fa-undo', tone: 'text-slate-500', text: `${action}: the edit did not match the draft` };
    if (step.status === 'valid') {
        const layout = { kept: ', layout kept', regenerated: ', laid out again', created: ', laid out' }[step.layout] || '';
        const lint = step.lint ? `, ${step.lint === 1 ? '1 finding' : `${step.lint} findings`}` : '';
        return { icon: 'fa-check', tone: 'text-emerald-600', text: `${action}: parsed${layout}${lint}` };
    }
    if (step.status === 'unverified') return { icon: 'fa-question', tone: 'text-amber-600', text: `${action}: could not check` };
    return { icon: 'fa-times', tone: 'text-red-600', text: `${action}: parse error` };
}

/** The pictures on a user message: thumbnails while the session lasts, names after a reload. */
const MessagePictures = ({ msg }) => {
    if (msg.images?.length) {
        return (
            <div className="mb-2 flex flex-wrap gap-1.5 justify-end">
                {msg.images.map((image, i) => (
                    <img key={i} src={imageSrc(image)} alt={image.name || 'Attached picture'} className="h-16 max-w-[8rem] object-cover rounded-md ring-1 ring-slate-900/10 bg-white" />
                ))}
            </div>
        );
    }
    if (msg.pictures?.length) {
        return (
            <p className="mb-1 text-xs text-slate-500">
                <i className="fas fa-image mr-1" aria-hidden="true"></i>
                {msg.pictures.length === 1 ? '1 picture attached' : `${msg.pictures.length} pictures attached`} (pictures are kept only until the page reloads)
            </p>
        );
    }
    return null;
};

const ValidationTrail = ({ trail }) => (
    <ul className="mt-2.5 pt-2 border-t border-slate-100 space-y-1 text-xs" aria-label="What Smith checked">
        {trail.map((step, i) => {
            const d = describeStep(step);
            return (
                <li key={i} className={`flex items-center gap-2 ${d.tone}`}>
                    <i className={`fas ${d.icon} w-3 text-center text-[10px]`} aria-hidden="true"></i>
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
        ? { tone: 'bg-emerald-50/70 text-emerald-800 border-emerald-100', icon: 'fa-check-circle', text: 'Checked: the diagram is valid' }
        : proposal.status === 'unverified'
            ? { tone: 'bg-amber-50 text-amber-800 border-amber-100', icon: 'fa-question-circle', text: 'Not checked: the diagram server could not be reached' }
            : { tone: 'bg-red-50 text-red-700 border-red-100', icon: 'fa-exclamation-circle', text: 'Not verified: the diagram still has an error' };
    return (
        <div className="mt-2.5 w-full rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="px-3 py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs shrink-0" aria-hidden="true">
                        <i className="fas fa-code-branch"></i>
                    </span>
                    <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-slate-900 leading-tight">Proposed change</p>
                        <p className="text-xs text-slate-500 leading-tight mt-0.5 truncate">
                            {typeName(proposal.type)}
                            {proposal.type !== proposal.baseType && proposal.baseCode && ` (from ${typeName(proposal.baseType)})`}
                        </p>
                    </div>
                </div>
                <Button variant="primary" size="sm" icon="fas fa-eye" onClick={onReview} className="shrink-0">
                    Review and apply
                </Button>
            </div>
            <div className={`px-3 py-2 text-xs ${status.tone} flex items-start gap-2 border-t`}>
                <i className={`fas ${status.icon} mt-0.5`} aria-hidden="true"></i>
                <span className="min-w-0">
                    {status.text}
                    {!proposal.verified && proposal.error && <span className="block font-mono text-[11px] mt-1 whitespace-pre-wrap break-words opacity-90">{proposal.error}</span>}
                </span>
            </div>
            {proposal.layout === 'regenerated' && (
                <div className="px-3 py-2 text-xs leading-relaxed text-amber-800 bg-amber-50 border-t border-amber-100 flex items-start gap-2">
                    <i className="fas fa-project-diagram mt-0.5" aria-hidden="true"></i>
                    <span>The change adds, removes or reconnects elements, so the app laid out the diagram again. Shapes you arranged by hand move.</span>
                </div>
            )}
            {proposal.lint?.length > 0 && (
                <details className="group px-3 py-2 text-xs text-slate-600 border-t border-slate-100">
                    <summary className="cursor-pointer list-none flex items-center gap-2 select-none hover:text-slate-900">
                        <i className="fas fa-chevron-right text-[9px] text-slate-400 transition-transform group-open:rotate-90" aria-hidden="true"></i>
                        {proposal.lint.length === 1 ? '1 modelling finding' : `${proposal.lint.length} modelling findings`}
                    </summary>
                    <ul className="mt-1.5 ml-5 list-disc space-y-1 leading-relaxed">
                        {proposal.lint.map((finding, i) => <li key={i}>{finding}</li>)}
                    </ul>
                </details>
            )}
            {stale && (
                <div className="px-3 py-2 text-xs leading-relaxed text-slate-500 bg-slate-50 border-t border-slate-100">
                    The editor has changed since Smith made this proposal. The review compares the proposal with the current code.
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
    // Opens a proposal in the code pane's review
    onReviewProposal,
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
    const [isInputExpanded, setIsInputExpanded] = useState(false);
    // Pictures waiting to go with the next message, as image parts with a name
    const [attachments, setAttachments] = useState([]);
    const [attachError, setAttachError] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);
    // The message whose text was just copied, for a moment of feedback
    const [copiedIndex, setCopiedIndex] = useState(null);

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
    const runReply = async (request, earlier, isStillOpen, images = []) => {
        const controller = new AbortController();
        abortRef.current = controller;
        setStreamingText('');
        setLiveTrail([]);
        let partial = '';
        try {
            const result = await askSmith({
                request,
                images,
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

    /** Turn picked, pasted or dropped files into attachments. Files that are not pictures are refused with a message. */
    const addFiles = async (fileList) => {
        const files = Array.from(fileList || []);
        if (!files.length) return;
        setAttachError('');
        const room = MAX_PICTURES - attachments.length;
        if (room <= 0) {
            setAttachError(`A message can carry ${MAX_PICTURES} pictures at most.`);
            return;
        }
        const added = [];
        const problems = [];
        for (const file of files.slice(0, room)) {
            try {
                added.push(await imageFileToPart(file));
            } catch (e) {
                problems.push(e.message);
            }
        }
        if (files.length > room) problems.push(`Only the first ${room} ${room === 1 ? 'picture was' : 'pictures were'} added; a message can carry ${MAX_PICTURES} at most.`);
        if (added.length) setAttachments(prev => [...prev, ...added]);
        if (problems.length) setAttachError(problems.join(' '));
    };

    const handlePaste = (e) => {
        const images = Array.from(e.clipboardData?.files || []).filter(f => f.type.startsWith('image/'));
        if (!images.length) return;
        e.preventDefault();
        addFiles(images);
    };

    const handleDragOver = (e) => {
        if (!Array.from(e.dataTransfer?.types || []).includes('Files')) return;
        // The app opens files dropped anywhere else; a file dropped on the chat is an attachment only
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDrop = (e) => {
        if (!e.dataTransfer?.files?.length) return;
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        addFiles(e.dataTransfer.files);
    };

    const handleSend = async (textOverride = null) => {
        const typed = typeof textOverride === 'string' ? textOverride : input;
        // Suggestion chips send text only; the attached pictures wait for the next typed message
        const images = typeof textOverride === 'string' ? [] : attachments;
        const textToSend = typed.trim() ? typed : images.length ? DEFAULT_PICTURE_REQUEST : '';
        if (isTyping || !textToSend.trim() || !currentConversationId) return;

        const conversationId = currentConversationId;
        const isStillOpen = () => currentConversationRef.current === conversationId;
        const userMessage = { role: 'user', content: textToSend, ...(images.length ? { images } : {}) };
        const earlier = messages;

        setMessages(prev => [...prev, userMessage]);
        if (images.length) {
            setAttachments([]);
            setAttachError('');
        }
        setInput('');
        setIsTyping(true);
        conversationStore.append(conversationId, userMessage);
        refreshList();

        const reply = await runReply(textToSend, earlier, isStillOpen, images);
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

        // The pictures live only in the panel's memory, so they come from the shown messages, not the store
        const images = messages[lastUser]?.role === 'user' ? (messages[lastUser].images || []) : [];
        const kept = [...convo.messages.slice(0, lastUser), { ...convo.messages[lastUser], ...(images.length ? { images } : {}) }];
        setMessages(kept);
        setIsTyping(true);
        const reply = await runReply(convo.messages[lastUser].content, convo.messages.slice(0, lastUser), isStillOpen, images);
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
        <nav className="absolute right-1.5 top-4 bottom-4 w-3 z-10 flex flex-col gap-1.5 items-center overflow-y-auto no-scrollbar pb-4" aria-label="Messages">
            {messages.map((msg, idx) => (
                <div key={idx} className="group relative">
                    <button
                        onClick={() => scrollToMessage(idx)}
                        className={`block w-1.5 h-1.5 rounded-full transition-transform duration-150 hover:scale-150 ${
                            msg.role === 'user'
                                ? 'bg-indigo-400'
                                : msg.isError
                                    ? 'bg-red-400'
                                    : 'bg-slate-300'
                        }`}
                        aria-label={`Jump to message ${idx + 1}`}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[11px] px-2 py-1 rounded-md whitespace-nowrap max-w-[180px] truncate shadow-lg pointer-events-none z-20">
                        {msg.role === 'user' ? 'You: ' : 'Smith: '}
                        {msg.content}
                    </div>
                </div>
            ))}
        </nav>
    );

    const sortedConversations = Object.values(conversations).sort((a, b) => b.lastModified - a.lastModified);
    const dayLabel = (time) => {
        if (!time) return '';
        const day = new Date(time); day.setHours(0, 0, 0, 0);
        const today = new Date(); today.setHours(0, 0, 0, 0);
        const days = Math.round((today - day) / 86400000);
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        return new Date(time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    };

    const copyMessage = (idx, text) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(idx);
        setTimeout(() => setCopiedIndex(current => (current === idx ? null : current)), 1500);
    };

    return (
        <div
            className={
                isSidebar
                ? "w-full h-full flex flex-col bg-white overflow-hidden relative"
                : "fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-40 flex flex-col border-l border-slate-200"
            }
            onDragOver={handleDragOver}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false); }}
            onDrop={handleDrop}
        >
            {isDragging && (
                <div className="absolute inset-0 z-50 m-2 rounded-xl border-2 border-dashed border-indigo-400 bg-indigo-50/95 flex items-center justify-center pointer-events-none">
                    <p className="text-[13px] font-medium text-indigo-700"><i className="fas fa-image mr-2" aria-hidden="true"></i>Drop the picture to attach it to your message</p>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between h-10 pl-1.5 pr-1.5 border-b border-slate-200 shrink-0 z-10 bg-white">
                <div className="flex items-center gap-1.5 min-w-0">
                    <IconButton
                        icon="fas fa-history"
                        label="Conversation history"
                        title="Conversation History"
                        pressed={showHistory}
                        onClick={() => setShowHistory(!showHistory)}
                    />
                    <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 truncate">
                        <i className="fas fa-magic text-xs text-indigo-600" aria-hidden="true"></i>
                        Syntext Smith
                    </h3>
                </div>
                <div className="flex items-center gap-0.5">
                    <IconButton icon="fas fa-plus" label="New chat" title="New Chat" onClick={createNewConversation} disabled={isTyping} />
                    <IconButton icon="fas fa-cog" label="Smith settings" title="Settings" onClick={() => setShowSettings(true)} />
                    <IconButton icon="fas fa-times" label="Close Syntext Smith" title="Close" onClick={onClose} />
                </div>
            </div>

            {/* History */}
            {showHistory && (
                <div className="absolute top-10 left-0 right-0 bottom-0 bg-white z-20 overflow-y-auto ui-scroll animate-fade-in">
                    <div className="p-2">
                        <div className="px-2 pt-2 pb-1.5 text-xs font-medium text-slate-500">
                            Recent chats
                        </div>
                        <ul className="space-y-0.5">
                            {sortedConversations.map(convo => {
                                const active = convo.id === currentConversationId;
                                return (
                                    <li
                                        key={convo.id}
                                        role="button"
                                        tabIndex={0}
                                        aria-current={active ? 'true' : undefined}
                                        onClick={() => !isTyping && selectConversation(convo.id)}
                                        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget) { e.preventDefault(); if (!isTyping) selectConversation(convo.id); } }}
                                        className={`group flex items-center gap-2 pl-2.5 pr-1 h-9 rounded-md cursor-pointer text-[13px] transition-colors ${
                                            active ? 'bg-indigo-50 text-indigo-900' : 'text-slate-700 hover:bg-slate-50'
                                        }`}
                                    >
                                        <i className={`far fa-comment-alt text-xs ${active ? 'text-indigo-500' : 'text-slate-400'}`} aria-hidden="true"></i>
                                        <span className={`truncate flex-1 ${active ? 'font-medium' : ''}`}>{convo.title || 'New Conversation'}</span>
                                        <span className="text-[11px] text-slate-400 tabular-nums shrink-0 group-hover:hidden group-focus-within:hidden">{dayLabel(convo.lastModified)}</span>
                                        <button
                                            onClick={(e) => handleDeleteConversation(e, convo.id)}
                                            className="hidden group-hover:inline-flex group-focus-within:inline-flex w-7 h-7 items-center justify-center rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            aria-label="Delete conversation"
                                            title="Delete conversation"
                                        >
                                            <i className="fas fa-trash-alt text-xs" aria-hidden="true"></i>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                        {sortedConversations.length === 0 && (
                            <div className="text-center py-10 text-slate-400 text-[13px]">
                                Your past conversations appear here.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 relative min-h-0 bg-white">
                {messages.length > 1 && <ChatTimeline />}

                <div className="absolute inset-0 overflow-y-auto ui-scroll pl-4 pr-7 py-4 space-y-5">
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            ref={el => messageRefs.current[idx] = el}
                            className={`flex flex-col scroll-mt-4 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                        >
                            <div
                                className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
                                    msg.role === 'user'
                                    ? 'max-w-[88%] rounded-lg rounded-br-sm bg-slate-100 text-slate-900 px-3.5 py-2.5'
                                    : msg.isError
                                        ? 'w-full rounded-lg bg-red-50 text-red-700 border border-red-100 px-3.5 py-2.5'
                                        : msg.isStopped
                                            ? 'w-full rounded-lg text-slate-500 border border-dashed border-slate-300 px-3.5 py-2.5'
                                            : 'w-full text-slate-800'
                                }`}
                            >
                                {msg.role === 'user' && <MessagePictures msg={msg} />}
                                {msg.content}
                                {msg.trail?.length > 0 && <ValidationTrail trail={msg.trail} />}
                                {msg.limitReached && (
                                    <p className="mt-2 text-xs text-amber-700">Smith stopped after the most steps allowed for one request.</p>
                                )}
                            </div>

                            {msg.proposal && (
                                <ProposalCard
                                    proposal={msg.proposal}
                                    editorCode={contextCode}
                                    editorType={diagramType}
                                    onReview={() => onReviewProposal?.(msg.proposal)}
                                />
                            )}

                            {msg.suggestions?.length > 0 && idx === lastAssistantIndex && (
                                <div className="mt-2.5 flex flex-wrap gap-1.5" aria-label="Suggested next requests">
                                    {msg.suggestions.map((suggestion, sIdx) => (
                                        <button
                                            key={sIdx}
                                            onClick={() => handleSend(suggestion)}
                                            disabled={isTyping}
                                            className="px-2.5 py-1 bg-white text-slate-700 text-xs rounded-full border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 hover:bg-indigo-50/50 transition-colors disabled:opacity-40"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {msg.role === 'assistant' && !msg.isError && (
                                <div className="mt-1.5 -ml-2 flex gap-0.5">
                                    {idx === lastAssistantIndex && (
                                        <button
                                            onClick={handleRegenerate}
                                            disabled={isTyping}
                                            className="h-6 text-xs inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-700 px-2 rounded-md hover:bg-slate-100 transition-colors disabled:opacity-40"
                                        >
                                            <i className="fas fa-sync-alt text-[10px]" aria-hidden="true"></i>
                                            Regenerate
                                        </button>
                                    )}
                                    <button
                                        onClick={() => copyMessage(idx, msg.content)}
                                        className="h-6 text-xs inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-700 px-2 rounded-md hover:bg-slate-100 transition-colors"
                                    >
                                        <i className={`fas ${copiedIndex === idx ? 'fa-check text-emerald-600' : 'fa-copy'} text-[10px]`} aria-hidden="true"></i>
                                        {copiedIndex === idx ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}

                    {messages.length === 0 && !isTyping && (
                        <div className="pt-10 px-2 text-center">
                            <span className="mx-auto mb-4 w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center" aria-hidden="true">
                                <i className="fas fa-magic"></i>
                            </span>
                            <h4 className="text-[15px] font-semibold text-slate-900">Ask Smith about this diagram</h4>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
                                Describe a new diagram, or ask for a change to the current one. Smith checks each change, and you review the change before it reaches your code.
                            </p>
                            <p className="mt-3 text-xs text-slate-400">
                                <i className="fas fa-paperclip mr-1.5" aria-hidden="true"></i>To turn a sketch into a diagram, attach or paste a picture.
                            </p>
                        </div>
                    )}

                    {isTyping && (
                        <div className="flex flex-col items-start" aria-live="polite">
                            <div className="w-full text-sm leading-relaxed text-slate-800 whitespace-pre-wrap break-words">
                                {streamingText || (
                                    <div className="flex items-center gap-1 h-5" aria-label="Smith is working">
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
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
            <div className="px-3 pt-3 pb-2 bg-white border-t border-slate-200 shrink-0">
                {attachments.length > 0 && (
                    <ul className="mb-2 flex flex-wrap gap-2" aria-label="Attached pictures">
                        {attachments.map((image, i) => (
                            <li key={i} className="relative">
                                <img src={imageSrc(image)} alt={image.name} title={image.name} className="h-14 w-14 object-cover rounded-md ring-1 ring-slate-900/10" />
                                <button
                                    onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}
                                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-800 text-white text-[9px] flex items-center justify-center ring-2 ring-white hover:bg-red-600 transition-colors"
                                    aria-label={`Remove ${image.name}`}
                                    title="Remove"
                                >
                                    <i className="fas fa-times" aria-hidden="true"></i>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                {attachError && <p className="mb-2 text-xs text-red-600" role="alert">{attachError}</p>}
                <div className="relative rounded-lg border border-slate-200 bg-white shadow-sm transition-colors focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder={attachments.length ? 'Say what to do with the picture' : 'Describe a diagram, or ask for a change'}
                        aria-label="Message to Smith"
                        className={`block w-full px-3 pt-2.5 pb-1 bg-transparent border-0 rounded-lg text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0 ${isInputExpanded ? 'h-64 resize-y' : 'resize-none max-h-32 min-h-[44px]'}`}
                        rows={isInputExpanded ? 10 : 1}
                        style={{ height: isInputExpanded ? undefined : 'auto' }}
                    />
                    <div className="flex items-center justify-between px-1.5 pb-1.5">
                        <div className="flex items-center gap-0.5">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isTyping || attachments.length >= MAX_PICTURES}
                                title="Attach a picture (or paste or drop one)"
                                aria-label="Attach a picture"
                                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
                            >
                                <i className="fas fa-paperclip text-[13px]" aria-hidden="true"></i>
                            </button>
                            <button
                                onClick={() => setIsInputExpanded(!isInputExpanded)}
                                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                                title={isInputExpanded ? "Collapse Input" : "Expand Input"}
                                aria-label={isInputExpanded ? 'Collapse the message box' : 'Expand the message box'}
                                aria-pressed={isInputExpanded}
                            >
                                <i className={`fas ${isInputExpanded ? 'fa-compress-alt' : 'fa-expand-alt'} text-xs`} aria-hidden="true"></i>
                            </button>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept={ACCEPTED_IMAGE_TYPES.join(',')}
                            multiple
                            className="hidden"
                            onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }}
                        />
                        {isTyping ? (
                            <button
                                onClick={handleStop}
                                title="Stop"
                                aria-label="Stop"
                                className="w-8 h-8 inline-flex items-center justify-center rounded-md bg-slate-800 text-white hover:bg-slate-900 transition-colors shadow-sm"
                            >
                                <i className="fas fa-stop text-[10px]" aria-hidden="true"></i>
                            </button>
                        ) : (
                            <button
                                onClick={() => handleSend()}
                                disabled={!input.trim() && !attachments.length}
                                title="Send"
                                aria-label="Send"
                                className="w-8 h-8 inline-flex items-center justify-center rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                            >
                                <i className="fas fa-arrow-up text-xs" aria-hidden="true"></i>
                            </button>
                        )}
                    </div>
                </div>
                <p className="mt-1.5 text-center text-[11px] text-slate-400">
                    <kbd className="font-sans">Enter</kbd> to send · <kbd className="font-sans">Shift+Enter</kbd> for a new line
                </p>
            </div>

            <AISettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
                aiService={aiService}
            />
        </div>
    );
};
