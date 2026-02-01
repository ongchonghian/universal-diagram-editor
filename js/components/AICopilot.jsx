import React, { useState, useEffect, useRef } from 'react';
import { aiService } from '../services/ai-service.js';
import { Button, LogoLoader } from './common.jsx';
import { AISettingsModal } from './dialogs/AISettingsModal.jsx';
import { SemanticDiffModal } from './dialogs/SemanticDiffModal.jsx';

export const AICopilot = ({ 
    isOpen, 
    onClose, 
    contextCode, 
    diagramType, 
    onApplyCode,
    isSidebar = false 
}) => {
    // State
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [currentConversationId, setCurrentConversationId] = useState(null);
    const [conversations, setConversations] = useState({});
    
    // Diff State
    const [showDiffModal, setShowDiffModal] = useState(false);
    const [pendingCode, setPendingCode] = useState('');
    
    const messagesEndRef = useRef(null);

    // Load conversations and initial chat
    useEffect(() => {
        if (isOpen) {
            loadConversations();
        }
    }, [isOpen]);

    const loadConversations = () => {
        const all = aiService.getConversations();
        setConversations(all);
        
        // If no current conversation, create one or select latest
        if (!currentConversationId) {
            const sortedIds = Object.keys(all).sort((a, b) => all[b].lastModified - all[a].lastModified);
            if (sortedIds.length > 0) {
                selectConversation(sortedIds[0]);
            } else {
                createNewConversation();
            }
        } else {
            // Refresh current messages
            if (all[currentConversationId]) {
                setMessages(all[currentConversationId].messages);
            }
        }
    };

    const createNewConversation = () => {
        const id = aiService.createConversation();
        setConversations(aiService.getConversations());
        setCurrentConversationId(id);
        setMessages([]);
        setShowHistory(false);
    };

    const selectConversation = (id) => {
        const convo = aiService.getConversation(id);
        if (convo) {
            setCurrentConversationId(id);
            setMessages(convo.messages);
            setShowHistory(false);
        }
    };

    const handleDeleteConversation = (e, id) => {
        e.stopPropagation();
        aiService.deleteConversation(id);
        const remaining = aiService.getConversations();
        setConversations(remaining);
        
        if (id === currentConversationId) {
            const sorted = Object.keys(remaining).sort((a, b) => remaining[b].lastModified - remaining[a].lastModified);
            if (sorted.length > 0) selectConversation(sorted[0]);
            else createNewConversation();
        }
    };

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    const handleSend = async (textOverride = null) => {
        const textToSend = textOverride || input;
        if (!textToSend.trim() || !currentConversationId) return;

        const userMessage = { role: 'user', content: textToSend };
        
        // Update UI immediately
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        // Save to persistence
        aiService.addMessageToConversation(currentConversationId, userMessage);
        // Update title/list in background
        setConversations(aiService.getConversations());

        try {
            // Use chat method for history awareness
            // Filter history to exclude the just-added message (already in state) 
            // and system messages if we handled them differently. 
            // For now, pass previous messages as history.
            const history = messages.filter(m => m.role !== 'system'); // Exclude system greeting if any
            
            const responseText = await aiService.chat(userMessage.content, history, contextCode, diagramType);

            const botMessage = { role: 'assistant', content: responseText };
            setMessages(prev => [...prev, botMessage]);
            aiService.addMessageToConversation(currentConversationId, botMessage);

        } catch (error) {
            const errorMessage = { 
                role: 'assistant', 
                content: `Error: ${error.message}`, 
                isError: true 
            };
            setMessages(prev => [...prev, errorMessage]);
            // Don't save errors to history? Or maybe yes. saving for now.
            aiService.addMessageToConversation(currentConversationId, errorMessage);
            
            if (error.message.includes('API Key is missing')) {
                setShowSettings(true);
            }
        } finally {
            setIsTyping(false);
            setConversations(aiService.getConversations()); // Refresh list for last modified
        }
    };

    const handleRegenerate = async () => {
        if (!currentConversationId || isTyping) return;
        
        // Remove last assistant message from UI
        setMessages(prev => {
            if (prev.length > 0 && prev[prev.length - 1].role === 'assistant') {
                return prev.slice(0, -1);
            }
            return prev;
        });
        
        setIsTyping(true);
        
        try {
            // Get history (excluding valid system prompt stuff if needed)
            // We need to fetch the actual conversation from service to be sure
            const convo = aiService.getConversation(currentConversationId);
            if (!convo || convo.messages.length === 0) return;

             // Remove the last message if it was assistant
            let history = [...convo.messages];
            if (history[history.length - 1].role === 'assistant') {
                history.pop();
            }

            // We pass a special flag or just call chat. 
            // Since we implemented __REGENERATE__ in service, we can use that, 
            // OR effectively we just want to call chat with the *previous* user prompt again.
            // But relying on service logic is cleaner if we pass a special flag? 
            // Actually, let's just use the last user message from history.
            
            // Simplest way: Call chat with a specialized prompt or just re-send the last user message context?
            // The service's 'chat' method expects 'message' to be the NEW user input.
            // If we want to regenerate, we basically want to pretend the user just sent the last message again.
            // My service modification handled `__REGENERATE__` to look up the last user message.
            
            // We pass the SPECIAL flag as the message
            const responseText = await aiService.chat('__REGENERATE__', history, contextCode, diagramType);

            const botMessage = { role: 'assistant', content: responseText };
            setMessages(prev => [...prev, botMessage]);
            
            // Update persistence: Remove the old last assistant message (if any) and add new one
            // This is a bit tricky with simple append-only persistence. 
            // For now, valid history is just appended. We might have duplicates in history? 
            // Let's just append the new response.
            aiService.addMessageToConversation(currentConversationId, botMessage);

        } catch (error) {
             const errorMessage = { 
                role: 'assistant', 
                content: `Error: ${error.message}`, 
                isError: true 
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const [isInputExpanded, setIsInputExpanded] = useState(false);
    const messageRefs = useRef({});

    if (!isOpen) return null;

    const scrollToMessage = (index) => {
        messageRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Chat Timeline Component
    const ChatTimeline = () => (
        <div className="absolute right-1 top-4 bottom-4 w-4 bg-transparent z-50 flex flex-col gap-1 items-center overflow-y-auto no-scrollbar pointer-events-auto pb-4">
            {messages.map((msg, idx) => (
                <div 
                    key={idx}
                    className="group relative pointer-events-auto"
                >
                    {/* Indicator Dot */}
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
                    
                    {/* Tooltip */}
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
            
            {/* ... Header ... */}
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
                        className="p-2 text-slate-500 hover:text-indigo-600 rounded-full hover:bg-indigo-50 transition-colors"
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

            {/* History Overlay (Dropdown style or Slide over) */}
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
                                onClick={() => selectConversation(convo.id)}
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

            {/* Messages Area */}
            <div className="flex-1 relative min-h-0 bg-slate-50/50">
                <ChatTimeline />
                
                <div className="absolute inset-0 overflow-y-auto p-4 space-y-4">
                    {messages.concat(isTyping ? [] : []).map((msg, idx) => {
                        // Check for suggestions tag
                        let content = msg.content;
                        let suggestions = [];
                        
                        if (msg.role === 'assistant') {
                            const suggestionMatch = content.match(/\[SUGGESTIONS\]:\s*(\[.*\])/);
                            if (suggestionMatch) {
                                try {
                                    suggestions = JSON.parse(suggestionMatch[1]);
                                    content = content.replace(suggestionMatch[0], '').trim();
                                } catch (e) {
                                    console.warn("Failed to parse suggestions JSON", e);
                                }
                            }
                        }

                        return (
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
                                        : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                                }`}
                            >
                                {content}
                            </div>
                            
                            {/* Suggestion Chips */}
                            {suggestions.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2 max-w-[90%]">
                                    {suggestions.map((suggestion, sIdx) => (
                                        <button
                                            key={sIdx}
                                            onClick={() => {
                                                setInput(suggestion);
                                                handleSend(suggestion); 
                                            }}
                                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full border border-indigo-200 transition-colors shadow-sm"
                                        >
                                            {suggestion}
                                        </button>
                                    ))}
                                </div>
                            )}
                            
                            {/* Actions for Assistant Messages */}
                            {msg.role === 'assistant' && !msg.isError && (
                                <div className="mt-1 flex gap-2">
                                    <button 
                                        onClick={() => {
                                            setPendingCode(content);
                                            setShowDiffModal(true);
                                        }} // Use cleaned content
                                        className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors"
                                    >
                                        <i className="fas fa-reply"></i>
                                        Apply Code
                                    </button>
                                    <button 
                                        onClick={() => handleRegenerate()}
                                        className="text-xs flex items-center gap-1 text-slate-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                                    >
                                        <i className="fas fa-sync-alt"></i>
                                        Regenerate
                                    </button>
                                    <button 
                                        onClick={() => navigator.clipboard.writeText(content)}
                                        className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-700 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                                    >
                                        <i className="fas fa-copy"></i>
                                        Copy
                                    </button>
                                </div>
                            )}
                        </div>
                        );
                    })}
                    
                    {messages.length === 0 && !isTyping && (
                        <div className="text-center py-10 text-slate-400">
                            <i className="fas fa-robot text-4xl mb-3 opacity-20"></i>
                            <p className="text-sm">Start a new conversation</p>
                        </div>
                    )}

                    {isTyping && (
                        <div className="flex items-start">
                            <div className="bg-white px-4 py-3 rounded-lg rounded-bl-none border border-slate-200 shadow-sm">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></span>
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></span>
                                    <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input Area */}
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
                    <button
                        onClick={() => handleSend()}
                        disabled={!input.trim() || isTyping}
                        className="absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all shadow-sm w-8 h-8 flex items-center justify-center"
                    >
                        <i className="fas fa-paper-plane text-xs"></i>
                    </button>
                </div>
                <div className="mt-2 flex justify-center text-[10px] text-slate-400 gap-4">
                    <span><i className="fas fa-keyboard mr-1"></i>Enter to send</span>
                    <span><i className="fas fa-level-up-alt mr-1"></i>Shift+Enter for new line</span>
                </div>
            </div>

            {/* Settings Modal */}
            <AISettingsModal 
                isOpen={showSettings} 
                onClose={() => setShowSettings(false)} 
                aiService={aiService} 
            />

            {/* Semantic Diff Modal */}
            {showDiffModal && (
                <SemanticDiffModal
                    isOpen={showDiffModal}
                    onClose={() => setShowDiffModal(false)}
                    onConfirm={() => {
                        onApplyCode(pendingCode);
                        setShowDiffModal(false);
                    }}
                    oldCode={contextCode}
                    newCode={pendingCode}
                    diagramType={diagramType}
                />
            )}
        </div>
    );
};
