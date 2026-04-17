import React, { useMemo } from 'react';
import DoodleCanvas from './DoodleCanvas';
import { generateVines } from './VineGenerator';
import { Leaf } from 'lucide-react'; // if we want vector leaves instead of just circles

export default function Brick({ 
  brick, 
  onSaveStroke, 
  onAgentInteract,
  isHovered,
  setHovered
}) {
  const ageDays = (Date.now() - brick.placedAt) / (1000 * 3600 * 24);
  
  // Deterministic vines
  const vines = useMemo(() => generateVines(ageDays, brick.id.length * 42), [ageDays, brick.id]);

  let doodlePaths = [];
  try { doodlePaths = JSON.parse(brick.strokePaths); } catch (e) {}

  let marks = [];
  try { if (brick.marks) marks = JSON.parse(brick.marks); } catch (e) {}

  const colorMap = {
    'brick-red': '#8A3324',
    'moss-green': '#8F9779',
    'wheat-gold': '#F5DEB3',
    'chalk-white': '#F8F8FF',
    'charcoal': '#36454F',
    'rust-orange': '#C35817',
    'sage': '#9DC183',
    'dusty-rose': '#DCAE96'
  };

  return (
    <div 
      style={{
        width: '300px',
        height: '150px',
        backgroundColor: '#8B4513',
        margin: '5px',
        position: 'relative',
        borderRadius: '4px',
        boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5), 2px 2px 5px rgba(0,0,0,0.3)',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.05), rgba(0,0,0,0.1))',
        flexShrink: 0
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Marks Grid Overlay */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', display: 'flex', flexWrap: 'wrap' }}>
        {marks.map((m, i) => (
          <div key={i} style={{
            position: 'absolute',
            left: m.col * (300 / 16),
            top: m.row * (150 / 8),
            width: 300 / 16,
            height: 150 / 8,
            backgroundColor: colorMap[m.color] || m.color,
            borderRadius: m.type === 'circle' ? '50%' : '2px',
            opacity: m.visitor ? 0.9 : 0.7,
            boxShadow: m.visitor ? '0 0 2px rgba(255,255,255,0.5)' : 'none'
          }} />
        ))}
      </div>

      {/* Doodle Canvas Overlay */}
      <DoodleCanvas 
        brickId={brick.id} 
        initialPaths={doodlePaths}
        onSaveStroke={(paths) => onSaveStroke(brick.id, JSON.stringify(paths))}
      />

      {/* Vine Layer */}
      <svg 
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
      >
        {vines.paths.map((p, i) => (
          <path 
            key={i} 
            d={p.d} 
            fill="transparent" 
            stroke="#2E8B57" 
            strokeWidth={p.width} 
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={p.dash === "none" ? undefined : p.dash}
            opacity={p.opacity}
          />
        ))}
        {vines.leaves.map((l, i) => (
          <circle key={'l'+i} cx={l.x} cy={l.y} r={l.r} fill="#228B22" opacity="0.9" />
        ))}
      </svg>

      {/* Quote / Hover UI */}
      {brick.quote && (
        <div style={{
          position: 'absolute',
          bottom: '10px',
          left: '10px',
          right: '10px',
          color: 'rgba(255,255,255,0.8)',
          fontFamily: 'Georgia, serif',
          fontSize: '12px',
          pointerEvents: 'none',
          textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
        }}>
          "{brick.quote}" - {brick.owner}
        </div>
      )}

      {isHovered && (
        <button 
          onClick={onAgentInteract}
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            background: 'rgba(255,255,255,0.2)',
            border: '1px solid rgba(255,255,255,0.5)',
            color: 'white',
            borderRadius: '4px',
            padding: '4px 8px',
            cursor: 'pointer',
            fontSize: '12px',
            pointerEvents: 'auto'
          }}
        >
          Talk to Agent
        </button>
      )}
    </div>
  );
}
