import React, { useEffect } from 'react';

const FogLayer = ({ fowEnabled, fowCanvasRef, fowActions }) => {
  useEffect(() => {
    const canvas = fowCanvasRef.current;
    if (!canvas || !fowEnabled) return;
    
    const ctx = canvas.getContext('2d');
    
    // Limpiamos el canvas antes de dibujar el estado actual
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Fondo de niebla 100% negro opaco
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    fowActions.forEach(action => {
      ctx.beginPath();
      ctx.arc(action.x + 1000, action.y + 1000, action.radius, 0, Math.PI * 2);
      
      if (action.type === 'reveal') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fill();
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        ctx.fill();
      }
    });
    
    ctx.globalCompositeOperation = 'source-over';
  }, [fowActions, fowEnabled, fowCanvasRef]);

  if (!fowEnabled) return null;
  
  return (
    <canvas
      ref={fowCanvasRef}
      width={4000} height={4000}
      // Opacidad del elemento web al 100% para que sea negro total
      style={{ position: 'absolute', top: -1000, left: -1000, pointerEvents: 'none', zIndex: 5, opacity: 1 }}
    />
  );
};

export default FogLayer;