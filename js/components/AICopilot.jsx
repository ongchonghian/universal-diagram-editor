import React, { useState, useEffect, useRef } from 'react';
import { aiService } from '../services/ai-service.js';
import { Button, LogoLoader } from './common.jsx';
import { AISettingsModal } from './dialogs/AISettingsModal.jsx';

export const AICopilot = ({ 
    isOpen, 
    onClose, 
    contextCode, 
    diagramType, 
    onApplyCode 
}) => {
    // State
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [currentConversationId, setCurrentConversationId] = useState(null);
    const [conversations, setConversations] = useState({});
    
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

    const handleSend = async () => {
        if (!input.trim() || !currentConversationId) return;

        const userMessage = { role: 'user', content: input };
        
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

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-40 flex flex-col border-l border-slate-200 transform transition-transform duration-300 ease-in-out">
            
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-2">
                     <button 
                        onClick={() => setShowHistory(!showHistory)}
                        className={`p-2 rounded-lg transition-colors ${showHistory ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-200'}`}
                        title="History"
                    >
                        <i className="fas fa-history"></i>
                    </button>
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        AI Copilot
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {messages.concat(isTyping ? [] : []).map((msg, idx) => ( // Render messages
                    <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div 
                            className={`max-w-[90%] rounded-lg px-4 py-3 text-sm whitespace-pre-wrap shadow-sm ${
                                msg.role === 'user' 
                                ? 'bg-indigo-600 text-white rounded-br-none' 
                                : msg.isError 
                                    ? 'bg-red-50 text-red-700 border border-red-100'
                                    : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'
                            }`}
                        >
                            {msg.content}
                        </div>
                        
                        {/* Actions for Assistant Messages */}
                        {msg.role === 'assistant' && !msg.isError && (
                            <div className="mt-1 flex gap-2">
                                <button 
                                    onClick={() => onApplyCode(msg.content)}
                                    className="text-xs flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors"
                                >
                                    <i className="fas fa-reply"></i>
                                    Apply Code
                                </button>
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

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-200 shrink-0">
                <div className="relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Describe a diagram or ask for help..."
                        className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none text-sm max-h-32 min-h-[50px]"
                        rows={1}
                        style={{ height: 'auto', minHeight: '50px' }}
                    />
                    <button
                        onClick={handleSend}
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
        </div>
    );
};
