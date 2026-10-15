import React, { useState, useRef, useEffect } from 'react';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { emit as tauriEmit, listen as tauriListen } from '@tauri-apps/api/event';

import Toolbar from './components/Toolbar';
import GameBoard from './components/GameBoard';
import TokenSidebar from './components/TokenSidebar';
import SettingsDrawer from './components/SettingsDrawer';
import DiceRoller from './components/DiceRoller';
import Soundboard, { playerSoundEngine, SOUND_CATALOG } from './components/Soundboard';
import TutorialModal from './components/TutorialModal';
import MapCreator from './components/MapCreator';
import { WEATHER_TYPES, AMBIENT_TINTS } from './components/WeatherOverlay';
import useLocalStorage from './hooks/useLocalStorage';
import { saveCampaignToDB, loadCampaignFromDB, exportCampaignJSON } from './utils/campaignStorage';

const isTauriDesktop = () => Boolean(window.__TAURI_INTERNALS__ || window.__TAURI__);

const DEFAULT_STATUSES = [
  { id: 'bloodied', icon: '🩸', label: 'Malherido', effect: 'none' },
  { id: 'poisoned', icon: '🤢', label: 'Envenenado', effect: 'none' },
  { id: 'stunned', icon: '💫', label: 'Aturdido', effect: 'immobilize' },
  { id: 'burning', icon: '🔥', label: 'Ardiendo', effect: 'none' }
];

// Comprobación geométrica de colisión segmento-segmento
const segmentsIntersect = (ax, ay, bx, by, cx, cy, dx, dy) => {
  const ccw = (p1x, p1y, p2x, p2y, p3x, p3y) =>
    (p3y - p1y) * (p2x - p1x) > (p2y - p1y) * (p3x - p1x);
  return (
    ccw(ax, ay, cx, cy, dx, dy) !== ccw(bx, by, cx, cy, dx, dy) &&
    ccw(ax, ay, bx, by, cx, cy) !== ccw(ax, ay, bx, by, dx, dy)
  );
};

const GLOBAL_VTT_STYLES = `
  html, body, #root {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    height: 100% !important;
    overflow: hidden !important;
    background-color: #0e0906 !important;
    box-sizing: border-box;
  }
  *, *::before, *::after {
    box-sizing: border-box;
  }
  .vtt-gothic-title {
    font-family: 'Cinzel', Georgia, serif;
    letter-spacing: 0.04em;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.9);
  }
  .vtt-wood-panel {
    background: linear-gradient(180deg, #241710 0%, #140c08 100%);
    border: 2px solid #8a6d3b;
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(212, 175, 55, 0.2);
  }
  .vtt-brass-btn {
    font-family: 'Cinzel', Georgia, serif;
    background: linear-gradient(180deg, #3a2618 0%, #1c120c 100%);
    color: #f3e5ab;
    border: 1px solid #8a6d3b;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(212, 175, 55, 0.25);
    transition: all 0.15s ease;
  }
  .vtt-brass-btn:hover:not(:disabled) {
    background: linear-gradient(180deg, #4d3320 0%, #291a11 100%);
    border-color: #d4af37;
    color: #fffbeb;
  }
`;

