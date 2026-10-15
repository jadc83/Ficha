import React, { useState, useRef } from 'react';
import { OBJECT_PRESETS, LIGHT_PRESETS } from './MapCreator';

const SettingsDrawer = ({ 
  isOpen, onClose, characters = [], onSaveCharacter, onImportCharacters,
  onAddToken, onRemoveCharacter,
  customStatuses = [], onAddCustomStatus, onRemoveCustomStatus,
  onExportCampaign, onImportCampaign,
  fowEnabled, setFowEnabled, fowBrushSize, setFowBrushSize, fowVisionRadius, setFowVisionRadius,
  fowMemoryEnabled = true, setFowMemoryEnabled, fowAutoHideEnemies = true, setFowAutoHideEnemies,
  onResetFow, fowMode, setFowMode,
  snapToGrid, setSnapToGrid, gridSize = 50, setGridSize,
  openMapCreator,
  maps = [], onAddMapElement, onToggleMapElementState, onRemoveMapElement, onClearAllMaps,
  scenes = [], activeSceneId = null, onSelectScene, onCreateNewScene, onRenameScene, onDeleteScene,
  handouts = [], activeHandout = null, onAddHandout, onRemoveHandout, onProjectHandout
}) => {
  const [activeTab, setActiveTab] = useState('escenario');
  const [statusMessage, setStatusMessage] = useState(null);
  const [confirmClearMaps, setConfirmClearMaps] = useState(false);

  // Estados para Escenas
  const [newSceneTitle, setNewSceneTitle] = useState('');

  // Estados para Ilustraciones (Handouts)
  const [handoutTitle, setHandoutTitle] = useState('');
  const handoutFileInputRef = useRef(null);

  // Estados para Bestiario
  const [charName, setCharName] = useState('');
  const [charColor, setCharColor] = useState('#b45309');
  const [charFaction, setCharFaction] = useState('ally');
  const [charAvatar, setCharAvatar] = useState('');
  const charInputRef = useRef(null);
  const charAvatarInputRef = useRef(null);

  // Estados para Creador de Objetos y Luces en vivo
  const [objCategory, setObjCategory] = useState('object');
  const [objName, setObjName] = useState(OBJECT_PRESETS[0].label);
  const [objIcon, setObjIcon] = useState(OBJECT_PRESETS[0].icon);
  const [objOpenIcon, setObjOpenIcon] = useState(OBJECT_PRESETS[0].openIcon);
  const [objBlocksMove, setObjBlocksMove] = useState(true);
  const [objBlocksVision, setObjBlocksVision] = useState(false);
  const [lightRadius, setLightRadius] = useState(220);
  const [lightColor, setLightColor] = useState(LIGHT_PRESETS[0].color);

  // Estados para Condiciones
  const [statusIcon, setStatusIcon] = useState('🩸');
  const [statusLabel, setStatusLabel] = useState('');
  const [statusEffect, setStatusEffect] = useState('none');

  const notify = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 2500);
  };

  const handleHandoutImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const title = handoutTitle.trim() || file.name.replace(/\.[^/.]+$/, '');
      const newHandout = {
        id: `handout_${Date.now()}`,
        type: 'image',
        title,
        src: event.target.result
      };
      if (onAddHandout) onAddHandout(newHandout);
      setHandoutTitle('');
      notify(`Ilustración "${title}" lista para proyectar`);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;
        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, 256, 256);
        setCharAvatar(canvas.toDataURL('image/webp', 0.85));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCharacterSubmit = (e) => {
    e.preventDefault();
    if (!charName.trim()) return;
    onSaveCharacter({
      id: Date.now(),
      name: charName.trim(),
      color: charColor,
      faction: charFaction,
      avatar: charAvatar || null
    });
    setCharName('');
    setCharAvatar('');
    notify('Personaje añadido al Bestiario');
  };

  const handleSpawnObjectOnBoard = (e) => {
    e.preventDefault();
    if (!onAddMapElement) return;

    if (objCategory === 'object') {
      onAddMapElement({
        id: Date.now() + Math.random(),
        type: 'object',
        name: objName.trim() || 'Objeto',
        icon: objIcon || '📦',
        openIcon: objOpenIcon || '🪙',
        width: 48,
        height: 48,
        isOpen: false,
        blocksMovement: objBlocksMove,
        blocksVision: objBlocksVision,
        isHidden: false
      });
      notify(`Objeto "${objName}" colocado en la mesa`);
    } else if (objCategory === 'light') {
      onAddMapElement({
        id: Date.now() + Math.random(),
        type: 'light',
        name: objName.trim() || 'Antorcha',
        icon: objIcon || '🔥',
        width: 38,
        height: 38,
        radius: lightRadius,
        color: lightColor,
        isOn: true
      });
      notify(`Fuente de luz "${objName}" colocada en la mesa`);
    } else if (objCategory === 'structure') {
      onAddMapElement({
        id: Date.now() + Math.random(),
        type: objIcon === '🪟' ? 'window' : 'door',
        name: objName.trim() || (objIcon === '🪟' ? 'Ventana' : 'Puerta'),
        width: 60,
        height: 16,
        isOpen: false
      });
      notify(`${objName} colocada en el centro de la mesa`);
    }
  };

  const handleStatusSubmit = (e) => {
    e.preventDefault();
    if (!statusLabel.trim() || !statusIcon.trim()) return;
    onAddCustomStatus({
      id: `custom_${Date.now()}`,
      icon: statusIcon.trim(),
      label: statusLabel.trim(),
      effect: statusEffect
    });
    setStatusLabel('');
    notify('Condición añadida');
  };

  const TABS = [
    { id: 'escenario', label: 'Escenas' },
    { id: 'proyector', label: 'Proyector' },
    { id: 'objetos', label: 'Objetos' },
    { id: 'niebla', label: 'Niebla' },
    { id: 'bestiario', label: 'Bestiario' },
    { id: 'campana', label: 'Campaña' }
  ];

  const interactiveItemsOnBoard = maps.filter(
    el => el.type === 'object' || el.type === 'light' || el.type === 'door' || el.type === 'window'
  );

  return (
    <div style={{
      position: 'fixed',
      top: '58px',
      right: isOpen ? '0' : '-480px',
      width: '460px',
      bottom: '0',
      transition: 'right 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
      zIndex: 4500,
      background: 'linear-gradient(180deg, #18100b 0%, #0d0805 100%)',
      borderLeft: '2px solid #8a6d3b',
      boxShadow: isOpen ? '-10px 0 30px rgba(0,0,0,0.95)' : 'none',
      display: 'flex',
      flexDirection: 'column',
      color: '#e6d5b8',
      overflow: 'hidden'
    }}>
      {/* Cabecera Superior Limpia */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 18px',
        background: '#120b07',
        borderBottom: '1px solid #4a331d'
      }}>
        <span className="vtt-gothic-title" style={{ fontSize: '15px', fontWeight: 'bold', color: '#d4af37' }}>
          Ajustes de Partida
        </span>
        <button
          onClick={onClose}
          className="vtt-brass-btn"
          style={{ padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
        >
          Cerrar
        </button>
      </div>

      {/* Navegación en Rejilla de 6 Columnas (Cero Scroll Horizontal) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        background: '#0d0805',
        borderBottom: '2px solid #6b4c2b'
      }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="vtt-gothic-title"
            style={{
              padding: '11px 2px',
              cursor: 'pointer',
              textAlign: 'center',
              background: activeTab === tab.id ? 'linear-gradient(180deg, #b45309 0%, #78350f 100%)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.id ? '2px solid #fbbf24' : '2px solid transparent',
              color: activeTab === tab.id ? '#fffbeb' : '#c5a059',
              fontSize: '11px',
              fontWeight: 'bold',
              transition: 'all 0.15s ease'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cuerpo Compacto */}
      <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
        {statusMessage && (
          <div style={{
            padding: '7px 12px',
            backgroundColor: '#261810',
            border: '1px solid #d4af37',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#fbbf24',
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            {statusMessage}
          </div>
        )}

        {/* PESTAÑA 1: GESTOR DE ESCENAS, PLANOS Y REJILLA */}
        {activeTab === 'escenario' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflow: 'hidden' }}>
            {/* Gestor de Múltiples Escenas / Pisos */}
            <div className="vtt-wood-panel" style={{ padding: '12px 14px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflow: 'hidden' }}>
              <div className="vtt-gothic-title" style={{ fontSize: '13px', color: '#d4af37', fontWeight: 'bold' }}>
                Selector de Escenas y Planos ({scenes.length})
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newSceneTitle.trim() || !onCreateNewScene) return;
                  onCreateNewScene(newSceneTitle.trim());
                  setNewSceneTitle('');
                  notify('Nueva escena creada y activada');
                }}
                style={{ display: 'flex', gap: '6px' }}
              >
                <input
                  type="text"
                  value={newSceneTitle}
                  onChange={(e) => setNewSceneTitle(e.target.value)}
                  placeholder="Nombre de nueva escena (ej. Cripta Piso 2)..."
                  style={{ flex: 1, padding: '6px 8px', backgroundColor: '#120b07', color: '#f3e5ab', border: '1px solid #8a6d3b', borderRadius: '4px', fontSize: '12px' }}
                />
                <button type="submit" className="vtt-brass-btn" style={{ padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', borderColor: '#fbbf24' }}>
                  + Crear Escena
                </button>
              </form>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {scenes.map((sc) => {
                  const isCurrent = sc.id === activeSceneId;
                  return (
                    <div
                      key={sc.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        backgroundColor: isCurrent ? 'rgba(180, 83, 9, 0.3)' : '#120b07',
                        border: isCurrent ? '1px solid #fbbf24' : '1px solid #4a331d',
                        fontSize: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 'bold', color: isCurrent ? '#fffbeb' : '#f3e5ab' }}>
                          {sc.name} {isCurrent && <span style={{ color: '#4ade80', fontSize: '10px' }}>(Activa)</span>}
                        </span>
                        <span style={{ fontSize: '10px', color: '#b89f7d' }}>
                          {(sc.maps || []).length} elem. mapa • {(sc.tokens || []).length} fichas
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {!isCurrent && onSelectScene && (
                          <button
                            onClick={() => {
                              onSelectScene(sc.id);
                              notify(`Escena "${sc.name}" cargada`);
                            }}
                            className="vtt-brass-btn"
                            style={{ padding: '3px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            Cargar
                          </button>
                        )}
                        {scenes.length > 1 && onDeleteScene && (
                          <button
                            onClick={() => onDeleteScene(sc.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}
                            title="Eliminar esta escena"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Acceso al Editor de Mapas */}
            <div className="vtt-wood-panel" style={{ padding: '12px 14px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="vtt-gothic-title" style={{ fontSize: '13px', color: '#d4af37', fontWeight: 'bold' }}>
                  Arquitectura de Escena ({maps.length} elementos)
                </span>
                {maps.length > 0 && onClearAllMaps && (
                  <button
                    onClick={() => {
                      if (confirmClearMaps) {
                        onClearAllMaps();
                        setConfirmClearMaps(false);
                        notify('Escenario vaciado');
                      } else {
                        setConfirmClearMaps(true);
                        setTimeout(() => setConfirmClearMaps(false), 3000);
                      }
                    }}
                    style={{
                      background: confirmClearMaps ? '#7f1d1d' : 'transparent',
                      border: '1px solid #7f1d1d',
                      color: '#fca5a5',
                      borderRadius: '4px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    {confirmClearMaps ? '¿Confirmar vaciado?' : 'Vaciar Plano'}
                  </button>
                )}
              </div>
              <button 
                onClick={() => {
                  onClose();
                  openMapCreator();
                }}
                className="vtt-gothic-title" 
                style={{
                  padding: '9px',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  background: 'linear-gradient(180deg, #b45309 0%, #78350f 100%)',
                  color: '#fffbeb',
                  border: '1px solid #fbbf24',
                  cursor: 'pointer'
                }}
              >
                Abrir Editor de Mapas a Pantalla Completa
              </button>
            </div>

            {/* Cuadrícula Táctica */}
            <div className="vtt-wood-panel" style={{ padding: '12px 14px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="vtt-gothic-title" style={{ fontSize: '13px', color: '#d4af37', fontWeight: 'bold' }}>
                  Cuadrícula ({gridSize} px)
                </span>
                <button
                  onClick={() => setSnapToGrid && setSnapToGrid(!snapToGrid)}
                  className="vtt-brass-btn"
                  style={{
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    fontSize: '11px',
                    cursor: 'pointer',
                    color: snapToGrid ? '#4ade80' : '#f87171'
                  }}
                >
                  {snapToGrid ? 'Activada' : 'Desactivada'}
                </button>
              </div>
              <input
                type="range"
                min="25"
                max="150"
                step="5"
                value={gridSize}
                onChange={(e) => setGridSize && setGridSize(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#d4af37', cursor: 'pointer' }}
              />
            </div>
          </div>
        )}

        {/* PESTAÑA 2: PROYECTOR DE ILUSTRACIONES A PANTALLA COMPLETA (HANDOUTS) */}
        {activeTab === 'proyector' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflow: 'hidden' }}>
            <div className="vtt-wood-panel" style={{ padding: '14px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="vtt-gothic-title" style={{ fontSize: '13px', color: '#d4af37', fontWeight: 'bold' }}>
                Proyector de Ilustraciones a Pantalla Completa
              </div>
              <p style={{ color: '#b89f7d', fontSize: '12px', margin: 0, lineHeight: '1.4' }}>
                Sube retratos de PNJs, criaturas, mapas regionales o pistas visuales para mostrarlos a pantalla completa en la ventana de los jugadores.
              </p>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={handoutTitle}
                  onChange={(e) => setHandoutTitle(e.target.value)}
                  placeholder="Título de la ilustración (opcional)..."
                  style={{ flex: 1, padding: '7px 10px', backgroundColor: '#120b07', color: '#f3e5ab', border: '1px solid #8a6d3b', borderRadius: '4px', fontSize: '12px' }}
                />
                <input
                  type="file"
                  accept="image/*"
                  ref={handoutFileInputRef}
                  onChange={handleHandoutImageUpload}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => handoutFileInputRef.current.click()}
                  className="vtt-brass-btn"
                  style={{ padding: '7px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', borderColor: '#fbbf24', whiteSpace: 'nowrap' }}
                >
                  + Subir Imagen
                </button>
              </div>

              {activeHandout && (
                <button
                  onClick={() => onProjectHandout && onProjectHandout(null)}
                  style={{
                    padding: '8px',
                    borderRadius: '6px',
                    background: 'linear-gradient(180deg, #991b1b 0%, #450a0a 100%)',
                    color: '#fecaca',
                    border: '1px solid #f87171',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}
                >
                  Ocultar Proyección Actual ({activeHandout.title})
                </button>
              )}
            </div>

            <div className="vtt-wood-panel" style={{ padding: '12px 14px', borderRadius: '8px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <span className="vtt-gothic-title" style={{ fontSize: '12px', color: '#c5a059', fontWeight: 'bold', marginBottom: '8px' }}>
                Galería de Ilustraciones ({handouts.length})
              </span>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {handouts.map((item) => {
                  const isProjected = activeHandout && activeHandout.id === item.id;
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '10px',
                        padding: '8px 10px',
                        backgroundColor: isProjected ? 'rgba(180, 83, 9, 0.35)' : '#120b07',
                        border: isProjected ? '1px solid #fbbf24' : '1px solid #4a331d',
                        borderRadius: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                        <img
                          src={item.src}
                          alt={item.title}
                          style={{ width: '44px', height: '44px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #8a6d3b', flexShrink: 0 }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#f3e5ab', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                            {item.title}
                          </span>
                          <span style={{ fontSize: '11px', color: isProjected ? '#4ade80' : '#b89f7d' }}>
                            {isProjected ? 'Proyectándose en Pantalla de Jugadores' : 'En archivo'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button
                          onClick={() => onProjectHandout && onProjectHandout(isProjected ? null : item)}
                          className="vtt-brass-btn"
                          style={{
                            padding: '5px 10px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            borderColor: isProjected ? '#f87171' : '#fbbf24',
                            color: isProjected ? '#fca5a5' : '#f3e5ab'
                          }}
                        >
                          {isProjected ? 'Ocultar' : 'Mostrar a Jugadores'}
                        </button>
                        {onRemoveHandout && (
                          <button
                            onClick={() => onRemoveHandout(item.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
                          >
                            X
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {handouts.length === 0 && (
                  <div style={{ color: '#8a6d3b', fontSize: '12px', textAlign: 'center', marginTop: '20px', fontStyle: 'italic' }}>
                    Aún no has subido ilustraciones. Sube cualquier imagen arriba para proyectarla a pantalla completa en la ventana de tus jugadores.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 3: CREADOR DE OBJETOS, LUCES Y PUERTAS */}
        {activeTab === 'objetos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflow: 'hidden' }}>
            <div className="vtt-wood-panel" style={{ padding: '14px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                <button
                  onClick={() => {
                    setObjCategory('object');
                    setObjName(OBJECT_PRESETS[0].label);
                    setObjIcon(OBJECT_PRESETS[0].icon);
                    setObjOpenIcon(OBJECT_PRESETS[0].openIcon);
                  }}
                  className="vtt-brass-btn"
                  style={{
                    padding: '7px 4px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
                    borderColor: objCategory === 'object' ? '#fbbf24' : '#8a6d3b',
                    background: objCategory === 'object' ? '#78350f' : undefined
                  }}
                >
                  Objeto
                </button>
                <button
                  onClick={() => {
                    setObjCategory('light');
                    setObjName(LIGHT_PRESETS[0].label);
                    setObjIcon(LIGHT_PRESETS[0].icon);
                    setLightRadius(LIGHT_PRESETS[0].radius);
                    setLightColor(LIGHT_PRESETS[0].color);
                  }}
                  className="vtt-brass-btn"
                  style={{
                    padding: '7px 4px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
                    borderColor: objCategory === 'light' ? '#fbbf24' : '#8a6d3b',
                    background: objCategory === 'light' ? '#78350f' : undefined
                  }}
                >
                  Antorcha / Luz
                </button>
                <button
                  onClick={() => {
                    setObjCategory('structure');
                    setObjName('Puerta');
                    setObjIcon('🚪');
                  }}
                  className="vtt-brass-btn"
                  style={{
                    padding: '7px 4px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer',
                    borderColor: objCategory === 'structure' ? '#fbbf24' : '#8a6d3b',
                    background: objCategory === 'structure' ? '#78350f' : undefined
                  }}
                >
                  Puerta / Ventana
                </button>
              </div>

              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {objCategory === 'structure' ? (
                  <>
                    <button type="button" onClick={() => { setObjName('Puerta'); setObjIcon('🚪'); }} className="vtt-brass-btn" style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Puerta de Madera</button>
                    <button type="button" onClick={() => { setObjName('Ventana'); setObjIcon('🪟'); }} className="vtt-brass-btn" style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>Ventana Acristalada</button>
                  </>
                ) : (
                  (objCategory === 'object' ? OBJECT_PRESETS : LIGHT_PRESETS).map(p => (
                    <button
                      key={p.presetId}
                      type="button"
                      onClick={() => {
                        setObjName(p.label);
                        setObjIcon(p.icon);
                        if (objCategory === 'object') {
                          setObjOpenIcon(p.openIcon);
                          setObjBlocksMove(p.blocksMovement);
                          setObjBlocksVision(p.blocksVision);
                        } else {
                          setLightRadius(p.radius);
                          setLightColor(p.color);
                        }
                      }}
                      className="vtt-brass-btn"
                      style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                    >
                      {p.label}
                    </button>
                  ))
                )}
              </div>

              <form onSubmit={handleSpawnObjectOnBoard} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={objName}
                    onChange={(e) => setObjName(e.target.value)}
                    placeholder="Nombre del elemento..."
                    style={{ flex: 1, padding: '7px', backgroundColor: '#120b07', color: '#f3e5ab', border: '1px solid #8a6d3b', borderRadius: '4px', fontSize: '12px' }}
                  />
                  <input
                    type="text"
                    value={objIcon}
                    onChange={(e) => setObjIcon(e.target.value)}
                    title="Símbolo Cerrado / Activo"
                    style={{ width: '42px', padding: '7px', textAlign: 'center', backgroundColor: '#120b07', color: '#f3e5ab', border: '1px solid #8a6d3b', borderRadius: '4px', fontSize: '13px' }}
                  />
                  {objCategory === 'object' && (
                    <input
                      type="text"
                      value={objOpenIcon}
                      onChange={(e) => setObjOpenIcon(e.target.value)}
                      title="Símbolo Abierto / Accionado"
                      style={{ width: '42px', padding: '7px', textAlign: 'center', backgroundColor: '#120b07', color: '#f3e5ab', border: '1px solid #8a6d3b', borderRadius: '4px', fontSize: '13px' }}
                    />
                  )}
                </div>

                {objCategory === 'object' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px', color: '#e6d5b8' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: '#120b07', padding: '6px 8px', borderRadius: '4px', border: '1px solid #4a331d' }}>
                      <input type="checkbox" checked={objBlocksMove} onChange={(e) => setObjBlocksMove(e.target.checked)} />
                      <span>Bloquea paso</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', background: '#120b07', padding: '6px 8px', borderRadius: '4px', border: '1px solid #4a331d' }}>
                      <input type="checkbox" checked={objBlocksVision} onChange={(e) => setObjBlocksVision(e.target.checked)} />
                      <span>Bloquea visión</span>
                    </label>
                  </div>
                )}

                {objCategory === 'light' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                      <span>Radio de Luz en la Niebla</span>
                      <strong style={{ color: '#fbbf24' }}>{lightRadius} px</strong>
                    </div>
                    <input
                      type="range"
                      min="80"
                      max="500"
                      value={lightRadius}
                      onChange={(e) => setLightRadius(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#fbbf24' }}
                    />
                  </div>
                )}

                <button type="submit" className="vtt-brass-btn" style={{ padding: '8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', borderColor: '#fbbf24' }}>
                  Colocar en el Centro de la Mesa
                </button>
              </form>
            </div>

            <div className="vtt-wood-panel" style={{ padding: '12px 14px', borderRadius: '8px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span className="vtt-gothic-title" style={{ fontSize: '12px', color: '#c5a059', fontWeight: 'bold' }}>
                  En el Mapa ({interactiveItemsOnBoard.length})
                </span>
                <button
                  onClick={() => { onClose(); openMapCreator(); }}
                  style={{ background: 'none', border: 'none', color: '#fbbf24', fontSize: '11px', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Mover Posición en Editor
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {interactiveItemsOnBoard.map(item => {
                  const isActive = item.type === 'light' ? item.isOn !== false : Boolean(item.isOpen);
                  return (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#120b07', padding: '6px 10px', borderRadius: '4px', border: '1px solid #4a331d', fontSize: '12px' }}>
                      <span>
                        {item.icon || (item.type === 'door' ? '🚪' : '🪟')} {item.name || item.type.toUpperCase()}
                      </span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {onToggleMapElementState && (
                          <button
                            onClick={() => onToggleMapElementState(item)}
                            className="vtt-brass-btn"
                            style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: isActive ? '#4ade80' : '#f3e5ab' }}
                          >
                            {item.type === 'light' ? (isActive ? 'Apagar' : 'Encender') : (isActive ? 'Cerrar' : 'Abrir')}
                          </button>
                        )}
                        {onRemoveMapElement && (
                          <button
                            onClick={() => onRemoveMapElement(item.id)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}
                          >
                            Quitar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {interactiveItemsOnBoard.length === 0 && (
                  <div style={{ color: '#8a6d3b', fontSize: '12px', textAlign: 'center', marginTop: '12px', fontStyle: 'italic' }}>
                    No hay objetos ni luces colocados aún.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PESTAÑA 4: NIEBLA Y VISIÓN */}
        {activeTab === 'niebla' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="vtt-wood-panel" style={{ padding: '14px', borderRadius: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: '#120b07', padding: '10px', borderRadius: '6px', border: '1px solid #4a331d', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#d4af37' }}>Niebla de Guerra</span>
                <button
                  onClick={() => setFowEnabled(!fowEnabled)}
                  className="vtt-brass-btn"
                  style={{ padding: '6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer', color: fowEnabled ? '#4ade80' : '#f87171' }}
                >
                  {fowEnabled ? 'Activada' : 'Desactivada'}
                </button>
              </div>

              <div style={{ background: '#120b07', padding: '10px', borderRadius: '6px', border: '1px solid #4a331d', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#d4af37' }}>Memoria de Mapa</span>
                <button
                  onClick={() => setFowMemoryEnabled(!fowMemoryEnabled)}
                  className="vtt-brass-btn"
                  style={{ padding: '6px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                >
                  {fowMemoryEnabled ? 'Con Penumbra' : 'Visión Estricta'}
                </button>
              </div>

              <div style={{ gridColumn: '1 / -1', background: '#120b07', padding: '10px', borderRadius: '6px', border: '1px solid #4a331d', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: '#e6d5b8' }}>Ocultar enemigos fuera de visión</span>
                <button
                  onClick={() => setFowAutoHideEnemies && setFowAutoHideEnemies(!fowAutoHideEnemies)}
                  className="vtt-brass-btn"
                  style={{ padding: '5px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '11px', cursor: 'pointer', color: fowAutoHideEnemies ? '#4ade80' : '#f87171' }}
                >
                  {fowAutoHideEnemies ? 'Automático' : 'Siempre Visibles'}
                </button>
              </div>
            </div>

            <div className="vtt-wood-panel" style={{ padding: '14px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#d4af37', display: 'block', marginBottom: '8px' }}>
                  Pincel Manual del Master
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                  <button onClick={() => setFowMode('none')} className="vtt-brass-btn" style={{ padding: '7px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer', borderColor: fowMode === 'none' ? '#fbbf24' : '#8a6d3b', background: fowMode === 'none' ? '#78350f' : undefined }}>Mover Fichas</button>
                  <button onClick={() => setFowMode('reveal')} className="vtt-brass-btn" style={{ padding: '7px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer', borderColor: fowMode === 'reveal' ? '#4ade80' : '#8a6d3b', background: fowMode === 'reveal' ? '#14532d' : undefined }}>Revelar Zona</button>
                  <button onClick={() => setFowMode('hide')} className="vtt-brass-btn" style={{ padding: '7px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer', borderColor: fowMode === 'hide' ? '#f87171' : '#8a6d3b', background: fowMode === 'hide' ? '#7f1d1d' : undefined }}>Tapar Zona</button>
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Alcance de Visión de Personajes</span>
                  <strong style={{ color: '#fbbf24' }}>{fowVisionRadius} px</strong>
                </div>
                <input type="range" min="60" max="500" value={fowVisionRadius} onChange={(e) => setFowVisionRadius(Number(e.target.value))} style={{ width: '100%', accentColor: '#d4af37' }} />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                  <span>Tamaño del Pincel Manual</span>
                  <strong style={{ color: '#fbbf24' }}>{fowBrushSize} px</strong>
                </div>
                <input type="range" min="20" max="300" value={fowBrushSize} onChange={(e) => setFowBrushSize(Number(e.target.value))} style={{ width: '100%', accentColor: '#d4af37' }} />
              </div>
            </div>

            {onResetFow && (
              <button
                onClick={onResetFow}
                className="vtt-gothic-title"
                style={{
                  padding: '10px',
                  borderRadius: '6px',
                  background: 'linear-gradient(180deg, #991b1b 0%, #450a0a 100%)',
                  color: '#fecaca',
                  border: '1px solid #f87171',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Restaurar Oscuridad en Todo el Mapa
              </button>
            )}
          </div>
        )}

        {/* PESTAÑA 5: BESTIARIO Y PERSONAJES */}
        {activeTab === 'bestiario' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflow: 'hidden' }}>
            <div className="vtt-wood-panel" style={{ padding: '14px', borderRadius: '8px' }}>
              <div className="vtt-gothic-title" style={{ fontSize: '13px', color: '#d4af37', marginBottom: '10px', fontWeight: 'bold' }}>
                Registrar Personaje o Criatura
              </div>
              <form onSubmit={handleCharacterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div
                    onClick={() => charAvatarInputRef.current.click()}
                    title="Subir imagen de retrato"
                    style={{
                      width: '40px', height: '40px', borderRadius: '50%', backgroundColor: charColor,
                      border: '2px solid #d4af37', cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', overflow: 'hidden', flexShrink: 0
                    }}
                  >
                    {charAvatar ? <img src={charAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: '10px', color: '#fff' }}>Foto</span>}
                  </div>
                  {charAvatar && (
                    <button
                      type="button"
                      onClick={() => setCharAvatar('')}
                      style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '11px', cursor: 'pointer' }}
                      title="Quitar foto seleccionada"
                    >
                      Quitar
                    </button>
                  )}
                  <input type="file" accept="image/*" ref={charAvatarInputRef} onChange={handleAvatarUpload} style={{ display: 'none' }} />
                  <input
                    type="text"
                    value={charName}
                    onChange={(e) => setCharName(e.target.value)}
                    placeholder="Nombre del héroe o criatura..."
                    style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: '1px solid #8a6d3b', backgroundColor: '#120b07', color: '#f3e5ab', fontSize: '12px' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="color"
                    value={charColor}
                    onChange={(e) => setCharColor(e.target.value)}
                    title="Color del borde/ficha"
                    style={{ width: '40px', height: '34px', border: '1px solid #8a6d3b', cursor: 'pointer', backgroundColor: 'transparent', borderRadius: '4px' }}
                  />
                  <select
                    value={charFaction}
                    onChange={(e) => setCharFaction(e.target.value)}
                    style={{ flex: 1, padding: '0 8px', borderRadius: '6px', border: '1px solid #8a6d3b', backgroundColor: '#120b07', color: '#f3e5ab', fontSize: '12px' }}
                  >
                    <option value="ally">Facción: Aliado / Jugador (Emite visión)</option>
                    <option value="enemy">Facción: Enemigo / Criatura (Oculto en niebla)</option>
                  </select>
                </div>

                <button type="submit" disabled={!charName.trim()} className="vtt-brass-btn" style={{ padding: '8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: charName.trim() ? 'pointer' : 'not-allowed', borderColor: '#fbbf24' }}>
                  Guardar en el Bestiario
                </button>
              </form>
            </div>

            <div className="vtt-wood-panel" style={{ padding: '12px 14px', borderRadius: '8px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="vtt-gothic-title" style={{ fontSize: '12px', color: '#d4af37', fontWeight: 'bold' }}>
                  Compendio ({characters.length})
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => charInputRef.current.click()} className="vtt-brass-btn" style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>
                    Importar
                  </button>
                  <button
                    onClick={() => {
                      if (!characters.length) return notify('No hay personajes para exportar');
                      const a = document.createElement('a');
                      a.href = URL.createObjectURL(new Blob([JSON.stringify(characters)], { type: 'application/json' }));
                      a.download = 'bestiario_vtt.json';
                      a.click();
                    }}
                    className="vtt-brass-btn"
                    style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Exportar
                  </button>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {characters.map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#120b07', padding: '5px 8px', borderRadius: '4px', border: '1px solid #4a331d', fontSize: '12px' }}>
                    <span style={{ color: '#f3e5ab', fontWeight: 'bold' }}>
                      {c.name} <span style={{ color: c.faction === 'enemy' ? '#f87171' : '#60a5fa', fontSize: '10px' }}>({c.faction === 'enemy' ? 'Enemigo' : 'Aliado'})</span>
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {onAddToken && (
                        <button onClick={() => { onAddToken(c); notify(`${c.name} invocado`); }} className="vtt-brass-btn" style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>
                          Invocar
                        </button>
                      )}
                      {onRemoveCharacter && (
                        <button onClick={() => onRemoveCharacter(c.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>
                          X
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {characters.length === 0 && (
                  <div style={{ color: '#8a6d3b', fontSize: '12px', textAlign: 'center', marginTop: '10px', fontStyle: 'italic' }}>
                    Registra o importa personajes para invocarlos en tus partidas.
                  </div>
                )}
              </div>

              <input
                type="file"
                accept=".json"
                ref={charInputRef}
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  const r = new FileReader();
                  r.onload = (ev) => {
                    try {
                      const data = JSON.parse(ev.target.result);
                      if (Array.isArray(data)) {
                        onImportCharacters(data.map(c => ({ ...c, id: Date.now() + Math.random() })));
                        notify('Compendio importado con éxito');
                      }
                    } catch (err) {}
                  };
                  r.readAsText(file);
                  e.target.value = '';
                }}
              />
            </div>
          </div>
        )}

        {/* PESTAÑA 6: CAMPAÑA Y ESTADOS */}
        {activeTab === 'campana' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div className="vtt-wood-panel" style={{ padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="vtt-gothic-title" style={{ fontSize: '14px', color: '#d4af37', fontWeight: 'bold' }}>
                Estados y Condiciones
              </div>
              <form onSubmit={handleStatusSubmit} style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  value={statusIcon}
                  onChange={(e) => setStatusIcon(e.target.value)}
                  placeholder="🩸"
                  style={{ width: '40px', padding: '7px', textAlign: 'center', borderRadius: '4px', background: '#120b07', color: 'white', border: '1px solid #8a6d3b' }}
                />
                <input
                  type="text"
                  value={statusLabel}
                  onChange={(e) => setStatusLabel(e.target.value)}
                  placeholder="Nombre (ej. Envenenado)..."
                  style={{ flex: 1, padding: '7px', borderRadius: '4px', background: '#120b07', color: 'white', border: '1px solid #8a6d3b', fontSize: '12px' }}
                />
                <select
                  value={statusEffect}
                  onChange={(e) => setStatusEffect(e.target.value)}
                  style={{ padding: '7px', borderRadius: '4px', background: '#120b07', color: '#f3e5ab', border: '1px solid #8a6d3b', fontSize: '11px' }}
                >
                  <option value="none">Visual</option>
                  <option value="immobilize">Inmoviliza</option>
                </select>
                <button type="submit" className="vtt-brass-btn" style={{ padding: '7px 12px', borderRadius: '4px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                  Crear
                </button>
              </form>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '95px', overflowY: 'auto' }}>
                {customStatuses.map(status => (
                  <div key={status.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#120b07', border: '1px solid #6b4c2b', padding: '4px 8px', borderRadius: '4px', fontSize: '11px' }}>
                    <span>{status.icon} {status.label}</span>
                    <button onClick={() => onRemoveCustomStatus(status.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="vtt-wood-panel" style={{ padding: '16px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div className="vtt-gothic-title" style={{ fontSize: '14px', color: '#d4af37', fontWeight: 'bold' }}>
                Archivo de Crónica Completa
              </div>
              <p style={{ color: '#b89f7d', fontSize: '12px', margin: 0 }}>
                Guarda o restaura todas tus escenas, ilustraciones, muros, objetos interactivos, luces, fichas y niebla en un único archivo.
              </p>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={onImportCampaign} className="vtt-brass-btn" style={{ flex: 1, padding: '10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                  Cargar Crónica (.json)
                </button>
                <button onClick={onExportCampaign} className="vtt-brass-btn" style={{ flex: 1, padding: '10px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}>
                  Guardar Crónica (.json)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsDrawer;