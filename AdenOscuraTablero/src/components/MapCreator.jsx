import React, { useState, useRef, useEffect } from 'react';

const MapCreator = ({ initialElements, onLoadMapToBoard }) => {
  const [elements, setElements] = useState(initialElements || []);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(0.8);
  
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [draggingElements, setDraggingElements] = useState(false);
  
  const [clipboard, setClipboard] = useState([]);
  const [editingNote, setEditingNote] = useState(null); 
  const [toolMode, setToolMode] = useState('select'); // 'select' | 'wall'
  const [drawingWall, setDrawingWall] = useState(null);

  const boardRef = useRef(null);
  const fileInputRef = useRef(null);
  const importRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (editingNote) return; 

      if (e.key === 'Delete' || e.key === 'Backspace') {
        setElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
        setSelectedIds([]);
      }
      
      if (e.ctrlKey && e.key === 'c') {
        const copied = elements.filter(el => selectedIds.includes(el.id));
        setClipboard(copied);
      }
      
      if (e.ctrlKey && e.key === 'v') {
        if (clipboard.length > 0) {
          const newElements = clipboard.map(el => ({
            ...el,
            id: Date.now() + Math.random(), 
            x: el.x + 50, 
            y: el.y + 50
          }));
          setElements(prev => [...prev, ...newElements]);
          setSelectedIds(newElements.map(el => el.id));
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIds, elements, clipboard, editingNote]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const newMap = {
            id: Date.now(), type: 'image', src: event.target.result,
            x: -pan.x / scale + window.innerWidth / 2 / scale - img.width / 2,
            y: -pan.y / scale + window.innerHeight / 2 / scale - img.height / 2,
            width: img.width, height: img.height, zIndex: elements.length
          };
          setElements(prev => [...prev, newMap]);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleExportMapConfig = () => {
    const blob = new Blob([JSON.stringify(elements)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'layout_mapa.json'; a.click();
  };

  const handleImportMapConfig = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try { 
        const importedData = JSON.parse(evt.target.result);
        if (Array.isArray(importedData)) {
          setElements(importedData);
        }
      } catch (err) {}
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleCreateNote = () => {
    const newNote = {
      id: Date.now(), type: 'note', title: 'Pergamino Antiguo', content: 'Escribe aquí la pista o inscripción...',
      x: -pan.x / scale + window.innerWidth / 2 / scale,
      y: -pan.y / scale + window.innerHeight / 2 / scale,
      width: 40, height: 40, zIndex: elements.length
    };
    setElements(prev => [...prev, newNote]);
    setEditingNote(newNote);
  };

  const handleCreateDoor = () => {
    const newDoor = {
      id: Date.now(),
      type: 'door',
      x: -pan.x / scale + window.innerWidth / 2 / scale,
      y: -pan.y / scale + window.innerHeight / 2 / scale,
      width: 60,
      height: 16,
      isOpen: false,
      zIndex: elements.length + 10
    };
    setElements(prev => [...prev, newDoor]);
  };

  const handleCreateWindow = () => {
    const newWindow = {
      id: Date.now(),
      type: 'window',
      x: -pan.x / scale + window.innerWidth / 2 / scale,
      y: -pan.y / scale + window.innerHeight / 2 / scale,
      width: 60,
      height: 14,
      isOpen: false,
      isBroken: false,
      zIndex: elements.length + 10
    };
    setElements(prev => [...prev, newWindow]);
  };

  const handlePointerDown = (e) => {
    if (e.button === 1 || e.button === 2) {
      setIsDraggingPan(true);
      return;
    }

    if (toolMode === 'wall' && e.button === 0) {
      const rect = boardRef.current.getBoundingClientRect();
      const logicalX = (e.clientX - rect.left - pan.x) / scale;
      const logicalY = (e.clientY - rect.top - pan.y) / scale;
      setDrawingWall({
        id: Date.now(),
        type: 'wall',
        x1: logicalX,
        y1: logicalY,
        x2: logicalX,
        y2: logicalY
      });
      return;
    }

    setIsDraggingPan(true);
    setSelectedIds([]);
  };

  const handleElementPointerDown = (e, el) => {
    if (toolMode === 'wall') return;
    e.stopPropagation();
    if (e.button === 2) return; 

    if (e.shiftKey || e.ctrlKey) {
      setSelectedIds(prev => prev.includes(el.id) ? prev.filter(id => id !== el.id) : [...prev, el.id]);
    } else {
      if (!selectedIds.includes(el.id)) {
        setSelectedIds([el.id]);
      }
    }
    setDraggingElements(true);
  };

  const handlePointerMove = (e) => {
    if (drawingWall) {
      const rect = boardRef.current.getBoundingClientRect();
      const logicalX = (e.clientX - rect.left - pan.x) / scale;
      const logicalY = (e.clientY - rect.top - pan.y) / scale;
      setDrawingWall(prev => ({ ...prev, x2: logicalX, y2: logicalY }));
      return;
    }

    if (isDraggingPan && !draggingElements) {
      setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
      return;
    }

    if (draggingElements) {
      const dx = e.movementX / scale;
      const dy = e.movementY / scale;
      
      setElements(prev => prev.map(el => {
        if (selectedIds.includes(el.id)) {
          if (el.type === 'wall') {
            return { ...el, x1: el.x1 + dx, y1: el.y1 + dy, x2: el.x2 + dx, y2: el.y2 + dy };
          }
          return { ...el, x: el.x + dx, y: el.y + dy };
        }
        return el;
      }));
    }
  };

  const handlePointerUp = () => {
    if (drawingWall) {
      const dist = Math.hypot(drawingWall.x2 - drawingWall.x1, drawingWall.y2 - drawingWall.y1);
      if (dist > 10) {
        setElements(prev => [...prev, drawingWall]);
      }
      setDrawingWall(null);
    }
    setIsDraggingPan(false);
    setDraggingElements(false);
  };

  const handleWheel = (e) => {
    const zoomFactor = -e.deltaY * 0.001;
    setScale(prev => Math.min(Math.max(0.1, prev + zoomFactor), 5));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      {/* Barra superior de herramientas estilo Gótico / Madera y Bronce */}
      <div style={{
        padding: '14px 20px',
        background: 'linear-gradient(180deg, #2b1b12 0%, #170f0a 100%)',
        borderBottom: '2px solid #8a6d3b',
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />
          <button onClick={() => fileInputRef.current.click()} className="vtt-brass-btn" style={{ padding: '8px 13px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>🖼️ Añadir Mapa</button>
          
          <button onClick={handleCreateNote} className="vtt-brass-btn" style={{ padding: '8px 13px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>📜 Añadir Nota</button>

          <button onClick={handleCreateDoor} className="vtt-brass-btn" style={{ padding: '8px 13px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }} title="Doble clic en la puerta para rotarla entre Horizontal y Vertical">🚪 Añadir Puerta</button>

          <button onClick={handleCreateWindow} className="vtt-brass-btn" style={{ padding: '8px 13px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }} title="Permite ver a través de ella aunque esté cerrada. Doble clic para rotar.">🪟 Añadir Ventana</button>

          <button
            onClick={() => setToolMode(toolMode === 'wall' ? 'select' : 'wall')}
            style={{
              padding: '8px 13px',
              fontFamily: "'Cinzel', serif",
              background: toolMode === 'wall' ? 'linear-gradient(180deg, #991b1b 0%, #450a0a 100%)' : 'linear-gradient(180deg, #3a2618 0%, #21150d 100%)',
              color: '#f3e5ab',
              borderRadius: '6px',
              border: toolMode === 'wall' ? '1px solid #f87171' : '1px solid #8a6d3b',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '12px'
            }}
          >
            🧱 {toolMode === 'wall' ? 'Trazando Muro (Clic para salir)' : 'Trazar Muro'}
          </button>
          
          <div style={{ width: '1px', backgroundColor: '#6b4c2b', margin: '0 4px', height: '24px' }}></div>
          
          <input type="file" accept=".json" ref={importRef} onChange={handleImportMapConfig} style={{ display: 'none' }} />
          <button onClick={() => importRef.current.click()} className="vtt-brass-btn" style={{ padding: '6px 11px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>📥 Importar</button>
          <button onClick={handleExportMapConfig} className="vtt-brass-btn" style={{ padding: '6px 11px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>📤 Exportar</button>

          <span style={{ display: 'flex', alignItems: 'center', color: '#c5a059', fontSize: '13px', marginLeft: '6px' }}>Seleccionados: {selectedIds.length}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => onLoadMapToBoard(elements)}
            className="vtt-gothic-title"
            style={{
              padding: '8px 22px',
              background: 'linear-gradient(180deg, #b45309 0%, #78350f 100%)',
              color: '#fffbeb',
              borderRadius: '6px',
              border: '1px solid #fbbf24',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '14px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.7)'
            }}
          >
            ⚜️ Enviar Escenario a la Mesa
          </button>
        </div>
      </div>

      {/* Lienzo del Creador */}
      <div 
        ref={boardRef}
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} 
        onPointerUp={handlePointerUp} 
        onPointerLeave={handlePointerUp} 
        onWheel={handleWheel} onContextMenu={(e) => e.preventDefault()}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: toolMode === 'wall' ? 'crosshair' : (isDraggingPan ? 'grabbing' : 'grab'), backgroundColor: '#080504' }}
      >
        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: '0 0', position: 'absolute', width: '100%', height: '100%' }}>
          
          {elements.map((el) => {
            const isSelected = selectedIds.includes(el.id);
            const borderStyle = isSelected ? '3px solid #fbbf24' : 'none';

            if (el.type === 'image' || !el.type) {
              return (
                <img 
                  key={el.id} src={el.src} alt="map" 
                  onPointerDown={(e) => handleElementPointerDown(e, el)} 
                  style={{ position: 'absolute', left: `${el.x}px`, top: `${el.y}px`, width: `${el.width}px`, height: `${el.height}px`, cursor: 'grab', border: borderStyle, boxSizing: 'border-box' }} 
                  draggable={false} 
                />
              );
            }

            if (el.type === 'note') {
              return (
                <div
                  key={el.id}
                  onPointerDown={(e) => handleElementPointerDown(e, el)}
                  onDoubleClick={(e) => { e.stopPropagation(); setEditingNote(el); }}
                  style={{
                    position: 'absolute', left: `${el.x}px`, top: `${el.y}px`,
                    width: '40px', height: '40px', backgroundColor: '#e6ccb2',
                    borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'grab', border: borderStyle || '2px solid #8a6d3b', boxShadow: '0 4px 10px rgba(0,0,0,0.7)',
                    fontSize: '22px', zIndex: 100
                  }}
                  title={el.title}
                >
                  📜
                </div>
              );
            }

            if (el.type === 'door') {
              return (
                <div
                  key={el.id}
                  onPointerDown={(e) => handleElementPointerDown(e, el)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setElements(prev => prev.map(item => item.id === el.id ? { ...item, width: item.height, height: item.width } : item));
                  }}
                  style={{
                    position: 'absolute',
                    left: `${el.x}px`,
                    top: `${el.y}px`,
                    width: `${el.width || 60}px`,
                    height: `${el.height || 16}px`,
                    backgroundColor: '#5c2d0c',
                    border: isSelected ? '3px solid #fbbf24' : '2px solid #d4af37',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'grab',
                    zIndex: 110,
                    boxShadow: '0 4px 8px rgba(0,0,0,0.75)',
                    fontSize: '12px'
                  }}
                  title="Puerta (Doble clic para rotar Horizontal/Vertical)"
                >
                  🚪
                </div>
              );
            }

            if (el.type === 'window') {
              return (
                <div
                  key={el.id}
                  onPointerDown={(e) => handleElementPointerDown(e, el)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    setElements(prev => prev.map(item => item.id === el.id ? { ...item, width: item.height, height: item.width } : item));
                  }}
                  style={{
                    position: 'absolute',
                    left: `${el.x}px`,
                    top: `${el.y}px`,
                    width: `${el.width || 60}px`,
                    height: `${el.height || 14}px`,
                    background: 'linear-gradient(90deg, rgba(56, 189, 248, 0.45), rgba(186, 230, 253, 0.75), rgba(56, 189, 248, 0.45))',
                    border: isSelected ? '3px solid #fbbf24' : '2px solid #7dd3fc',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'grab',
                    zIndex: 110,
                    boxShadow: '0 0 10px rgba(56, 189, 248, 0.4)',
                    fontSize: '11px'
                  }}
                  title="Ventana (Deja pasar la visión. Doble clic para rotar Horizontal/Vertical)"
                >
                  🪟
                </div>
              );
            }
            return null;
          })}

          {/* Capa SVG para dibujar y seleccionar Paredes */}
          <svg style={{ position: 'absolute', top: 0, left: 0, width: '8000px', height: '8000px', overflow: 'visible', pointerEvents: 'none', zIndex: 95 }}>
            {elements.filter(el => el.type === 'wall').map(wall => {
              const isSelected = selectedIds.includes(wall.id);
              return (
                <g key={wall.id} style={{ pointerEvents: 'stroke', cursor: 'pointer' }} onPointerDown={(e) => handleElementPointerDown(e, wall)}>
                  <line
                    x1={wall.x1} y1={wall.y1} x2={wall.x2} y2={wall.y2}
                    stroke={isSelected ? '#fbbf24' : '#dc2626'}
                    strokeWidth={10}
                    strokeLinecap="round"
                  />
                  <line
                    x1={wall.x1} y1={wall.y1} x2={wall.x2} y2={wall.y2}
                    stroke="#fca5a5"
                    strokeWidth={2}
                    strokeDasharray="6,6"
                  />
                </g>
              );
            })}
            {drawingWall && (
              <line
                x1={drawingWall.x1} y1={drawingWall.y1} x2={drawingWall.x2} y2={drawingWall.y2}
                stroke="#fbbf24"
                strokeWidth={8}
                strokeLinecap="round"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Modal Editor de Notas estilo Grimorio */}
      {editingNote && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div className="vtt-wood-panel" style={{ padding: '26px', borderRadius: '10px', width: '500px', display: 'flex', flexDirection: 'column', gap: '15px', border: '2px solid #8a6d3b' }}>
            <h3 className="vtt-gothic-title" style={{ margin: 0, color: '#d4af37' }}>📜 Redactar Pergamino</h3>
            <input 
              type="text" value={editingNote.title} 
              onChange={(e) => setEditingNote({...editingNote, title: e.target.value})}
              style={{ padding: '10px', fontSize: '18px', fontWeight: 'bold', backgroundColor: '#120b07', color: '#f3e5ab', border: '1px solid #8a6d3b', borderRadius: '6px', fontFamily: "'Cinzel', serif" }}
            />
            <textarea 
              value={editingNote.content}
              onChange={(e) => setEditingNote({...editingNote, content: e.target.value})}
              style={{ padding: '12px', height: '200px', backgroundColor: '#120b07', color: '#e6d5b8', border: '1px solid #8a6d3b', borderRadius: '6px', resize: 'none', fontFamily: "'Crimson Text', serif", fontSize: '16px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => {
                  setElements(elements.map(el => el.id === editingNote.id ? editingNote : el));
                  setEditingNote(null);
                }} 
                className="vtt-brass-btn"
                style={{ padding: '10px 22px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                ✒️ Sellar Pergamino
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapCreator;