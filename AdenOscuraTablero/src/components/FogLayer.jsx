import React, { useEffect } from 'react';

const FogLayer = ({ fowEnabled, fowCanvasRef, fowActions }) => {
  useEffect(() => {
    const canvas = fowCanvasRef.current;
    if (!canvas || !fowEnabled) return;
    
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    fowActions.forEach(action => {
      ctx.beginPath();
      // El canvas empieza en -1000, así que hay que sumar 1000 a las coordenadas lógicas
      ctx.arc(action.x + 1000, action.y + 1000, action.radius, 0, Math.PI * 2);
      
      if (action.type === 'reveal') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fill();
      } else {
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fill();
      }
    });
    
    // Restauramos el modo normal de dibujo al terminar
    ctx.globalCompositeOperation = 'source-over';
  }, [fowActions, fowEnabled, fowCanvasRef]);

  if (!fowEnabled) return null;
  
  return (
    <canvas
      ref={fowCanvasRef}
      width={4000} height={4000}
      style={{ position: 'absolute', top: -1000, left: -1000, pointerEvents: 'none', zIndex: 5, opacity: 0.95 }}
    />
  );
};

export default FogLayer;