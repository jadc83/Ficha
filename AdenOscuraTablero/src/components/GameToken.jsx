import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const GameToken = ({ token, isDragging, onPointerDown, onToggleLock, onUpdateSize, onToggleStatus, showNames, customStatuses }) => {
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
    if (e.button !== 0) return;
    e.preventDefault();
    if (menuState.visible) setMenuState({ visible: false, x: 0, y: 0 });
    
    if (!token.isLocked) {
      onPointerDown(e, token);
    }
  };

  return (
    <div
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      onDragStart={(e) => e.preventDefault()}
      style={{
        position: 'absolute',
        left: `${token.x}px`,
        top: `${token.y}px`,
        width: `${currentSize}px`,
        height: `${currentSize}px`,
        backgroundColor: token.color,
        borderRadius: '50%',
        cursor: token.isLocked ? 'not-allowed' : (isDragging ? 'grabbing' : 'grab'),
        boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
        border: token.isLocked
          ? '3px solid #ef4444'
          : token.avatar
          ? `3px solid ${token.color}`
          : '2px solid rgba(255,255,255,0.2)',
        zIndex: isDragging ? 100 : 10,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'none'
      }}
    >
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