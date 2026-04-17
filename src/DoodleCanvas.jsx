import React, { useRef, useState, useEffect } from 'react';
import getStroke from 'perfect-freehand';

// We'll use perfect-freehand for the goodnotes-style variable width stroke SVG path generation
// First need to install it. I'll add it in package.json or instructions.
export function getSvgPathFromStroke(stroke) {
  if (!stroke.length) return '';
  const d = stroke.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length]
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
      return acc
    },
    ['M', ...stroke[0], 'Q']
  )
  d.push('Z')
  return d.join(' ')
}

export default function DoodleCanvas({ brickId, initialPaths = [], onSaveStroke }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [savedPaths, setSavedPaths] = useState(initialPaths);
  const [currentTool, setCurrentTool] = useState('marker');

  const tools = {
    marker: { color: '#000', config: { size: 4, thinning: 0.1, smoothing: 0.5, streamline: 0.5, simulatePressure: false } },
    chalk: { color: '#F8F8FF', config: { size: 6, thinning: 0.8, smoothing: 0.2, streamline: 0.8, simulatePressure: true } },
    spray: { color: '#C35817', config: { size: 12, thinning: -0.5, smoothing: 0.1, streamline: 0.1, simulatePressure: true } }
  };

  useEffect(() => {
    // Render existing paths
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, 300, 150);
    
    savedPaths.forEach(pathData => {
        const p = new Path2D(pathData.d);
        ctx.fillStyle = pathData.color || '#000';
        ctx.globalAlpha = pathData.tool === 'spray' || pathData.tool === 'chalk' ? 0.7 : 1.0;
        ctx.fill(p);
    });
    ctx.globalAlpha = 1.0; // reset
  }, [savedPaths]);

  const handlePointerDown = (e) => {
    e.target.setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    setCurrentPoints([[e.clientX - rect.left, e.clientY - rect.top, e.pressure || 0.5]]);
  };

  const handlePointerMove = (e) => {
    if (!isDrawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const newPoint = [e.clientX - rect.left, e.clientY - rect.top, e.pressure || 0.5];
    setCurrentPoints(prev => [...prev, newPoint]);
    
    // Quick render for feedback
    const stroke = getStroke([...currentPoints, newPoint], tools[currentTool].config);
    
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, 300, 150);
    // Render saved
    savedPaths.forEach(pathData => {
        const p = new Path2D(pathData.d);
        ctx.fillStyle = pathData.color || '#000';
        ctx.globalAlpha = pathData.tool === 'spray' || pathData.tool === 'chalk' ? 0.7 : 1.0;
        ctx.fill(p);
    });
    ctx.globalAlpha = 1.0;
    // Render current
    const pathData = getSvgPathFromStroke(stroke);
    const p = new Path2D(pathData);
    ctx.fillStyle = tools[currentTool].color; 
    ctx.globalAlpha = currentTool === 'spray' || currentTool === 'chalk' ? 0.7 : 1.0;
    ctx.fill(p);
    ctx.globalAlpha = 1.0;
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    if (currentPoints.length < 2) return;
    
    const stroke = getStroke(currentPoints, tools[currentTool].config);
    const d = getSvgPathFromStroke(stroke);
    
    const newPath = { d, color: tools[currentTool].color, tool: currentTool };
    const updated = [...savedPaths, newPath];
    setSavedPaths(updated);
    setCurrentPoints([]);
    
    if (onSaveStroke) {
      onSaveStroke(updated);
    }
  };

  return (
    <>
      {/* Tool Picker */}
      <div style={{
        position: 'absolute', top: 5, left: 5, display: 'flex', gap: '4px', zIndex: 10, pointerEvents: 'auto'
      }}>
        {Object.keys(tools).map(t => (
          <button 
            key={t}
            onClick={() => setCurrentTool(t)}
            style={{
              background: currentTool === t ? '#fff' : 'rgba(255,255,255,0.5)',
              border: 'none', borderRadius: '4px', padding: '2px 6px', fontSize: '10px',
              cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.3)', pointerEvents: 'auto'
            }}
          >
            {t}
          </button>
        ))}
      </div>
      <canvas
        ref={canvasRef}
        width={300}
        height={150}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '300px',
          height: '150px',
          cursor: 'crosshair',
          touchAction: 'none'
        }}
      />
    </>
  );
}
