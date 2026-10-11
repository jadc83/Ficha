import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const GameToken = ({ token, isDragging, onPointerDown, onToggleLock, onUpdateSize, showNames }) => {
  const [menuState, setMenuState] = useState({ visible: false, x: 0, y: 0 });
  const menuRef = useRef(null);
  const currentSize = token.size || 50;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuState(prev => ({ ...prev, visible: false }));
      }
    };

    if (menuState.visible) {
      document.addEventListener('pointerdown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
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
      onPointerDown(e, token);
    } else {
      e.stopPropagation();
    }
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
      {/* Etiqueta flotante con el nombre */}
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

      {}
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
            zIndex: 999999, /* Un z-index masivo asegurado por el portal */
            display: 'flex', 
            flexDirection: 'column', 
            gap: '10px'
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
              style={{ width: '120px', cursor: 'pointer' }}
            />
          </div>
        </div>,
        document.body // El destino final del Portal
      )}
    </div>
  );
};

export default GameToken;