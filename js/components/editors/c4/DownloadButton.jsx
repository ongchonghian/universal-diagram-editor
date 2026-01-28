import React, { useCallback } from 'react';
import { useReactFlow, Panel } from '@xyflow/react';
import { toPng } from 'html-to-image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload } from '@fortawesome/free-solid-svg-icons';

function downloadImage(dataUrl) {
  const a = document.createElement('a');
  a.setAttribute('download', 'c4-diagram.png');
  a.setAttribute('href', dataUrl);
  a.click();
}

export const DownloadButton = () => {
  const { getNodes } = useReactFlow();

  const onClick = useCallback(() => {
    // We select the flow container. 
    // Make sure class name matches. By default it is 'react-flow'.
    // If we want to capture ONLY the viewport content we might target '.react-flow__viewport',
    // but capturing the container is safer for styles.
    const imageWidth = 1024;
    const imageHeight = 768;
    const bg = '#fafafa';

    // Query selector is simplest here to find the main container from inside the component
    // Assuming only one flow on screen or we are inside it.
    const flowElement = document.querySelector('.react-flow');

    if (!flowElement) return;

    toPng(flowElement, {
      backgroundColor: bg,
      // width: imageWidth, // Let it use natural size or specify
      // height: imageHeight,
      style: {
        // Ensure proper rendering
        width: '100%',
        height: '100%',
      }
    }).then(downloadImage);
  }, []);

  return (
    <Panel position="top-right" className="react-flow__panel-top-right">
      <button 
        className="bg-white hover:bg-slate-50 text-slate-700 font-semibold py-2 px-4 border border-slate-300 rounded shadow flex items-center gap-2"
        onClick={onClick}
      >
        <FontAwesomeIcon icon={faDownload} />
        Download PNG
      </button>
    </Panel>
  );
};
