import React from 'react';

const GridLayer = ({ snapToGrid, gridSize }) => {
  if (!snapToGrid) return null;
  
  return (
    <div style={{
      position: 'absolute', top: -5000, left: -5000, width: 10000, height: 10000,
      backgroundImage: `linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)`,
      backgroundSize: `${gridSize}px ${gridSize}px`, pointerEvents: 'none', zIndex: 1
    }}/>
  );
};

export default GridLayer;