// Mermaid Sequence Diagram Editor
import { html, useState, useEffect } from '../../react-helpers.js';

export const MermaidSequenceEditor = ({ ast, code, onChange, onCodeChange, previewUrl, previewLoading }) => {
    const [participants, setParticipants] = useState([]);
    const [messages, setMessages] = useState([]);
    
    useEffect(() => {
        if (!ast || ast.type !== 'sequence') return;
        
        const extractedParticipants = [];
        const extractedMessages = [];
        
        if (ast.participants && Array.isArray(ast.participants)) {
            ast.participants.forEach(p => {
                extractedParticipants.push({
                    id: p.id || p.name,
                    label: p.label || p.alias || p.id || p.name
                });
            });
        }
        
        if (ast.messages && Array.isArray(ast.messages)) {
            ast.messages.forEach((msg, idx) => {
                extractedMessages.push({
                    id: `msg-${idx}`,
                    from: msg.from || msg.actor,
                    to: msg.to || msg.target,
                    text: msg.text || msg.message || ''
                });
            });
        }
        
        setParticipants(extractedParticipants);
        setMessages(extractedMessages);
    }, [ast]);
    
    const handleAddParticipant = () => {
        const newName = `Actor${participants.length + 1}`;
        const insertPos = code.indexOf('\n', code.indexOf('sequenceDiagram'));
        const newCode = code.slice(0, insertPos) + `\n    participant ${newName}` + code.slice(insertPos);
        onCodeChange(newCode);
    };
    
    const handleAddMessage = () => {
        if (participants.length < 2) return;
        const from = participants[0]?.id || 'A';
        const to = participants[1]?.id || 'B';
        onCodeChange(code + `\n    ${from}->>${to}: New message`);
    };
    
    return html`
        <div className="w-full h-full flex">
            <div className="flex-1 flex flex-col bg-slate-50">
                <div className="flex-none px-3 py-2 bg-white border-b border-slate-200 flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">
                        <i className="fas fa-exchange-alt mr-1.5"></i>
                        Sequence Diagram Editor
                    </span>
                    <button onClick=${handleAddParticipant} className="px-2 py-1 text-xs bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100">
                        <i className="fas fa-user-plus mr-1"></i> Participant
                    </button>
                    <button onClick=${handleAddMessage} className="px-2 py-1 text-xs bg-slate-100 text-slate-600 rounded hover:bg-slate-200" disabled=${participants.length < 2}>
                        <i className="fas fa-comment mr-1"></i> Message
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-4 flex items-center justify-center" style=${{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                    ${previewUrl ? html`<img src=${previewUrl} alt="Sequence Diagram" className="max-w-full h-auto bg-white shadow-lg rounded" />` : html`
                        <div className="text-center text-slate-400">
                            <i className="fas fa-exchange-alt text-4xl mb-3 opacity-30"></i>
                            <p className="text-sm">Sequence diagram preview</p>
                        </div>
                    `}
                </div>
            </div>
            <div className="w-72 border-l border-slate-200 bg-white flex flex-col">
                <div className="flex-none px-3 py-2 border-b border-slate-200">
                    <span className="text-xs font-medium text-slate-600">Elements</span>
                </div>
                <div className="flex-1 overflow-auto">
                    <div className="p-2 border-b border-slate-100">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Participants (${participants.length})</div>
                        ${participants.map(p => html`
                            <div key=${p.id} className="p-2 bg-slate-50 rounded text-xs mb-1">
                                <span className="font-medium">${p.label}</span>
                                ${p.id !== p.label && html`<span className="text-slate-400 ml-1">(${p.id})</span>`}
                            </div>
                        `)}
                    </div>
                    <div className="p-2">
                        <div className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Messages (${messages.length})</div>
                        ${messages.map(msg => html`
                            <div key=${msg.id} className="p-2 bg-slate-50 rounded text-xs mb-1">
                                <div className="flex items-center gap-1">
                                    <span>${msg.from}</span>
                                    <i className="fas fa-arrow-right text-[10px] text-slate-400"></i>
                                    <span>${msg.to}</span>
                                </div>
                                ${msg.text && html`<div className="text-slate-500 mt-1">"${msg.text}"</div>`}
                            </div>
                        `)}
                    </div>
                </div>
            </div>
        </div>
    `;
};

export default MermaidSequenceEditor;
