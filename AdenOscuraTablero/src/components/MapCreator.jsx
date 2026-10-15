import React, { useState, useRef, useEffect } from 'react';

export const OBJECT_PRESETS = [
  { presetId: 'chest', label: 'Cofre del Tesoro', icon: '📦', openIcon: '🪙', blocksMovement: true, blocksVision: false, interactable: true },
  { presetId: 'lever', label: 'Palanca / Mecanismo', icon: '🕹️', openIcon: '⚙️', blocksMovement: false, blocksVision: false, interactable: true },
  { presetId: 'barricade', label: 'Barricada Pesada', icon: '🚧', openIcon: '🪵', blocksMovement: true, blocksVision: true, interactable: true },
  { presetId: 'altar', label: 'Altar Arcano', icon: '⛩️', openIcon: '✨', blocksMovement: true, blocksVision: false, interactable: true },
  { presetId: 'trap', label: 'Trampa de Suelo', icon: '🕸️', openIcon: '💥', blocksMovement: false, blocksVision: false, interactable: true }
];

export const LIGHT_PRESETS = [
  { presetId: 'torch', label: 'Antorcha de Pared', icon: '🔥', radius: 210, color: 'rgba(251, 146, 60, 0.22)' },
  { presetId: 'brazier', label: 'Brasero Real', icon: '🏮', radius: 300, color: 'rgba(245, 158, 11, 0.26)' },
  { presetId: 'arcane_lantern', label: 'Farol Espectral', icon: '🔮', radius: 240, color: 'rgba(56, 189, 248, 0.24)' }
];

