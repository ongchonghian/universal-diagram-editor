import React from 'react';

export const Sidebar = ({ onAddNode }) => {
  const onDragStart = (event, nodeType, label) => {
    console.log('Drag started', nodeType, label);
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow-label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside className="w-64 bg-slate-50 border-r border-slate-200 p-4 flex flex-col gap-4 overflow-y-auto shrink-0 h-full">
      <div className="mb-2">
        <h3 className="font-semibold text-slate-700">Elements</h3>
        <p className="text-xs text-slate-500">Click or drag to canvas</p>
      </div>

      <div className="space-y-3">
        <div className="dndnode input p-3 border border-slate-300 rounded bg-white shadow-sm cursor-grab hover:border-indigo-400 transition-colors flex items-center gap-3 hover:bg-slate-50" 
            onDragStart={(event) => onDragStart(event, 'person', 'Person')} 
            onClick={() => onAddNode('person', 'Person')}
            draggable={true}
            title="Click to add or drag to canvas"
        >
            <div className="w-8 h-8 rounded-full bg-[#08427b] text-white flex items-center justify-center text-xs"><i className="fas fa-user"></i></div>
            <div className="text-sm font-medium">Person</div>
        </div>

        <div className="dndnode p-3 border border-slate-300 rounded bg-white shadow-sm cursor-grab hover:border-indigo-400 transition-colors flex items-center gap-3 hover:bg-slate-50" 
            onDragStart={(event) => onDragStart(event, 'system', 'Software System')} 
            onClick={() => onAddNode('system', 'Software System')}
            draggable={true}
            title="Click to add or drag to canvas"
        >
            <div className="w-8 h-6 rounded bg-[#1168bd] text-white flex items-center justify-center text-xs">Sys</div>
            <div className="text-sm font-medium">Software System</div>
        </div>

        <div className="dndnode p-3 border border-slate-300 rounded bg-white shadow-sm cursor-grab hover:border-indigo-400 transition-colors flex items-center gap-3 hover:bg-slate-50" 
            onDragStart={(event) => onDragStart(event, 'container', 'Container')} 
            onClick={() => onAddNode('container', 'Container')}
            draggable={true}
            title="Click to add or drag to canvas"
        >
            <div className="w-8 h-6 rounded bg-[#438dd5] text-white flex items-center justify-center text-xs">Con</div>
            <div className="text-sm font-medium">Container</div>
        </div>

        <div className="dndnode p-3 border border-slate-300 rounded bg-white shadow-sm cursor-grab hover:border-indigo-400 transition-colors flex items-center gap-3 hover:bg-slate-50" 
            onDragStart={(event) => onDragStart(event, 'component', 'Component')} 
            onClick={() => onAddNode('component', 'Component')}
            draggable={true}
            title="Click to add or drag to canvas"
        >
            <div className="w-8 h-6 rounded-none bg-[#85bbf0] text-slate-800 flex items-center justify-center text-xs">Cmp</div>
            <div className="text-sm font-medium">Component</div>
        </div>

        <div className="dndnode p-3 border border-slate-300 rounded bg-white shadow-sm cursor-grab hover:border-indigo-400 transition-colors flex items-center gap-3 hover:bg-slate-50" 
            onDragStart={(event) => onDragStart(event, 'database', 'Database')} 
            onClick={() => onAddNode('database', 'Database')}
            draggable={true}
            title="Click to add or drag to canvas"
        >
            <div className="w-8 h-8 relative flex items-center justify-center">
                 <div className="absolute inset-x-1 bottom-1 top-2 bg-[#438dd5] rounded-b border border-[#2e6295]"></div>
                 <div className="absolute inset-x-1 top-1 h-2 bg-[#5ba0e3] rounded-full border border-[#2e6295]"></div>
            </div>
            <div className="text-sm font-medium">Database</div>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-400">
              <p><i className="fas fa-mouse-pointer mr-1"></i> Drag to add nodes</p>
              <p><i className="fas fa-arrow-right mr-1"></i> Drag handles to connect</p>
              <p><i className="far fa-hand-paper mr-1"></i> Backspace to delete</p>
          </div>
      </div>
    </aside>
  );
};
