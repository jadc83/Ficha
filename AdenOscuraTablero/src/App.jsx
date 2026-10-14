import React, { useState, useRef, useEffect } from 'react';

import Toolbar from './components/Toolbar';
import GameBoard from './components/GameBoard';
import TokenSidebar from './components/TokenSidebar';
import SettingsModal from './components/SettingsModal';
import DiceRoller from './components/DiceRoller';
import useLocalStorage from './hooks/useLocalStorage';

const App = () => {
  const isPlayerView = new URLSearchParams(window.location.search).get('view') === 'player';

  const [characters, setCharacters] = useLocalStorage('vtt_characters', []);
  const [tokens, setTokens] = useLocalStorage('vtt_tokens', []);
  
  // CAMBIADO: Usamos useState normal en lugar de useLocalStorage para no saturar la memoria del navegador con imágenes gigantes.
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
  
  const [draggedToken, setDraggedToken] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const [rulerActive, setRulerActive] = useState(false);
  const [rulerMeasure, setRulerMeasure] = useState(null);
  const [pingActive, setPingActive] = useState(false);
  const [pings, setPings] = useState([]);

  const boardRef = useRef(null);
  const campaignInputRef = useRef(null);
  const fowCanvasRef = useRef(null);
  const pingTimerRef = useRef(null);
  const downPosRef = useRef(null);
  const syncChannelRef = useRef(null);
  const latestStateRef = useRef({});

  // Mantener referencia actualizada del estado del GM para responder al instante cuando se abre la ventana de jugador
  useEffect(() => {
    latestStateRef.current = {
      maps, tokens, fowEnabled, fowActions, snapToGrid, gridSize, scale, customStatuses, rulerMeasure
    };
  }, [maps, tokens, fowEnabled, fowActions, snapToGrid, gridSize, scale, customStatuses, rulerMeasure]);

  useEffect(() => {
    const channel = new BroadcastChannel('vtt_realtime_sync');
    syncChannelRef.current = channel;

    channel.onmessage = (event) => {
      const { type, payload } = event.data || {};

      if (isPlayerView) {
        if (type === 'SYNC_STATE' && payload) {
          if (payload.maps !== undefined) setMaps(payload.maps);
          if (payload.tokens !== undefined) setTokens(payload.tokens);
          if (payload.fowEnabled !== undefined) setFowEnabled(payload.fowEnabled);
          if (payload.fowActions !== undefined) setFowActions(payload.fowActions);
          if (payload.snapToGrid !== undefined) setSnapToGrid(payload.snapToGrid);
          if (payload.gridSize !== undefined) setGridSize(payload.gridSize);
          if (payload.scale !== undefined) setScale(payload.scale);
          if (payload.customStatuses !== undefined) setCustomStatuses(payload.customStatuses);
          if (payload.rulerMeasure !== undefined) setRulerMeasure(payload.rulerMeasure);
        }
        if (type === 'SPAWN_PING' && payload) {
          setPings(prev => [...prev, payload]);
          setTimeout(() => {
            setPings(prev => prev.filter(p => p.id !== payload.id));
          }, 3200);
        }
      } else {
        // Si la ventana de jugadores acaba de abrirse y pide el estado completo
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
        maps, tokens, fowEnabled, fowActions, snapToGrid, gridSize, scale, customStatuses, rulerMeasure
      }
    });
  }, [isPlayerView, maps, tokens, fowEnabled, fowActions, snapToGrid, gridSize, scale, customStatuses, rulerMeasure]);

  const spawnPing = (x, y) => {
    const newPing = { id: Date.now() + Math.random(), x, y };
    setPings(prev => [...prev, newPing]);
    if (syncChannelRef.current && !isPlayerView) {
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

  const handlePointerDown = (e) => {
    if (isPlayerView) return;

    const rect = boardRef.current.getBoundingClientRect();
    const logicalX = (e.clientX - rect.left) / scale;
    const logicalY = (e.clientY - rect.top) / scale;

    // Ping inmediato si el botón "Marcar Sonido" está activo, con Shift + Clic izquierdo o botón central
    if ((e.button === 0 && (pingActive || e.shiftKey)) || e.button === 1) {
      spawnPing(logicalX, logicalY);
      return;
    }

    // Regla de medición (si el botón Regla está activo o si mantiene Alt)
    if (e.button === 0 && (rulerActive || e.altKey)) {
      setRulerMeasure({ startX: logicalX, startY: logicalY, endX: logicalX, endY: logicalY });
      return;
    }

    // Si la niebla está activa, pintamos o borramos sobre el lienzo.
    if (fowEnabled && fowMode !== 'none') {
      setFowActions([...fowActions, { x: logicalX, y: logicalY, radius: fowBrushSize, type: fowMode }]);
      return;
    }

    // Temporizador para Ping mantendo pulsado el clic izquierdo (~500ms sin mover)
    if (e.button === 0) {
      downPosRef.current = { x: e.clientX, y: e.clientY };
      if (pingTimerRef.current) clearTimeout(pingTimerRef.current);
      pingTimerRef.current = setTimeout(() => {
        spawnPing(logicalX, logicalY);
      }, 500);
    }
  };

  const handlePointerMove = (e) => {
    const rect = boardRef.current.getBoundingClientRect();
    const logicalX = (e.clientX - rect.left) / scale;
    const logicalY = (e.clientY - rect.top) / scale;

    // Si mueve el ratón mientras mantiene pulsado, cancelamos el Ping por pulsación larga
    if (pingTimerRef.current && downPosRef.current) {
      const moveDist = Math.hypot(e.clientX - downPosRef.current.x, e.clientY - downPosRef.current.y);
      if (moveDist > 6) {
        clearTimeout(pingTimerRef.current);
        pingTimerRef.current = null;
      }
    }

    // Actualizar extremo de la regla si se está midiendo
    if (rulerMeasure) {
      setRulerMeasure(prev => ({ ...prev, endX: logicalX, endY: logicalY }));
      return;
    }

    // Pintar niebla de guerra en arrastre continuo
    if (fowEnabled && fowMode !== 'none' && e.buttons === 1) {
      setFowActions(prev => [...prev, { x: logicalX, y: logicalY, radius: fowBrushSize, type: fowMode }]);
      return;
    }

    // Mover un token
    if (draggedToken !== null) {
      setTokens(prev => prev.map(t => {
        if (t.id === draggedToken) {
          return { ...t, x: logicalX - dragOffset.x, y: logicalY - dragOffset.y };
        }
        return t;
      }));

      // Visión automática del token en la niebla
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
    }
  };

  const handlePointerUp = () => {
    if (pingTimerRef.current) {
      clearTimeout(pingTimerRef.current);
      pingTimerRef.current = null;
    }
    if (rulerMeasure) {
      setRulerMeasure(null);
    }
    if (draggedToken !== null) {
      if (snapToGrid) {
        setTokens(prev => prev.map(t => {
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
    const zoomFactor = -e.deltaY * 0.001;
    setScale(prev => Math.min(Math.max(0.1, prev + zoomFactor), 5));
  };

  const handleTokenPointerDown = (e, token) => {
    if (isPlayerView) return;
    if (token.isLocked) return;
    
    // Validar si el token está inmovilizado
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
    const mouseX = (e.clientX - rect.left) / scale;
    const mouseY = (e.clientY - rect.top) / scale;
    
    setDraggedToken(token.id);
    setDragOffset({ x: mouseX - token.x, y: mouseY - token.y });
  };

  const handleAddTokenToBoard = (char) => {
    const boardCenterX = window.innerWidth / 2 / scale;
    const boardCenterY = window.innerHeight / 2 / scale;

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
      } catch (err) {
        alert("Archivo JSON inválido");
      }
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
              rulerActive={rulerActive}
              onToggleRuler={() => {
                setRulerActive(!rulerActive);
                if (!rulerActive) setPingActive(false);
              }}
              pingActive={pingActive}
              onTogglePing={() => {
                setPingActive(!pingActive);
                if (!pingActive) setRulerActive(false);
              }}
              onOpenPlayerView={handleOpenPlayerView}
            />
          </div>
        )}

        <GameBoard 
          boardRef={boardRef}
          scale={scale}
          handlePointerDown={handlePointerDown} handlePointerMove={handlePointerMove}
          handlePointerUp={handlePointerUp} handleWheel={handleWheel}
          snapToGrid={snapToGrid} gridSize={gridSize} maps={maps}
          fowEnabled={fowEnabled} fowCanvasRef={fowCanvasRef} fowActions={fowActions}
          tokens={tokens} draggedToken={draggedToken}
          onTokenPointerDown={handleTokenPointerDown}
          onToggleTokenLock={(tokenId) => setTokens(tokens.map(t => t.id === tokenId ? { ...t, isLocked: !t.isLocked } : t))}
          onUpdateTokenSize={(tokenId, newSize) => setTokens(tokens.map(t => t.id === tokenId ? { ...t, size: newSize } : t))}
          onToggleTokenStatus={handleToggleTokenStatus}
          customStatuses={customStatuses}
          rulerMeasure={rulerMeasure}
          pings={pings}
        />

        {!isPlayerView && <DiceRoller />}
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
          snapToGrid={snapToGrid} setSnapToGrid={setSnapToGrid} gridSize={gridSize} setGridSize={setGridSize}
          maps={maps} onLoadMapToBoard={(newMaps) => { setMaps(newMaps); setIsSettingsModalOpen(false); }}
        />
      )}
    </div>
  );
};

export default App;