import React from 'react';
import { 
    NodePanel, 
    NodeIcon, 
    NodeDescription 
} from '@synergycodes/overflow-ui';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faServer, faUser, faDatabase, faLayerGroup, faCode } from '@fortawesome/free-solid-svg-icons';

export const SynergySidebar = ({ onAddNode }) => {
  const onDragStart = (event, nodeType, label) => {
    console.log('[SynergySidebar] Drag start:', nodeType, label);
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.setData('application/reactflow-label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const SidebarItem = ({ type, label, icon, description }) => (
    <div 
        className="cursor-grab active:cursor-grabbing mb-3"
        onDragStart={(event) => onDragStart(event, type, label)}
        onClick={() => {
            console.log('[SynergySidebar] Click add:', type);
            onAddNode && onAddNode(type, label);
        }}
        draggable={true}
    >
        {/* We use a non-selected NodePanel as a preview */}
        <NodePanel.Root className="!w-full !h-16 !border !border-slate-300 pointer-events-none">
            <NodePanel.Header>
                <div className="flex items-center gap-3 w-full">
                    <div className="w-8 h-8 flex items-center justify-center">
                        <NodeIcon icon={<FontAwesomeIcon icon={icon} className="w-full h-full text-slate-700" />} />
                    </div>
                    <NodeDescription 
                        label={label} 
                        description={description || type} 
                    />
                </div>
            </NodePanel.Header>
        </NodePanel.Root>
    </div>
  );

  return (
    <aside className="w-72 bg-slate-50 border-r border-slate-200 p-4 flex flex-col h-full overflow-y-auto shrink-0 z-20 shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-700 text-lg">C4 Elements</h3>
        <p className="text-xs text-slate-500">Drag to canvas to add</p>
      </div>

      <div className="flex-1 overflow-y-auto px-1 py-1">
        <SidebarItem type="person" label="Person" icon={faUser} description="User / Actor" />
        <SidebarItem type="system" label="Software System" icon={faServer} description="Existing System" />
        <SidebarItem type="container" label="Container" icon={faLayerGroup} description="App / Service" />
        <SidebarItem type="component" label="Component" icon={faCode} description="Module / Class" />
        <SidebarItem type="database" label="Database" icon={faDatabase} description="Data Store" />
      </div>

      <div className="mt-auto pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-400 space-y-1">
             <div className="font-semibold text-slate-500 mb-1">Shortcuts</div>
             <div className="flex justify-between"><span>Copy/Paste</span> <span>Cmd+C/V</span></div>
             <div className="flex justify-between"><span>Undo/Redo</span> <span>Cmd+Z</span></div>
             <div className="flex justify-between"><span>Group/Ungroup</span> <span>Cmd+G</span></div>
             <div className="flex justify-between"><span>Delete</span> <span>Backspace</span></div>
          </div>
      </div>
    </aside>
  );
};
