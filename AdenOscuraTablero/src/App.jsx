import React, { useState, useRef, useEffect } from 'react';

import Toolbar from './components/Toolbar';
import GameBoard from './components/GameBoard';
import TokenSidebar from './components/TokenSidebar';
import SettingsModal from './components/SettingsModal';
import DiceRoller from './components/DiceRoller';
import Soundboard, { playerSoundEngine, SOUND_CATALOG } from './components/Soundboard';
import { WEATHER_TYPES, AMBIENT_TINTS } from './components/WeatherOverlay';
import useLocalStorage from './hooks/useLocalStorage';

const ccw = (A, B, C) => (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
const segmentsIntersect = (A, B, C, D) => ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);

const distToSegment = (p, v, w) => {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
};

// Interpolación angular por el camino más corto (evita saltos bruscos entre 359º y 0º)
const lerpAngle = (current, target, factor) => {
  const diff = ((((target - current) % 360) + 540) % 360) - 180;
  return (((current + diff * factor) % 360) + 360) % 360;
};

// Persistencia en IndexedDB para mapas pesados (sin el límite de 5MB de localStorage)
const openMapDB = () => new Promise((resolve, reject) => {
  const req = window.indexedDB.open('vtt_maps_db', 1);
  req.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains('maps_store')) {
      db.createObjectStore('maps_store');
    }
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const saveMapsToDB = async (mapsData) => {
  try {
    const db = await openMapDB();
    const tx = db.transaction('maps_store', 'readwrite');
    tx.objectStore('maps_store').put(mapsData, 'active_maps');
  } catch (e) {}
};

const loadMapsFromDB = async () => {
  try {
    const db = await openMapDB();
    return await new Promise((resolve) => {
      const tx = db.transaction('maps_store', 'readonly');
      const req = tx.objectStore('maps_store').get('active_maps');
      req.onsuccess = () => resolve(Array.isArray(req.result) ? req.result : []);
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
};

const App = () => {
  const isPlayerView = new URLSearchParams(window.location.search).get('view') === 'player';

  const [characters, setCharacters] = useLocalStorage('vtt_characters', []);
  const [tokens, setTokens] = useLocalStorage('vtt_tokens', []);
  const [maps, setMaps] = useState([]); 
  const [fowActions, setFowActions] = useLocalStorage('vtt_fowActions', []);
  const [customStatuses, setCustomStatuses] = useLocalStorage('vtt_statuses', []);

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const [fowEnabled, setFowEnabled] = useLocalStorage('vtt_fowEnabled', false);
  const [fowMode, setFowMode] = useState('none');
  const [fowBrushSize, setFowBrushSize] = useState(100);
  const [fowVisionRadius, setFowVisionRadius] = useLocalStorage('vtt_fowVisionRadius', 180);
  const [fowMemoryEnabled, setFowMemoryEnabled] = useLocalStorage('vtt_fowMemoryEnabled', true);
  const [fowAutoHideEnemies, setFowAutoHideEnemies] = useLocalStorage('vtt_fowAutoHideEnemies', true);

  const [weatherEffect, setWeatherEffect] = useLocalStorage('vtt_weatherEffect', 'none');
  const [ambientTint, setAmbientTint] = useLocalStorage('vtt_ambientTint', 'none');
  const [isWeatherMenuOpen, setIsWeatherMenuOpen] = useState(false);
  
  const [snapToGrid, setSnapToGrid] = useLocalStorage('vtt_snapToGrid', false);
  const [gridSize, setGridSize] = useLocalStorage('vtt_gridSize', 50);
  
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const [isHudMinimized, setIsHudMinimized] = useState(false);
  
  const [draggedToken, setDraggedToken] = useState(null);
  const [rotatingToken, setRotatingToken] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const [rulerActive, setRulerActive] = useState(false);
  const [rulerMeasure, setRulerMeasure] = useState(null);
  const [pingActive, setPingActive] = useState(false);
  const [pings, setPings] = useState([]);

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
  const lastFowTrailRef = useRef({});
  const lastBrushPosRef = useRef(null);
  const walkAnchorRef = useRef({});
  const mapsLoadedRef = useRef(false);

  // Cargar mapas guardados en IndexedDB al iniciar para que nunca desaparezcan por recargas o gestos
  useEffect(() => {
    if (isPlayerView) return;
    loadMapsFromDB().then((savedMaps) => {
      if (savedMaps && savedMaps.length > 0) {
        setMaps(savedMaps);
      }
      mapsLoadedRef.current = true;
    });
  }, [isPlayerView]);

  useEffect(() => {
    if (isPlayerView || !mapsLoadedRef.current) return;
    saveMapsToDB(maps);
  }, [maps, isPlayerView]);

  const isMovementBlocked = (startX, startY, targetX, targetY, tokenSize) => {
    const r = (tokenSize || gridSize) * 0.35;
    const pStart = { x: startX + (tokenSize || gridSize) / 2, y: startY + (tokenSize || gridSize) / 2 };
    const pEnd = { x: targetX + (tokenSize || gridSize) / 2, y: targetY + (tokenSize || gridSize) / 2 };

    for (const el of maps) {
      let seg = null;
      if (el.type === 'wall') {
        seg = { A: { x: el.x1, y: el.y1 }, B: { x: el.x2, y: el.y2 } };
      } else if ((el.type === 'door' || el.type === 'window') && !el.isOpen) {
        const w = el.width || 60;
        const h = el.height || 16;
        if (w >= h) {
          seg = { A: { x: el.x, y: el.y + h / 2 }, B: { x: el.x + w, y: el.y + h / 2 } };
        } else {
          seg = { A: { x: el.x + w / 2, y: el.y }, B: { x: el.x + w / 2, y: el.y + h } };
        }
      }

      if (seg) {
        if (segmentsIntersect(pStart, pEnd, seg.A, seg.B)) return true;
        if (distToSegment(pEnd, seg.A, seg.B) < r) return true;
      }
    }
    return false;
  };

  const handleGridSizeChange = (newSize) => {
    const ratio = newSize / (gridSize || 50);
    setGridSize(newSize);
    setTokens(prev => prev.map(t => ({
      ...t,
      size: Math.max(20, Math.round((t.size || gridSize) * ratio))
    })));
  };

  const handleOpenPlayerView = () => {
    const url = `${window.location.origin}${window.location.pathname}?view=player`;
    window.open(url, 'VTT_Player_View', 'width=1280,height=800,menubar=no,toolbar=no,location=no,status=no');
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  };

  const spawnPing = (x, y) => {
    const newPing = { id: `ping_${Date.now()}_${Math.random()}`, x, y };
    setPings(prev => [...prev, newPing]);
    if (syncChannelRef.current) {
      syncChannelRef.current.postMessage({ type: 'SPAWN_PING', payload: newPing });
    }
    setTimeout(() => {
      setPings(prev => prev.filter(p => p.id !== newPing.id));
    }, 3200);
  };

  const showMasterSoundToast = (soundObj) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setMasterToast(soundObj);
    toastTimerRef.current = setTimeout(() => {
      setMasterToast(null);
    }, 3000);
  };

  const handleTriggerSound = (sound) => {
    if (!sound) return;
    if (sound.loop) {
      const exists = activeSoundLoops.includes(sound.id);
      const nextLoops = exists
        ? activeSoundLoops.filter(id => id !== sound.id)
        : [...activeSoundLoops, sound.id];
      setActiveSoundLoops(nextLoops);
      showMasterSoundToast({
        icon: sound.icon,
        label: exists ? `Detenido: ${sound.label}` : `Ambiente activo: ${sound.label}`
      });
    } else {
      showMasterSoundToast({ icon: sound.icon, label: sound.label });
    }

    if (syncChannelRef.current) {
      syncChannelRef.current.postMessage({ type: 'PLAY_SOUND', payload: { id: sound.id } });
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

  const handleToggleWindow = (windowId, breakGlass = false) => {
    let openedNow = false;
    setMaps(prev => prev.map(el => {
      if (el.id === windowId && el.type === 'window') {
        openedNow = breakGlass ? true : !el.isOpen;
        return { ...el, isOpen: openedNow, isBroken: breakGlass ? true : el.isBroken };
      }
      return el;
    }));
    const soundId = breakGlass ? 'sfx_glass' : (openedNow ? 'sfx_door_open' : 'sfx_door_slam');
    const winSound = SOUND_CATALOG.find(s => s.id === soundId);
    if (winSound) {
      handleTriggerSound(winSound);
    }
  };

  useEffect(() => {
    latestStateRef.current = {
      maps, tokens, fowEnabled, fowActions, fowVisionRadius, fowMemoryEnabled, fowAutoHideEnemies,
      weatherEffect, ambientTint, snapToGrid, gridSize, customStatuses, rulerMeasure
    };
  }, [maps, tokens, fowEnabled, fowActions, fowVisionRadius, fowMemoryEnabled, fowAutoHideEnemies, weatherEffect, ambientTint, snapToGrid, gridSize, customStatuses, rulerMeasure]);

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
        if (type === 'PLAY_SOUND' && payload) {
          playerSoundEngine.play(payload.id);
        }
        if (type === 'STOP_ALL_SOUNDS') {
          playerSoundEngine.stopAll();
        }

        if (type === 'SYNC_MAPS' && Array.isArray(payload)) {
          setMaps(payload);
        }
        if (type === 'SYNC_TOKENS' && Array.isArray(payload)) {
          setTokens(payload);
        }
        if (type === 'SYNC_FOW' && Array.isArray(payload)) {
          setFowActions(payload);
        }
        if (type === 'SYNC_SETTINGS' && payload) {
          if (payload.fowEnabled !== undefined) setFowEnabled(payload.fowEnabled);
          if (payload.fowVisionRadius !== undefined) setFowVisionRadius(payload.fowVisionRadius);
          if (payload.fowMemoryEnabled !== undefined) setFowMemoryEnabled(payload.fowMemoryEnabled);
          if (payload.fowAutoHideEnemies !== undefined) setFowAutoHideEnemies(payload.fowAutoHideEnemies);
          if (payload.weatherEffect !== undefined) setWeatherEffect(payload.weatherEffect);
          if (payload.ambientTint !== undefined) setAmbientTint(payload.ambientTint);
          if (payload.snapToGrid !== undefined) setSnapToGrid(payload.snapToGrid);
          if (payload.gridSize !== undefined) setGridSize(payload.gridSize);
          if (payload.customStatuses !== undefined) setCustomStatuses(payload.customStatuses);
          if (payload.rulerMeasure !== undefined) setRulerMeasure(payload.rulerMeasure);
        }

        if (type === 'SYNC_STATE' && payload) {
          if (payload.maps !== undefined) setMaps(payload.maps);
          if (payload.tokens !== undefined) setTokens(payload.tokens);
          if (payload.fowEnabled !== undefined) setFowEnabled(payload.fowEnabled);
          if (payload.fowActions !== undefined) setFowActions(payload.fowActions);
          if (payload.fowVisionRadius !== undefined) setFowVisionRadius(payload.fowVisionRadius);
          if (payload.fowMemoryEnabled !== undefined) setFowMemoryEnabled(payload.fowMemoryEnabled);
          if (payload.fowAutoHideEnemies !== undefined) setFowAutoHideEnemies(payload.fowAutoHideEnemies);
          if (payload.weatherEffect !== undefined) setWeatherEffect(payload.weatherEffect);
          if (payload.ambientTint !== undefined) setAmbientTint(payload.ambientTint);
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
  }, [isPlayerView, setTokens, setFowActions, setCustomStatuses, setFowEnabled, setFowVisionRadius, setFowMemoryEnabled, setFowAutoHideEnemies, setWeatherEffect, setAmbientTint, setSnapToGrid, setGridSize]);

  // Enviar mapas SOLO cuando cambian los mapas (evita reenviar imágenes pesadas al girar o mover tokens)
  useEffect(() => {
    if (isPlayerView || !syncChannelRef.current || !mapsLoadedRef.current) return;
    syncChannelRef.current.postMessage({ type: 'SYNC_MAPS', payload: maps });
  }, [isPlayerView, maps]);

  useEffect(() => {
    if (isPlayerView || !syncChannelRef.current) return;
    syncChannelRef.current.postMessage({ type: 'SYNC_TOKENS', payload: tokens });
  }, [isPlayerView, tokens]);

  useEffect(() => {
    if (isPlayerView || !syncChannelRef.current) return;
    syncChannelRef.current.postMessage({ type: 'SYNC_FOW', payload: fowActions });
  }, [isPlayerView, fowActions]);

  useEffect(() => {
    if (isPlayerView || !syncChannelRef.current) return;
    syncChannelRef.current.postMessage({
      type: 'SYNC_SETTINGS',
      payload: { fowEnabled, fowVisionRadius, fowMemoryEnabled, fowAutoHideEnemies, weatherEffect, ambientTint, snapToGrid, gridSize, customStatuses, rulerMeasure }
    });
  }, [isPlayerView, fowEnabled, fowVisionRadius, fowMemoryEnabled, fowAutoHideEnemies, weatherEffect, ambientTint, snapToGrid, gridSize, customStatuses, rulerMeasure]);
  // Registra un punto de memoria explorada solo cuando la ficha se ha desplazado o girado lo suficiente
  const revealTokenVision = (tokenObj, customX, customY, customRotation, customVisionMode, force = false) => {
    if (!fowEnabled || !fowMemoryEnabled || !tokenObj) return;
    if (tokenObj.isHidden || tokenObj.faction === 'enemy') return;
    const tknSize = tokenObj.size || gridSize;
    const cx = (customX !== undefined ? customX : tokenObj.x) + tknSize / 2;
    const cy = (customY !== undefined ? customY : tokenObj.y) + tknSize / 2;
    const rot = customRotation !== undefined ? customRotation : (tokenObj.rotation || 0);
    const vMode = customVisionMode !== undefined ? customVisionMode : (tokenObj.visionMode || 'cone');

    if (!Number.isFinite(cx) || !Number.isFinite(cy) || !Number.isFinite(rot)) return;

    const now = performance.now();
    const prev = lastFowTrailRef.current[tokenObj.id];
    if (!force && prev) {
      const dist = Math.hypot(cx - prev.x, cy - prev.y);
      const rotDiff = Math.abs((((rot - prev.angle) % 360) + 540) % 360 - 180);
      const elapsed = now - (prev.time || 0);
      if ((dist < 22 && rotDiff < 12 && prev.visionMode === vMode) || elapsed < 65) {
        return;
      }
    }

    lastFowTrailRef.current[tokenObj.id] = { x: cx, y: cy, angle: rot, visionMode: vMode, time: now };

    setFowActions(prevActions => {
      const next = [...prevActions, {
        x: Math.round(cx),
        y: Math.round(cy),
        radius: fowVisionRadius,
        tokenSize: tknSize,
        type: 'reveal',
        mode: 'token',
        visionMode: vMode,
        angle: Math.round(rot * 10) / 10,
        fov: vMode === 'cone' ? 90 : 360
      }];
      return next.length > 600 ? next.slice(next.length - 600) : next;
    });
  };

  const handlePointerDown = (e) => {
    if (!boardRef.current) return;
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
      lastBrushPosRef.current = { x: logicalX, y: logicalY };
      setFowActions(prev => [...prev, { x: logicalX, y: logicalY, radius: fowBrushSize, type: fowMode, mode: 'brush' }]);
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
    if (!boardRef.current) return;
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

    if (!isPlayerView && rotatingToken !== null) {
      const currentToken = tokens.find(t => t.id === rotatingToken);
      if (!currentToken) return;
      const tknSize = currentToken.size || gridSize;
      const centerX = currentToken.x + tknSize / 2;
      const centerY = currentToken.y + tknSize / 2;
      const dx = logicalX - centerX;
      const dy = logicalY - centerY;

      if (Math.hypot(dx, dy) > 2) {
        const targetAngle = (((Math.atan2(dy, dx) * 180) / Math.PI) % 360 + 360) % 360;
        const smoothRot = lerpAngle(currentToken.rotation || 0, targetAngle, 0.55);
        setTokens(prev => prev.map(t => t.id === rotatingToken ? { ...t, rotation: smoothRot } : t));
        if (fowEnabled) {
          revealTokenVision(currentToken, currentToken.x, currentToken.y, smoothRot, currentToken.visionMode || 'cone', false);
        }
      }
      return;
    }

    if (isDraggingPan && draggedToken === null && rotatingToken === null) {
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
      const lastPos = lastBrushPosRef.current;
      if (!lastPos || Math.hypot(logicalX - lastPos.x, logicalY - lastPos.y) >= Math.max(10, fowBrushSize * 0.22)) {
        lastBrushPosRef.current = { x: logicalX, y: logicalY };
        setFowActions(prev => [...prev, { x: logicalX, y: logicalY, radius: fowBrushSize, type: fowMode, mode: 'brush' }]);
      }
      return;
    }

    // Mover un token respetando paredes, puertas cerradas y ventanas cerradas
    if (draggedToken !== null) {
      const currentToken = tokens.find(t => t.id === draggedToken);
      if (!currentToken) return;

      const tknSize = currentToken.size || gridSize;
      const targetX = logicalX - dragOffset.x;
      const targetY = logicalY - dragOffset.y;

      if (isMovementBlocked(currentToken.x, currentToken.y, targetX, targetY, tknSize)) {
        return;
      }

      // Orientación progresiva y suave usando un punto de anclaje dinámico (sin tirones bruscos por píxel)
      const anchor = walkAnchorRef.current[draggedToken] || { x: currentToken.x, y: currentToken.y };
      const dx = targetX - anchor.x;
      const dy = targetY - anchor.y;
      const distFromAnchor = Math.hypot(dx, dy);
      let newRotation = currentToken.rotation || 0;

      if (distFromAnchor > 5) {
        const targetAngle = (((Math.atan2(dy, dx) * 180) / Math.PI) % 360 + 360) % 360;
        newRotation = lerpAngle(newRotation, targetAngle, 0.28);
        walkAnchorRef.current[draggedToken] = {
          x: anchor.x + dx * 0.3,
          y: anchor.y + dy * 0.3
        };
      }

      setTokens(prev => prev.map(t => {
        if (t.id === draggedToken) {
          return { ...t, x: targetX, y: targetY, rotation: newRotation };
        }
        return t;
      }));

      if (fowEnabled) {
        revealTokenVision(currentToken, targetX, targetY, newRotation, currentToken.visionMode || 'cone', false);
      }
    }
  };

  const handlePointerUp = () => {
    lastBrushPosRef.current = null;
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
    if (rotatingToken !== null) {
      const rotTkn = tokens.find(t => t.id === rotatingToken);
      if (rotTkn && fowEnabled) {
        revealTokenVision(rotTkn, rotTkn.x, rotTkn.y, rotTkn.rotation || 0, rotTkn.visionMode || 'cone', true);
      }
      setRotatingToken(null);
    }
    if (draggedToken !== null) {
      const movedToken = tokens.find(t => t.id === draggedToken);
      if (movedToken) {
        if (snapToGrid) {
          const tknSize = movedToken.size || gridSize;
          const cellX = Math.floor((movedToken.x + tknSize / 2) / gridSize) * gridSize + (gridSize - tknSize) / 2;
          const cellY = Math.floor((movedToken.y + tknSize / 2) / gridSize) * gridSize + (gridSize - tknSize) / 2;

          if (!isMovementBlocked(movedToken.x, movedToken.y, cellX, cellY, tknSize)) {
            setTokens(prev => prev.map(t => t.id === draggedToken ? { ...t, x: cellX, y: cellY } : t));
            if (fowEnabled) {
              revealTokenVision(movedToken, cellX, cellY, movedToken.rotation || 0, movedToken.visionMode || 'cone', true);
            }
          }
        } else if (fowEnabled) {
          revealTokenVision(movedToken, movedToken.x, movedToken.y, movedToken.rotation || 0, movedToken.visionMode || 'cone', true);
        }
      }
      setDraggedToken(null);
    }
  };

  // Garantiza que soltar el ratón fuera del tablero o sobre un menú flotante siempre limpie el estado de arrastre
  useEffect(() => {
    const onGlobalUp = () => {
      if (isDraggingPan || draggedToken !== null || rotatingToken !== null) {
        handlePointerUp();
      }
    };
    window.addEventListener('pointerup', onGlobalUp);
    window.addEventListener('pointercancel', onGlobalUp);
    return () => {
      window.removeEventListener('pointerup', onGlobalUp);
      window.removeEventListener('pointercancel', onGlobalUp);
    };
  });

  const handleWheel = (e) => {
    const zoomFactor = -e.deltaY * 0.001;
    setScale(prev => Math.min(Math.max(0.1, prev + zoomFactor), 5));
  };

  const handleTokenPointerDown = (e, token) => {
    if (isPlayerView) return;
    if (token.isLocked) return;

    e.preventDefault();
    e.stopPropagation();
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }

    // Shift + arrastrar sobre la ficha permite girar el cono directamente hacia el ratón sin desplazar la ficha
    if (e.shiftKey) {
      setRotatingToken(token.id);
      return;
    }

    const hasImmobilize = token.statuses?.some(stId => {
      const statusObj = customStatuses.find(s => s.id === stId);
      return statusObj && statusObj.effect === 'immobilize';
    });
    if (hasImmobilize) return;

    const rect = boardRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - pan.x) / scale;
    const mouseY = (e.clientY - rect.top - pan.y) / scale;
    
    walkAnchorRef.current[token.id] = { x: token.x, y: token.y };
    setDraggedToken(token.id);
    setDragOffset({ x: mouseX - token.x, y: mouseY - token.y });
  };

  const handleStartTokenRotate = (e, token) => {
    if (isPlayerView || token.isLocked) return;
    e.preventDefault();
    e.stopPropagation();
    setRotatingToken(token.id);
  };

  const handleUpdateTokenRotation = (tokenId, newAngle) => {
    if (!Number.isFinite(newAngle)) return;
    const normalized = ((newAngle % 360) + 360) % 360;
    const targetToken = tokens.find(t => t.id === tokenId);
    setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, rotation: normalized } : t));
    if (targetToken && fowEnabled) {
      revealTokenVision(targetToken, targetToken.x, targetToken.y, normalized, targetToken.visionMode || 'cone', false);
    }
  };

  const handleUpdateTokenVisionMode = (tokenId, newVisionMode) => {
    const targetToken = tokens.find(t => t.id === tokenId);
    setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, visionMode: newVisionMode } : t));
    if (targetToken && fowEnabled) {
      revealTokenVision(targetToken, targetToken.x, targetToken.y, targetToken.rotation || 0, newVisionMode, true);
    }
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
      rotation: 0,
      visionMode: 'cone',
      faction: char.faction || 'ally',
      isHidden: char.faction === 'enemy',
      isLocked: false,
      showName: true,
      statuses: []
    };
    setTokens([...tokens, newToken]);
    if (fowEnabled && newToken.faction !== 'enemy' && !newToken.isHidden) {
      revealTokenVision(newToken, spawnX, spawnY, 0, 'cone');
    }
  };

  const handleToggleTokenHidden = (tokenId) => {
    setTokens(prev => prev.map(t => t.id === tokenId ? { ...t, isHidden: !t.isHidden } : t));
  };

  const handleToggleTokenFaction = (tokenId) => {
    setTokens(prev => prev.map(t => {
      if (t.id === tokenId) {
        const nextFaction = t.faction === 'enemy' ? 'ally' : 'enemy';
        return { ...t, faction: nextFaction };
      }
      return t;
    }));
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
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex',
      backgroundColor: '#0d0907',
      color: '#e6d5b8',
      fontFamily: "'Crimson Text', 'EB Garamond', Georgia, serif",
      overflow: 'hidden'
    }}>
      {/* Tipografías y Estilos Globales Gótico / Barroco */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;900&family=Crimson+Text:ital,wght@0,400;0,600;0,700;1,400&display=swap');

        .vtt-gothic-title {
          font-family: 'Cinzel', Georgia, serif;
          letter-spacing: 0.06em;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.85);
        }

        .vtt-wood-panel {
          background: linear-gradient(180deg, #241711 0%, #160e0a 100%);
          border: 1px solid #6b4c2b;
          box-shadow: inset 0 1px 0 rgba(212, 175, 55, 0.2), 0 10px 30px rgba(0, 0, 0, 0.85);
        }

        .vtt-brass-btn {
          font-family: 'Cinzel', Georgia, serif;
          background: linear-gradient(180deg, #3a2618 0%, #21150d 100%);
          color: #e6d5b8;
          border: 1px solid #8a6d3b;
          box-shadow: inset 0 1px 0 rgba(255, 215, 128, 0.2), 0 3px 6px rgba(0, 0, 0, 0.6);
          transition: all 0.2s ease;
        }
        .vtt-brass-btn:hover {
          border-color: #d4af37;
          color: #fff3d1;
          box-shadow: inset 0 1px 0 rgba(255, 215, 128, 0.4), 0 0 10px rgba(212, 175, 55, 0.3);
        }
      `}</style>
      
      {!isPlayerView && (
        <TokenSidebar 
          tokens={tokens} characters={characters}
          onAddToken={handleAddTokenToBoard}
          onRemoveToken={(id) => setTokens(tokens.filter(t => t.id !== id))}
          onRemoveCharacter={(id) => setCharacters(characters.filter(c => c.id !== id))}
          onToggleTokenName={handleToggleTokenName}
          onToggleTokenHidden={handleToggleTokenHidden}
          onToggleTokenFaction={handleToggleTokenFaction}
          customStatuses={customStatuses}
        />
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {!isPlayerView && (
          <div style={{
            padding: '10px 22px',
            background: 'linear-gradient(180deg, #2b1b12 0%, #170f0a 100%)',
            borderBottom: '2px solid #8a6d3b',
            boxShadow: '0 4px 18px rgba(0,0,0,0.85), inset 0 -1px 0 rgba(212,175,55,0.25)',
            display: 'flex',
            alignItems: 'center',
            zIndex: 10
          }}>
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
          fowVisionRadius={fowVisionRadius}
          fowMemoryEnabled={fowMemoryEnabled}
          fowAutoHideEnemies={fowAutoHideEnemies}
          weatherEffect={weatherEffect}
          ambientTint={ambientTint}
          rulerActive={rulerActive}
          pingActive={pingActive}
          handlePointerDown={handlePointerDown} handlePointerMove={handlePointerMove}
          handlePointerUp={handlePointerUp} handleWheel={handleWheel}
          snapToGrid={snapToGrid} gridSize={gridSize} maps={maps}
          fowCanvasRef={fowCanvasRef} fowActions={fowActions}
          tokens={tokens} draggedToken={draggedToken} rotatingToken={rotatingToken}
          onTokenPointerDown={handleTokenPointerDown}
          onStartTokenRotate={handleStartTokenRotate}
          onToggleTokenLock={(tokenId) => setTokens(tokens.map(t => t.id === tokenId ? { ...t, isLocked: !t.isLocked } : t))}
          onToggleTokenHidden={handleToggleTokenHidden}
          onToggleTokenFaction={handleToggleTokenFaction}
          onUpdateTokenSize={(tokenId, newSize) => setTokens(tokens.map(t => t.id === tokenId ? { ...t, size: newSize } : t))}
          onUpdateTokenRotation={handleUpdateTokenRotation}
          onUpdateTokenVisionMode={handleUpdateTokenVisionMode}
          onToggleTokenStatus={handleToggleTokenStatus}
          customStatuses={customStatuses}
          rulerMeasure={rulerMeasure}
          pings={pings}
          onToggleDoor={handleToggleDoor}
          onToggleWindow={handleToggleWindow}
        />

        {!isPlayerView && isWeatherMenuOpen && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            onWheel={(e) => e.stopPropagation()}
            className="vtt-wood-panel"
            style={{
              position: 'fixed',
              bottom: '74px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '360px',
              borderRadius: '10px',
              border: '2px solid #8a6d3b',
              padding: '14px',
              zIndex: 5001,
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              color: '#e6d5b8'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #6b4c2b', paddingBottom: '6px' }}>
              <span className="vtt-gothic-title" style={{ fontSize: '13px', color: '#d4af37', fontWeight: 'bold' }}>
                ⛈️ Clima e Iluminación Ambiental
              </span>
              <button
                onClick={() => setIsWeatherMenuOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#c5a059', cursor: 'pointer', fontSize: '15px' }}
              >
                ✕
              </button>
            </div>

            <div>
              <span className="vtt-gothic-title" style={{ fontSize: '11px', color: '#c5a059', display: 'block', marginBottom: '6px' }}>
                Partículas en Pantalla
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {WEATHER_TYPES.map(w => (
                  <button
                    key={w.id}
                    onClick={() => setWeatherEffect(w.id)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: weatherEffect === w.id ? '1px solid #fbbf24' : '1px solid #5c4028',
                      background: weatherEffect === w.id ? 'linear-gradient(180deg, #b45309 0%, #78350f 100%)' : '#120b07',
                      color: '#f3e5ab',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>{w.icon}</span>
                    <span>{w.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <span className="vtt-gothic-title" style={{ fontSize: '11px', color: '#c5a059', display: 'block', marginBottom: '6px' }}>
                Tinte de Iluminación
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                {AMBIENT_TINTS.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setAmbientTint(t.id)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: '6px',
                      border: ambientTint === t.id ? '1px solid #fbbf24' : '1px solid #5c4028',
                      background: ambientTint === t.id ? 'linear-gradient(180deg, #b45309 0%, #78350f 100%)' : '#120b07',
                      color: '#f3e5ab',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Barra flotante Gótica / Barroca de navegación y vista */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(180deg, rgba(43, 27, 18, 0.96) 0%, rgba(22, 14, 9, 0.98) 100%)',
            border: '2px solid #8a6d3b',
            outline: '1px solid #120b07',
            borderRadius: '10px',
            padding: isHudMinimized ? '6px 16px' : '8px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.9), inset 0 1px 0 rgba(212, 175, 55, 0.35)',
            zIndex: 5000
          }}
        >
          {!isHudMinimized ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => setScale(prev => Math.max(0.1, +(prev - 0.15).toFixed(2)))}
                  style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid #8a6d3b', background: '#1c120c', color: '#d4af37', cursor: 'pointer', fontWeight: 'bold' }}
                  title="Alejar Zoom"
                >➖</button>
                <span className="vtt-gothic-title" style={{ minWidth: '52px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', color: '#f3e5ab' }}>
                  {Math.round(scale * 100)}%
                </span>
                <button
                  onClick={() => setScale(prev => Math.min(5, +(prev + 0.15).toFixed(2)))}
                  style={{ width: '30px', height: '30px', borderRadius: '6px', border: '1px solid #8a6d3b', background: '#1c120c', color: '#d4af37', cursor: 'pointer', fontWeight: 'bold' }}
                  title="Acercar Zoom"
                >➕</button>
              </div>

              <div style={{ width: '1px', height: '22px', backgroundColor: '#6b4c2b' }} />

              <button
                onClick={() => { setPan({ x: 0, y: 0 }); setScale(1); }}
                className="vtt-brass-btn"
                style={{ padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '5px' }}
                title="Volver al centro del mapa y restaurar zoom al 100%"
              >
                🧭 Centrar
              </button>

              <button
                onClick={() => {
                  setRulerActive(!rulerActive);
                  if (!rulerActive) setPingActive(false);
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontFamily: "'Cinzel', serif",
                  border: rulerActive ? '1px solid #ffd700' : '1px solid #8a6d3b',
                  background: rulerActive ? 'linear-gradient(180deg, #b45309 0%, #78350f 100%)' : 'linear-gradient(180deg, #3a2618 0%, #21150d 100%)',
                  color: rulerActive ? '#fffbeb' : '#e6d5b8',
                  cursor: 'pointer',
                  fontSize: '12px',
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
                  borderRadius: '6px',
                  fontFamily: "'Cinzel', serif",
                  border: pingActive ? '1px solid #f87171' : '1px solid #8a6d3b',
                  background: pingActive ? 'linear-gradient(180deg, #991b1b 0%, #450a0a 100%)' : 'linear-gradient(180deg, #3a2618 0%, #21150d 100%)',
                  color: '#e6d5b8',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
                title="Señalar un punto en el mapa (Atajo: Shift + Clic)"
              >
                🔔 Señalar
              </button>

              {!isPlayerView && (
                <button
                  onClick={() => setIsWeatherMenuOpen(!isWeatherMenuOpen)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontFamily: "'Cinzel', serif",
                    border: (weatherEffect !== 'none' || ambientTint !== 'none' || isWeatherMenuOpen) ? '1px solid #fbbf24' : '1px solid #8a6d3b',
                    background: (weatherEffect !== 'none' || ambientTint !== 'none' || isWeatherMenuOpen)
                      ? 'linear-gradient(180deg, #b45309 0%, #78350f 100%)'
                      : 'linear-gradient(180deg, #3a2618 0%, #21150d 100%)',
                    color: '#e6d5b8',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Configurar Clima e Iluminación Ambiental"
                >
                  ⛈️ Clima
                </button>
              )}

              <div style={{ width: '1px', height: '22px', backgroundColor: '#6b4c2b' }} />

              <button
                onClick={handleToggleFullscreen}
                className="vtt-brass-btn"
                style={{ padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                title="Alternar Pantalla Completa"
              >
                ⛶ Pantalla
              </button>

              <button
                onClick={() => setIsHudMinimized(true)}
                style={{ background: 'transparent', border: 'none', color: '#c5a059', cursor: 'pointer', fontSize: '14px', padding: '4px' }}
                title="Minimizar controles"
              >
                ✕
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsHudMinimized(false)}
              className="vtt-gothic-title"
              style={{ background: 'transparent', border: 'none', color: '#d4af37', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
              title="Mostrar herramientas de navegación y vista"
            >
              ⚜️ Controles de Cámara
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
          fowMemoryEnabled={fowMemoryEnabled} setFowMemoryEnabled={setFowMemoryEnabled}
          fowAutoHideEnemies={fowAutoHideEnemies} setFowAutoHideEnemies={setFowAutoHideEnemies}
          onResetFow={() => { lastFowTrailRef.current = {}; setFowActions([]); }}
          fowMode={fowMode} setFowMode={setFowMode}
          snapToGrid={snapToGrid} setSnapToGrid={setSnapToGrid} gridSize={gridSize} setGridSize={handleGridSizeChange}
          maps={maps} onLoadMapToBoard={(newMaps) => { setMaps(newMaps); setIsSettingsModalOpen(false); }}
        />
      )}
    </div>
  );
};

export default App;