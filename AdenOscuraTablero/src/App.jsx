import React, { useState, useRef } from 'react';
import Toolbar from './components/Toolbar';
import GameToken from './components/GameToken';

export default function App() {
  const [gameState, setGameState] = useState({
    tokens: [
      { id: 1, x: 100, y: 150, color: '#ef4444' },
      { id: 2, x: 300, y: 200, color: '#3b82f6' },
    ]
  });

  const [maps, setMaps] = useState([]);
  const [isMapsLocked, setIsMapsLocked] = useState(false);
  const [tokenSize, setTokenSize] = useState(50);
  const fileInputRef = useRef(null);

  const [dragState, setDragState] = useState({
    isDragging: false,
    type: null, // 'token' o 'map'
    id: null,
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0
  });

  const [viewport, setViewport] = useState({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const handleTokenPointerDown = (e, token) => {
    e.stopPropagation();
    try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
    setDragState({
      isDragging: true, type: 'token', id: token.id, startX: e.clientX, startY: e.clientY,
      initialX: token.x, initialY: token.y
    });
  };

  const handleMapItemPointerDown = (e, map) => {
    if (isMapsLocked) return; 
    e.stopPropagation();
    try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
    
    // Mover el mapa seleccionado al frente
    setMaps(prev => {
      const filtered = prev.filter(m => m.id !== map.id);
      return [...filtered, map];
    });

    setDragState({
      isDragging: true, type: 'map', id: map.id, startX: e.clientX, startY: e.clientY,
      initialX: map.x, initialY: map.y
    });
  };

  const handleMapPointerDown = (e) => {
    try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e) => {
    if (dragState.isDragging && dragState.id !== null) {
      const dx = (e.clientX - dragState.startX) / viewport.scale;
      const dy = (e.clientY - dragState.startY) / viewport.scale;
      
      if (dragState.type === 'token') {
        setGameState(prev => ({
          ...prev,
          tokens: prev.tokens.map(t => 
            t.id === dragState.id ? { ...t, x: dragState.initialX + dx, y: dragState.initialY + dy } : t
          )
        }));
      } else if (dragState.type === 'map') {
        setMaps(prev => prev.map(m => 
          m.id === dragState.id ? { ...m, x: dragState.initialX + dx, y: dragState.initialY + dy } : m
        ));
      }
    } else if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerUp = () => {
    if (dragState.isDragging) {
      setDragState({ isDragging: false, type: null, id: null, startX: 0, startY: 0, initialX: 0, initialY: 0 });
    }
    if (isPanning) setIsPanning(false);
  };

  const handleWheel = (e) => {
    const zoomSensitivity = 0.001;
    const delta = e.deltaY * -zoomSensitivity;
    let newScale = viewport.scale * Math.exp(delta);
    newScale = Math.max(0.1, Math.min(newScale, 5)); // Límites de zoom
    
    const mouseX = e.clientX;
    const mouseY = e.clientY;
    const xs = (mouseX - viewport.x) / viewport.scale;
    const ys = (mouseY - viewport.y) / viewport.scale;
    const newX = mouseX - xs * newScale;
    const newY = mouseY - ys * newScale;

    setViewport({ scale: newScale, x: newX, y: newY });
  };

  const handleMapUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const centerX = -viewport.x / viewport.scale + (window.innerWidth / 2) / viewport.scale;
        const centerY = -viewport.y / viewport.scale + (window.innerHeight / 2) / viewport.scale;

        const newMap = {
          id: Date.now(),
          url: event.target.result,
          x: centerX - 250, 
          y: centerY - 250
        };
        setMaps(prev => [...prev, newMap]);
      };
      reader.readAsDataURL(file);
    }
    if (e.target) e.target.value = ''; 
  };

  return (
    <div 
      style={{ 
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
        overflow: 'hidden', backgroundColor: '#1a202c', touchAction: 'none', margin: 0, padding: 0
      }}
      onPointerDown={handleMapPointerDown} onPointerMove={handlePointerMove} 
      onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} onWheel={handleWheel}
    >
      <Toolbar 
        onUploadClick={() => fileInputRef.current?.click()} 
        fileInputRef={fileInputRef} 
        onMapUpload={handleMapUpload}
        tokenSize={tokenSize}
        setTokenSize={setTokenSize}
        isMapsLocked={isMapsLocked}
        setIsMapsLocked={setIsMapsLocked}
      />

      <div 
        style={{
          position: 'absolute', transformOrigin: '0 0',
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
          width: '100%', height: '100%', willChange: 'transform'
        }}
      >
        {maps.length === 0 && (
          <div style={{ position: 'absolute', top: '50vh', left: '50vw', transform: 'translate(-50%, -50%)', color: 'white', fontSize: 20, opacity: 0.5, pointerEvents: 'none' }}>
            Carga uno o varios mapas para comenzar
          </div>
        )}

        {maps.map((map) => (
          <img 
            key={map.id}
            src={map.url} 
            alt="Sección del mapa" 
            onPointerDown={(e) => handleMapItemPointerDown(e, map)}
            style={{ 
              position: 'absolute', top: map.y, left: map.x, 
              cursor: isMapsLocked ? 'default' : (dragState.type === 'map' && dragState.id === map.id ? 'grabbing' : 'grab'),
              boxShadow: isMapsLocked ? 'none' : '0 10px 25px rgba(0,0,0,0.5)',
              border: isMapsLocked ? 'none' : '2px dashed rgba(255,255,255,0.4)',
              zIndex: dragState.type === 'map' && dragState.id === map.id ? 50 : 0
            }} 
            draggable="false" 
          />
        ))}

        {gameState.tokens.map((token) => (
          <GameToken 
            key={token.id} 
            token={token}
            isDragging={dragState.type === 'token' && dragState.id === token.id}
            onPointerDown={handleTokenPointerDown}
            size={tokenSize}
          />
        ))}
      </div>
    </div>
  );
}