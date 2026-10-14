import React, { useState, useRef, useEffect } from 'react';

import Toolbar from './components/Toolbar';
import GameBoard from './components/GameBoard';
import TokenSidebar from './components/TokenSidebar';
import SettingsModal from './components/SettingsModal';
import DiceRoller from './components/DiceRoller';
import Soundboard, { playerSoundEngine, SOUND_CATALOG } from './components/Soundboard';
import useLocalStorage from './hooks/useLocalStorage';

// Auxiliares geométricos para impedir que un token atraviese paredes o puertas cerradas
const ccw = (A, B, C) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
const segmentsIntersect = (A, B, C, D) => ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);

const distToSegment = (p, v, w) => {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
};

const App = () => {
  const isPlayerView = new URLSearchParams(window.location.search).get('view') === 'player';

  const [characters, setCharacters] = useLocalStorage('vtt_characters', []);
  const [tokens, setTokens] = useLocalStorage('vtt_tokens', []);
  const [maps, setMaps] = useState([]); 
  const [fowActions, setFowActions] = useLocalStorage('vtt_fowActions', []);
  const [customStatuses, setCustomStatuses] = useLocalStorage('vtt_statuses', []);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const [fowEnabled, setFowEnabled] = useState(false);
  const [fowMode, setFowMode] = useState('none');
  const [fowBrushSize, setFowBrushSize] = useState(100);
  const [fowVisionRadius, setFowVisionRadius] = useState(150);
  
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(50);
  
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const [isHudMinimized, setIsHudMinimized] = useState(false);
  
  const [draggedToken, setDraggedToken] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const [rulerActive, setRulerActive] = useState(false);
  const [rulerMeasure, setRulerMeasure] = useState(null);
  const [pingActive, setPingActive] = useState(false);
  const [pings, setPings] = useState([]);

  // Estados para Efectos de Sonido (Master Toast vs Player Audio)
  const [activeSoundLoops, setActiveSoundLoops] = useState([]);
  const [masterToast, setMasterToast] = useState(null);

  const boardRef = useRef(null);
  const campaignInputRef = useRef(null);
  const fowCanvasRef = useRef(null);
  const pingTimerRef = useRef(null);
  const toastTimerRef = useRef(null);
  const downPosRef = useRef(null);
  const syncChannelRef = useRef(null);
  const latestStateRef = useRef({});
  const panStartRef = useRef({ x: 0, y: 0 });

  // Cuando cambia el tamaño de la cuadrícula (gridSize), adaptamos proporcionalmente el tamaño de los tokens en mesa
  const handleGridSizeChange = (newSize) => {
    const ratio = newSize / gridSize;
    setGridSize(newSize);
    setTokens(prev => prev.map(t => ({
      ...t,
      size: Math.max(20, Math.round((t.size || gridSize) * ratio)),
      x: snapToGrid ? Math.round(t.x / newSize) * newSize : t.x,
      y: snapToGrid ? Math.round(t.y / newSize) * newSize : t.y
    })));
  };

  // Comprueba si el movimiento desde (oldX, oldY) hasta (newX, newY) choca con una pared o puerta cerrada
  const isMovementBlocked = (oldX, oldY, newX, newY, tokenSize) => {
    const radius = tokenSize * 0.38;
    const startCenter = { x: oldX + tokenSize / 2, y: oldY + tokenSize / 2 };
    const endCenter = { x: newX + tokenSize / 2, y: newY + tokenSize / 2 };

    for (const el of maps) {
      if (el.type === 'wall') {
        const A = { x: el.x1, y: el.y1 };
        const B = { x: el.x2, y: el.y2 };
        if (segmentsIntersect(startCenter, endCenter, A, B) || distToSegment(endCenter, A, B) < radius) {
          return true;
        }
      } else if (el.type === 'door' && !el.isOpen) {
        const w = el.width || 60;
        const h = el.height || 16;
        // Convertimos la puerta cerrada en un segmento bloqueante a lo largo de su eje central
        const A = w >= h
          ? { x: el.x, y: el.y + h / 2 }
          : { x: el.x + w / 2, y: el.y };
        const B = w >= h
          ? { x: el.x + w, y: el.y + h / 2 }
          : { x: el.x + w / 2, y: el.y + h };

        if (segmentsIntersect(startCenter, endCenter, A, B) || distToSegment(endCenter, A, B) < radius) {
          return true;
        }
      }
    }
    return false;
  };

  const showMasterSoundToast = (soundObj) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setMasterToast(soundObj);
    toastTimerRef.current = setTimeout(() => {
      setMasterToast(null);
    }, 3200);
  };

  const handleTriggerSound = (sound) => {
    if (sound.loop) {
      setActiveSoundLoops(prev =>
        prev.includes(sound.id) ? prev.filter(id => id !== sound.id) : [...prev, sound.id]
      );
    }
    showMasterSoundToast(sound);
    if (syncChannelRef.current) {
      syncChannelRef.current.postMessage({ type: 'PLAY_SOUND', payload: sound });
    }
  };

  const handleStopAllSounds = () => {
    setActiveSoundLoops([]);
    showMasterSoundToast({ icon: '🔇', label: 'Todos los sonidos detenidos' });
    if (syncChannelRef.current) {
      syncChannelRef.current.postMessage({ type: 'STOP_ALL_SOUNDS' });
    }
  };

  const handleToggleDoor = (doorId) => {
    let openedNow = false;
    setMaps(prev => prev.map(el => {
      if (el.id === doorId && el.type === 'door') {
        openedNow = !el.isOpen;
        return { ...el, isOpen: !el.isOpen };
      }
      return el;
    }));
    const doorSound = SOUND_CATALOG.find(s => s.id === (openedNow ? 'sfx_door_open' : 'sfx_door_slam'));
    if (doorSound) {
      handleTriggerSound(doorSound);
    }
  };

  // Mantener referencia actualizada del estado del GM para responder al instante cuando se abre la ventana de jugador
  useEffect(() => {
    latestStateRef.current = {
      maps, tokens, fowEnabled, fowActions, snapToGrid, gridSize, customStatuses, rulerMeasure
    };
  }, [maps, tokens, fowEnabled, fowActions, snapToGrid, gridSize, customStatuses, rulerMeasure]);

  useEffect(() => {
    const channel = new BroadcastChannel('vtt_realtime_sync');
    syncChannelRef.current = channel;

    channel.onmessage = (event) => {
      const { type, payload } = event.data || {};

      if (type === 'SPAWN_PING' && payload) {
        setPings(prev => [...prev, payload]);
        setTimeout(() => {
          setPings(prev => prev.filter(p => p.id !== payload.id));
        }, 3200);
      }

      if (type === 'SYNC_RULER') {
        setRulerMeasure(payload);
      }

      if (isPlayerView) {
        // El audio SOLO suena en la pantalla del jugador
        if (type === 'PLAY_SOUND' && payload) {
          playerSoundEngine.play(payload.id);
        }
        if (type === 'STOP_ALL_SOUNDS') {
          playerSoundEngine.stopAll();
        }

        if (type === 'SYNC_STATE' && payload) {
          if (payload.maps !== undefined) setMaps(payload.maps);
          if (payload.tokens !== undefined) setTokens(payload.tokens);
          if (payload.fowEnabled !== undefined) setFowEnabled(payload.fowEnabled);
          if (payload.fowActions !== undefined) setFowActions(payload.fowActions);
          if (payload.snapToGrid !== undefined) setSnapToGrid(payload.snapToGrid);
          if (payload.gridSize !== undefined) setGridSize(payload.gridSize);
          if (payload.customStatuses !== undefined) setCustomStatuses(payload.customStatuses);
          if (payload.rulerMeasure !== undefined) setRulerMeasure(payload.rulerMeasure);
        }
      } else {
        if (type === 'REQUEST_INITIAL_STATE') {
          channel.postMessage({
            type: 'SYNC_STATE',
            payload: latestStateRef.current
          });
        }
      }
    };

    if (isPlayerView) {
      channel.postMessage({ type: 'REQUEST_INITIAL_STATE' });
    }

    return () => channel.close();
  }, [isPlayerView, setTokens, setFowActions, setCustomStatuses]);

  // Emitir cambios automáticamente desde la ventana del Master hacia la Vista de Jugador
  useEffect(() => {
    if (isPlayerView || !syncChannelRef.current) return;
    syncChannelRef.current.postMessage({
      type: 'SYNC_STATE',
      payload: {
        maps, tokens, fowEnabled, fowActions, snapToGrid, gridSize, customStatuses, rulerMeasure
      }
    });
  }, [isPlayerView, maps, tokens, fowEnabled, fowActions, snapToGrid, gridSize, customStatuses, rulerMeasure]);

  const spawnPing = (x, y) => {
    const newPing = { id: Date.now() + Math.random(), x, y };
    setPings(prev => [...prev, newPing]);
    if (syncChannelRef.current) {
      syncChannelRef.current.postMessage({ type: 'SPAWN_PING', payload: newPing });
    }
    setTimeout(() => {
      setPings(prev => prev.filter(p => p.id !== newPing.id));
    }, 3200);
  };

  const handleOpenPlayerView = () => {
    const playerUrl = `${window.location.origin}${window.location.pathname}?view=player`;
    window.open(playerUrl, 'VTT_Player_View', 'width=1280,height=800,menubar=no,toolbar=no');
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const handlePointerDown = (e) => {
    const rect = boardRef.current.getBoundingClientRect();
    const logicalX = (e.clientX - rect.left - pan.x) / scale;
    const logicalY = (e.clientY - rect.top - pan.y) / scale;

    if ((e.button === 0 && (pingActive || e.shiftKey)) || e.button === 1) {
      spawnPing(logicalX, logicalY);
      return;
    }

    if (e.button === 0 && (rulerActive || e.altKey)) {
      const newMeasure = { startX: logicalX, startY: logicalY, endX: logicalX, endY: logicalY };
      setRulerMeasure(newMeasure);
      if (isPlayerView && syncChannelRef.current) {
        syncChannelRef.current.postMessage({ type: 'SYNC_RULER', payload: newMeasure });
      }
      return;
    }

    if (!isPlayerView && fowEnabled && fowMode !== 'none' && e.button === 0) {
      setFowActions([...fowActions, { x: logicalX, y: logicalY, radius: fowBrushSize, type: fowMode }]);
      return;
    }

    if (e.button === 0 || e.button === 2) {
      setIsDraggingPan(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }

    if (e.button === 0) {
      downPosRef.current = { x: e.clientX, y: e.clientY };
      if (pingTimerRef.current) clearTimeout(pingTimerRef.current);
      pingTimerRef.current = setTimeout(() => {
        setIsDraggingPan(false);
        spawnPing(logicalX, logicalY);
      }, 500);
    }
  };

  const handlePointerMove = (e) => {
    const rect = boardRef.current.getBoundingClientRect();
    const logicalX = (e.clientX - rect.left - pan.x) / scale;
    const logicalY = (e.clientY - rect.top - pan.y) / scale;

    if (pingTimerRef.current && downPosRef.current) {
      const moveDist = Math.hypot(e.clientX - downPosRef.current.x, e.clientY - downPosRef.current.y);
      if (moveDist > 6) {
        clearTimeout(pingTimerRef.current);
        pingTimerRef.current = null;
      }
    }

    if (isDraggingPan && draggedToken === null) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y
      });
      return;
    }

    if (rulerMeasure) {
      const updatedMeasure = { ...rulerMeasure, endX: logicalX, endY: logicalY };
      setRulerMeasure(updatedMeasure);
      if (isPlayerView && syncChannelRef.current) {
        syncChannelRef.current.postMessage({ type: 'SYNC_RULER', payload: updatedMeasure });
      }
      return;
    }

    if (isPlayerView) return;

    if (fowEnabled && fowMode !== 'none' && e.buttons === 1) {
      setFowActions(prev => [...prev, { x: logicalX, y: logicalY, radius: fowBrushSize, type: fowMode }]);
      return;
    }

    // Mover un token respetando paredes y puertas cerradas
    if (draggedToken !== null) {
      const currentToken = tokens.find(t => t.id === draggedToken);
      if (!currentToken) return;

      const tknSize = currentToken.size || gridSize;
      const targetX = logicalX - dragOffset.x;
      const targetY = logicalY - dragOffset.y;

      // Si el movimiento atraviesa una pared o puerta cerrada, impedimos el paso
      if (isMovementBlocked(currentToken.x, currentToken.y, targetX, targetY, tknSize)) {
        return;
      }

      setTokens(prev => prev.map(t => {
        if (t.id === draggedToken) {
          return { ...t, x: targetX, y: targetY };
        }
        return t;
      }));

      if (fowEnabled) {
        setFowActions(prev => [...prev, {
          x: targetX + (tknSize / 2),
          y: targetY + (tknSize / 2),
          radius: fowVisionRadius,
          type: 'reveal'
        }]);
      }
    }
  };

  const handlePointerUp = () => {
    if (isDraggingPan) {
      setIsDraggingPan(false);
    }
    if (pingTimerRef.current) {
      clearTimeout(pingTimerRef.current);
      pingTimerRef.current = null;
    }
    if (rulerMeasure) {
      setRulerMeasure(null);
      if (isPlayerView && syncChannelRef.current) {
        syncChannelRef.current.postMessage({ type: 'SYNC_RULER', payload: null });
      }
    }
    if (draggedToken !== null) {
      if (snapToGrid) {
        setTokens(prev => prev.map(t => {
          if (t.id === draggedToken) {
            const tknSize = t.size || gridSize;
            // Centramos el token respecto a la casilla más cercana
            const cellX = Math.floor((t.x + tknSize / 2) / gridSize) * gridSize + (gridSize - tknSize) / 2;
            const cellY = Math.floor((t.y + tknSize / 2) / gridSize) * gridSize + (gridSize - tknSize) / 2;

            if (isMovementBlocked(t.x, t.y, cellX, cellY, tknSize)) {
              return t;
            }
            return { ...t, x: cellX, y: cellY };
          }
          return t;
        }));
      }
      setDraggedToken(null);
    }
  };

  const handleWheel = (e) => {
    const zoomFactor = -e.deltaY * 0.001;
    setScale(prev => Math.min(Math.max(0.1, prev + zoomFactor), 5));
  };

  const handleTokenPointerDown = (e, token) => {
    if (isPlayerView) return;
    if (token.isLocked) return;
    
    const hasImmobilize = token.statuses?.some(stId => {
      const statusObj = customStatuses.find(s => s.id === stId);
      return statusObj && statusObj.effect === 'immobilize';
    });
    if (hasImmobilize) return;

    e.preventDefault();
    e.stopPropagation(); 
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }

    const rect = boardRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / scale;
    const mouseY = (e.clientY - rect.top - pan.y) / scale;
    
    setDraggedToken(token.id);
    setDragOffset({ x: mouseX - token.x, y: mouseY - token.y });
  };

  const handleAddTokenToBoard = (char) => {
    const rect = boardRef.current ? boardRef.current.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight };
    const rawCenterX = (rect.width / 2 - pan.x) / scale - gridSize / 2;
    const rawCenterY = (rect.height / 2 - pan.y) / scale - gridSize / 2;

    const spawnX = snapToGrid ? Math.round(rawCenterX / gridSize) * gridSize : rawCenterX;
    const spawnY = snapToGrid ? Math.round(rawCenterY / gridSize) * gridSize : rawCenterY;

    const newToken = {
      ...char,
      id: `token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      x: spawnX,
      y: spawnY,
      size: gridSize,
      isLocked: false,
      showName: true,
      statuses: []
    };
    setTokens([...tokens, newToken]);
  };

  const handleToggleTokenName = (tokenId) => {
    setTokens(tokens.map(t => t.id === tokenId ? { ...t, showName: t.showName === false ? true : false } : t));
  };

  const handleToggleTokenStatus = (tokenId, statusId) => {
    setTokens(tokens.map(t => {
      if (t.id === tokenId) {
        const currentStatuses = t.statuses || [];
        const newStatuses = currentStatuses.includes(statusId)
          ? currentStatuses.filter(s => s !== statusId)
          : [...currentStatuses, statusId];
        return { ...t, statuses: newStatuses };
      }
      return t;
    }));
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
        setIsSettingsModalOpen(false);
      } catch (err) {}
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', backgroundColor: '#111827', color: 'white', overflow: 'hidden' }}>
      
      {!isPlayerView && (
        <TokenSidebar 
          tokens={tokens} characters={characters}
          onAddToken={handleAddTokenToBoard}
          onRemoveToken={(id) => setTokens(tokens.filter(t => t.id !== id))}
          onRemoveCharacter={(id) => setCharacters(characters.filter(c => c.id !== id))}
          onToggleTokenName={handleToggleTokenName}
          customStatuses={customStatuses}
        />
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {!isPlayerView && (
          <div style={{ padding: '10px 20px', backgroundColor: '#1f2937', borderBottom: '1px solid #374151', display: 'flex', alignItems: 'center', zIndex: 10 }}>
            <Toolbar 
              onResetBoard={() => { setMaps([]); setTokens([]); setFowActions([]); }}
              onOpenSettings={() => setIsSettingsModalOpen(true)}
              onOpenPlayerView={handleOpenPlayerView}
            />
          </div>
        )}

        <GameBoard 
          boardRef={boardRef}
          scale={scale}
          pan={pan}
          isDraggingPan={isDraggingPan}
          isPlayerView={isPlayerView}
          fowEnabled={fowEnabled}
          fowMode={fowMode}
          rulerActive={rulerActive}
          pingActive={pingActive}
          handlePointerDown={handlePointerDown} handlePointerMove={handlePointerMove}
          handlePointerUp={handlePointerUp} handleWheel={handleWheel}
          snapToGrid={snapToGrid} gridSize={gridSize} maps={maps}
          fowCanvasRef={fowCanvasRef} fowActions={fowActions}
          tokens={tokens} draggedToken={draggedToken}
          onTokenPointerDown={handleTokenPointerDown}
          onToggleTokenLock={(tokenId) => setTokens(tokens.map(t => t.id === tokenId ? { ...t, isLocked: !t.isLocked } : t))}
          onUpdateTokenSize={(tokenId, newSize) => setTokens(tokens.map(t => t.id === tokenId ? { ...t, size: newSize } : t))}
          onToggleTokenStatus={handleToggleTokenStatus}
          customStatuses={customStatuses}
          rulerMeasure={rulerMeasure}
          pings={pings}
          onToggleDoor={handleToggleDoor}
        />

        {/* Barra flotante de herramientas de navegación y vista */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(17, 24, 39, 0.92)',
            border: '1px solid #374151',
            borderRadius: '999px',
            padding: isHudMinimized ? '6px 14px' : '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.7)',
            zIndex: 5000,
            backdropFilter: 'blur(8px)'
          }}
        >
          {!isHudMinimized ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => setScale(prev => Math.max(0.1, +(prev - 0.15).toFixed(2)))}
                  style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #4b5563', backgroundColor: '#1f2937', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                  title="Alejar Zoom"
                >➖</button>
                <span style={{ minWidth: '48px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', color: '#d1d5db' }}>
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale(prev => Math.min(5, +(prev + 0.15).toFixed(2)))}
                  style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #4b5563', backgroundColor: '#1f2937', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                  title="Acercar Zoom"
                >➕</button>
              </div>

              <div style={{ width: '1px', height: '20px', backgroundColor: '#374151' }} />

              <button
                onClick={() => { setPan({ x: 0, y: 0 }); setScale(1); }}
                style={{ padding: '6px 12px', borderRadius: '999px', border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
                title="Volver al centro del mapa y restaurar zoom al 100%"
              >
                🎯 Centrar
              </button>

              <button
                onClick={() => {
                  setRulerActive(!rulerActive);
                  if (!rulerActive) setPingActive(false);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '999px',
                  border: rulerActive ? '1px solid #fbbf24' : '1px solid #4b5563',
                  backgroundColor: rulerActive ? '#f59e0b' : '#374151',
                  color: rulerActive ? '#111827' : 'white',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title="Medir distancias en el mapa (Atajo: Alt + Arrastrar)"
              >
                📏 Regla
              </button>

              <button
                onClick={() => {
                  setPingActive(!pingActive);
                  if (!pingActive) setRulerActive(false);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '999px',
                  border: pingActive ? '1px solid #f87171' : '1px solid #4b5563',
                  backgroundColor: pingActive ? '#ef4444' : '#374151',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title="Señalar un punto en el mapa (Atajo: Shift + Clic)"
              >
                🔊 Señalar
              </button>

              <div style={{ width: '1px', height: '20px', backgroundColor: '#374151' }} />

              <button
                onClick={handleToggleFullscreen}
                style={{ padding: '6px 12px', borderRadius: '999px', border: '1px solid #4b5563', backgroundColor: '#1f2937', color: 'white', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
                title="Alternar Pantalla Completa"
              >
                ⛶ Pantalla Completa
              </button>

              <button
                onClick={() => setIsHudMinimized(true)}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '14px', padding: '4px' }}
                title="Minimizar controles"
              >
                ✕
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsHudMinimized(false)}
              style={{ background: 'transparent', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Mostrar herramientas de navegación y vista"
            >
              🛠️ Controles de Vista
            </button>
          )}
        </div>

        {!isPlayerView && (
          <>
            <Soundboard
              onTriggerSound={handleTriggerSound}
              onStopAllSounds={handleStopAllSounds}
              activeLoops={activeSoundLoops}
              masterToast={masterToast}
            />
            <DiceRoller />
          </>
        )}
      </div>

      <input type="file" accept=".json" ref={campaignInputRef} style={{ display: 'none' }} onChange={handleImportCampaign} />

      {!isPlayerView && isSettingsModalOpen && (
        <SettingsModal 
          onClose={() => setIsSettingsModalOpen(false)}
          characters={characters} onSaveCharacter={(c) => setCharacters([...characters, c])}
          onImportCharacters={(newChars) => setCharacters([...characters, ...newChars])}
          customStatuses={customStatuses} onAddCustomStatus={(s) => setCustomStatuses([...customStatuses, s])}
          onRemoveCustomStatus={(id) => setCustomStatuses(customStatuses.filter(s => s.id !== id))}
          onExportCampaign={() => {
            const blob = new Blob([JSON.stringify({ maps, tokens, fowActions, customStatuses, characters })], { type: 'application/json' });
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'partida_vtt.json'; a.click();
          }} 
          onImportCampaign={() => campaignInputRef.current.click()}
          fowEnabled={fowEnabled} setFowEnabled={setFowEnabled}
          fowBrushSize={fowBrushSize} setFowBrushSize={setFowBrushSize}
          fowVisionRadius={fowVisionRadius} setFowVisionRadius={setFowVisionRadius}
          fowMode={fowMode} setFowMode={setFowMode}
          snapToGrid={snapToGrid} setSnapToGrid={setSnapToGrid} gridSize={gridSize} setGridSize={handleGridSizeChange}
          maps={maps} onLoadMapToBoard={(newMaps) => { setMaps(newMaps); setIsSettingsModalOpen(false); }}
        />
      )}
    </div>
  );
};

export default App;