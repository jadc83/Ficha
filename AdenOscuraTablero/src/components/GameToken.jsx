import React from 'react';

const GameToken = ({ token, isDragging, onPointerDown, size = 50 }) => {
  return (
    <div
      onPointerDown={(e) => onPointerDown(e, token)}
      style={{
        position: 'absolute',
        /* Añadimos 'px' explícitamente a las coordenadas para evitar fallos de CSS */
        left: `${token.x}px`,
        top: `${token.y}px`,
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: token.color,
        borderRadius: '50%',
        cursor: isDragging ? 'grabbing' : 'grab',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        border: '2px solid rgba(255,255,255,0.2)',
        zIndex: isDragging ? 100 : 1
      }}
    />
  );
};

export default GameToken;