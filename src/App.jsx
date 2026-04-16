import React, { useState, useEffect } from 'react';
import Brick from './Brick';
import './index.css';

export default function App() {
  const [bricks, setBricks] = useState([]);
  const [hoveredBrick, setHoveredBrick] = useState(null);
  const [currentUser] = useState('User_' + Math.floor(Math.random() * 1000));
  const [isPlacing, setIsPlacing] = useState(false);

  useEffect(() => {
    fetchWall();
  }, []);

  const fetchWall = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/wall');
      const data = await res.json();
      // data might come back as MCP Resource content
      // Handle array vs resource format
      if (Array.isArray(data)) {
         setBricks(data);
      } else if (data.contents && data.contents[0]) {
         setBricks(JSON.parse(data.contents[0].text));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const placeBrick = async () => {
    setIsPlacing(true);
    // Find next position. Masonry logic: we just add to end of list, order determines position
    const rowCapacity = 10;
    const count = bricks.length;
    const row = Math.floor(count / rowCapacity);
    const col = count % rowCapacity;
    
    try {
      const res = await fetch('http://localhost:3001/api/bricks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: currentUser, x: col, y: row })
      });
      const newBrick = await res.json();
      setBricks([...bricks, newBrick]);
    } catch (err) {
      console.error(err);
    }
    setIsPlacing(false);
  };

  const saveStroke = async (brickId, strokePathsStr) => {
    try {
      await fetch(`http://localhost:3001/api/bricks/${brickId}/doodle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ strokePaths: JSON.parse(strokePathsStr) })
      });
      // Update local state without fetching whole wall
      setBricks(prev => prev.map(b => 
        b.id === brickId ? { ...b, strokePaths: strokePathsStr } : b
      ));
    } catch (e) {
      console.error(e);
    }
  };

  const suggestQuote = async (brick) => {
    const rowNum = brick.y;
    const neighborQuotes = bricks
      .filter(b => Math.abs(b.y - rowNum) <= 1 && b.quote)
      .map(b => b.quote);

    try {
      const ageDays = (Date.now() - brick.placedAt) / (1000 * 3600 * 24);
      const res = await fetch('http://localhost:3001/api/suggest-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          owner: brick.owner,
          ageDays: ageDays.toFixed(1),
          neighborQuotes
        })
      });
      const { suggestion } = await res.json();
      
      // Update locally
      const updated = bricks.map(b => b.id === brick.id ? { ...b, quote: suggestion } : b);
      setBricks(updated);
      
    } catch (e) {
      console.error(e);
    }
  };

  // Group bricks by row for offset layout
  const rows = [];
  bricks.forEach(b => {
    if (!rows[b.y]) rows[b.y] = [];
    rows[b.y].push(b);
  });

  return (
    <div style={{ backgroundColor: '#FDFBF7', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <header style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #EAE0D5' }}>
        <h1 style={{ margin: 0, fontWeight: 500, color: '#4A3B32' }}>The Endless Wall</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '8px',
            background: 'rgba(0,0,0,0.05)', padding: '4px 12px', borderRadius: '20px'
          }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2E8B57' }} />
            <span style={{ fontSize: '14px', color: '#6B584B' }}>{currentUser}</span>
          </div>
          <button 
            onClick={placeBrick}
            disabled={isPlacing}
            style={{
              background: '#8B4513', color: 'white', border: 'none', borderRadius: '20px',
              padding: '8px 16px', cursor: 'pointer', fontWeight: 500,
              boxShadow: '0 2px 4px rgba(139,69,19,0.3)'
            }}
          >
            {isPlacing ? 'Placing...' : 'Place Brick'}
          </button>
        </div>
      </header>

      <main style={{ padding: '40px', display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', overflowX: 'auto', minHeight: '80vh' }}>
        {rows.length > 0 ? rows.map((rowArr, rowIndex) => (
          <div 
            key={rowIndex} 
            style={{ 
              display: 'flex', 
              marginLeft: rowIndex % 2 === 1 ? '155px' : '0' // half brick (150) + margin (5)
            }}
          >
            {rowArr.map(brick => (
              <Brick 
                key={brick.id} 
                brick={brick} 
                onSaveStroke={saveStroke}
                onSuggestQuote={suggestQuote}
                isHovered={hoveredBrick === brick.id}
                setHovered={(val) => setHoveredBrick(val ? brick.id : null)}
              />
            ))}
          </div>
        )) : (
          <div style={{ textAlign: 'center', marginTop: 'auto', marginBottom: 'auto', color: '#9D8C80' }}>
            <h2>The wall is empty.</h2>
            <p>Place the first brick to begin.</p>
          </div>
        )}
      </main>
    </div>
  );
}
