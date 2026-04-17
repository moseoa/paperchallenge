import React, { useState } from 'react';
import DoodleCanvas from './DoodleCanvas';

export default function DoodleConsoleModal({ brickId, initialPaths, onSave, onCancel }) {
  const [paths, setPaths] = useState(initialPaths || []);
  
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', zIndex: 9999
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '20px', 
        width: '600px', maxWidth: '90%', display: 'flex', flexDirection: 'column', gap: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontFamily: 'sans-serif' }}>Editing Brick</h2>
          <div>
            <button onClick={() => setPaths([])} style={{ marginRight: '10px', background: '#ccc', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>Clear</button>
            <button onClick={onCancel} style={{ marginRight: '10px', background: '#ccc', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => onSave(paths)} style={{ background: '#2E8B57', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer' }}>Save Doodles</button>
          </div>
        </div>

        {/* The scaled up drawing surface */}
        <div style={{
            position: 'relative', 
            width: '600px', 
            height: '300px',
            maxWidth: '100%',
            backgroundColor: '#D1C4B5', // A plain paper/brick backing color
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.2)'
        }}>
          <DoodleCanvas 
            brickId={brickId} 
            initialPaths={paths}
            onSaveStroke={setPaths}
            width={600}
            height={300}
          />
        </div>
        <p style={{ margin: 0, color: '#666', fontSize: '12px', textAlign: 'center' }}>
          Note: Doodle Canvas is zoomed in for precision. Pick your tool from the top left of the canvas.
        </p>
      </div>
    </div>
  );
}
