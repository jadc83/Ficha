import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const MapLayer = ({ maps, fowCanvasRef, fowEnabled = false, isPlayerView = false, onToggleDoor, onToggleWindow }) => {
  const [readingNote, setReadingNote] = useState(null);
  const [visibleElements, setVisibleElements] = useState({});
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, item: null });
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    if (contextMenu.visible) {
      document.addEventListener('pointerdown', handleClickOutside, true);
    }
    return () => document.removeEventListener('pointerdown', handleClickOutside, true);
  }, [contextMenu.visible]);

  // RADAR DE NIEBLA: Oculta notas, puertas y ventanas en la Vista de Jugador mientras estén bajo oscuridad cerrada
  useEffect(() => {
    if (!fowEnabled || !isPlayerView) return;

    const checkVisibility = () => {
      if (!fowCanvasRef || !fowCanvasRef.current) return;
      
      try {
        const ctx = fowCanvasRef.current.getContext('2d', { willReadFrequently: true });
        let changed = false;
        const newVis = { ...visibleElements };

        maps.forEach(element => {
          if (element.type === 'note' || element.type === 'door' || element.type === 'window') {
            const centerX = Math.round(element.x + ((element.width || 40) / 2) + 1000);
            const centerY = Math.round(element.y + ((element.height || 40) / 2) + 1000);
            const pixel = ctx.getImageData(centerX, centerY, 1, 1).data;
            // Visible si la niebla en ese punto ha sido despejada o está en penumbra explorada (alpha < 225)
            const isVisible = pixel[3] < 225;

            if (newVis[element.id] !== isVisible) {
              newVis[element.id] = isVisible;
              changed = true;
            }
          }
        });

        if (changed) {
          setVisibleElements(newVis);
        }
      } catch (error) {}
    };

    checkVisibility();
    const interval = setInterval(checkVisibility, 180);
    return () => clearInterval(interval);
  }, [maps, fowCanvasRef, fowEnabled, isPlayerView, visibleElements]);

  return (
    <>
      {maps.map((element) => {
        if (element.type === 'image' || !element.type) {
          return (
            <img
              key={element.id} src={element.src || element.url} alt="map"
              style={{
                position: 'absolute', left: `${element.x}px`, top: `${element.y}px`,
                width: `${element.width}px`, height: `${element.height}px`,
                pointerEvents: 'none', userSelect: 'none', WebkitUserDrag: 'none',
                boxShadow: '0 10px 30px rgba(0,0,0,0.75)', zIndex: 0
              }}
              draggable={false}
            />
          );
        }

        if (element.type === 'note') {
          if (isPlayerView && fowEnabled && !visibleElements[element.id]) {
            return null; 
          }

          return (
            <div
              key={element.id}
              onPointerDown={(e) => { 
                e.stopPropagation(); 
                setReadingNote(element); 
              }}
              style={{
                position: 'absolute', left: `${element.x}px`, top: `${element.y}px`,
                width: '40px', height: '40px',
                background: ' radial-gradient(circle, #f3e5ab 0%, #c5a059 100%)',
                borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', border: '2px solid #5c3a21', boxShadow: '0 4px 10px rgba(0,0,0,0.8)',
                fontSize: '22px', zIndex: 6
              }}
              title="Leer Pergamino"
            >
              📜
            </div>
          );
        }

        if (element.type === 'door') {
          if (isPlayerView && fowEnabled && !visibleElements[element.id]) {
            return null;
          }

          return (
            <div
              key={element.id}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isPlayerView) return;
                setContextMenu({ visible: true, x: e.clientX, y: e.clientY, item: element });
              }}
              onPointerDown={(e) => {
                if (e.button === 2 && !isPlayerView) e.stopPropagation();
              }}
              style={{
                position: 'absolute',
                left: `${element.x}px`,
                top: `${element.y}px`,
                width: `${element.width || 60}px`,
                height: `${element.height || 16}px`,
                background: element.isOpen
                  ? 'rgba(16, 185, 129, 0.22)'
                  : 'linear-gradient(90deg, #451a03 0%, #78350f 50%, #451a03 100%)',
                border: element.isOpen ? '2px dashed #34d399' : '2px solid #d4af37',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isPlayerView ? 'default' : 'context-menu',
                boxShadow: element.isOpen ? 'none' : '0 4px 12px rgba(0,0,0,0.85)',
                zIndex: 6,
                fontSize: '12px',
                transition: 'all 0.2s'
              }}
              title={element.isOpen ? 'Puerta Abierta (Clic derecho para cerrar)' : 'Puerta Cerrada (Bloquea paso y visión. Clic derecho para abrir)'}
            >
              {element.isOpen ? '🔓' : '🚪'}
            </div>
          );
        }

        if (element.type === 'window') {
          if (isPlayerView && fowEnabled && !visibleElements[element.id]) {
            return null;
          }

          return (
            <div
              key={element.id}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isPlayerView) return;
                setContextMenu({ visible: true, x: e.clientX, y: e.clientY, item: element });
              }}
              onPointerDown={(e) => {
                if (e.button === 2 && !isPlayerView) e.stopPropagation();
              }}
              style={{
                position: 'absolute',
                left: `${element.x}px`,
                top: `${element.y}px`,
                width: `${element.width || 60}px`,
                height: `${element.height || 14}px`,
                background: element.isOpen
                  ? 'rgba(56, 189, 248, 0.15)'
                  : 'linear-gradient(90deg, rgba(14, 116, 144, 0.75) 0%, rgba(186, 230, 253, 0.85) 50%, rgba(14, 116, 144, 0.75) 100%)',
                border: element.isOpen ? '2px dashed #7dd3fc' : '2px solid #38bdf8',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isPlayerView ? 'default' : 'context-menu',
                boxShadow: element.isOpen ? 'none' : '0 0 10px rgba(56, 189, 248, 0.45)',
                zIndex: 6,
                fontSize: '11px',
                transition: 'all 0.2s'
              }}
              title={element.isOpen ? 'Ventana Abierta / Rota (Permite paso)' : 'Ventana Cerrada (Permite visión, bloquea paso. Clic derecho para abrir/romper)'}
            >
              {element.isBroken ? '💥' : (element.isOpen ? '🌬️' : '🪟')}
            </div>
          );
        }

        return null;
      })}

      {/* GUÍA SUTIL DE PAREDES (Solo visible para el Master) */}
      {!isPlayerView && (
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '8000px', height: '8000px', overflow: 'visible', pointerEvents: 'none', zIndex: 4 }}>
          {maps.filter(el => el.type === 'wall').map(wall => (
            <line
              key={wall.id}
              x1={wall.x1} y1={wall.y1} x2={wall.x2} y2={wall.y2}
              stroke="rgba(220, 38, 38, 0.42)"
              strokeWidth={6}
              strokeDasharray="8,6"
              strokeLinecap="round"
            />
          ))}
        </svg>
      )}

      {}
      {contextMenu.visible && contextMenu.item && createPortal(
        <div
          ref={menuRef}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            background: 'linear-gradient(180deg, #261810 0%, #140c08 100%)',
            padding: '12px',
            borderRadius: '8px',
            border: '2px solid #8a6d3b',
            boxShadow: '0 12px 30px rgba(0,0,0,0.95)',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            minWidth: '175px',
            color: '#e6d5b8'
          }}
        >
          <div className="vtt-gothic-title" style={{ fontSize: '12px', color: '#d4af37', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #6b4c2b', paddingBottom: '5px' }}>
            {contextMenu.item.type === 'door' ? '🚪 Control de Puerta' : '🪟 Control de Ventana'}
          </div>

          {contextMenu.item.type === 'door' ? (
            <button
              onClick={() => {
                if (onToggleDoor) onToggleDoor(contextMenu.item.id);
                setContextMenu({ visible: false, x: 0, y: 0, item: null });
              }}
              className="vtt-brass-btn"
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px'
              }}
            >
              {contextMenu.item.isOpen ? '🔒 Cerrar Puerta' : '🔓 Abrir Puerta'}
            </button>
          ) : (
            <>
              <button
                onClick={() => {
                  if (onToggleWindow) onToggleWindow(contextMenu.item.id, false);
                  setContextMenu({ visible: false, x: 0, y: 0, item: null });
                }}
                className="vtt-brass-btn"
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '12px'
                }}
              >
                {contextMenu.item.isOpen ? '🔒 Cerrar Ventana' : '🔓 Abrir Ventana'}
              </button>
              {!contextMenu.item.isOpen && (
                <button
                  onClick={() => {
                    if (onToggleWindow) onToggleWindow(contextMenu.item.id, true);
                    setContextMenu({ visible: false, x: 0, y: 0, item: null });
                  }}
                  style={{
                    padding: '8px 12px',
                    fontFamily: "'Cinzel', serif",
                    background: 'linear-gradient(180deg, #991b1b 0%, #450a0a 100%)',
                    color: '#fecaca',
                    border: '1px solid #f87171',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    fontSize: '12px'
                  }}
                >
                  💥 Romper Cristal
                </button>
              )}
            </>
          )}
        </div>,
        document.body
      )}

      {/* MODAL DE LECTURA DE PERGAMINO ANTIGUO */}
      {readingNote && createPortal(
        <div 
          onPointerDown={(e) => {
             e.stopPropagation(); 
             setReadingNote(null);
          }}
          onWheel={(e) => e.stopPropagation()} 
          style={{ 
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 999999, 
            display: 'flex', justifyContent: 'center', alignItems: 'center' 
          }}
        >
          <div 
            onPointerDown={(e) => e.stopPropagation()} 
            style={{ 
              background: 'radial-gradient(circle, #f7ebd2 0%, #dcc196 100%)',
              padding: '34px',
              borderRadius: '8px', 
              width: '480px', maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto',
              color: '#3b2314',
              boxShadow: '0 25px 50px rgba(0,0,0,0.95), inset 0 0 35px rgba(120, 53, 15, 0.35)', 
              border: '4px double #5c3a21' 
            }}
          >
            <h2 className="vtt-gothic-title" style={{ margin: '0 0 15px 0', borderBottom: '2px solid #8a6d3b', paddingBottom: '10px', fontSize: '24px', color: '#451a03', textShadow: 'none' }}>
              📜 {readingNote.title}
            </h2>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7', margin: 0, fontSize: '18px', fontFamily: "'Crimson Text', Georgia, serif" }}>
              {readingNote.content}
            </p>
            <button 
              onClick={() => setReadingNote(null)} 
              className="vtt-brass-btn"
              style={{ marginTop: '24px', padding: '10px 22px', borderRadius: '6px', cursor: 'pointer', float: 'right', fontWeight: 'bold' }}
            >
              Cerrar Pergamino
            </button>
            <div style={{ clear: 'both' }}></div>
          </div>
        </div>,
        document.body 
      )}
    </>
  );
};

export default MapLayer;