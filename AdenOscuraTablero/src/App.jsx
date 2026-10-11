import React, { useState, useEffect, useRef } from 'react';
import TokenSidebar from './components/TokenSidebar';
import CharacterModal from './components/CharacterModal';
import Toolbar from './components/Toolbar';
import MapContextMenu from './components/MapContextMenu';
import GameBoard from './components/GameBoard';
import useLocalStorage from './hooks/useLocalStorage';

const App = () => {
  // -- ESTADOS DE PERSISTENCIA --
  const [characters, setCharacters] = useLocalStorage('vtt_characters', []);
  const [tokens, setTokens] = useLocalStorage('vtt_tokens', []);
  const [maps, setMaps] = useLocalStorage('vtt_maps', []);
  const [fowActions, setFowActions] = useLocalStorage('vtt_fow', []);

  // -- ESTADOS DE LA UI --
  const [isCharModalOpen, setIsCharModalOpen] = useState(false);
  const [showNames, setShowNames] = useState(true);
  const [isMapsLocked, setIsMapsLocked] = useState(true);
  const [isToolbarVisible, setIsToolbarVisible] = useState(true);
  const [mapContextMenu, setMapContextMenu] = useState({ visible: false, x: 0, y: 0, mapId: null });

  // -- ESTADOS DE LA CÁMARA --
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  
  // -- ESTADOS DE ARRASTRE --
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const [draggedToken, setDraggedToken] = useState(null);
  const [draggedMap, setDraggedMap] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // -- ESTADOS DE CUADRÍCULA --
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(50);

  // -- ESTADOS DE NIEBLA DE GUERRA --
  const [fowEnabled, setFowEnabled] = useState(false);
  const [fowMode, setFowMode] = useState('none');
  const [fowBrushSize, setFowBrushSize] = useState(60);
  const [fowVisionRadius, setFowVisionRadius] = useState(150);

  // -- REFERENCIAS --
  const fileInputRef = useRef(null);
  const charFileInputRef = useRef(null);
  const boardRef = useRef(null);
  const fowCanvasRef = useRef(null);
  const hasDragged = useRef(false);
  const clickStart = useRef({ x: 0, y: 0 });

  // Forzar reseteo de Vite para la pantalla completa
  useEffect(() => {
    const root = document.getElementById('root');
    if (root) {
      root.style.setProperty('max-width', '100%', 'important');
      root.style.setProperty('width', '100%', 'important');
      root.style.setProperty('height', '100vh', 'important');
      root.style.setProperty('margin', '0', 'important');
      root.style.setProperty('padding', '0', 'important');
      root.style.setProperty('display', 'flex', 'important');
    }
  }, []);

  const getBoardCoords = (clientX, clientY) => {
    if (!boardRef.current) return { x: 0, y: 0 };
    const rect = boardRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / scale,
      y: (clientY - rect.top - pan.y) / scale
    };
  };

  const revealFogAt = (x, y, radius) => {
    setFowActions(prev => {
      const last = prev[prev.length - 1];
      if (last && last.type === 'reveal' && Math.abs(last.x - x) < 20 && Math.abs(last.y - y) < 20) return prev;
      return [...prev, { x, y, radius, type: 'reveal' }];
    });
  };

  const snapTo = (val, size) => Math.round(val / size) * size;

  const handlePointerDown = (e) => {
    clickStart.current = { x: e.clientX, y: e.clientY };
    hasDragged.current = false;

    if (e.button === 0 && fowEnabled && fowMode !== 'none') {
      const coords = getBoardCoords(e.clientX, e.clientY);
      setFowActions(prev => [...prev, { x: coords.x, y: coords.y, radius: fowBrushSize, type: fowMode }]);
      return;
    }

    // Paneo con click derecho (2) o rueda (1)
    if (e.button === 1 || e.button === 2) {
      e.preventDefault();
      setIsDraggingPan(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handlePointerMove = (e) => {
    if (Math.abs(e.clientX - clickStart.current.x) > 3 || Math.abs(e.clientY - clickStart.current.y) > 3) {
      hasDragged.current = true;
    }

    if (fowEnabled && fowMode !== 'none' && e.buttons === 1) {
      const coords = getBoardCoords(e.clientX, e.clientY);
      setFowActions(prev => [...prev, { x: coords.x, y: coords.y, radius: fowBrushSize, type: fowMode }]);
      return;
    }

    if (isDraggingPan) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      return;
    }

    if (draggedToken) {
      const coords = getBoardCoords(e.clientX, e.clientY);
      let newX = coords.x - dragStart.x;
      let newY = coords.y - dragStart.y;
      setTokens(tokens.map(t => t.id === draggedToken ? { ...t, x: newX, y: newY } : t));

      if (fowEnabled) {
        const currentToken = tokens.find(t => t.id === draggedToken);
        const radius = fowVisionRadius;
        revealFogAt(newX + (currentToken?.size || 50) / 2, newY + (currentToken?.size || 50) / 2, radius);
      }
    } else if (draggedMap && !isMapsLocked) {
      const coords = getBoardCoords(e.clientX, e.clientY);
      setMaps(maps.map(m => m.id === draggedMap ? { ...m, x: coords.x - dragStart.x, y: coords.y - dragStart.y } : m));
    }
  };

  const handlePointerUp = () => {
    if (draggedToken && snapToGrid) {
      setTokens(prev => prev.map(t => {
        if (t.id === draggedToken) {
          const tSize = t.size || 50;
          const centerX = t.x + tSize / 2;
          const centerY = t.y + tSize / 2;
          const snappedCX = snapTo(centerX, gridSize);
          const snappedCY = snapTo(centerY, gridSize);
          return { ...t, x: snappedCX - tSize / 2, y: snappedCY - tSize / 2 };
        }
        return t;
      }));
    }

    if (draggedMap && snapToGrid && !isMapsLocked) {
      setMaps(prev => prev.map(m => {
        if (m.id === draggedMap) {
          return { ...m, x: snapTo(m.x, gridSize), y: snapTo(m.y, gridSize) };
        }
        return m;
      }));
    }

    setIsDraggingPan(false);
    setDraggedToken(null);
    setDraggedMap(null);
  };

  const handleWheel = (e) => {
    if (e.deltaY !== 0) {
      setScale(prev => Math.min(Math.max(0.2, prev - e.deltaY * 0.001), 3));
    }
  };

  const handleMapPointerDown = (e, map) => {
    if (e.button === 0 && !isMapsLocked) {
      e.stopPropagation();
      const coords = getBoardCoords(e.clientX, e.clientY);
      setDragStart({ x: coords.x - map.x, y: coords.y - map.y });
      setDraggedMap(map.id);
    }
  };

  const handleMapContextMenu = (e, map) => {
    e.preventDefault();
    if (hasDragged.current) return;
    setMapContextMenu({ visible: true, x: e.clientX, y: e.clientY, mapId: map.id });
  };

  const resetBoard = () => {
    setTokens([]);
    setMaps([]);
    setFowActions([]);
    setPan({ x: 0, y: 0 });
    setScale(1);
  };

  const handleTokenPointerDown = (e, t) => {
    e.stopPropagation();
    if (fowEnabled && fowMode !== 'none') return;
    if (e.button === 0) {
      const coords = getBoardCoords(e.clientX, e.clientY);
      setDragStart({ x: coords.x - t.x, y: coords.y - t.y });
      setDraggedToken(t.id);
    }
  };

  const handleToggleTokenLock = (id) => {
    setTokens(tokens.map(t => t.id === id ? { ...t, isLocked: !t.isLocked } : t));
  };

  const handleUpdateTokenSize = (id, size) => {
    setTokens(tokens.map(t => t.id === id ? { ...t, size } : t));
  };

  const handleToggleTokenStatus = (id, statusId) => {
    setTokens(tokens.map(t => {
      if (t.id === id) {
        const currentStatuses = t.statuses || [];
        const hasStatus = currentStatuses.includes(statusId);
        return {
          ...t,
          statuses: hasStatus 
            ? currentStatuses.filter(s => s !== statusId) 
            : [...currentStatuses, statusId]
        };
      }
      return t;
    }));
  };

  return (
    <div style={{ display: 'flex', width: '100%', height: '100vh', overflow: 'hidden', backgroundColor: '#111827', flexDirection: 'column' }}>
      
      {/* Pestaña para ocultar/mostrar Toolbar */}
      <button
        onClick={() => setIsToolbarVisible(!isToolbarVisible)}
        style={{
          position: 'absolute', top: 0, right: '20px', zIndex: 999999,
          padding: '4px 12px', backgroundColor: '#374151', color: '#d1d5db',
          border: 'none', borderBottomLeftRadius: '6px', borderBottomRightRadius: '6px',
          cursor: 'pointer', fontSize: '12px', fontWeight: 'bold',
          boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
        }}
      >
        {isToolbarVisible ? '▲ Ocultar' : '▼ Mostrar Herramientas'}
      </button>

      {/* TOOLBAR SUPERIOR */}
      {isToolbarVisible && (
        <div style={{ backgroundColor: '#1f2937', padding: '12px', borderBottom: '1px solid #374151', zIndex: 99999 }}>
          <Toolbar 
            onUploadClick={() => fileInputRef.current.click()}
            fileInputRef={fileInputRef}
            onMapUpload={(e) => {
              const file = e.target.files[0];
              if (!file) return;
              const url = URL.createObjectURL(file);
              const img = new Image();
              img.onload = () => {
                setMaps([...maps, { id: Date.now(), src: url, x: 0, y: 0, width: img.width, height: img.height }]);
              };
              img.src = url;
            }}
            isMapsLocked={isMapsLocked} setIsMapsLocked={setIsMapsLocked}
            snapToGrid={snapToGrid} setSnapToGrid={setSnapToGrid}
            gridSize={gridSize} setGridSize={setGridSize}
            fowEnabled={fowEnabled} setFowEnabled={setFowEnabled}
            fowMode={fowMode} setFowMode={setFowMode}
            fowBrushSize={fowBrushSize} setFowBrushSize={setFowBrushSize}
            fowVisionRadius={fowVisionRadius} setFowVisionRadius={setFowVisionRadius}
            onResetBoard={resetBoard}
          />
        </div>
      )}

      {/* ÁREA PRINCIPAL: SIDEBAR + TABLERO */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <TokenSidebar 
          tokens={tokens}
          characters={characters}
          onAddToken={(char) => setTokens([...tokens, { ...char, id: Date.now(), x: 50, y: 50, size: 50, isLocked: false, statuses: [] }])}
          onRemoveToken={(id) => setTokens(tokens.filter(t => t.id !== id))}
          onOpenModal={() => setIsCharModalOpen(true)}
          onRemoveCharacter={(id) => setCharacters(characters.filter(c => c.id !== id))}
          showNames={showNames}
          setShowNames={setShowNames}
          onExportCharacters={() => {
            const blob = new Blob([JSON.stringify(characters)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'personajes_vtt.json';
            a.click();
          }}
          onImportClick={() => charFileInputRef.current.click()}
        />

        <input 
          type="file" accept=".json" ref={charFileInputRef} style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (evt) => {
              try {
                const imported = JSON.parse(evt.target.result);
                if (Array.isArray(imported)) {
                  setCharacters(prev => [...prev, ...imported]);
                }
              } catch (err) { alert("Archivo JSON inválido"); }
            };
            reader.readAsText(file);
          }}
        />

        <GameBoard 
          boardRef={boardRef}
          pan={pan}
          scale={scale}
          isDraggingPan={isDraggingPan}
          handlePointerDown={handlePointerDown}
          handlePointerMove={handlePointerMove}
          handlePointerUp={handlePointerUp}
          handleWheel={handleWheel}
          snapToGrid={snapToGrid}
          gridSize={gridSize}
          maps={maps}
          handleMapPointerDown={handleMapPointerDown}
          handleMapContextMenu={handleMapContextMenu}
          isMapsLocked={isMapsLocked}
          fowEnabled={fowEnabled}
          fowCanvasRef={fowCanvasRef}
          fowActions={fowActions}
          tokens={tokens}
          draggedToken={draggedToken}
          showNames={showNames}
          onTokenPointerDown={handleTokenPointerDown}
          onToggleTokenLock={handleToggleTokenLock}
          onUpdateTokenSize={handleUpdateTokenSize}
          onToggleTokenStatus={handleToggleTokenStatus}
        />
      </div>

      {/* Menú Contextual Mapas */}
      {mapContextMenu.visible && (
        <MapContextMenu 
          x={mapContextMenu.x} 
          y={mapContextMenu.y} 
          mapId={mapContextMenu.mapId}
          onBringToFront={(mapId) => {
            setMaps(prev => {
              const map = prev.find(m => m.id === mapId);
              return [...prev.filter(m => m.id !== mapId), map];
            });
            setMapContextMenu({ visible: false, x: 0, y: 0, mapId: null });
          }}
          onDelete={(mapId) => {
            setMaps(prev => prev.filter(m => m.id !== mapId));
            setMapContextMenu({ visible: false, x: 0, y: 0, mapId: null });
          }}
          onClose={() => setMapContextMenu(prev => ({ ...prev, visible: false }))}
        />
      )}

      {isCharModalOpen && (
        <CharacterModal 
          onClose={() => setIsCharModalOpen(false)}
          onSave={(char) => { setCharacters([...characters, char]); setIsCharModalOpen(false); }}
        />
      )}
    </div>
  );
};

export default App;