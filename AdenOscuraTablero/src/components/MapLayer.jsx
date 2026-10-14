import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

const MapLayer = ({ maps, fowCanvasRef }) => {
  const [readingNote, setReadingNote] = useState(null);
  const [visibleNotes, setVisibleNotes] = useState({});

  // RADAR DE NIEBLA: Escanea 4 veces por segundo la visibilidad de las notas
  useEffect(() => {
    const checkVisibility = () => {
      if (!fowCanvasRef || !fowCanvasRef.current) return;
      
      try {
        // willReadFrequently optimiza el canvas para leer sus píxeles a alta velocidad
        const ctx = fowCanvasRef.current.getContext('2d', { willReadFrequently: true });
        let changed = false;
        const newVis = { ...visibleNotes };

        maps.forEach(element => {
          if (element.type === 'note') {
            // Buscamos el píxel central de la nota (+20px) ajustado al offset del canvas (+1000)
            const canvasX = element.x + 20 + 1000;
            const canvasY = element.y + 20 + 1000;
            const pixel = ctx.getImageData(canvasX, canvasY, 1, 1).data;
            
            // Si el alpha (opacidad) es menor a 128, significa que hemos borrado más del 50% de la niebla
            const isVisible = pixel[3] < 128; 

            if (newVis[element.id] !== isVisible) {
              newVis[element.id] = isVisible;
              changed = true;
            }
          }
        });

        // Solo repintamos React si alguna nota ha aparecido o desaparecido
        if (changed) {
          setVisibleNotes(newVis);
        }
      } catch (error) {
        // Ignoramos errores transitorios de lectura del canvas
      }
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
          // Si la niebla está encendida y el Radar ha dicho que la nota está a oscuras -> No la dibujamos
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
        return null;
      })}

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