import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const MapLayer = ({ maps, fowCanvasRef, isPlayerView = false, onToggleDoor }) => {
  const [readingNote, setReadingNote] = useState(null);
  const [visibleNotes, setVisibleNotes] = useState({});
  const [doorMenu, setDoorMenu] = useState({ visible: false, x: 0, y: 0, door: null });
  const doorMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (doorMenuRef.current && !doorMenuRef.current.contains(e.target)) {
        setDoorMenu(prev => ({ ...prev, visible: false }));
      }
    };
    if (doorMenu.visible) {
      document.addEventListener('pointerdown', handleClickOutside, true);
    }
    return () => document.removeEventListener('pointerdown', handleClickOutside, true);
  }, [doorMenu.visible]);

  // RADAR DE NIEBLA: Escanea 4 veces por segundo la visibilidad de las notas y puertas
  useEffect(() => {
    const checkVisibility = () => {
      if (!fowCanvasRef || !fowCanvasRef.current) return;
      
      try {
        const ctx = fowCanvasRef.current.getContext('2d', { willReadFrequently: true });
        let changed = false;
        const newVis = { ...visibleNotes };

        maps.forEach(element => {
          if (element.type === 'note' || element.type === 'door') {
            const centerX = element.x + ((element.width || 40) / 2) + 1000;
            const centerY = element.y + ((element.height || 40) / 2) + 1000;
            const pixel = ctx.getImageData(centerX, centerY, 1, 1).data;
            const isVisible = pixel[3] < 128; 

            if (newVis[element.id] !== isVisible) {
              newVis[element.id] = isVisible;
              changed = true;
            }
          }
        });

        if (changed) {
          setVisibleNotes(newVis);
        }
      } catch (error) {}
    };

    const interval = setInterval(checkVisibility, 250);
    return () => clearInterval(interval);
  }, [maps, fowCanvasRef, visibleNotes]);

  return (
    <>
      {maps.map((element) => {
        // RENDERIZAR IMÁGENES DE MAPA (Intangibles)
        if (element.type === 'image' || !element.type) {
          return (
            <img
              key={element.id} src={element.src || element.url} alt="map"
              style={{
                position: 'absolute', left: `${element.x}px`, top: `${element.y}px`,
                width: `${element.width}px`, height: `${element.height}px`,
                pointerEvents: 'none', userSelect: 'none', WebkitUserDrag: 'none',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 0
              }}
              draggable={false}
            />
          );
        }

        // RENDERIZAR NOTAS (Tangibles)
        if (element.type === 'note') {
          if (fowCanvasRef && fowCanvasRef.current && visibleNotes[element.id] === false) {
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
                width: '40px', height: '40px', backgroundColor: '#fcd34d',
                borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', border: '2px solid #b45309', boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
                fontSize: '24px', zIndex: 2
              }}
              title="Leer Nota"
            >
              📜
            </div>
          );
        }

        // RENDERIZAR PUERTAS INTERACTIVAS
        if (element.type === 'door') {
          if (fowCanvasRef && fowCanvasRef.current && visibleNotes[element.id] === false) {
            return null;
          }

          return (
            <div
              key={element.id}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isPlayerView) return;
                setDoorMenu({ visible: true, x: e.clientX, y: e.clientY, door: element });
              }}
              onPointerDown={(e) => {
                if (e.button === 2 && !isPlayerView) {
                  e.stopPropagation();
                }
              }}
              style={{
                position: 'absolute',
                left: `${element.x}px`,
                top: `${element.y}px`,
                width: `${element.width || 60}px`,
                height: `${element.height || 16}px`,
                backgroundColor: element.isOpen ? 'rgba(16, 185, 129, 0.25)' : '#78350f',
                border: element.isOpen ? '2px dashed #10b981' : '2px solid #f59e0b',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: isPlayerView ? 'default' : 'context-menu',
                boxShadow: element.isOpen ? 'none' : '0 4px 10px rgba(0,0,0,0.75)',
                zIndex: 3,
                fontSize: '12px',
                transition: 'all 0.2s'
              }}
              title={element.isOpen ? 'Puerta Abierta (Clic derecho para cerrar)' : 'Puerta Cerrada (Clic derecho para abrir)'}
            >
              {element.isOpen ? '🔓' : '🚪'}
            </div>
          );
        }

        return null;
      })}

      {/* GUÍA SUTIL DE PAREDES (Solo visible para el Master, invisible para jugadores) */}
      {!isPlayerView && (
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '8000px', height: '8000px', overflow: 'visible', pointerEvents: 'none', zIndex: 4 }}>
          {maps.filter(el => el.type === 'wall').map(wall => (
            <line
              key={wall.id}
              x1={wall.x1} y1={wall.y1} x2={wall.x2} y2={wall.y2}
              stroke="rgba(239, 68, 68, 0.45)"
              strokeWidth={6}
              strokeDasharray="8,6"
              strokeLinecap="round"
            />
          ))}
        </svg>
      )}

      {/* MENÚ CONTEXTUAL DE PUERTA (Clic derecho -> Abrir / Cerrar) */}
      {doorMenu.visible && doorMenu.door && createPortal(
        <div
          ref={doorMenuRef}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: `${doorMenu.y}px`,
            left: `${doorMenu.x}px`,
            backgroundColor: '#1f2937',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #374151',
            boxShadow: '0 10px 25px rgba(0,0,0,0.85)',
            zIndex: 999999,
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            minWidth: '150px'
          }}
        >
          <div style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 'bold', textAlign: 'center', borderBottom: '1px solid #374151', paddingBottom: '4px' }}>
            Control de Puerta
          </div>
          <button
            onClick={() => {
              if (onToggleDoor) onToggleDoor(doorMenu.door.id);
              setDoorMenu({ visible: false, x: 0, y: 0, door: null });
            }}
            style={{
              padding: '8px 12px',
              backgroundColor: doorMenu.door.isOpen ? '#ef4444' : '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            {doorMenu.door.isOpen ? '🔒 Cerrar Puerta' : '🔓 Abrir'}
          </button>
        </div>,
        document.body
      )}

      {/* MODAL DE LECTURA EN LA MESA (A través de un Portal) */}
      {readingNote && createPortal(
        <div 
          onPointerDown={(e) => {
             e.stopPropagation(); 
             setReadingNote(null);
          }}
          onWheel={(e) => e.stopPropagation()} 
          style={{ 
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', 
            backgroundColor: 'rgba(0,0,0,0.7)', zIndex: 999999, 
            display: 'flex', justifyContent: 'center', alignItems: 'center' 
          }}
        >
          <div 
            onPointerDown={(e) => e.stopPropagation()} 
            style={{ 
              backgroundColor: '#fef3c7', padding: '30px', borderRadius: '8px', 
              width: '450px', maxWidth: '90%', maxHeight: '80vh', overflowY: 'auto',
              color: '#92400e', boxShadow: '0 20px 40px rgba(0,0,0,0.8)', 
              border: '2px solid #b45309' 
            }}
          >
            <h2 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #d97706', paddingBottom: '10px', fontSize: '24px' }}>
              {readingNote.title}
            </h2>
            <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', margin: 0, fontSize: '16px', fontFamily: 'serif' }}>
              {readingNote.content}
            </p>
            <button 
              onClick={() => setReadingNote(null)} 
              style={{ marginTop: '20px', padding: '10px 20px', background: '#d97706', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', float: 'right', fontWeight: 'bold' }}
            >
              Cerrar Papiro
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