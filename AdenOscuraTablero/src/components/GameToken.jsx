import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const AVAILABLE_STATUSES = [
  { id: 'wound_light', icon: '🩹', label: 'Herido Leve' },
  { id: 'wound_severe', icon: '🩸', label: 'Herido Grave' },
  { id: 'dead', icon: '💀', label: 'Caído/Muerto' },
  { id: 'asleep', icon: '💤', label: 'Dormido' },
  { id: 'defending', icon: '🛡️', label: 'Defendiendo' },
  { id: 'burning', icon: '🔥', label: 'Ardiendo' },
  { id: 'frozen', icon: '❄️', label: 'Congelado' },
  { id: 'poisoned', icon: '🤢', label: 'Envenenado' }
];

const GameToken = ({ token, isDragging, onPointerDown, onToggleLock, onUpdateSize, onToggleStatus, showNames }) => {
  const [menuState, setMenuState] = useState({ visible: false, x: 0, y: 0 });
  const menuRef = useRef(null);
  const currentSize = token.size || 50;
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

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuState({ visible: true, x: e.clientX, y: e.clientY });
  };

  const handlePointerDown = (e) => {
    if (menuState.visible) setMenuState({ visible: false, x: 0, y: 0 });
    
    if (!token.isLocked) {
      // Si NO está bloqueado, le pasamos el clic a App.jsx para que lo arrastre.
      onPointerDown(e, token);
    }
    // NOTA CLAVE: Si ESTÁ bloqueado, NO hacemos e.stopPropagation().
    // Esto permite que el clic atraviese el token y llegue al tablero, 
    // permitiendo al Master mover la cámara incluso pinchando sobre este token.
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      style={{
        position: 'absolute',
        left: `${token.x}px`,
        top: `${token.y}px`,
        width: `${currentSize}px`,
        height: `${currentSize}px`,
        backgroundColor: token.color,
        borderRadius: '50%',
        cursor: token.isLocked ? 'not-allowed' : (isDragging ? 'grabbing' : 'grab'),
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        border: token.isLocked ? '2px solid #ef4444' : '2px solid rgba(255,255,255,0.2)',
        zIndex: isDragging ? 100 : 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {showNames && (
        <div style={{
          position: 'absolute',
          top: '-25px',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}>
          {token.name}
        </div>
      )}

      {/* Renderizado de Iconos de Estado */}
      {activeStatuses.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '-20px',
          display: 'flex',
          gap: '2px',
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.6)',
          padding: '2px 4px',
          borderRadius: '8px',
          pointerEvents: 'none',
          whiteSpace: 'nowrap'
        }}>
          {activeStatuses.map(statusId => {
            const s = AVAILABLE_STATUSES.find(st => st.id === statusId);
            return s ? <span key={statusId} title={s.label} style={{ fontSize: '14px', filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.8))' }}>{s.icon}</span> : null;
          })}
        </div>
      )}

      {menuState.visible && createPortal(
        <div 
          ref={menuRef}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed', 
            top: `${menuState.y}px`, 
            left: `${menuState.x}px`,
            backgroundColor: '#1f2937', 
            padding: '12px', 
            borderRadius: '6px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.8)', 
            zIndex: 999999, 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px',
            width: '160px'
          }}
        >
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (onToggleLock) {
                onToggleLock(token.id);
              }
              setMenuState({ visible: false, x: 0, y: 0 });
            }}
            style={{
              background: '#3b82f6', border: 'none', color: 'white',
              cursor: 'pointer', padding: '6px 12px', whiteSpace: 'nowrap',
              borderRadius: '4px', fontWeight: 'bold'
            }}
          >
            {token.isLocked ? '🔓 Desbloquear' : '🔒 Bloquear'}
          </button>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 'bold', textAlign: 'center' }}>Tamaño</span>
            <input 
              type="range" 
              min="20" max="250" 
              value={currentSize}
              onChange={(e) => {
                if (onUpdateSize) {
                  onUpdateSize(token.id, Number(e.target.value));
                }
              }}
              onPointerDown={(e) => e.stopPropagation()} 
              style={{ width: '100%', cursor: 'pointer' }}
            />
          </div>

          <div style={{ borderTop: '1px solid #4b5563', paddingTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
            <span style={{ fontSize: '11px', color: '#9ca3af', width: '100%', textAlign: 'center', marginBottom: '4px', fontWeight: 'bold' }}>Estados</span>
            {AVAILABLE_STATUSES.map(status => {
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
                    background: isActive ? '#3b82f6' : '#374151',
                    border: isActive ? '1px solid #60a5fa' : '1px solid #4b5563',
                    borderRadius: '4px',
                    padding: '4px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    transition: 'all 0.1s'
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