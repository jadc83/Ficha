import React, { useState, useRef, useEffect } from 'react';

const MapCreator = ({ initialElements, onLoadMapToBoard }) => {
  const [elements, setElements] = useState(initialElements || []);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(0.8);
  
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [draggingElements, setDraggingElements] = useState(false);
  
  const [clipboard, setClipboard] = useState([]);
  
  // Estado para el editor de notas
  const [editingNote, setEditingNote] = useState(null); 

  const boardRef = useRef(null);
  const fileInputRef = useRef(null);
  const importRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Evitar que los atajos se disparen si estamos escribiendo en una nota
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
            id: Date.now() + Math.random(), // Nueva ID
            x: el.x + 50, // Desplazamiento para que no caiga exactamente encima
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

  const handleCreateNote = () => {
    const newNote = {
      id: Date.now(), type: 'note', title: 'Nueva Nota', content: 'Escribe aquí la pista o descripción...',
      x: -pan.x / scale + window.innerWidth / 2 / scale,
      y: -pan.y / scale + window.innerHeight / 2 / scale,
      width: 40, height: 40, zIndex: elements.length
    };
    setElements(prev => [...prev, newNote]);
    setEditingNote(newNote); // Abre el editor automáticamente
  };

  const handlePointerDown = (e) => {
    if (e.button === 1 || e.button === 2) {
      setIsDraggingPan(true);
      return;
    }
    // Clic en el fondo deselecciona todo
    setIsDraggingPan(true);
    setSelectedIds([]);
  };

  const handleElementPointerDown = (e, el) => {
    e.stopPropagation();
    if (e.button === 2) return; // Clic derecho reservado para menús futuros

    // Si pulsamos Shift o Ctrl, añadimos a la selección
    if (e.shiftKey || e.ctrlKey) {
      setSelectedIds(prev => prev.includes(el.id) ? prev.filter(id => id !== el.id) : [...prev, el.id]);
    } else {
      // Si el elemento no está seleccionado, seleccionamos solo este
      if (!selectedIds.includes(el.id)) {
        setSelectedIds([el.id]);
      }
    }
    setDraggingElements(true);
  };

  const handlePointerMove = (e) => {
    if (isDraggingPan && !draggingElements) {
      setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
      return;
    }

    if (draggingElements) {
      const dx = e.movementX / scale;
      const dy = e.movementY / scale;
      
      setElements(prev => prev.map(el => {
        if (selectedIds.includes(el.id)) {
          return { ...el, x: el.x + dx, y: el.y + dy };
        }
        return el;
      }));
    }
  };

  const handleWheel = (e) => {
    const zoomFactor = -e.deltaY * 0.001;
    setScale(prev => Math.min(Math.max(0.1, prev + zoomFactor), 5));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      {/* Barra superior de herramientas */}
      <div style={{ padding: '15px 20px', backgroundColor: '#1f2937', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />
          <button onClick={() => fileInputRef.current.click()} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>🖼️ Añadir Mapa</button>
          <button onClick={handleCreateNote} style={{ padding: '8px 16px', background: '#f59e0b', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>📝 Añadir Nota</button>
          
          <div style={{ width: '1px', backgroundColor: '#4b5563', margin: '0 5px' }}></div>
          <span style={{ display: 'flex', alignItems: 'center', color: '#9ca3af', fontSize: '14px' }}>Seleccionados: {selectedIds.length} (Usa Ctrl+C / Ctrl+V)</span>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => onLoadMapToBoard(elements)} style={{ padding: '8px 24px', background: '#10b981', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>🚀 Cargar a la Mesa</button>
        </div>
      </div>

      {/* Lienzo del Creador */}
      <div 
        ref={boardRef}
        onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} 
        onPointerUp={() => { setIsDraggingPan(false); setDraggingElements(false); }} 
        onPointerLeave={() => { setIsDraggingPan(false); setDraggingElements(false); }} 
        onWheel={handleWheel} onContextMenu={(e) => e.preventDefault()}
        style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: isDraggingPan ? 'grabbing' : 'crosshair', backgroundColor: '#000' }}
      >
        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: '0 0', position: 'absolute', width: '100%', height: '100%' }}>
          
          {elements.map((el) => {
            const isSelected = selectedIds.includes(el.id);
            const borderStyle = isSelected ? '3px solid #3b82f6' : 'none';

            if (el.type === 'image') {
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
            return null;
          })}
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