const MapCreator = ({ initialElements, onLoadMapToBoard, onClose, onReturnToSettings }) => {
  const [elements, setElements] = useState(initialElements || []);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(0.8);
  
  const [isDraggingPan, setIsDraggingPan] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [draggingElements, setDraggingElements] = useState(false);
  
  const [clipboard, setClipboard] = useState([]);
  const [editingNote, setEditingNote] = useState(null); 
  const [editingObject, setEditingObject] = useState(null);
  const [editingLight, setEditingLight] = useState(null);
  const [toolMode, setToolMode] = useState('select'); // 'select' | 'wall'
  const [drawingWall, setDrawingWall] = useState(null);

  const boardRef = useRef(null);
  const fileInputRef = useRef(null);
  const importRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (editingNote || editingObject || editingLight) return; 

      if (e.key === 'Delete' || e.key === 'Backspace') {
        setElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
        setSelectedIds([]);
      }

      if (e.key === 'Escape') {
        setToolMode('select');
        setDrawingWall(null);
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
  }, [selectedIds, elements, clipboard, editingNote, editingObject, editingLight]);

  const getViewportCenter = () => ({
    x: -pan.x / scale + window.innerWidth / 2 / scale,
    y: -pan.y / scale + window.innerHeight / 2 / scale
  });

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const center = getViewportCenter();
          const newMap = {
            id: Date.now(), type: 'image', src: event.target.result,
            x: center.x - img.width / 2,
            y: center.y - img.height / 2,
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
    const center = getViewportCenter();
    const newNote = {
      id: Date.now(), type: 'note', title: 'Pergamino Antiguo', content: 'Escribe aquí la pista o inscripción...',
      x: center.x, y: center.y,
      width: 40, height: 40, zIndex: elements.length
    };
    setElements(prev => [...prev, newNote]);
    setEditingNote(newNote);
  };

  const handleCreateDoor = () => {
    const center = getViewportCenter();
    const newDoor = {
      id: Date.now(),
      type: 'door',
      x: center.x,
      y: center.y,
      width: 60,
      height: 16,
      isOpen: false,
      zIndex: elements.length + 10
    };
    setElements(prev => [...prev, newDoor]);
  };

  const handleCreateWindow = () => {
    const center = getViewportCenter();
    const newWindow = {
      id: Date.now(),
      type: 'window',
      x: center.x,
      y: center.y,
      width: 60,
      height: 14,
      isOpen: false,
      isBroken: false,
      zIndex: elements.length + 10
    };
    setElements(prev => [...prev, newWindow]);
  };

  const handleCreateInteractiveObject = () => {
    const center = getViewportCenter();
    const preset = OBJECT_PRESETS[0];
    const newObj = {
      id: Date.now(),
      type: 'object',
      name: preset.label,
      icon: preset.icon,
      openIcon: preset.openIcon,
      x: center.x,
      y: center.y,
      width: 48,
      height: 48,
      isOpen: false,
      blocksMovement: preset.blocksMovement,
      blocksVision: preset.blocksVision,
      isHidden: false,
      zIndex: elements.length + 8
    };
    setElements(prev => [...prev, newObj]);
    setEditingObject(newObj);
  };

  const handleCreateLightSource = () => {
    const center = getViewportCenter();
    const preset = LIGHT_PRESETS[0];
    const newLight = {
      id: Date.now(),
      type: 'light',
      name: preset.label,
      icon: preset.icon,
      x: center.x,
      y: center.y,
      width: 38,
      height: 38,
      radius: preset.radius,
      color: preset.color,
      isOn: true,
      zIndex: elements.length + 12
    };
    setElements(prev => [...prev, newLight]);
    setEditingLight(newLight);
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

  const selectedElement = selectedIds.length === 1 ? elements.find(el => el.id === selectedIds[0]) : null;

  const handleDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setElements(prev => prev.filter(el => !selectedIds.includes(el.id)));
    setSelectedIds([]);
  };

  const handleDuplicateSelected = () => {
    if (selectedIds.length === 0) return;
    const toCopy = elements.filter(el => selectedIds.includes(el.id));
    const clones = toCopy.map(el => ({
      ...el,
      id: Date.now() + Math.random(),
      x: el.type === 'wall' ? undefined : (el.x || 0) + 40,
      y: el.type === 'wall' ? undefined : (el.y || 0) + 40,
      x1: el.type === 'wall' ? el.x1 + 40 : undefined,
      y1: el.type === 'wall' ? el.y1 + 40 : undefined,
      x2: el.type === 'wall' ? el.x2 + 40 : undefined,
      y2: el.type === 'wall' ? el.y2 + 40 : undefined
    }));
    setElements(prev => [...prev, ...clones]);
    setSelectedIds(clones.map(c => c.id));
  };

  const handleRotateSelected = () => {
    if (!selectedElement) return;
    setElements(prev => prev.map(item =>
      item.id === selectedElement.id
        ? { ...item, width: item.height || 60, height: item.width || 60 }
        : item
    ));
  };

  const handleScaleSelectedImage = (factor) => {
    if (!selectedElement) return;
    setElements(prev => prev.map(item =>
      item.id === selectedElement.id
        ? {
            ...item,
            width: Math.max(40, Math.round((item.width || 200) * factor)),
            height: Math.max(40, Math.round((item.height || 200) * factor))
          }
        : item
    ));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      
      {/* Barra superior de herramientas estilo Gótico / Madera y Bronce */}
      <div style={{
        padding: '12px 20px',
        background: 'linear-gradient(180deg, #2b1b12 0%, #170f0a 100%)',
        borderBottom: '2px solid #8a6d3b',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Selector explícito de Modo de Cursor para no quedarse encerrado trazando muros */}
          <div style={{ display: 'flex', background: '#120b07', padding: '3px', borderRadius: '6px', border: '1px solid #6b4c2b' }}>
            <button
              onClick={() => { setToolMode('select'); setDrawingWall(null); }}
              className="vtt-gothic-title"
              style={{
                padding: '6px 11px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '11px',
                background: toolMode === 'select' ? 'linear-gradient(180deg, #b45309 0%, #78350f 100%)' : 'transparent',
                color: toolMode === 'select' ? '#fffbeb' : '#c5a059'
              }}
            >
              Seleccionar / Mover
            </button>
            <button
              onClick={() => { setToolMode('wall'); setSelectedIds([]); }}
              className="vtt-gothic-title"
              style={{
                padding: '6px 11px',
                borderRadius: '4px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '11px',
                background: toolMode === 'wall' ? 'linear-gradient(180deg, #991b1b 0%, #450a0a 100%)' : 'transparent',
                color: toolMode === 'wall' ? '#fecaca' : '#c5a059'
              }}
            >
              Trazar Muros
            </button>
          </div>

          <div style={{ width: '1px', backgroundColor: '#6b4c2b', margin: '0 4px', height: '24px' }}></div>

          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: 'none' }} />
          <button onClick={() => { setToolMode('select'); fileInputRef.current.click(); }} className="vtt-brass-btn" style={{ padding: '7px 11px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>+ Mapa de Fondo</button>
          <button onClick={() => { setToolMode('select'); handleCreateDoor(); }} className="vtt-brass-btn" style={{ padding: '7px 11px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>+ Puerta</button>
          <button onClick={() => { setToolMode('select'); handleCreateWindow(); }} className="vtt-brass-btn" style={{ padding: '7px 11px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>+ Ventana</button>
          <button onClick={() => { setToolMode('select'); handleCreateInteractiveObject(); }} className="vtt-brass-btn" style={{ padding: '7px 11px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>+ Objeto</button>
          <button onClick={() => { setToolMode('select'); handleCreateLightSource(); }} className="vtt-brass-btn" style={{ padding: '7px 11px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px', borderColor: '#fbbf24' }}>+ Luz</button>
          <button onClick={() => { setToolMode('select'); handleCreateNote(); }} className="vtt-brass-btn" style={{ padding: '7px 11px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '11px' }}>+ Nota</button>
          
          <div style={{ width: '1px', backgroundColor: '#6b4c2b', margin: '0 4px', height: '24px' }}></div>
          
          <input type="file" accept=".json" ref={importRef} onChange={handleImportMapConfig} style={{ display: 'none' }} />
          <button onClick={() => importRef.current.click()} className="vtt-brass-btn" style={{ padding: '6px 9px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>Importar</button>
          <button onClick={handleExportMapConfig} className="vtt-brass-btn" style={{ padding: '6px 9px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>Exportar</button>
        </div>
        
        {/* Opciones de Salida Claras: Sin Guardar, Volver a Ajustes o Ir a la Mesa */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => { if (onClose) onClose(); }}
            className="vtt-brass-btn"
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              color: '#fca5a5',
              borderColor: '#7f1d1d'
            }}
            title="Salir del editor descartando los cambios no guardados"
          >
            Cancelar
          </button>

          {onReturnToSettings && (
            <button
              onClick={() => {
                onLoadMapToBoard(elements);
                onReturnToSettings();
              }}
              className="vtt-brass-btn"
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '12px',
                borderColor: '#d4af37'
              }}
              title="Guarda los cambios del escenario y regresa al menú lateral de Ajustes"
            >
              Guardar y Volver a Ajustes
            </button>
          )}

          <button
            onClick={() => {
              onLoadMapToBoard(elements);
              if (onClose) onClose();
            }}
            className="vtt-gothic-title"
            style={{
              padding: '7px 16px',
              background: 'linear-gradient(180deg, #b45309 0%, #78350f 100%)',
              color: '#fffbeb',
              borderRadius: '6px',
              border: '1px solid #fbbf24',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '12px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.7)'
            }}
          >
            Guardar e Ir a la Mesa
          </button>
        </div>
      </div>

      {/* Barra Contextual Flotante para Elementos Seleccionados o Modo Muro */}
      {(selectedIds.length > 0 || toolMode === 'wall') && (
        <div style={{
          padding: '8px 20px',
          background: '#160e09',
          borderBottom: '1px solid #6b4c2b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
          color: '#f3e5ab',
          zIndex: 20
        }}>
          {toolMode === 'wall' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', justifyContent: 'space-between' }}>
              <span>
                <strong style={{ color: '#f87171' }}>Modo Trazar Muros Activo:</strong> Haz clic izquierdo y arrastra en el lienzo para levantar paredes que bloquean el paso y la visión.
              </span>
              <button
                onClick={() => setToolMode('select')}
                className="vtt-brass-btn"
                style={{ padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', borderColor: '#fbbf24' }}
              >
                Volver a Herramienta Seleccionar (Esc)
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
              <span style={{ color: '#c5a059', fontWeight: 'bold' }}>
                {selectedIds.length === 1
                  ? `Elemento seleccionado: ${selectedElement?.name || selectedElement?.title || selectedElement?.type?.toUpperCase() || 'IMAGEN DE MAPA'}`
                  : `${selectedIds.length} elementos seleccionados`}
              </span>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {selectedElement && (selectedElement.type === 'image' || !selectedElement.type) && (
                  <>
                    <button onClick={() => handleScaleSelectedImage(0.9)} className="vtt-brass-btn" style={{ padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Reducir Tamaño (-10%)</button>
                    <button onClick={() => handleScaleSelectedImage(1.1)} className="vtt-brass-btn" style={{ padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Ampliar Tamaño (+10%)</button>
                  </>
                )}

                {selectedElement && (selectedElement.type === 'door' || selectedElement.type === 'window') && (
                  <button onClick={handleRotateSelected} className="vtt-brass-btn" style={{ padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                    Rotar Orientación (90º)
                  </button>
                )}

                {selectedElement && selectedElement.type === 'object' && (
                  <button onClick={() => setEditingObject(selectedElement)} className="vtt-brass-btn" style={{ padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                    Configurar Propiedades
                  </button>
                )}

                {selectedElement && selectedElement.type === 'light' && (
                  <button onClick={() => setEditingLight(selectedElement)} className="vtt-brass-btn" style={{ padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                    Configurar Radio de Luz
                  </button>
                )}

                {selectedElement && selectedElement.type === 'note' && (
                  <button onClick={() => setEditingNote(selectedElement)} className="vtt-brass-btn" style={{ padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}>
                    Editar Texto
                  </button>
                )}

                <button onClick={handleDuplicateSelected} className="vtt-brass-btn" style={{ padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                  Duplicar
                </button>

                <button
                  onClick={handleDeleteSelected}
                  style={{
                    padding: '4px 12px',
                    background: '#7f1d1d',
                    color: '#fecaca',
                    border: '1px solid #f87171',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}
                >
                  Eliminar Seleccionado
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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

            if (el.type === 'object') {
              return (
                <div
                  key={el.id}
                  onPointerDown={(e) => handleElementPointerDown(e, el)}
                  onDoubleClick={(e) => { e.stopPropagation(); setEditingObject(el); }}
                  style={{
                    position: 'absolute',
                    left: `${el.x}px`,
                    top: `${el.y}px`,
                    width: `${el.width || 48}px`,
                    height: `${el.height || 48}px`,
                    background: 'radial-gradient(circle, #3a2618 0%, #170f0a 100%)',
                    border: isSelected ? '3px solid #fbbf24' : '2px solid #d4af37',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'grab',
                    zIndex: 105,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.85)',
                    fontSize: '24px'
                  }}
                  title={`${el.name} (Doble clic para configurar propiedades)`}
                >
                  {el.isOpen ? (el.openIcon || '🪙') : (el.icon || '📦')}
                </div>
              );
            }

            if (el.type === 'light') {
              const r = el.radius || 220;
              return (
                <div
                  key={el.id}
                  onPointerDown={(e) => handleElementPointerDown(e, el)}
                  onDoubleClick={(e) => { e.stopPropagation(); setEditingLight(el); }}
                  style={{
                    position: 'absolute',
                    left: `${el.x}px`,
                    top: `${el.y}px`,
                    width: `${el.width || 38}px`,
                    height: `${el.height || 38}px`,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, #78350f 0%, #1c120c 100%)',
                    border: isSelected ? '3px solid #fffbeb' : '2px solid #fbbf24',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'grab',
                    zIndex: 115,
                    boxShadow: '0 0 18px rgba(251, 191, 36, 0.85)',
                    fontSize: '20px'
                  }}
                  title={`${el.name} - Radio: ${r}px (Doble clic para configurar luz)`}
                >
                  <div style={{
                    position: 'absolute',
                    width: `${r * 2}px`,
                    height: `${r * 2}px`,
                    borderRadius: '50%',
                    border: '1px dashed rgba(251, 191, 36, 0.45)',
                    background: 'radial-gradient(circle, rgba(251, 146, 60, 0.14) 0%, transparent 70%)',
                    pointerEvents: 'none'
                  }} />
                  {el.icon || '🔥'}
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

      {/* Modal Editor de Objetos Interactivos */}
      {editingObject && (
        <div
          onClick={() => setEditingObject(null)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="vtt-wood-panel"
            style={{ padding: '26px', borderRadius: '10px', width: '480px', display: 'flex', flexDirection: 'column', gap: '14px', border: '2px solid #d4af37', color: '#e6d5b8' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="vtt-gothic-title" style={{ margin: 0, color: '#d4af37' }}>Configurar Objeto Interactivo</h3>
              <button onClick={() => setEditingObject(null)} style={{ background: 'none', border: 'none', color: '#c5a059', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
            
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {OBJECT_PRESETS.map(p => (
                <button
                  key={p.presetId}
                  onClick={() => setEditingObject({
                    ...editingObject,
                    name: p.label,
                    icon: p.icon,
                    openIcon: p.openIcon,
                    blocksMovement: p.blocksMovement,
                    blocksVision: p.blocksVision
                  })}
                  className="vtt-brass-btn"
                  style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', color: '#c5a059' }}>Nombre</label>
                <input
                  type="text"
                  value={editingObject.name}
                  onChange={(e) => setEditingObject({ ...editingObject, name: e.target.value })}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#120b07', color: '#f3e5ab', border: '1px solid #8a6d3b', borderRadius: '6px' }}
                />
              </div>
              <div style={{ width: '70px' }}>
                <label style={{ fontSize: '12px', color: '#c5a059' }}>Cerrado</label>
                <input
                  type="text"
                  value={editingObject.icon}
                  onChange={(e) => setEditingObject({ ...editingObject, icon: e.target.value })}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#120b07', color: '#f3e5ab', border: '1px solid #8a6d3b', borderRadius: '6px', textAlign: 'center' }}
                />
              </div>
              <div style={{ width: '70px' }}>
                <label style={{ fontSize: '12px', color: '#c5a059' }}>Abierto</label>
                <input
                  type="text"
                  value={editingObject.openIcon}
                  onChange={(e) => setEditingObject({ ...editingObject, openIcon: e.target.value })}
                  style={{ width: '100%', padding: '8px', backgroundColor: '#120b07', color: '#f3e5ab', border: '1px solid #8a6d3b', borderRadius: '6px', textAlign: 'center' }}
                />
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(editingObject.blocksMovement)}
                onChange={(e) => setEditingObject({ ...editingObject, blocksMovement: e.target.checked })}
              />
              <span>Bloquea el paso mientras esté cerrado/activo</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(editingObject.blocksVision)}
                onChange={(e) => setEditingObject({ ...editingObject, blocksVision: e.target.checked })}
              />
              <span>Bloquea el cono de visión (proyecta sombra) mientras esté cerrado</span>
            </label>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '8px' }}>
              <button
                onClick={() => {
                  setElements(elements.filter(el => el.id !== editingObject.id));
                  setSelectedIds([]);
                  setEditingObject(null);
                }}
                style={{ padding: '8px 14px', background: '#7f1d1d', color: '#fecaca', border: '1px solid #f87171', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
              >
                Eliminar Objeto
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setEditingObject(null)}
                  className="vtt-brass-btn"
                  style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setElements(elements.map(el => el.id === editingObject.id ? editingObject : el));
                    setEditingObject(null);
                  }}
                  className="vtt-brass-btn"
                  style={{ padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', borderColor: '#fbbf24' }}
                >
                  Guardar Objeto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editor de Fuentes de Luz */}
      {editingLight && (
        <div
          onClick={() => setEditingLight(null)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="vtt-wood-panel"
            style={{ padding: '26px', borderRadius: '10px', width: '440px', display: 'flex', flexDirection: 'column', gap: '14px', border: '2px solid #fbbf24', color: '#e6d5b8' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="vtt-gothic-title" style={{ margin: 0, color: '#fbbf24' }}>Configurar Fuente de Luz</h3>
              <button onClick={() => setEditingLight(null)} style={{ background: 'none', border: 'none', color: '#c5a059', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {LIGHT_PRESETS.map(p => (
                <button
                  key={p.presetId}
                  onClick={() => setEditingLight({
                    ...editingLight,
                    name: p.label,
                    icon: p.icon,
                    radius: p.radius,
                    color: p.color
                  })}
                  className="vtt-brass-btn"
                  style={{ padding: '6px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '6px', color: '#c5a059' }}>
                Radio de Iluminación en la Niebla: {editingLight.radius || 220}px
              </label>
              <input
                type="range"
                min="80"
                max="550"
                value={editingLight.radius || 220}
                onChange={(e) => setEditingLight({ ...editingLight, radius: Number(e.target.value) })}
                style={{ width: '100%', accentColor: '#fbbf24' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '8px' }}>
              <button
                onClick={() => {
                  setElements(elements.filter(el => el.id !== editingLight.id));
                  setSelectedIds([]);
                  setEditingLight(null);
                }}
                style={{ padding: '8px 14px', background: '#7f1d1d', color: '#fecaca', border: '1px solid #f87171', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
              >
                Eliminar Luz
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setEditingLight(null)}
                  className="vtt-brass-btn"
                  style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setElements(elements.map(el => el.id === editingLight.id ? editingLight : el));
                    setEditingLight(null);
                  }}
                  className="vtt-brass-btn"
                  style={{ padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', borderColor: '#fbbf24' }}
                >
                  Guardar Luz
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editor de Notas estilo Grimorio */}
      {editingNote && (
        <div
          onClick={() => setEditingNote(null)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="vtt-wood-panel"
            style={{ padding: '26px', borderRadius: '10px', width: '500px', display: 'flex', flexDirection: 'column', gap: '15px', border: '2px solid #8a6d3b' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="vtt-gothic-title" style={{ margin: 0, color: '#d4af37' }}>Redactar Pergamino</h3>
              <button onClick={() => setEditingNote(null)} style={{ background: 'none', border: 'none', color: '#c5a059', cursor: 'pointer', fontSize: '16px' }}>✕</button>
            </div>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <button
                onClick={() => {
                  setElements(elements.filter(el => el.id !== editingNote.id));
                  setSelectedIds([]);
                  setEditingNote(null);
                }}
                style={{ padding: '8px 14px', background: '#7f1d1d', color: '#fecaca', border: '1px solid #f87171', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}
              >
                Eliminar Nota
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setEditingNote(null)}
                  className="vtt-brass-btn"
                  style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    setElements(elements.map(el => el.id === editingNote.id ? editingNote : el));
                    setEditingNote(null);
                  }} 
                  className="vtt-brass-btn"
                  style={{ padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', borderColor: '#fbbf24' }}
                >
                  Guardar Pergamino
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapCreator;