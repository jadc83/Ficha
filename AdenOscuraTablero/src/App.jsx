import React, { useState, useRef } from 'react';

import Toolbar from './components/Toolbar';
import GameBoard from './components/GameBoard';
import TokenSidebar from './components/TokenSidebar';
import SettingsModal from './components/SettingsModal';
import MapContextMenu from './components/MapContextMenu';

import useLocalStorage from './hooks/useLocalStorage';

const App = () => {
  const [characters, setCharacters] = useLocalStorage('vtt_characters', []);
  const [tokens, setTokens] = useLocalStorage('vtt_tokens', []);
  const [maps, setMaps] = useLocalStorage('vtt_maps', []);
  const [fowActions, setFowActions] = useLocalStorage('vtt_fowActions', []);
  const [customStatuses, setCustomStatuses] = useLocalStorage('vtt_statuses', []);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  // Estados de Niebla de Guerra
  const [fowEnabled, setFowEnabled] = useState(false);
  const [fowMode, setFowMode] = useState('none');
  const [fowBrushSize, setFowBrushSize] = useState(100);
  const [fowVisionRadius, setFowVisionRadius] = useState(150);
  
  // Estados de Cuadrícula
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(50);
  
  // Estados del Tablero y Mapas
  const [isMapsLocked, setIsMapsLocked] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  
  // Estados de Arrastre de Tokens
  const [draggedToken, setDraggedToken] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Estados de Arrastre de Mapas y Menú
  const [draggedMap, setDraggedMap] = useState(null);
  const [mapDragOffset, setMapDragOffset] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, mapId: null });

  const boardRef = useRef(null);
  const fileInputRef = useRef(null);
  const campaignInputRef = useRef(null);
  const fowCanvasRef = useRef(null);

  const handleMapUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const newMap = {
            id: Date.now(),
            src: event.target.result,
            x: 0,
            y: 0,
            width: img.width,
            height: img.height,
            zIndex: maps.length
          };
          setMaps([...maps, newMap]);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleMapPointerDown = (e, map) => {
    if (isMapsLocked) return;
    e.stopPropagation();
    const rect = boardRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / scale - pan.x / scale;
    const mouseY = (e.clientY - rect.top) / scale - pan.y / scale;
    
    setDraggedMap(map.id);
    setMapDragOffset({ x: mouseX - map.x, y: mouseY - map.y });
  };

  const handleMapContextMenu = (e, map) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, mapId: map.id });
  };

  const handleBringMapToFront = (mapId) => {
    const mapToMove = maps.find(m => m.id === mapId);
    const otherMaps = maps.filter(m => m.id !== mapId);
    setMaps([...otherMaps, mapToMove]);
    setContextMenu({ visible: false, x: 0, y: 0, mapId: null });
  };

  const handleDeleteMap = (mapId) => {
    setMaps(maps.filter(m => m.id !== mapId));
    setContextMenu({ visible: false, x: 0, y: 0, mapId: null });
  };

  const handlePointerDown = (e) => {
    if (e.button === 1 || e.button === 2) {
      setIsDraggingPan(true);
      return;
    }

    if (fowEnabled && fowMode !== 'none') {
      const rect = boardRef.current.getBoundingClientRect();
      const logicalX = (e.clientX - rect.left) / scale - pan.x / scale;
      const logicalY = (e.clientY - rect.top) / scale - pan.y / scale;
      
      setFowActions([...fowActions, { x: logicalX, y: logicalY, radius: fowBrushSize, type: fowMode }]);
    }
  };

  const handlePointerMove = (e) => {
    if (isDraggingPan) {
      setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
      return;
    }

    const rect = boardRef.current.getBoundingClientRect();
    const logicalX = (e.clientX - rect.left) / scale - pan.x / scale;
    const logicalY = (e.clientY - rect.top) / scale - pan.y / scale;

    if (fowEnabled && fowMode !== 'none' && e.buttons === 1) {
      setFowActions(prev => [...prev, { x: logicalX, y: logicalY, radius: fowBrushSize, type: fowMode }]);
      return;
    }

    if (draggedToken !== null) {
      setTokens(tokens.map(t => {
        if (t.id === draggedToken) {
          return { ...t, x: logicalX - dragOffset.x, y: logicalY - dragOffset.y };
        }
        return t;
      }));

      // Revelar niebla automáticamente al arrastrar si está activado
      if (fowEnabled) {
        const tkn = tokens.find(t => t.id === draggedToken);
        const tknSize = tkn?.size || 50;
        setFowActions(prev => [...prev, {
          x: logicalX - dragOffset.x + (tknSize / 2),
          y: logicalY - dragOffset.y + (tknSize / 2),
          radius: fowVisionRadius,
          type: 'reveal'
        }]);
      }
      return;
    }

    if (draggedMap !== null) {
      setMaps(maps.map(m => {
        if (m.id === draggedMap) {
          return { ...m, x: logicalX - mapDragOffset.x, y: logicalY - mapDragOffset.y };
        }
        return m;
      }));
    }
  };

  const handlePointerUp = () => {
    setIsDraggingPan(false);
    setDraggedMap(null);
    
    if (draggedToken !== null) {
      if (snapToGrid) {
        setTokens(tokens.map(t => {
          if (t.id === draggedToken) {
            const snappedX = Math.round(t.x / gridSize) * gridSize;
            const snappedY = Math.round(t.y / gridSize) * gridSize;
            return { ...t, x: snappedX, y: snappedY };
          }
          return t;
        }));
      }
      setDraggedToken(null);
    }
  };

  const handleWheel = (e) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const zoomFactor = -e.deltaY * 0.001;
      setScale(prev => Math.min(Math.max(0.1, prev + zoomFactor), 5));
    } else {
      setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  const handleTokenPointerDown = (e, token) => {
    if (token.isLocked) return;
    
    // Bloquear el movimiento si tiene un estado que lo inmovilice (ej. Muerto/Dormido)
    const hasImmobilize = token.statuses?.some(stId => {
      const statusObj = customStatuses.find(s => s.id === stId);
      return statusObj && statusObj.effect === 'immobilize';
    });
    
    if (hasImmobilize) {
      // No permitimos el arrastre
      return;
    }

    e.stopPropagation();
    const rect = boardRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / scale - pan.x / scale;
    const mouseY = (e.clientY - rect.top) / scale - pan.y / scale;
    
    setDraggedToken(token.id);
    setDragOffset({ x: mouseX - token.x, y: mouseY - token.y });
  };

  const handleAddTokenToBoard = (char) => {
    // Calculamos el centro actual de la pantalla para que el token caiga ahí
    const boardCenterX = -pan.x / scale + window.innerWidth / 2 / scale;
    const boardCenterY = -pan.y / scale + window.innerHeight / 2 / scale;

    const newToken = {
      ...char,
      id: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x: boardCenterX,
      y: boardCenterY,
      size: 50,
      isLocked: false,
      showName: true,
      statuses: []
    };
    setTokens([...tokens, newToken]);
  };

  const handleRemoveToken = (id) => setTokens(tokens.filter(t => t.id !== id));
  const handleRemoveCharacter = (id) => setCharacters(characters.filter(c => c.id !== id));
  const handleToggleTokenLock = (tokenId) => setTokens(tokens.map(t => t.id === tokenId ? { ...t, isLocked: !t.isLocked } : t));
  const handleUpdateTokenSize = (tokenId, newSize) => setTokens(tokens.map(t => t.id === tokenId ? { ...t, size: newSize } : t));
  const handleToggleTokenName = (tokenId) => setTokens(tokens.map(t => t.id === tokenId ? { ...t, showName: t.showName === false ? true : false } : t));

  const handleToggleTokenStatus = (tokenId, statusId) => {
    setTokens(tokens.map(t => {
      if (t.id !== tokenId) return t;
      const currentStatuses = t.statuses || [];
      if (currentStatuses.includes(statusId)) {
        return { ...t, statuses: currentStatuses.filter(id => id !== statusId) };
      } else {
        return { ...t, statuses: [...currentStatuses, statusId] };
      }
    }));
  };

  const handleExportCampaign = () => {
    const campaignData = { maps, tokens, fowActions, customStatuses, characters };
    const blob = new Blob([JSON.stringify(campaignData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'partida_vtt.json';
    a.click();
  };

  const handleImportCampaign = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (data.maps) setMaps(data.maps);
        if (data.tokens) setTokens(data.tokens);
        if (data.fowActions) setFowActions(data.fowActions);
        if (data.customStatuses) setCustomStatuses(data.customStatuses);
        if (data.characters) setCharacters(data.characters);
        setIsSettingsModalOpen(false); // Cierra el modal de ajustes si todo va bien
      } catch (err) {
        alert("Archivo JSON inválido");
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleImportCharacters = (newChars) => {
    setCharacters([...characters, ...newChars]);
  };

  const handleResetBoard = () => {
    setMaps([]);
    setTokens([]);
    setFowActions([]);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: '#111827', color: 'white', overflow: 'hidden' }}>
      
      <TokenSidebar 
        tokens={tokens}
        characters={characters}
        onAddToken={handleAddTokenToBoard}
        onRemoveToken={handleRemoveToken}
        onRemoveCharacter={handleRemoveCharacter}
        onToggleTokenName={handleToggleTokenName}
        customStatuses={customStatuses}
      />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <div style={{ padding: '10px 20px', backgroundColor: '#1f2937', borderBottom: '1px solid #374151', display: 'flex', alignItems: 'center', zIndex: 10 }}>
          <Toolbar 
            onUploadClick={() => fileInputRef.current.click()}
            fileInputRef={fileInputRef}
            onMapUpload={handleMapUpload}
            isMapsLocked={isMapsLocked}
            setIsMapsLocked={setIsMapsLocked}
            fowEnabled={fowEnabled}
            setFowEnabled={setFowEnabled}
            onResetBoard={handleResetBoard}
            onOpenSettings={() => setIsSettingsModalOpen(true)}
          />
        </div>

        <GameBoard 
          boardRef={boardRef}
          pan={pan} scale={scale} isDraggingPan={isDraggingPan}
          handlePointerDown={handlePointerDown} handlePointerMove={handlePointerMove}
          handlePointerUp={handlePointerUp} handleWheel={handleWheel}
          snapToGrid={snapToGrid} gridSize={gridSize}
          maps={maps} handleMapPointerDown={handleMapPointerDown}
          handleMapContextMenu={handleMapContextMenu} isMapsLocked={isMapsLocked}
          fowEnabled={fowEnabled} fowCanvasRef={fowCanvasRef} fowActions={fowActions}
          tokens={tokens} draggedToken={draggedToken}
          onTokenPointerDown={handleTokenPointerDown}
          onToggleTokenLock={handleToggleTokenLock}
          onUpdateTokenSize={handleUpdateTokenSize}
          onToggleTokenStatus={handleToggleTokenStatus}
          customStatuses={customStatuses}
        />
      </div>

      {contextMenu.visible && (
        <MapContextMenu 
          x={contextMenu.x} y={contextMenu.y} mapId={contextMenu.mapId}
          onBringToFront={handleBringMapToFront} onDelete={handleDeleteMap}
          onClose={() => setContextMenu({ ...contextMenu, visible: false })}
        />
      )}

      {/* Input oculto para la importación de campaña */}
      <input 
        type="file" accept=".json" ref={campaignInputRef} 
        style={{ display: 'none' }} onChange={handleImportCampaign} 
      />

      {isSettingsModalOpen && (
        <SettingsModal 
          onClose={() => setIsSettingsModalOpen(false)}
          characters={characters}
          onSaveCharacter={(c) => setCharacters([...characters, c])}
          onImportCharacters={handleImportCharacters}
          customStatuses={customStatuses}
          onAddCustomStatus={(s) => setCustomStatuses([...customStatuses, s])}
          onRemoveCustomStatus={(id) => setCustomStatuses(customStatuses.filter(s => s.id !== id))}
          onExportCampaign={handleExportCampaign}
          onImportCampaign={() => campaignInputRef.current.click()}
          fowBrushSize={fowBrushSize} setFowBrushSize={setFowBrushSize}
          fowVisionRadius={fowVisionRadius} setFowVisionRadius={setFowVisionRadius}
          fowMode={fowMode} setFowMode={setFowMode}
          snapToGrid={snapToGrid} setSnapToGrid={setSnapToGrid}
          gridSize={gridSize} setGridSize={setGridSize}
        />
      )}
      
    </div>
  );
};

export default App;