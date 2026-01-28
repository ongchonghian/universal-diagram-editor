import React, { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';

// Common handle styles - for floating edges, handles can be minimal or hidden, 
// but we keep them for standard "snap" feeling if needed, or make them valid targets.
// For floating edges, we often use a single handle or handles on all sides.
// To work best with the floating edge logic we implemented, we can have a generic handle.
const handleStyle = { width: 1, height: 1, background: 'transparent', border: 0 };

const ResizableNodeWrapper = ({ children, className = '', selected, minWidth = 100, minHeight = 60, style = {} }) => (
  <div 
    className={`shadow-md rounded-md bg-white border-2 text-center transition-all h-full w-full flex flex-col items-center justify-center ${selected ? 'border-indigo-500 shadow-lg' : 'border-slate-400'} ${className}`}
    style={style}
  >
    <NodeResizer 
      color="#6366f1" 
      isVisible={selected} 
      minWidth={minWidth} 
      minHeight={minHeight} 
      handleStyle={{ width: 8, height: 8, borderRadius: 2 }}
    />
    
    {/* Central handle for floating edges - often works best if covering or central */}
    <Handle type="target" position={Position.Top} style={{ ...handleStyle, top: 0, left: '50%' }} />
    <Handle type="target" position={Position.Left} style={{ ...handleStyle, top: '50%', left: 0 }} />
    <Handle type="target" position={Position.Right} style={{ ...handleStyle, top: '50%', right: 0 }} />
    <Handle type="target" position={Position.Bottom} style={{ ...handleStyle, bottom: 0, left: '50%' }} />

    <Handle type="source" position={Position.Top} style={{ ...handleStyle, top: 0, left: '50%' }} />
    <Handle type="source" position={Position.Left} style={{ ...handleStyle, top: '50%', left: 0 }} />
    <Handle type="source" position={Position.Right} style={{ ...handleStyle, top: '50%', right: 0 }} />
    <Handle type="source" position={Position.Bottom} style={{ ...handleStyle, bottom: 0, left: '50%' }} />

    {children}
  </div>
);

export const PersonNode = memo(({ data, selected }) => {
  return (
    <div 
        className={`relative w-full h-full min-w-[80px] min-h-[80px] rounded-full flex flex-col items-center justify-center p-2 shadow-md transition-all text-white border-2 ${selected ? 'border-indigo-300 ring-2 ring-indigo-200' : 'border-[#0b4884]'} bg-[#08427b]`}
        style={data.style} // Apply dynamic styles
    >
       <NodeResizer 
          color="#a5b4fc" 
          isVisible={selected} 
          minWidth={80} 
          minHeight={80} 
          keepAspectRatio={true}
        />
       
       <Handle type="target" position={Position.Top} className="!bg-transparent !w-full !h-full !border-0 !top-0 !left-0 !rounded-full opacity-0" />
       
       <div className="flex flex-col items-center justify-center pointer-events-none">
          <div className="mb-1 text-2xl"><i className="fas fa-user"></i></div>
          <div className="font-bold text-sm leading-tight break-all max-w-full px-1">{data.label}</div>
          <div className="text-[10px] opacity-80 mt-1 max-w-full px-1 truncate">{data.description}</div>
       </div>

       <Handle type="source" position={Position.Bottom} className="!bg-transparent !w-full !h-full !border-0 !top-0 !left-0 !rounded-full opacity-0" />
    </div>
  );
});

export const SystemNode = memo(({ data, selected }) => {
  const isDropTarget = data.isDropTarget;
  return (
    <ResizableNodeWrapper 
        selected={selected} 
        className={`${isDropTarget ? '!border-dashed !border-indigo-400 !bg-indigo-50' : 'bg-[#1168bd] text-white !border-[#0b4884]'} !rounded-sm p-2 transition-colors duration-200`} 
        style={data.style}
    >
      <div className="pointer-events-none w-full">
         <div className="font-bold text-sm break-words">{data.label}</div>
         <div className="text-[10px] mt-1 opacity-90">[Software System]</div>
         <div className="text-xs mt-2 border-t border-white/20 pt-1 w-full text-center break-words">{data.description}</div>
      </div>
    </ResizableNodeWrapper>
  );
});

export const ContainerNode = memo(({ data, selected }) => {
  const isDropTarget = data.isDropTarget;
  return (
    <ResizableNodeWrapper 
        selected={selected} 
        className={`${isDropTarget ? '!border-dashed !border-indigo-400 !bg-indigo-50' : 'bg-[#438dd5] text-white !border-[#2e6295]'} !rounded-sm p-2 transition-colors duration-200`} 
        style={data.style}
    >
      <div className="pointer-events-none w-full">
        <div className="font-bold text-sm break-words">{data.label}</div>
        <div className="text-[10px] mt-1 opacity-90">[{data.technology || 'Container'}]</div>
        <div className="text-xs mt-2 border-t border-white/20 pt-1 w-full text-center break-words">{data.description}</div>
      </div>
    </ResizableNodeWrapper>
  );
});

export const ComponentNode = memo(({ data, selected }) => {
  return (
    <ResizableNodeWrapper selected={selected} className="bg-[#85bbf0] text-slate-800 !border-[#5d82a8] !rounded-none p-2" style={data.style}>
      <div className="pointer-events-none w-full">
        <div className="font-bold text-sm break-words">{data.label}</div>
        <div className="text-[10px] mt-1 text-slate-600">[{data.technology || 'Component'}]</div>
        <div className="text-xs mt-2 border-t border-slate-600/20 pt-1 w-full text-center break-words">{data.description}</div>
      </div>
    </ResizableNodeWrapper>
  );
});

export const DatabaseNode = memo(({ data, selected }) => {
    return (
      <div className={`relative w-full h-full min-w-[100px] min-h-[100px] flex flex-col ${selected ? 'filter drop-shadow-lg' : ''}`}>
        <NodeResizer 
          color="#6366f1" 
          isVisible={selected} 
          minWidth={100} 
          minHeight={80} 
        />
        
        {/* Visual Layers for Cylinder */}
        <div 
            className="absolute inset-x-0 bottom-0 top-[15px] bg-[#438dd5] rounded-b-xl border-x-2 border-b-2 border-[#2e6295] z-0"
            style={{ backgroundColor: data.style?.backgroundColor, borderColor: data.style?.backgroundColor ? 'rgba(0,0,0,0.2)' : undefined }}
        ></div>
        <div 
            className="absolute top-0 inset-x-0 h-[30px] bg-[#5ba0e3] rounded-[50%] border-2 border-[#2e6295] z-10"
            style={{ 
                backgroundColor: data.style?.backgroundColor ? `${data.style.backgroundColor}dd` : undefined, // Slightly lighter or transparent? 
                borderColor: data.style?.backgroundColor ? 'rgba(0,0,0,0.2)' : undefined
            }}
        ></div>
        
        <div className="relative z-20 pt-8 px-2 flex flex-col items-center justify-center h-full pb-2 text-white pointer-events-none">
            <div className="font-bold text-sm text-center break-words w-full">{data.label}</div>
            <div className="text-[10px] mt-1 opacity-90">[{data.technology || 'Database'}]</div>
            <div className="text-xs mt-1 pt-1 text-center w-full truncate">{data.description}</div>
        </div>

        {/* Handles */}
        <Handle type="target" position={Position.Top} className="!top-[15px] !bg-transparent" style={{...handleStyle, left: '50%'}} />
        <Handle type="source" position={Position.Bottom} className="!bottom-0 !bg-transparent" style={{...handleStyle, left: '50%'}} />
        <Handle type="target" position={Position.Left} className="!bg-transparent" style={{...handleStyle, top: '50%'}} />
        <Handle type="source" position={Position.Right} className="!bg-transparent" style={{...handleStyle, top: '50%'}} />
      </div>
    );
  });
