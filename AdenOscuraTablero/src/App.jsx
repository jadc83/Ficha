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

  const [mapImage, setMapImage] = useState(null);
  const fileInputRef = useRef(null);

  const [tokenSize, setTokenSize] = useState(50);

  const [dragState, setDragState] = useState({
    isDragging: false,
    tokenId: null,
    startX: 0,
    startY: 0,
    initialTokenX: 0,
    initialTokenY: 0
  });

  const [viewport, setViewport] = useState({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const handleTokenPointerDown = (e, token) => {
    e.stopPropagation();
    e.target.setPointerCapture(e.pointerId);
    setDragState({
      isDragging: true, tokenId: token.id, startX: e.clientX, startY: e.clientY,
      initialTokenX: token.x, initialTokenY: token.y
    });
  };

  const handleMapPointerDown = (e) => {
    e.target.setPointerCapture(e.pointerId);
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerMove = (e) => {
    if (dragState.isDragging && dragState.tokenId !== null) {
      const dx = (e.clientX - dragState.startX) / viewport.scale;
      const dy = (e.clientY - dragState.startY) / viewport.scale;
      setGameState(prev => ({
        ...prev,
        tokens: prev.tokens.map(t => 
          t.id === dragState.tokenId ? { ...t, x: dragState.initialTokenX + dx, y: dragState.initialTokenY + dy } : t
        )
      }));
    } else if (isPanning) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePointerUp = () => {
    if (dragState.isDragging) setDragState({ isDragging: false, tokenId: null, startX: 0, startY: 0, initialTokenX: 0, initialTokenY: 0 });
    if (isPanning) setIsPanning(false);
  };

  const handleWheel = (e) => {
    const zoomSensitivity = 0.001;
    const delta = e.deltaY * -zoomSensitivity;
    let newScale = viewport.scale * Math.exp(delta);
    newScale = Math.max(0.1, Math.min(newScale, 5));
    
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
      reader.onload = (event) => setMapImage(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  return (
    <>
      {/* Inyectamos CSS global para eliminar márgenes y scroll del navegador */}
      <style>{`
        body, html {
          margin: 0;
          padding: 0;
          overflow: hidden;
          width: 100%;
          height: 100%;
        }
        #root {
          width: 100%;
          height: 100%;
        }
      `}</style>

      <div 
        style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', backgroundColor: '#1a202c', touchAction: 'none' }}
        onPointerDown={handleMapPointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onWheel={handleWheel}
      >
        
        {/* 1. Capa de UI (Barra de herramientas, menús) */}
        <Toolbar 
          onUploadClick={() => fileInputRef.current.click()} 
          fileInputRef={fileInputRef} 
          onMapUpload={handleMapUpload}
          tokenSize={tokenSize}
          setTokenSize={setTokenSize}
        />

        {/* 2. Capa Virtual (La cámara que se mueve y hace zoom) */}
        <div 
          style={{
            position: 'absolute', transformOrigin: '0 0',
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.scale})`,
            width: '100%', height: '100%', willChange: 'transform'
          }}
        >
          {/* Fondo del Mapa */}
          {mapImage ? (
            <img src={mapImage} alt="Mapa" style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }} draggable="false" />
          ) : (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'white', fontSize: 20, opacity: 0.5 }}>
              Carga un mapa para comenzar
            </div>
          )}

          {/* Mapeo de Tokens */}
          {gameState.tokens.map((token) => (
            <GameToken 
              key={token.id} 
              token={token}
              isDragging={dragState.tokenId === token.id}
              onPointerDown={handleTokenPointerDown}
              size={tokenSize}
            />
          ))}
        </div>
      </div>
    </>
  );
}