// Componente de Proyección a Pantalla Completa (Ilustración o Pergamino)
const HandoutFullscreenOverlay = ({ handout, isPlayerView, onClose }) => {
  if (!handout) return null;

  return (
    <div
      onClick={!isPlayerView ? onClose : undefined}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 95000,
        backgroundColor: 'rgba(5, 3, 2, 0.94)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px'
      }}
    >
      {handout.type === 'note' ? (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            background: 'radial-gradient(circle, #f7ebd2 0%, #dcc196 100%)',
            padding: '42px',
            borderRadius: '10px',
            width: '620px',
            maxWidth: '92vw',
            maxHeight: '85vh',
            overflowY: 'auto',
            color: '#3b2314',
            boxShadow: '0 25px 70px rgba(0,0,0,0.98), inset 0 0 40px rgba(120, 53, 15, 0.35)',
            border: '5px double #5c3a21'
          }}
        >
          <h2
            className="vtt-gothic-title"
            style={{
              margin: '0 0 18px 0',
              borderBottom: '2px solid #8a6d3b',
              paddingBottom: '12px',
              fontSize: '28px',
              color: '#451a03',
              textShadow: 'none'
            }}
          >
            📜 {handout.title}
          </h2>
          <p
            style={{
              whiteSpace: 'pre-wrap',
              lineHeight: '1.8',
              margin: 0,
              fontSize: '21px',
              fontFamily: "'Crimson Text', Georgia, serif"
            }}
          >
            {handout.content}
          </p>
        </div>
      ) : (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            maxWidth: '92vw',
            maxHeight: '88vh'
          }}
        >
          <div
            style={{
              border: '4px double #d4af37',
              borderRadius: '10px',
              overflow: 'hidden',
              boxShadow: '0 25px 70px rgba(0,0,0,0.98), 0 0 35px rgba(212, 175, 55, 0.25)',
              backgroundColor: '#090604',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <img
              src={handout.src}
              alt={handout.title}
              style={{
                maxWidth: '88vw',
                maxHeight: '78vh',
                objectFit: 'contain',
                display: 'block'
              }}
            />
          </div>
          {handout.title && (
            <div
              className="vtt-gothic-title"
              style={{
                padding: '8px 26px',
                background: 'linear-gradient(180deg, #2b1b12 0%, #140c08 100%)',
                border: '2px solid #d4af37',
                borderRadius: '6px',
                color: '#f3e5ab',
                fontSize: '18px',
                fontWeight: 'bold',
                boxShadow: '0 10px 25px rgba(0,0,0,0.9)'
              }}
            >
              {handout.title}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

function App() {
  const isPlayerView = new URLSearchParams(window.location.search).get('view') === 'player';

  const [characters, setCharacters] = useLocalStorage('vtt_characters', []);
  const [tokens, setTokens] = useLocalStorage('vtt_tokens', []);
  const [maps, setMaps] = useState([]);
  const [customStatuses, setCustomStatuses] = useLocalStorage('vtt_statuses', DEFAULT_STATUSES);
  const [customSounds, setCustomSounds] = useState([]);

  // Gestor de Múltiples Escenas / Planos y Galería de Ilustraciones (Handouts)
  const [scenes, setScenes] = useState([
    { id: 'scene_default', name: 'Escena Principal', maps: [], tokens: [], fowActions: [], weatherEffect: 'none', ambientTint: 'none' }
  ]);
  const [activeSceneId, setActiveSceneId] = useLocalStorage('vtt_active_scene_id', 'scene_default');
  const [handouts, setHandouts] = useState([]);
  const [activeHandout, setActiveHandout] = useState(null);

  const [fowEnabled, setFowEnabled] = useLocalStorage('vtt_fow_enabled', false);
  const [fowBrushSize, setFowBrushSize] = useLocalStorage('vtt_fow_brush', 80);
  const [fowVisionRadius, setFowVisionRadius] = useLocalStorage('vtt_fow_vision_radius', 180);
  const [fowMemoryEnabled, setFowMemoryEnabled] = useLocalStorage('vtt_fow_memory', true);
  const [fowAutoHideEnemies, setFowAutoHideEnemies] = useLocalStorage('vtt_fow_autohide_enemies', true);
  const [fowMode, setFowMode] = useState('none');
  const [fowActions, setFowActions] = useLocalStorage('vtt_fow_actions', []);

  const [weatherEffect, setWeatherEffect] = useLocalStorage('vtt_weather_effect', 'none');
  const [ambientTint, setAmbientTint] = useLocalStorage('vtt_ambient_tint', 'none');

  const [snapToGrid, setSnapToGrid] = useLocalStorage('vtt_snap_grid', true);
  const [gridSize, setGridSize] = useLocalStorage('vtt_grid_size', 50);

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const [draggedToken, setDraggedToken] = useState(null);
  const [rotatingToken, setRotatingToken] = useState(null);
  const [isPaintingFow, setIsPaintingFow] = useState(false);

  const [rulerActive, setRulerActive] = useState(false);
  const [rulerMeasure, setRulerMeasure] = useState(null);
  const [pingActive, setPingActive] = useState(false);
  const [pings, setPings] = useState([]);
  const [syncPlayerCamera, setSyncPlayerCamera] = useLocalStorage('vtt_sync_camera', true);

  const [radialMenu, setRadialMenu] = useState(null);
  const [holdProgress, setHoldProgress] = useState(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMapCreatorOpen, setIsMapCreatorOpen] = useState(false);
  const [hideTutorialPermanently, setHideTutorialPermanently] = useLocalStorage('vtt_hide_tutorial', false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(() => !isPlayerView && !hideTutorialPermanently);

  const [activeLoops, setActiveLoops] = useState([]);
  const [masterToast, setMasterToast] = useState(null);

  const boardRef = useRef(null);
  const fowCanvasRef = useRef(null);
  const campaignFileInputRef = useRef(null);
  const syncChannelRef = useRef(null);
  const holdTimerRef = useRef(null);
  const holdStartPosRef = useRef(null);

  const postSyncMessage = (msg) => {
    if (syncChannelRef.current) {
      syncChannelRef.current.postMessage(msg);
    }
    if (isTauriDesktop()) {
      tauriEmit('vtt_tauri_sync', msg).catch(() => {});
    }
  };

  // Cargar campaña robusta desde IndexedDB al iniciar
  useEffect(() => {
    loadCampaignFromDB().then((saved) => {
      if (saved) {
        if (Array.isArray(saved.maps)) setMaps(saved.maps);
        if (Array.isArray(saved.customSounds)) setCustomSounds(saved.customSounds);
        if (Array.isArray(saved.handouts)) setHandouts(saved.handouts);
        if (Array.isArray(saved.scenes) && saved.scenes.length > 0) {
          setScenes(saved.scenes);
        } else if (Array.isArray(saved.maps)) {
          setScenes([
            {
              id: activeSceneId || 'scene_default',
              name: 'Escena Principal',
              maps: saved.maps,
              tokens: saved.tokens || [],
              fowActions: saved.fowActions || [],
              weatherEffect: saved.weatherEffect || 'none',
              ambientTint: saved.ambientTint || 'none'
            }
          ]);
        }
      }
    });
  }, []);

  // Mantener sincronizada la escena activa dentro del array de escenas cada vez que el Master mueve fichas o edita el mapa
  useEffect(() => {
    if (isPlayerView) return;
    setScenes((prevScenes) =>
      prevScenes.map((sc) =>
        sc.id === activeSceneId
          ? { ...sc, maps, tokens, fowActions, weatherEffect, ambientTint }
          : sc
      )
    );
  }, [isPlayerView, activeSceneId, maps, tokens, fowActions, weatherEffect, ambientTint]);

  // Auto-guardado en IndexedDB
  useEffect(() => {
    if (isPlayerView) return;
    saveCampaignToDB({
      characters,
      tokens,
      maps,
      scenes,
      activeSceneId,
      handouts,
      customStatuses,
      customSounds,
      fowEnabled,
      fowVisionRadius,
      fowMemoryEnabled,
      fowAutoHideEnemies,
      fowActions,
      weatherEffect,
      ambientTint,
      snapToGrid,
      gridSize
    });
  }, [
    isPlayerView, characters, tokens, maps, scenes, activeSceneId, handouts,
    customStatuses, customSounds, fowEnabled, fowVisionRadius, fowMemoryEnabled,
    fowAutoHideEnemies, fowActions, weatherEffect, ambientTint, snapToGrid, gridSize
  ]);

  // Canal de sincronización en vivo entre Pantalla de Master y Pantalla de Jugadores (Web + Tauri IPC)
  useEffect(() => {
    const channel = new BroadcastChannel('vtt_live_sync_channel');
    syncChannelRef.current = channel;

    const handleIncomingSync = (msg) => {
      if (!msg || !msg.type) return;

      if (isPlayerView) {
        if (msg.type === 'STATE_SYNC') {
          const s = msg.payload;
          if (s.tokens) setTokens(s.tokens);
          if (s.maps) setMaps(s.maps);
          if (s.customStatuses) setCustomStatuses(s.customStatuses);
          if (typeof s.fowEnabled === 'boolean') setFowEnabled(s.fowEnabled);
          if (s.fowVisionRadius) setFowVisionRadius(s.fowVisionRadius);
          if (typeof s.fowMemoryEnabled === 'boolean') setFowMemoryEnabled(s.fowMemoryEnabled);
          if (typeof s.fowAutoHideEnemies === 'boolean') setFowAutoHideEnemies(s.fowAutoHideEnemies);
          if (s.fowActions) setFowActions(s.fowActions);
          if (s.weatherEffect) setWeatherEffect(s.weatherEffect);
          if (s.ambientTint) setAmbientTint(s.ambientTint);
          if (typeof s.snapToGrid === 'boolean') setSnapToGrid(s.snapToGrid);
          if (s.gridSize) setGridSize(s.gridSize);
          if (s.activeHandout !== undefined) setActiveHandout(s.activeHandout);
          if (s.syncPlayerCamera !== false) {
            if (s.pan) setPan(s.pan);
            if (s.scale) setScale(s.scale);
          }
        } else if (msg.type === 'PING') {
          setPings(prev => [...prev, msg.payload]);
          setTimeout(() => {
            setPings(prev => prev.filter(p => p.id !== msg.payload.id));
          }, 3600);
        } else if (msg.type === 'SOUND_PLAY') {
          playerSoundEngine.play(msg.payload);
        } else if (msg.type === 'SOUND_STOP_ALL') {
          playerSoundEngine.stopAll();
        }
      } else if (msg.type === 'REQUEST_INITIAL_SYNC') {
        postSyncMessage({
          type: 'STATE_SYNC',
          payload: {
            tokens, maps, customStatuses, fowEnabled, fowVisionRadius,
            fowMemoryEnabled, fowAutoHideEnemies, fowActions,
            weatherEffect, ambientTint, snapToGrid, gridSize, pan, scale, syncPlayerCamera, activeHandout
          }
        });
      }
    };

    channel.onmessage = (event) => handleIncomingSync(event.data);

    let unlistenTauri = null;
    if (isTauriDesktop()) {
      tauriListen('vtt_tauri_sync', (event) => {
        handleIncomingSync(event.payload);
      }).then((fn) => {
        unlistenTauri = fn;
      }).catch(() => {});
    }

    if (isPlayerView) {
      postSyncMessage({ type: 'REQUEST_INITIAL_SYNC' });
    }

    return () => {
      channel.close();
      if (unlistenTauri) unlistenTauri();
    };
  }, [
    isPlayerView, tokens, maps, customStatuses, fowEnabled, fowVisionRadius,
    fowMemoryEnabled, fowAutoHideEnemies, fowActions, weatherEffect, ambientTint,
    snapToGrid, gridSize, pan, scale, syncPlayerCamera, activeHandout
  ]);

  // Emitir sincronización cada vez que el Master actualiza el tablero o proyecta una imagen
  useEffect(() => {
    if (isPlayerView) return;
    postSyncMessage({
      type: 'STATE_SYNC',
      payload: {
        tokens, maps, customStatuses, fowEnabled, fowVisionRadius,
        fowMemoryEnabled, fowAutoHideEnemies, fowActions,
        weatherEffect, ambientTint, snapToGrid, gridSize, pan, scale, syncPlayerCamera, activeHandout
      }
    });
  }, [
    isPlayerView, tokens, maps, customStatuses, fowEnabled, fowVisionRadius,
    fowMemoryEnabled, fowAutoHideEnemies, fowActions, weatherEffect, ambientTint,
    snapToGrid, gridSize, pan, scale, syncPlayerCamera, activeHandout
  ]);

  // Cambiar de Escena / Plano
  const handleSelectScene = (targetSceneId) => {
    const target = scenes.find((sc) => sc.id === targetSceneId);
    if (!target) return;
    setActiveSceneId(target.id);
    setMaps(target.maps || []);
    setTokens(target.tokens || []);
    setFowActions(target.fowActions || []);
    setWeatherEffect(target.weatherEffect || 'none');
    setAmbientTint(target.ambientTint || 'none');
    setPan({ x: 0, y: 0 });
    showMasterFeedback(`Escena activa: ${target.name}`, '🗺️');
  };

  // Crear nueva escena limpia
  const handleCreateNewScene = (sceneName) => {
    const newId = `scene_${Date.now()}`;
    const newSceneObj = {
      id: newId,
      name: sceneName,
      maps: [],
      tokens: [],
      fowActions: [],
      weatherEffect: 'none',
      ambientTint: 'none'
    };
    setScenes((prev) => [...prev, newSceneObj]);
    setActiveSceneId(newId);
    setMaps([]);
    setTokens([]);
    setFowActions([]);
    setWeatherEffect('none');
    setAmbientTint('none');
    setPan({ x: 0, y: 0 });
    showMasterFeedback(`Nueva escena creada: ${sceneName}`, '🗺️');
  };

  // Eliminar escena
  const handleDeleteScene = (sceneIdToDelete) => {
    if (scenes.length <= 1) return;
    const remaining = scenes.filter((sc) => sc.id !== sceneIdToDelete);
    setScenes(remaining);
    if (activeSceneId === sceneIdToDelete) {
      const next = remaining[0];
      setActiveSceneId(next.id);
      setMaps(next.maps || []);
      setTokens(next.tokens || []);
      setFowActions(next.fowActions || []);
      setWeatherEffect(next.weatherEffect || 'none');
      setAmbientTint(next.ambientTint || 'none');
    }
    showMasterFeedback('Escena eliminada', '🗑️');
  };

  // Atajos de teclado globales del Master
  useEffect(() => {
    if (isPlayerView) return;
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.key === 'Escape') {
        setRadialMenu(null);
        setRulerActive(false);
        setPingActive(false);
        setFowMode('none');
        if (activeHandout) setActiveHandout(null);
      } else if (e.code === 'Space' && !isSettingsOpen) {
        e.preventDefault();
        const allies = tokens.filter(t => t.faction !== 'enemy' && !t.isHidden);
        const targetList = allies.length > 0 ? allies : tokens;
        if (targetList.length > 0) {
          const avgX = targetList.reduce((acc, t) => acc + t.x + (t.size || 50) / 2, 0) / targetList.length;
          const avgY = targetList.reduce((acc, t) => acc + t.y + (t.size || 50) / 2, 0) / targetList.length;
          setPan({
            x: window.innerWidth / 2 - avgX * scale,
            y: window.innerHeight / 2 - avgY * scale
          });
          showMasterFeedback('Cámara centrada en el grupo', '🎯');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlayerView, isSettingsOpen, tokens, scale, activeHandout]);

  const showMasterFeedback = (label, icon = '⚜️') => {
    setMasterToast({ label, icon });
    setTimeout(() => setMasterToast(null), 2600);
  };

  const clearHoldTimer = () => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setHoldProgress(null);
  };

  const emitSpatialPing = (x, y, sound = null) => {
    const newPing = {
      id: Date.now() + Math.random(),
      x,
      y,
      icon: sound ? sound.icon : '🔔',
      label: sound ? sound.label : '¡Atención!',
      color: sound ? '#fbbf24' : '#d4af37',
      isSoundWave: Boolean(sound)
    };
    setPings(prev => [...prev, newPing]);
    postSyncMessage({ type: 'PING', payload: newPing });
    if (sound) {
      postSyncMessage({ type: 'SOUND_PLAY', payload: sound });
      showMasterFeedback(`Eco en el mapa: ${sound.label}`, sound.icon);
    } else {
      showMasterFeedback('Señal enviada a los jugadores', '🔔');
    }
    setTimeout(() => {
      setPings(prev => prev.filter(p => p.id !== newPing.id));
    }, 3600);
  };

  const getLogicalCoords = (e) => {
    const rect = boardRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / scale,
      y: (e.clientY - rect.top - pan.y) / scale
    };
  };

  const isMovementBlocked = (fromX, fromY, toX, toY) => {
    for (let i = 0; i < maps.length; i++) {
      const el = maps[i];
      if (el.type === 'wall') {
        if (segmentsIntersect(fromX, fromY, toX, toY, el.x1, el.y1, el.x2, el.y2)) return true;
      } else if ((el.type === 'door' || el.type === 'window') && !el.isOpen) {
        const w = el.width || 60;
        const h = el.height || 16;
        const x1 = w >= h ? el.x : el.x + w / 2;
        const y1 = w >= h ? el.y + h / 2 : el.y;
        const x2 = w >= h ? el.x + w : el.x + w / 2;
        const y2 = w >= h ? el.y + h / 2 : el.y + h;
        if (segmentsIntersect(fromX, fromY, toX, toY, x1, y1, x2, y2)) return true;
      } else if (el.type === 'object' && el.blocksMovement && !el.isOpen) {
        const w = el.width || 48;
        const h = el.height || 48;
        if (
          toX >= el.x && toX <= el.x + w &&
          toY >= el.y && toY <= el.y + h
        ) {
          return true;
        }
      }
    }
    return false;
  };

  const handlePointerDown = (e) => {
    if (radialMenu) {
      setRadialMenu(null);
    }

    if (e.button === 1 || e.button === 2) {
      clearHoldTimer();
      setIsDraggingPan(true);
      return;
    }

    const coords = getLogicalCoords(e);

    if (pingActive && !isPlayerView) {
      emitSpatialPing(coords.x, coords.y, null);
      return;
    }

    if (rulerActive) {
      setRulerMeasure({ startX: coords.x, startY: coords.y, endX: coords.x, endY: coords.y });
      return;
    }

    if (!isPlayerView && fowEnabled && fowMode !== 'none') {
      setIsPaintingFow(true);
      setFowActions(prev => [...prev, { x: coords.x, y: coords.y, size: fowBrushSize, mode: fowMode }]);
      return;
    }

    if (!isPlayerView && e.button === 0) {
      clearHoldTimer();
      holdStartPosRef.current = { clientX: e.clientX, clientY: e.clientY, logicalX: coords.x, logicalY: coords.y };
      setHoldProgress({ x: coords.x, y: coords.y });
      holdTimerRef.current = setTimeout(() => {
        setIsDraggingPan(false);
        setHoldProgress(null);
        setRadialMenu({
          screenX: e.clientX,
          screenY: e.clientY,
          logicalX: coords.x,
          logicalY: coords.y
        });
      }, 550);
    }

    setIsDraggingPan(true);
  };

  const handlePointerMove = (e) => {
    const coords = getLogicalCoords(e);

    if (holdStartPosRef.current) {
      const distMoved = Math.hypot(
        e.clientX - holdStartPosRef.current.clientX,
        e.clientY - holdStartPosRef.current.clientY
      );
      if (distMoved > 8) {
        clearHoldTimer();
        holdStartPosRef.current = null;
      }
    }

    if (rulerMeasure) {
      setRulerMeasure(prev => ({ ...prev, endX: coords.x, endY: coords.y }));
      return;
    }

    if (isPaintingFow && !isPlayerView && fowEnabled && fowMode !== 'none') {
      setFowActions(prev => [...prev, { x: coords.x, y: coords.y, size: fowBrushSize, mode: fowMode }]);
      return;
    }

    if (rotatingToken) {
      setTokens(prev => prev.map(t => {
        if (t.id !== rotatingToken) return t;
        const size = t.size || 50;
        const cx = t.x + size / 2;
        const cy = t.y + size / 2;
        const deg = ((Math.atan2(coords.y - cy, coords.x - cx) * 180) / Math.PI + 360) % 360;
        return { ...t, rotation: deg };
      }));
      return;
    }

    if (draggedToken) {
      setTokens(prev => prev.map(t => {
        if (t.id !== draggedToken) return t;
        const isImmobilized = (t.statuses || []).some(stId => {
          const stObj = customStatuses.find(cs => cs.id === stId);
          return stObj && stObj.effect === 'immobilize';
        });
        if (isImmobilized) return t;

        const size = t.size || 50;
        const currentCenterX = t.x + size / 2;
        const currentCenterY = t.y + size / 2;
        const targetCenterX = coords.x;
        const targetCenterY = coords.y;

        if (!isMovementBlocked(currentCenterX, currentCenterY, targetCenterX, targetCenterY)) {
          return { ...t, x: targetCenterX - size / 2, y: targetCenterY - size / 2 };
        }
        if (!isMovementBlocked(currentCenterX, currentCenterY, targetCenterX, currentCenterY)) {
          return { ...t, x: targetCenterX - size / 2 };
        }
        if (!isMovementBlocked(currentCenterX, currentCenterY, currentCenterX, targetCenterY)) {
          return { ...t, y: targetCenterY - size / 2 };
        }
        return t;
      }));
      return;
    }

    if (isDraggingPan) {
      setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
    }
  };

  const handlePointerUp = () => {
    clearHoldTimer();
    holdStartPosRef.current = null;
    if (draggedToken && snapToGrid) {
      setTokens(prev => prev.map(t => {
        if (t.id !== draggedToken) return t;
        const size = t.size || 50;
        const snappedX = Math.round(t.x / gridSize) * gridSize;
        const snappedY = Math.round(t.y / gridSize) * gridSize;
        if (!isMovementBlocked(t.x + size / 2, t.y + size / 2, snappedX + size / 2, snappedY + size / 2)) {
          return { ...t, x: snappedX, y: snappedY };
        }
        return t;
      }));
    }
    setDraggedToken(null);
    setRotatingToken(null);
    setIsDraggingPan(false);
    setIsPaintingFow(false);
    setRulerMeasure(null);
  };

  const handleWheel = (e) => {
    const zoomFactor = -e.deltaY * 0.001;
    setScale(prev => Math.min(Math.max(0.2, prev + zoomFactor), 4));
  };

  const handleTokenPointerDown = (e, token) => {
    if (isPlayerView) return;
    clearHoldTimer();
    holdStartPosRef.current = null;
    if (e.shiftKey) {
      setRotatingToken(token.id);
    } else {
      setDraggedToken(token.id);
    }
  };

  const handleStartTokenRotate = (e, token) => {
    if (isPlayerView) return;
    setRotatingToken(token.id);
  };

  const handleAddToken = (char) => {
    const center = {
      x: Math.round((-pan.x / scale + window.innerWidth / 3 / scale) / gridSize) * gridSize,
      y: Math.round((-pan.y / scale + window.innerHeight / 2 / scale) / gridSize) * gridSize
    };
    const newToken = {
      id: Date.now() + Math.random(),
      name: char.name,
      color: char.color,
      avatar: char.avatar || null,
      faction: char.faction || 'ally',
      x: center.x,
      y: center.y,
      size: gridSize,
      rotation: 0,
      visionMode: 'cone',
      isLocked: false,
      isHidden: char.faction === 'enemy',
      showName: true,
      statuses: []
    };
    setTokens(prev => [...prev, newToken]);
    showMasterFeedback(`${char.name} invocado en escena`, '⚔️');
  };

  const handleToggleDoor = (doorId) => {
    setMaps(prev => prev.map(el => {
      if (el.id !== doorId) return el;
      const nextOpen = !el.isOpen;
      postSyncMessage({
        type: 'SOUND_PLAY',
        payload: { id: nextOpen ? 'sfx_door_open' : 'sfx_door_slam' }
      });
      showMasterFeedback(nextOpen ? 'Puerta Abierta' : 'Puerta Cerrada', nextOpen ? '🔓' : '🚪');
      return { ...el, isOpen: nextOpen };
    }));
  };

  const handleToggleWindow = (winId, breakGlass = false) => {
    setMaps(prev => prev.map(el => {
      if (el.id !== winId) return el;
      const nextOpen = breakGlass ? true : !el.isOpen;
      if (breakGlass) {
        postSyncMessage({
          type: 'SOUND_PLAY',
          payload: { id: 'sfx_glass' }
        });
      }
      showMasterFeedback(breakGlass ? '¡Cristal Roto!' : (nextOpen ? 'Ventana Abierta' : 'Ventana Cerrada'), '🪟');
      return { ...el, isOpen: nextOpen, isBroken: breakGlass || el.isBroken };
    }));
  };

  const handleToggleObject = (objId) => {
    setMaps(prev => prev.map(el => {
      if (el.id !== objId) return el;
      const nextOpen = !el.isOpen;
      postSyncMessage({
        type: 'SOUND_PLAY',
        payload: { id: 'sfx_chest' }
      });
      showMasterFeedback(`${el.name || 'Objeto'}: ${nextOpen ? 'Activado / Abierto' : 'Cerrado'}`, nextOpen ? (el.openIcon || '🪙') : (el.icon || '📦'));
      return { ...el, isOpen: nextOpen };
    }));
  };

  const handleToggleLight = (lightId) => {
    setMaps(prev => prev.map(el => {
      if (el.id !== lightId) return el;
      const nextOn = el.isOn === false ? true : false;
      showMasterFeedback(`${el.name || 'Fuente de Luz'}: ${nextOn ? 'Encendida' : 'Apagada'}`, nextOn ? '🔥' : '🌑');
      return { ...el, isOn: nextOn };
    }));
  };

  const handleTriggerSound = (sound) => {
    if (sound.loop) {
      setActiveLoops(prev =>
        prev.includes(sound.id) ? prev.filter(id => id !== sound.id) : [...prev, sound.id]
      );
    }
    postSyncMessage({ type: 'SOUND_PLAY', payload: sound });
    showMasterFeedback(sound.label, sound.icon);
  };

  const handleStopAllSounds = () => {
    setActiveLoops([]);
    postSyncMessage({ type: 'SOUND_STOP_ALL' });
    showMasterFeedback('Ecos silenciados', '🔇');
  };

  const handleExportCampaign = () => {
    exportCampaignJSON({
      characters, tokens, maps, scenes, activeSceneId, handouts,
      customStatuses, customSounds, fowEnabled, fowVisionRadius,
      fowMemoryEnabled, fowAutoHideEnemies, fowActions,
      weatherEffect, ambientTint, snapToGrid, gridSize
    });
    showMasterFeedback('Crónica exportada (.json)', '📤');
  };

  const handleOpenPlayerView = async () => {
    const playerUrl = `${window.location.origin}${window.location.pathname}?view=player`;

    if (isTauriDesktop()) {
      try {
        const existingWin = await WebviewWindow.getByLabel('player');
        if (existingWin) {
          await existingWin.show();
          await existingWin.setFocus();
          showMasterFeedback('Pantalla de Jugadores enfocada');
          return;
        }

        const webview = new WebviewWindow('player', {
          url: '/?view=player',
          title: 'Grimorio VTT — Pantalla de Jugadores (Alpha)',
          width: 1280,
          height: 720,
          resizable: true,
          fullscreen: false
        });

        webview.once('tauri://created', () => {
          showMasterFeedback('Pantalla de Jugadores abierta');
          setTimeout(() => {
            postSyncMessage({
              type: 'STATE_SYNC',
              payload: {
                tokens, maps, customStatuses, fowEnabled, fowVisionRadius,
                fowMemoryEnabled, fowAutoHideEnemies, fowActions,
                weatherEffect, ambientTint, snapToGrid, gridSize, pan, scale, syncPlayerCamera, activeHandout
              }
            });
          }, 500);
        });

        webview.once('tauri://error', (e) => {
          console.error('Error abriendo ventana Tauri:', e);
          showMasterFeedback('Error de permiso en ventana Tauri', '⚠️');
        });
        return;
      } catch (err) {
        console.error('Excepción en Tauri WebviewWindow:', err);
      }
    }

    window.open(playerUrl, '_blank', 'width=1280,height=720');
  };

  const handleImportCampaignFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        if (data.characters) setCharacters(data.characters);
        if (data.tokens) setTokens(data.tokens);
        if (data.maps) {
          setMaps(data.maps);
          saveCampaignToDB(data, true);
        }
        if (Array.isArray(data.scenes) && data.scenes.length > 0) {
          setScenes(data.scenes);
          if (data.activeSceneId) setActiveSceneId(data.activeSceneId);
        }
        if (Array.isArray(data.handouts)) setHandouts(data.handouts);
        if (data.customStatuses) setCustomStatuses(data.customStatuses);
        if (data.customSounds) setCustomSounds(data.customSounds);
        if (typeof data.fowEnabled === 'boolean') setFowEnabled(data.fowEnabled);
        if (data.fowVisionRadius) setFowVisionRadius(data.fowVisionRadius);
        if (data.fowActions) setFowActions(data.fowActions);
        showMasterFeedback('¡Crónica restaurada con éxito!');
      } catch (err) {
        showMasterFeedback('El archivo seleccionado no es una crónica válida');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  if (isPlayerView) {
    return (
      <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'flex', overflow: 'hidden', backgroundColor: '#050302' }}>
        <style>{GLOBAL_VTT_STYLES}</style>
        <GameBoard
          boardRef={boardRef}
          scale={scale}
          pan={pan}
          isPlayerView={true}
          fowEnabled={fowEnabled}
          fowVisionRadius={fowVisionRadius}
          fowMemoryEnabled={fowMemoryEnabled}
          fowAutoHideEnemies={fowAutoHideEnemies}
          weatherEffect={weatherEffect}
          ambientTint={ambientTint}
          handlePointerDown={handlePointerDown}
          handlePointerMove={handlePointerMove}
          handlePointerUp={handlePointerUp}
          handleWheel={handleWheel}
          snapToGrid={snapToGrid}
          gridSize={gridSize}
          maps={maps}
          fowCanvasRef={fowCanvasRef}
          fowActions={fowActions}
          tokens={tokens}
          customStatuses={customStatuses}
          pings={pings}
        />
        <HandoutFullscreenOverlay handout={activeHandout} isPlayerView={true} />
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#0e0906' }}>
      <style>{GLOBAL_VTT_STYLES}</style>
      <input
        type="file"
        accept=".json"
        ref={campaignFileInputRef}
        onChange={handleImportCampaignFile}
        style={{ display: 'none' }}
      />

      {/* Barra Superior Gótica */}
      <div style={{
        height: '58px',
        background: 'linear-gradient(180deg, #2b1b12 0%, #160e09 100%)',
        borderBottom: '2px solid #8a6d3b',
        padding: '0 22px',
        display: 'flex',
        alignItems: 'center',
        zIndex: 30,
        boxShadow: '0 4px 20px rgba(0,0,0,0.85)'
      }}>
        <Toolbar
          onResetBoard={() => {
            setTokens([]);
            setFowActions([]);
            showMasterFeedback('Mesa despejada', '🗡️');
          }}
          onOpenMapCreator={() => setIsMapCreatorOpen(true)}
          onOpenSettings={() => setIsSettingsOpen(!isSettingsOpen)}
          onOpenPlayerView={handleOpenPlayerView}
          scenes={scenes}
          activeSceneId={activeSceneId}
          onSelectScene={handleSelectScene}
          onCreateNewScene={handleCreateNewScene}
        />
      </div>

      {/* Modal a Pantalla Completa del Creador de Mapas */}
      {isMapCreatorOpen && !isPlayerView && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, backgroundColor: '#080504', display: 'flex', flexDirection: 'column' }}>
          <MapCreator
            initialElements={maps}
            onLoadMapToBoard={(newElements) => {
              setMaps(newElements);
              saveCampaignToDB({ maps: newElements }, true);
              showMasterFeedback('Escenario actualizado');
            }}
            onClose={() => setIsMapCreatorOpen(false)}
            onReturnToSettings={() => {
              setIsMapCreatorOpen(false);
              setIsSettingsOpen(true);
            }}
          />
        </div>
      )}

      {/* Cuerpo Central */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Aviso Flotante cuando hay una Ilustración o Pergamino Proyectándose en la Pantalla de Jugadores */}
        {activeHandout && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: '72px',
              left: 'calc(50% + 145px)',
              transform: 'translateX(-50%)',
              zIndex: 4300,
              background: 'linear-gradient(180deg, rgba(20, 83, 45, 0.96) 0%, rgba(5, 46, 22, 0.98) 100%)',
              border: '2px solid #4ade80',
              borderRadius: '8px',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              color: '#dcfce7',
              fontSize: '12px',
              boxShadow: '0 8px 25px rgba(0,0,0,0.9)'
            }}
          >
            <span>
              <strong>Proyectando en Pantalla de Jugadores:</strong> {activeHandout.title}
            </span>
            <button
              onClick={() => {
                setActiveHandout(null);
                showMasterFeedback('Proyección retirada');
              }}
              className="vtt-brass-btn"
              style={{
                padding: '4px 12px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                borderColor: '#f87171',
                color: '#fecaca'
              }}
            >
              Retirar Proyección (Esc)
            </button>
          </div>
        )}

        {/* Aviso Flotante Superior cuando hay una Herramienta o Pincel activo */}
        {(fowMode !== 'none' || rulerActive || pingActive) && !activeHandout && (
          <div
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: '72px',
              left: 'calc(50% + 145px)',
              transform: 'translateX(-50%)',
              zIndex: 4200,
              background: 'linear-gradient(180deg, rgba(146, 64, 14, 0.96) 0%, rgba(69, 26, 3, 0.98) 100%)',
              border: '1px solid #fbbf24',
              borderRadius: '8px',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#fffbeb',
              fontSize: '12px',
              boxShadow: '0 8px 20px rgba(0,0,0,0.85)'
            }}
          >
            <span>
              <strong>Modo Activo:</strong>{' '}
              {rulerActive
                ? 'Regla de Medición (Arrastra en el mapa)'
                : pingActive
                ? 'Señal / Ping (Haz clic en el mapa)'
                : fowMode === 'reveal'
                ? 'Pincel de Niebla: Revelar Zona'
                : 'Pincel de Niebla: Tapar Zona'}
            </span>
            <button
              onClick={() => {
                setFowMode('none');
                setRulerActive(false);
                setPingActive(false);
              }}
              className="vtt-brass-btn"
              style={{
                padding: '3px 10px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 'bold',
                cursor: 'pointer',
                borderColor: '#fbbf24'
              }}
            >
              Volver a Mover Fichas (Esc)
            </button>
          </div>
        )}

        <TokenSidebar
          tokens={tokens}
          characters={characters}
          onAddToken={handleAddToken}
          onRemoveToken={(id) => setTokens(prev => prev.filter(t => t.id !== id))}
          onRemoveCharacter={(id) => setCharacters(prev => prev.filter(c => c.id !== id))}
          onToggleTokenName={(id) => setTokens(prev => prev.map(t => {
            if (t.id !== id) return t;
            const next = t.showName === false ? true : false;
            showMasterFeedback(`${t.name}: ${next ? 'Nombre Visible' : 'Nombre Oculto'}`, '🏷️');
            return { ...t, showName: next };
          }))}
          onToggleTokenHidden={(id) => setTokens(prev => prev.map(t => {
            if (t.id !== id) return t;
            const next = !t.isHidden;
            showMasterFeedback(`${t.name}: ${next ? 'En Sigilo (👻)' : 'Revelado'}`, next ? '👻' : '👁️');
            return { ...t, isHidden: next };
          }))}
          onToggleTokenFaction={(id) => setTokens(prev => prev.map(t => {
            if (t.id !== id) return t;
            const next = t.faction === 'enemy' ? 'ally' : 'enemy';
            showMasterFeedback(`${t.name}: ${next === 'enemy' ? 'Enemigo (💀)' : 'Aliado (🛡️)'}`, next === 'enemy' ? '💀' : '🛡️');
            return { ...t, faction: next };
          }))}
          customStatuses={customStatuses}
        />

        <GameBoard
          boardRef={boardRef}
          scale={scale}
          pan={pan}
          isDraggingPan={isDraggingPan}
          isPlayerView={false}
          fowEnabled={fowEnabled}
          fowMode={fowMode}
          fowVisionRadius={fowVisionRadius}
          fowMemoryEnabled={fowMemoryEnabled}
          fowAutoHideEnemies={fowAutoHideEnemies}
          weatherEffect={weatherEffect}
          ambientTint={ambientTint}
          rulerActive={rulerActive}
          pingActive={pingActive}
          handlePointerDown={handlePointerDown}
          handlePointerMove={handlePointerMove}
          handlePointerUp={handlePointerUp}
          handleWheel={handleWheel}
          snapToGrid={snapToGrid}
          gridSize={gridSize}
          maps={maps}
          fowCanvasRef={fowCanvasRef}
          fowActions={fowActions}
          tokens={tokens}
          draggedToken={draggedToken}
          rotatingToken={rotatingToken}
          onTokenPointerDown={handleTokenPointerDown}
          onStartTokenRotate={handleStartTokenRotate}
          onToggleTokenLock={(id) => setTokens(prev => prev.map(t => {
            if (t.id !== id) return t;
            const next = !t.isLocked;
            showMasterFeedback(`${t.name}: ${next ? 'Posición Bloqueada 🔒' : 'Posición Desbloqueada 🔓'}`, next ? '🔒' : '🔓');
            return { ...t, isLocked: next };
          }))}
          onToggleTokenName={(id) => setTokens(prev => prev.map(t => {
            if (t.id !== id) return t;
            const next = t.showName === false ? true : false;
            showMasterFeedback(`${t.name}: ${next ? 'Nombre Visible' : 'Nombre Oculto'}`, '🏷️');
            return { ...t, showName: next };
          }))}
          onToggleTokenHidden={(id) => setTokens(prev => prev.map(t => t.id === id ? { ...t, isHidden: !t.isHidden } : t))}
          onToggleTokenFaction={(id) => setTokens(prev => prev.map(t => t.id === id ? { ...t, faction: t.faction === 'enemy' ? 'ally' : 'enemy' } : t))}
          onUpdateTokenSize={(id, size) => setTokens(prev => prev.map(t => t.id === id ? { ...t, size } : t))}
          onUpdateTokenRotation={(id, deg) => setTokens(prev => prev.map(t => t.id === id ? { ...t, rotation: ((deg % 360) + 360) % 360 } : t))}
          onUpdateTokenVisionMode={(id, mode) => setTokens(prev => prev.map(t => t.id === id ? { ...t, visionMode: mode } : t))}
          onToggleTokenStatus={(id, stId) => setTokens(prev => prev.map(t => {
            if (t.id !== id) return t;
            const current = t.statuses || [];
            const exists = current.includes(stId);
            return { ...t, statuses: exists ? current.filter(s => s !== stId) : [...current, stId] };
          }))}
          customStatuses={customStatuses}
          rulerMeasure={rulerMeasure}
          pings={pings}
          holdProgress={holdProgress}
          radialMenu={radialMenu}
          onCloseRadialMenu={() => setRadialMenu(null)}
          onSelectSpatialSound={(sound) => {
            if (radialMenu) {
              emitSpatialPing(radialMenu.logicalX, radialMenu.logicalY, sound);
              setRadialMenu(null);
            }
          }}
          customSounds={customSounds}
          onToggleDoor={handleToggleDoor}
          onToggleWindow={handleToggleWindow}
          onToggleObject={handleToggleObject}
          onToggleLight={handleToggleLight}
          onProjectHandout={(handoutObj) => {
            setActiveHandout(handoutObj);
            if (handoutObj) {
              showMasterFeedback(`Proyectando a jugadores: ${handoutObj.title}`, '🖼️');
            } else {
              showMasterFeedback('Proyección retirada');
            }
          }}
        />

        {/* Dock Central Flotante de Herramientas */}
        <div
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            bottom: '20px',
            left: 'calc(50% + 145px)',
            transform: 'translateX(-50%)',
            zIndex: 4000,
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            background: 'linear-gradient(180deg, rgba(30, 19, 13, 0.95) 0%, rgba(16, 10, 7, 0.98) 100%)',
            padding: '10px 20px',
            borderRadius: '16px',
            border: '2px solid #8a6d3b',
            boxShadow: '0 15px 35px rgba(0,0,0,0.9), inset 0 1px 0 rgba(212, 175, 55, 0.25)',
            backdropFilter: 'blur(8px)'
          }}
        >
          <button
            onClick={() => { setRulerActive(!rulerActive); setPingActive(false); }}
            className="vtt-brass-btn"
            style={{
              padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold',
              borderColor: rulerActive ? '#fbbf24' : '#8a6d3b', background: rulerActive ? '#92400e' : undefined
            }}
            title="Medir distancia en casillas y metros"
          >
            Regla de Medición
          </button>

          <button
            onClick={() => { setPingActive(!pingActive); setRulerActive(false); }}
            className="vtt-brass-btn"
            style={{
              padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold',
              borderColor: pingActive ? '#fbbf24' : '#8a6d3b', background: pingActive ? '#92400e' : undefined
            }}
            title="Señalar un punto de atención"
          >
            Señal / Ping
          </button>
          
          <div style={{ width: '1px', height: '24px', backgroundColor: '#6b4c2b' }}></div>

          <select
            value={weatherEffect}
            onChange={(e) => setWeatherEffect(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: '8px', backgroundColor: '#120b07', color: '#f3e5ab',
              border: '1px solid #8a6d3b', fontSize: '13px', fontFamily: "'Cinzel', serif", cursor: 'pointer'
            }}
            title="Clima en tiempo real"
          >
            <option value="none">Clima: Despejado</option>
            <option value="rain">Lluvia</option>
            <option value="storm">Tormenta</option>
            <option value="snow">Nieve</option>
            <option value="ash">Cenizas</option>
            <option value="spores">Esporas</option>
            <option value="mist">Niebla</option>
          </select>

          <select
            value={ambientTint}
            onChange={(e) => setAmbientTint(e.target.value)}
            style={{
              padding: '8px 12px', borderRadius: '8px', backgroundColor: '#120b07', color: '#f3e5ab',
              border: '1px solid #8a6d3b', fontSize: '13px', fontFamily: "'Cinzel', serif", cursor: 'pointer'
            }}
            title="Iluminación ambiental"
          >
            <option value="none">Luz: Natural</option>
            <option value="torch">Antorcha</option>
            <option value="night">Noche</option>
            <option value="blood">Carmesí</option>
            <option value="crypt">Cripta</option>
          </select>

          <div style={{ width: '1px', height: '24px', backgroundColor: '#6b4c2b' }}></div>

          <button
            onClick={() => { setPan({ x: 0, y: 0 }); setScale(1); }}
            className="vtt-brass-btn"
            style={{ padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
            title="Centrar Cámara al origen"
          >
            Centrar Cámara
          </button>

          <button
            onClick={() => {
              const nextSync = !syncPlayerCamera;
              setSyncPlayerCamera(nextSync);
              showMasterFeedback(nextSync ? 'Cámara vinculada' : 'Cámara libre');
            }}
            className="vtt-brass-btn"
            style={{
              padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold',
              borderColor: syncPlayerCamera ? '#4ade80' : '#8a6d3b'
            }}
            title="Vincular el movimiento de cámara con los Jugadores"
          >
            Vincular Pantalla: {syncPlayerCamera ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={() => setIsTutorialOpen(true)}
            className="vtt-brass-btn"
            style={{ padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
            title="Abrir Guía"
          >
            Guía de Uso
          </button>
        </div>

        <Soundboard
          onTriggerSound={handleTriggerSound}
          onStopAllSounds={handleStopAllSounds}
          activeLoops={activeLoops}
          masterToast={masterToast}
          customSounds={customSounds}
          onAddCustomSound={(snd) => {
            setCustomSounds(prev => [...prev, snd]);
            showMasterFeedback(`Sonido añadido: ${snd.label}`, snd.icon);
          }}
          onRemoveCustomSound={(id) => setCustomSounds(prev => prev.filter(s => s.id !== id))}
        />

        <DiceRoller />
      </div>

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        characters={characters}
        onSaveCharacter={(newChar) => setCharacters(prev => [...prev, newChar])}
        onImportCharacters={(imported) => setCharacters(prev => [...prev, ...imported])}
        onAddToken={handleAddToken}
        onRemoveCharacter={(id) => setCharacters(prev => prev.filter(c => c.id !== id))}
        customStatuses={customStatuses}
        onAddCustomStatus={(st) => setCustomStatuses(prev => [...prev, st])}
        onRemoveCustomStatus={(id) => setCustomStatuses(prev => prev.filter(s => s.id !== id))}
        onExportCampaign={handleExportCampaign}
        onImportCampaign={() => campaignFileInputRef.current.click()}
        fowEnabled={fowEnabled}
        setFowEnabled={setFowEnabled}
        fowBrushSize={fowBrushSize}
        setFowBrushSize={setFowBrushSize}
        fowVisionRadius={fowVisionRadius}
        setFowVisionRadius={setFowVisionRadius}
        fowMemoryEnabled={fowMemoryEnabled}
        setFowMemoryEnabled={setFowMemoryEnabled}
        fowAutoHideEnemies={fowAutoHideEnemies}
        setFowAutoHideEnemies={setFowAutoHideEnemies}
        onResetFow={() => {
          setFowActions([]);
          showMasterFeedback('Niebla de Guerra reiniciada');
        }}
        fowMode={fowMode}
        setFowMode={setFowMode}
        snapToGrid={snapToGrid}
        setSnapToGrid={setSnapToGrid}
        gridSize={gridSize}
        setGridSize={setGridSize}
        openMapCreator={() => setIsMapCreatorOpen(true)}
        maps={maps}
        onAddMapElement={(newEl) => {
          const center = {
            x: Math.round((-pan.x / scale + window.innerWidth / 3 / scale) / gridSize) * gridSize,
            y: Math.round((-pan.y / scale + window.innerHeight / 2 / scale) / gridSize) * gridSize
          };
          setMaps(prev => [...prev, { ...newEl, x: center.x, y: center.y, zIndex: prev.length + 10 }]);
        }}
        onToggleMapElementState={(item) => {
          if (item.type === 'door') handleToggleDoor(item.id);
          else if (item.type === 'window') handleToggleWindow(item.id, false);
          else if (item.type === 'object') handleToggleObject(item.id);
          else if (item.type === 'light') handleToggleLight(item.id);
        }}
        onRemoveMapElement={(id) => setMaps(prev => prev.filter(el => el.id !== id))}
        onClearAllMaps={() => setMaps([])}
        scenes={scenes}
        activeSceneId={activeSceneId}
        onSelectScene={handleSelectScene}
        onCreateNewScene={handleCreateNewScene}
        onDeleteScene={handleDeleteScene}
        handouts={handouts}
        activeHandout={activeHandout}
        onAddHandout={(h) => setHandouts(prev => [...prev, h])}
        onRemoveHandout={(id) => {
          setHandouts(prev => prev.filter(h => h.id !== id));
          if (activeHandout && activeHandout.id === id) setActiveHandout(null);
        }}
        onProjectHandout={(h) => {
          setActiveHandout(h);
          if (h) showMasterFeedback(`Proyectando: ${h.title}`, '🖼️');
          else showMasterFeedback('Proyección retirada');
        }}
      />

      <TutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onNeverShowAgain={() => setHideTutorialPermanently(true)}
      />
    </div>
  );
}

export default App;