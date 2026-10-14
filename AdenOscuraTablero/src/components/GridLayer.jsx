import React from 'react';

const GridLayer = ({ snapToGrid, gridSize }) => {
  if (!snapToGrid) return null;

  // Garantizamos que el borde del div sea múltiplo exacto de gridSize para que (0,0) coincida siempre con una intersección
  const offset = Math.ceil(5000 / gridSize) * gridSize;

  return (
    <div style={{
      position: 'absolute',
      top: -offset,
      left: -offset,
      width: offset * 2,
      height: offset * 2,
      backgroundImage: `linear-gradient(rgba(255,255,255,0.28) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.28) 1px, transparent 1px)`,
      backgroundSize: `${gridSize}px ${gridSize}px`,
      backgroundPosition: '0 0',
      pointerEvents: 'none',
      zIndex: 1
    }} />
  );
};

export default GridLayer;