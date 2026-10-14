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
  const importRef = useRef(null); // Ref para importar layouts

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
        } else {
          alert("El archivo no tiene el formato correcto.");
        }
      } catch (err) { alert("Archivo inválido."); }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handleCreateNote = () => {
    const newNote = {
      id: Date.now(), type: 'note', title: 'Nueva Nota', content: 'Escribe aquí la pista o descripción...',
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
      
      {/* Barra superior de herramientas */}
      <div style={{ padding: '15px 20px', backgroundColor: '#1f2937', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />
          <button onClick={() => fileInputRef.current.click()} style={{ padding: '8px 14px', background: '#3b82f6', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>🖼️ Añadir Mapa</button>
          
          <button onClick={handleCreateNote} style={{ padding: '8px 14px', background: '#f59e0b', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>📝 Añadir Nota</button>

          <button onClick={handleCreateDoor} style={{ padding: '8px 14px', background: '#8b5cf6', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }} title="Doble clic en la puerta para rotarla entre Horizontal y Vertical">🚪 Añadir Puerta</button>

          <button
            onClick={() => setToolMode(toolMode === 'wall' ? 'select' : 'wall')}
            style={{
              padding: '8px 14px',
              background: toolMode === 'wall' ? '#ef4444' : '#374151',
              color: 'white',
              borderRadius: '6px',
              border: toolMode === 'wall' ? '2px solid #fca5a5' : '1px solid #4b5563',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            🧱 {toolMode === 'wall' ? 'Trazando Pared (Clic para salir)' : 'Trazar Pared'}
          </button>
          
          <div style={{ width: '1px', backgroundColor: '#4b5563', margin: '0 5px', height: '24px' }}></div>
          
          <input type="file" accept=".json" ref={importRef} onChange={handleImportMapConfig} style={{ display: 'none' }} />
          <button onClick={() => importRef.current.click()} style={{ padding: '6px 12px', background: '#4b5563', color: 'white', borderRadius: '6px', border: '1px solid #6b7280', cursor: 'pointer' }}>📥 Importar Escenario</button>
          <button onClick={handleExportMapConfig} style={{ padding: '6px 12px', background: '#4b5563', color: 'white', borderRadius: '6px', border: '1px solid #6b7280', cursor: 'pointer' }}>📤 Exportar Escenario</button>

          <div style={{ width: '1px', backgroundColor: '#4b5563', margin: '0 5px', height: '24px' }}></div>
          <span style={{ display: 'flex', alignItems: 'center', color: '#9ca3af', fontSize: '13px' }}>Seleccionados: {selectedIds.length}</span>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => onLoadMapToBoard(elements)} style={{ padding: '8px 24px', background: '#10b981', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>🚀 Enviar a la Mesa</button>
        </div>
      </div>

      {/* Lienzo del Creador */}
      <div 
        ref={boardRef}
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} 
        onPointerUp={handlePointerUp} 
        onPointerLeave={handlePointerUp} 
        onWheel={handleWheel} onContextMenu={(e) => e.preventDefault()}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: toolMode === 'wall' ? 'crosshair' : (isDraggingPan ? 'grabbing' : 'grab'), backgroundColor: '#000' }}
      >
        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: '0 0', position: 'absolute', width: '100%', height: '100%' }}>
          
          {elements.map((el) => {
            const isSelected = selectedIds.includes(el.id);
            const borderStyle = isSelected ? '3px solid #3b82f6' : 'none';

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
                    width: '40px', height: '40px', backgroundColor: '#fcd34d',
                    borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'grab', border: borderStyle || '2px solid #b45309', boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                    fontSize: '24px', zIndex: 100
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
                    // Rotar orientación de la puerta (Horizontal <-> Vertical)
                    setElements(prev => prev.map(item => item.id === el.id ? { ...item, width: item.height, height: item.width } : item));
                  }}
                  style={{
                    position: 'absolute',
                    left: `${el.x}px`,
                    top: `${el.y}px`,
                    width: `${el.width || 60}px`,
                    height: `${el.height || 16}px`,
                    backgroundColor: '#92400e',
                    border: isSelected ? '3px solid #3b82f6' : '2px solid #f59e0b',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'grab',
                    zIndex: 110,
                    boxShadow: '0 4px 8px rgba(0,0,0,0.6)',
                    fontSize: '12px'
                  }}
                  title="Puerta (Doble clic para rotar Horizontal/Vertical)"
                >
                  🚪
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
                    stroke={isSelected ? '#3b82f6' : '#ef4444'}
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

      {/* Modal Editor de Notas */}
      {editingNote && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
          <div style={{ backgroundColor: '#1f2937', padding: '24px', borderRadius: '8px', width: '500px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="text" value={editingNote.title} 
              onChange={(e) => setEditingNote({...editingNote, title: e.target.value})}
              style={{ padding: '10px', fontSize: '18px', fontWeight: 'bold', backgroundColor: '#111827', color: 'white', border: '1px solid #374151', borderRadius: '4px' }}
            />
            <textarea 
              value={editingNote.content}
              onChange={(e) => setEditingNote({...editingNote, content: e.target.value})}
              style={{ padding: '10px', height: '200px', backgroundColor: '#111827', color: 'white', border: '1px solid #374151', borderRadius: '4px', resize: 'none' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                onClick={() => {
                  setElements(elements.map(el => el.id === editingNote.id ? editingNote : el));
                  setEditingNote(null);
                }} 
                style={{ padding: '10px 20px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Guardar Nota
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapCreator;