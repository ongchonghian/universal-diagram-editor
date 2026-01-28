import React from 'react';
import { Panel } from '@xyflow/react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagic } from '@fortawesome/free-solid-svg-icons';

export const AutoLayoutButton = ({ onLayout }) => {
    return (
        <Panel position="top-right" className="react-flow__panel-top-right mr-36"> 
             {/* Offset to avoid overlapping Download Button */}
            <button
                className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2 px-4 border border-slate-300 rounded shadow flex items-center gap-2"
                onClick={onLayout}
            >
                <FontAwesomeIcon icon={faMagic} />
                Magic Layout
            </button>
        </Panel>
    );
};
