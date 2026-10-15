import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const COMPASS_DIRS = [
  { label: '↖', angle: 225 },
  { label: '↑', angle: 270 },
  { label: '↗', angle: 315 },
  { label: '←', angle: 180 },
  { label: '•', angle: null },
  { label: '→', angle: 0 },
  { label: '↙', angle: 135 },
  { label: '↓', angle: 90 },
  { label: '↘', angle: 45 }
];

const GameToken = ({
  token,
  isDragging,
  isRotating,
  isPlayerView = false,
  onPointerDown,
  onStartRotate,
  onToggleLock,
  onToggleName,
  onToggleHidden,
  onToggleFaction,
  onUpdateSize,
  onUpdateRotation,
  onUpdateVisionMode,
  onToggleStatus,
  customStatuses
}) => {
  const [menuState, setMenuState] = useState({ visible: false, x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isRotatingLocally, setIsRotatingLocally] = useState(false);
  const menuRef = useRef(null);
  const tokenRef = useRef(null);
  const currentSize = token.size || 50;
  const rotation = token.rotation || 0;
  const visionMode = token.visionMode || 'cone';
  const faction = token.faction || 'ally';
  const isHidden = Boolean(token.isHidden);
  const activeStatuses = token.statuses || [];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuState(prev => ({ ...prev, visible: false }));
      }
    };

    if (menuState.visible) {
      document.addEventListener('pointerdown', handleClickOutside, true);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside, true);
    };
  }, [menuState.visible]);

  // Listener nativo no-pasivo para que Shift+Rueda gire el cono con suavidad sin activar navegación del navegador
  useEffect(() => {
    const el = tokenRef.current;
    if (!el || isPlayerView) return;

    const onNativeWheel = (e) => {
      if (e.shiftKey && onUpdateRotation && !token.isLocked) {
        e.stopPropagation();
        e.preventDefault();
        const step = e.deltaY > 0 ? 6 : -6;
        onUpdateRotation(token.id, (token.rotation || 0) + step);
      }
    };

    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => el.removeEventListener('wheel', onNativeWheel);
  }, [token.id, token.rotation, token.isLocked, onUpdateRotation, isPlayerView]);

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPlayerView) return;
    setMenuState({ visible: true, x: e.clientX, y: e.clientY });
  };

  const handlePointerDown = (e) => {
    // Bloqueamos siempre la propagación en cualquier botón (incluido clic derecho) para no activar el paneo del mapa
    e.stopPropagation();
    if (e.button !== 0) return;
    e.preventDefault();
    if (menuState.visible) setMenuState({ visible: false, x: 0, y: 0 });
    
    if (!token.isLocked && onPointerDown) {
      onPointerDown(e, token);
    }
  };

  return (
    <div
      ref={tokenRef}
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onDragStart={(e) => e.preventDefault()}
      style={{
        position: 'absolute',
        left: `${token.x}px`,
        top: `${token.y}px`,
        width: `${currentSize}px`,
        height: `${currentSize}px`,
        backgroundColor: token.color,
        borderRadius: '50%',
        cursor: token.isLocked ? 'not-allowed' : (isDragging || isRotating ? 'grabbing' : 'grab'),
        boxShadow: faction === 'enemy'
          ? '0 6px 14px rgba(0,0,0,0.9), 0 0 10px rgba(220, 38, 38, 0.45)'
          : '0 6px 14px rgba(0,0,0,0.85), inset 0 0 8px rgba(0,0,0,0.6)',
        border: token.isLocked
          ? '3px solid #dc2626'
          : isHidden
          ? '3px dashed #a855f7'
          : faction === 'enemy'
          ? '3px solid #ef4444'
          : `3px solid ${token.color || '#d4af37'}`,
        outline: isRotating ? '2px solid #fbbf24' : '1px solid #d4af37',
        opacity: !isPlayerView && isHidden ? 0.52 : 1,
        zIndex: isDragging || isRotating ? 100 : 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none'
      }}
      title="Arrastra la punta dorada (o Shift + Arrastrar) para orientar el cono con el ratón | Shift + Rueda para giro fino"
    >
      {/* Indicador de Sigilo para el Master */}
      {!isPlayerView && isHidden && (
        <div
          style={{
            position: 'absolute',
            bottom: '-8px',
            right: '-8px',
            backgroundColor: '#3b0764',
            border: '1px solid #c084fc',
            borderRadius: '50%',
            width: '22px',
            height: '22px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            zIndex: 15,
            pointerEvents: 'none',
            boxShadow: '0 2px 6px rgba(0,0,0,0.9)'
          }}
          title="En Sigilo (Invisible en Pantalla de Jugadores)"
        >
          👻
        </div>
      )}

      {/* Haz sutil del Cono de Visión y Tirador de Orientación */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: `${currentSize * 2.2}px`,
          height: `${currentSize * 2.2}px`,
          transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
          pointerEvents: 'none',
          zIndex: 2
        }}
      >
        {visionMode === 'cone' && (isHovered || isDragging || isRotating || menuState.visible) && (
          <svg
            viewBox="0 0 100 100"
            style={{ width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}
          >
            <defs>
              <radialGradient id={`coneGrad_${token.id}`} cx="50%" cy="50%" r="50%">
                <stop offset="15%" stopColor="#fbbf24" stopOpacity="0.34" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.0" />
              </radialGradient>
            </defs>
            <path
              d="M 50 50 L 100 0 A 70 70 0 0 1 100 100 Z"
              fill={`url(#coneGrad_${token.id})`}
              stroke="rgba(251, 191, 36, 0.45)"
              strokeWidth="0.7"
              strokeDasharray="2,2"
            />
          </svg>
        )}

        {/* Tirador interactivo dorado en el borde del token para apuntar con el ratón */}
        <div
          onPointerDown={(e) => {
            if (isPlayerView || token.isLocked) return;
            e.stopPropagation();
            e.preventDefault();
            if (onStartRotate) onStartRotate(e, token);
          }}
          title="Arrastra para orientar la mirada hacia el ratón"
          style={{
            position: 'absolute',
            top: '50%',
            right: `${currentSize * 0.36}px`,
            transform: 'translateY(-50%)',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: isPlayerView || token.isLocked ? 'default' : 'grab',
            pointerEvents: isPlayerView ? 'none' : 'auto'
          }}
        >
          <div
            style={{
              width: 0,
              height: 0,
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              borderLeft: '11px solid #fbbf24',
              filter: 'drop-shadow(0 0 4px rgba(0,0,0,0.95))'
            }}
          />
        </div>
      </div>

      {token.avatar && (
        <img
          src={token.avatar}
          alt={token.name}
          draggable={false}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover',
            pointerEvents: 'none',
            userSelect: 'none'
          }}
        />
      )}

      {token.showName !== false && (
        <div
          className="vtt-gothic-title"
          style={{
            position: 'absolute',
            top: '-26px',
            background: 'linear-gradient(180deg, rgba(36, 23, 17, 0.95) 0%, rgba(18, 11, 7, 0.95) 100%)',
            color: '#f3e5ab',
            border: '1px solid #8a6d3b',
            padding: '2px 9px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            boxShadow: '0 3px 6px rgba(0,0,0,0.85)'
          }}
        >
          {token.name}
        </div>
      )}

      {}
      {menuState.visible && createPortal(
        <div 
          ref={menuRef}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', 
            top: `${Math.min(menuState.y, window.innerHeight - 450)}px`, 
            left: `${Math.min(menuState.x, window.innerWidth - 230)}px`,
            background: 'linear-gradient(180deg, #261810 0%, #140c08 100%)', 
            padding: '14px', 
            borderRadius: '8px',
            border: '2px solid #8a6d3b',
            outline: '1px solid #0d0907',
            boxShadow: '0 15px 35px rgba(0,0,0,0.95), inset 0 1px 0 rgba(212,175,55,0.25)', 
            zIndex: 999999, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px',
            width: '215px',
            color: '#e6d5b8',
            fontFamily: "'Crimson Text', Georgia, serif"
          }}
        >
          <div className="vtt-gothic-title" style={{ fontSize: '13px', color: '#d4af37', textAlign: 'center', borderBottom: '1px solid #6b4c2b', paddingBottom: '6px' }}>
            {token.name}
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (onToggleHidden) onToggleHidden(token.id);
              }}
              style={{
                flex: 1,
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: '4px',
                fontWeight: 'bold',
                fontSize: '11px',
                fontFamily: "'Cinzel', serif",
                background: isHidden ? 'linear-gradient(180deg, #6b21a8 0%, #3b0764 100%)' : '#1c120c',
                border: isHidden ? '1px solid #c084fc' : '1px solid #8a6d3b',
                color: isHidden ? '#f3e8ff' : '#e6d5b8'
              }}
              title="Oculta o revela esta ficha en la pantalla de los jugadores"
            >
              {isHidden ? 'Oculto' : 'Visible'}
            </button>

            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (onToggleFaction) onToggleFaction(token.id);
              }}
              style={{
                flex: 1,
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: '4px',
                fontWeight: 'bold',
                fontSize: '11px',
                fontFamily: "'Cinzel', serif",
                background: faction === 'enemy' ? 'linear-gradient(180deg, #991b1b 0%, #450a0a 100%)' : 'linear-gradient(180deg, #1e3a8a 0%, #172554 100%)',
                border: faction === 'enemy' ? '1px solid #f87171' : '1px solid #60a5fa',
                color: '#fff'
              }}
              title="Los Aliados iluminan la niebla; los Enemigos solo se ven cuando entran en el cono de visión de un Aliado"
            >
              {faction === 'enemy' ? 'Enemigo' : 'Aliado'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (onToggleName) onToggleName(token.id);
              }}
              className="vtt-brass-btn"
              style={{
                flex: 1,
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: '4px',
                fontWeight: 'bold',
                fontSize: '11px',
                borderColor: token.showName !== false ? '#fbbf24' : '#8a6d3b',
                color: token.showName !== false ? '#fbbf24' : '#b89f7d'
              }}
              title="Muestra u oculta la etiqueta con el nombre sobre la ficha en el tablero"
            >
              {token.showName !== false ? 'Ocultar Nombre' : 'Mostrar Nombre'}
            </button>

            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                if (onToggleLock) onToggleLock(token.id);
                setMenuState({ visible: false, x: 0, y: 0 });
              }}
              className="vtt-brass-btn"
              style={{
                flex: 1,
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: '4px',
                fontWeight: 'bold',
                fontSize: '11px'
              }}
            >
              {token.isLocked ? 'Desbloquear' : 'Bloquear'}
            </button>
          </div>

          {/* Selector de Tipo de Visión (Cono Direccional vs 360º) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', borderTop: '1px solid #4a331d', paddingTop: '8px' }}>
            <span className="vtt-gothic-title" style={{ fontSize: '11px', color: '#c5a059', textAlign: 'center' }}>
              Tipo de Visión
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (onUpdateVisionMode) onUpdateVisionMode(token.id, 'cone');
                }}
                style={{
                  flex: 1, padding: '5px 4px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer',
                  background: visionMode === 'cone' ? '#92400e' : '#1c120c',
                  border: visionMode === 'cone' ? '1px solid #fbbf24' : '1px solid #5c4028',
                  color: '#f3e5ab'
                }}
              >
                Cono 90º
              </button>
              <button
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (onUpdateVisionMode) onUpdateVisionMode(token.id, 'circle');
                }}
                style={{
                  flex: 1, padding: '5px 4px', fontSize: '11px', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer',
                  background: visionMode === 'circle' ? '#92400e' : '#1c120c',
                  border: visionMode === 'circle' ? '1px solid #fbbf24' : '1px solid #5c4028',
                  color: '#f3e5ab'
                }}
              >
                Visión 360º
              </button>
            </div>
          </div>

          {/* Brújula de Orientación Hacia Dónde Mira */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #4a331d', paddingTop: '8px' }}>
            <span className="vtt-gothic-title" style={{ fontSize: '11px', color: '#c5a059', textAlign: 'center' }}>
              Orientación ({Math.round(rotation)}º)
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '3px', width: '108px', margin: '0 auto' }}>
              {COMPASS_DIRS.map((dir, i) => (
                <button
                  key={i}
                  disabled={dir.angle === null}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    if (dir.angle !== null && onUpdateRotation) {
                      onUpdateRotation(token.id, dir.angle);
                    }
                  }}
                  style={{
                    height: '26px',
                    borderRadius: '4px',
                    border: dir.angle === rotation ? '1px solid #fbbf24' : '1px solid #5c4028',
                    background: dir.angle === null ? 'transparent' : (dir.angle === rotation ? '#92400e' : '#1c120c'),
                    color: '#f3e5ab',
                    cursor: dir.angle === null ? 'default' : 'pointer',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                >
                  {dir.label}
                </button>
              ))}
            </div>
            <input
              type="range"
              min="0" max="359"
              value={rotation}
              onChange={(e) => onUpdateRotation && onUpdateRotation(token.id, Number(e.target.value))}
              onPointerDown={(e) => e.stopPropagation()}
              style={{ width: '100%', accentColor: '#d4af37', cursor: 'pointer' }}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px solid #4a331d', paddingTop: '8px' }}>
            <span className="vtt-gothic-title" style={{ fontSize: '11px', color: '#c5a059', textAlign: 'center' }}>Escala de Ficha</span>
            <input 
              type="range" 
              min="20" max="250" 
              value={currentSize}
              onChange={(e) => {
                if (onUpdateSize) onUpdateSize(token.id, Number(e.target.value));
              }}
              onPointerDown={(e) => e.stopPropagation()} 
              style={{ width: '100%', accentColor: '#d4af37', cursor: 'pointer' }}
            />
          </div>

          <div style={{ borderTop: '1px solid #4a331d', paddingTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
            <span className="vtt-gothic-title" style={{ fontSize: '11px', color: '#c5a059', width: '100%', textAlign: 'center', marginBottom: '4px' }}>Condiciones</span>
            {customStatuses.map(status => {
              const isActive = activeStatuses.includes(status.id);
              return (
                <button
                  key={status.id}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    if (onToggleStatus) onToggleStatus(token.id, status.id);
                  }}
                  style={{
                    background: isActive ? '#92400e' : '#1c120c',
                    border: isActive ? '1px solid #fbbf24' : '1px solid #5c4028',
                    borderRadius: '4px',
                    padding: '4px 6px',
                    cursor: 'pointer',
                    fontSize: '15px'
                  }}
                  title={status.label}
                >
                  {status.icon}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default GameToken;