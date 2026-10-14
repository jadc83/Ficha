import React, { useEffect, useRef } from 'react';

export const WEATHER_TYPES = [
  { id: 'none', label: 'Despejado', icon: '☀️' },
  { id: 'rain', label: 'Lluvia', icon: '🌧️' },
  { id: 'storm', label: 'Tormenta Eléctrica', icon: '⛈️' },
  { id: 'snow', label: 'Ventisca / Nieve', icon: '❄️' },
  { id: 'ash', label: 'Ceniza y Brasas', icon: '🌋' },
  { id: 'spores', label: 'Esporas Arcanas', icon: '✨' },
  { id: 'mist', label: 'Niebla Rastrera', icon: '🌫️' }
];

export const AMBIENT_TINTS = [
  { id: 'none', label: 'Luz Natural', color: 'transparent', blend: 'normal' },
  { id: 'torch', label: 'Antorcha Cálida', color: 'rgba(217, 119, 6, 0.18)', blend: 'multiply' },
  { id: 'night', label: 'Noche Cerrada', color: 'rgba(15, 23, 42, 0.48)', blend: 'multiply' },
  { id: 'blood', label: 'Ritual Carmesí', color: 'rgba(127, 29, 29, 0.34)', blend: 'multiply' },
  { id: 'crypt', label: 'Cripta Espectral', color: 'rgba(6, 78, 59, 0.28)', blend: 'multiply' }
];

const WeatherOverlay = ({ weather = 'none', ambientTint = 'none' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || weather === 'none') return;

    const ctx = canvas.getContext('2d');
    let animId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const count =
      weather === 'rain' || weather === 'storm'
        ? 170
        : weather === 'mist'
        ? 28
        : 95;

    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 3 + 1.2,
      vx:
        weather === 'rain' || weather === 'storm'
          ? -3.5
          : (Math.random() - 0.5) * 0.9,
      vy:
        weather === 'rain' || weather === 'storm'
          ? Math.random() * 10 + 15
          : weather === 'ash'
          ? -(Math.random() * 1.3 + 0.5)
          : weather === 'spores'
          ? (Math.random() - 0.5) * 0.6
          : Math.random() * 1.6 + 0.7,
      alpha: Math.random() * 0.65 + 0.2,
      phase: Math.random() * Math.PI * 2
    }));

    let flashAlpha = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      if (weather === 'storm') {
        if (Math.random() < 0.004 && flashAlpha <= 0.02) {
          flashAlpha = 0.75;
        }
        if (flashAlpha > 0) {
          ctx.fillStyle = `rgba(235, 245, 255, ${flashAlpha})`;
          ctx.fillRect(0, 0, width, height);
          flashAlpha *= 0.86;
          if (flashAlpha < 0.01) flashAlpha = 0;
        }
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.phase += 0.025;

        if (weather === 'rain' || weather === 'storm') {
          ctx.strokeStyle = `rgba(186, 230, 253, ${p.alpha * 0.65})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.vx * 1.7, p.y + p.vy * 1.7);
          ctx.stroke();
        } else if (weather === 'snow') {
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
          p.x += Math.sin(p.phase) * 0.6;
        } else if (weather === 'ash') {
          const isEmber = i % 4 === 0;
          ctx.fillStyle = isEmber
            ? `rgba(251, 146, 60, ${p.alpha})`
            : `rgba(168, 162, 158, ${p.alpha * 0.75})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, isEmber ? p.r * 0.9 : p.r * 0.7, 0, Math.PI * 2);
          ctx.fill();
          p.x += Math.sin(p.phase) * 0.8;
        } else if (weather === 'spores') {
          const pulse = (Math.sin(p.phase * 1.5) + 1) * 0.5;
          ctx.fillStyle =
            i % 2 === 0
              ? `rgba(167, 243, 208, ${p.alpha * pulse})`
              : `rgba(253, 230, 138, ${p.alpha * pulse})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 0.95, 0, Math.PI * 2);
          ctx.fill();
          p.x += Math.cos(p.phase) * 0.35;
          p.y += Math.sin(p.phase) * 0.35;
        } else if (weather === 'mist') {
          const radius = 190 + (i % 5) * 55;
          const grad = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, radius);
          grad.addColorStop(0, `rgba(226, 232, 240, ${p.alpha * 0.14})`);
          grad.addColorStop(1, 'rgba(226, 232, 240, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.fill();
          p.x += 0.45;
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.y > height + 40) {
          p.y = -20;
          p.x = Math.random() * width;
        } else if (p.y < -40) {
          p.y = height + 20;
          p.x = Math.random() * width;
        }
        if (p.x > width + 200) p.x = -200;
        if (p.x < -200) p.x = width + 200;
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [weather]);

  const tintObj = AMBIENT_TINTS.find(t => t.id === ambientTint) || AMBIENT_TINTS[0];

  return (
    <>
      {ambientTint !== 'none' && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: tintObj.color,
            mixBlendMode: tintObj.blend,
            pointerEvents: 'none',
            zIndex: 18,
            transition: 'background-color 0.6s ease'
          }}
        />
      )}
      {weather !== 'none' && (
        <canvas
          ref={canvasRef}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 19
          }}
        />
      )}
    </>
  );
};

export default WeatherOverlay;