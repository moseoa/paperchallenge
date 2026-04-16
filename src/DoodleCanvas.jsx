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

  useEffect(() => {
    // Render existing paths
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, 300, 150);
    
    savedPaths.forEach(pathData => {
        const p = new Path2D(pathData.d);
        ctx.fillStyle = '#000';
        ctx.fill(p);
    });
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
    const stroke = getStroke([...currentPoints, newPoint], {
      size: 4,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: true
    });
    
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, 300, 150);
    // Render saved
    savedPaths.forEach(pathData => {
        const p = new Path2D(pathData.d);
        ctx.fillStyle = '#000';
        ctx.fill(p);
    });
    // Render current
    const pathData = getSvgPathFromStroke(stroke);
    const p = new Path2D(pathData);
    ctx.fillStyle = '#A0522D'; // slightly different color while drawing
    ctx.fill(p);
  };

  const handlePointerUp = () => {
    setIsDrawing(false);
    if (currentPoints.length < 2) return;
    
    const stroke = getStroke(currentPoints, {
      size: 4,
      thinning: 0.5,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: true
    });
    const d = getSvgPathFromStroke(stroke);
    
    const newPath = { d, color: '#000' };
    const updated = [...savedPaths, newPath];
    setSavedPaths(updated);
    setCurrentPoints([]);
    
    if (onSaveStroke) {
      onSaveStroke(updated);
    }
  };

  return (
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
  );
}
