import React, { useState, useEffect } from 'react';
import Brick from './Brick';
import './index.css';

export default function App() {
  const [bricks, setBricks] = useState([]);
  const [hoveredBrick, setHoveredBrick] = useState(null);
  const [activeBrickId, setActiveBrickId] = useState(null);
  const [currentUser] = useState('User_' + Math.floor(Math.random() * 1000));
  const [isPlacing, setIsPlacing] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

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

  const interactWithAgent = async (brick, userMessage) => {
    setIsTyping(true);
    const history = [...chatHistory];
    if (userMessage) {
      history.push({ role: 'user', content: userMessage });
      setChatHistory(history);
    }

    try {
      const res = await fetch('http://localhost:3001/api/agent-interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isOwner: brick.owner === currentUser,
          currentMarks: brick.marks,
          messageHistory: history
        })
      });
      const data = await res.json();
      
      const updatedHistory = [...history, { role: 'assistant', content: data.reply }];
      setChatHistory(updatedHistory);

      // Save marks and quote
      if (data.quote || (data.marks && data.marks.length > 0)) {
        await fetch(`http://localhost:3001/api/bricks/${brick.id}/marks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            marks: data.marks, 
            quote: data.quote 
          })
        });

        const marksStr = JSON.stringify(data.marks);
        const updatedBricks = bricks.map(b => b.id === brick.id ? { 
          ...b, 
          quote: data.quote || b.quote,
          marks: data.marks && data.marks.length > 0 ? marksStr : b.marks 
        } : b);
        setBricks(updatedBricks);
      }
    } catch (e) {
      console.error(e);
    }
    setIsTyping(false);
  };

  const openAgent = (brickId) => {
    setActiveBrickId(brickId);
    setChatHistory([]);
    const brick = bricks.find(b => b.id === brickId);
    if (brick) interactWithAgent(brick, "Hello."); // Initial greeting
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
                onAgentInteract={() => openAgent(brick.id)}
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

      {/* Chat Agent UI */}
      {activeBrickId && (
        <div style={{
          position: 'fixed', bottom: '20px', right: '20px', width: '300px',
          background: 'white', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 1000
        }}>
          <div style={{ background: '#4A3B32', color: 'white', padding: '10px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Brick Agent</span>
            <button onClick={() => setActiveBrickId(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ height: '300px', overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {chatHistory.filter(m => m.content !== 'Hello.').map((msg, i) => (
              <div key={i} style={{ 
                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                background: msg.role === 'user' ? '#DCAE96' : '#F5F5F5',
                padding: '8px', borderRadius: '4px', maxWidth: '80%'
              }}>
                {msg.content}
              </div>
            ))}
            {isTyping && <div style={{ alignSelf: 'flex-start', color: '#888' }}>Typing...</div>}
          </div>
          <form style={{ display: 'flex', borderTop: '1px solid #eee' }} onSubmit={e => {
            e.preventDefault();
            const val = e.target.elements.message.value;
            if (val) interactWithAgent(bricks.find(b => b.id === activeBrickId), val);
            e.target.reset();
          }}>
            <input name="message" style={{ flex: 1, padding: '10px', border: 'none', outline: 'none' }} placeholder="Tell the agent..." />
            <button style={{ background: '#2E8B57', color: 'white', border: 'none', padding: '0 15px', cursor: 'pointer' }}>Send</button>
          </form>
        </div>
      )}
    </div>
  );
}
