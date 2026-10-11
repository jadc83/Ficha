import React, { useState } from 'react';

const GameToken = ({ token, isDragging, onPointerDown, onToggleLock, size = 50 }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleContextMenu = (e) => {
    e.preventDefault(); // Evita que salga el menú por defecto del navegador
    e.stopPropagation();
    setIsMenuOpen(true);
  };

  const handlePointerDown = (e) => {
    if (isMenuOpen) setIsMenuOpen(false); // Cierra el menú si se hace clic
    if (!token.isLocked) {
      onPointerDown(e, token);
    } else {
      e.stopPropagation(); // Evita que mueva el mapa si está bloqueado
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
        width: `${size}px`,
        height: `${size}px`,
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
      {/* Etiqueta con el nombre del personaje */}
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
        pointerEvents: 'none', /* Para que no estorbe al arrastrar el token */
        boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
      }}>
        {token.name}
      </div>

      {/* Menú contextual del token */}
      {isMenuOpen && (
        <div 
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            marginTop: '8px', backgroundColor: '#1f2937', padding: '8px', borderRadius: '6px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.5)', zIndex: 200
          }}
        >
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (onToggleLock) {
                onToggleLock(token.id);
              }
              setIsMenuOpen(false);
            }}
            style={{
              background: '#3b82f6', border: 'none', color: 'white',
              cursor: 'pointer', padding: '6px 12px', whiteSpace: 'nowrap',
              borderRadius: '4px', fontWeight: 'bold'
            }}
          >
            {token.isLocked ? '🔓 Desbloquear' : '🔒 Bloquear'}
          </button>
        </div>
      )}
    </div>
  );
};

export default GameToken;