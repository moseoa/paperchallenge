import React, { useMemo } from 'react';

import { generateVines } from './VineGenerator';
import { Leaf } from 'lucide-react'; // if we want vector leaves instead of just circles

export default function Brick({ 
  brick, 
  onAgentInteract,
  onDrawInteract,
  isHovered,
  setHovered
}) {
  const ageDays = (Date.now() - brick.placedAt) / (1000 * 3600 * 24);
  
  // Natural color based on age. New = #8B3A2B (red-brown), Old (mossy) = #6E7B61.
  const r = Math.max(110, 139 - ageDays * 0.5); // 139 -> 110
  const g = Math.min(123, 58 + ageDays * 0.5); // 58 -> 123
  const b = 43 + ageDays * 0.1; // 43 -> around 50
  const brickColor = `rgb(${r}, ${g}, ${b})`;
  
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
        backgroundColor: brickColor,
        margin: '5px',
        position: 'relative',
        borderRadius: '6px',
        boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.1), inset 0 -2px 10px rgba(0,0,0,0.5), 3px 3px 8px rgba(0,0,0,0.4)',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.05), rgba(0,0,0,0.1)), url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.8\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100\' height=\'100\' filter=\'url(%23noise)\' opacity=\'0.15\'/%3E%3C/svg%3E")',
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

      {/* Doodle Canvas Overlays (Goodnotes strokes) */}
      <svg viewBox="0 0 600 300" style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <filter id={`chalk-filter-${brick.id}`} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="1.5" numOctaves="3" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="0.5" />
          </filter>
          <filter id={`spray-filter-${brick.id}`} x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="10" xChannelSelector="R" yChannelSelector="G" />
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
        </defs>
        {doodlePaths.map((p, i) => {
          let filter = undefined;
          if (p.tool === 'chalk') filter = `url(#chalk-filter-${brick.id})`;
          if (p.tool === 'spray') filter = `url(#spray-filter-${brick.id})`;
          return (
            <path 
              key={i} 
              d={p.d} 
              fill={p.color || '#000'} 
              filter={filter}
              opacity={(p.tool === 'spray' || p.tool === 'chalk') ? 0.8 : 1}
            />
          );
        })}
      </svg>

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
          color: 'rgba(255,255,255,0.9)',
          fontFamily: "'Caveat', cursive",
          fontSize: '24px',
          lineHeight: '1.2',
          pointerEvents: 'none',
          textShadow: '2px 2px 4px rgba(0,0,0,0.6)'
        }}>
          {brick.quote}
          <div style={{ fontSize: '14px', textAlign: 'right', opacity: 0.8, marginTop: '4px' }}>- {brick.owner}</div>
        </div>
      )}

      {isHovered && (
        <div style={{ position: 'absolute', bottom: '10px', right: '10px', display: 'flex', gap: '5px' }}>
          <button 
            onClick={onDrawInteract}
            style={{
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
            Draw
          </button>
          <button 
            onClick={onAgentInteract}
            style={{
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
        </div>
      )}
    </div>
  );
}
