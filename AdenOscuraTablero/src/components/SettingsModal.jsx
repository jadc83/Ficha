import React, { useState, useRef } from 'react';
import MapCreator from './MapCreator'; // NUEVO IMPORT

const SettingsModal = ({ 
  onClose, characters = [], onSaveCharacter, onImportCharacters,
  customStatuses, onAddCustomStatus, onRemoveCustomStatus,
  onExportCampaign, onImportCampaign,
  fowEnabled, setFowEnabled, fowBrushSize, setFowBrushSize, fowVisionRadius, setFowVisionRadius, fowMode, setFowMode,
  snapToGrid, setSnapToGrid, gridSize, setGridSize,
  maps, onLoadMapToBoard
}) => {
  const [activeTab, setActiveTab] = useState('mapMaker'); 
  
  // Variables para la pestaña de Personajes
  const [charName, setCharName] = useState('');
  const [charColor, setCharColor] = useState('#3b82f6');
  const [charAvatar, setCharAvatar] = useState('');
  const charInputRef = useRef(null);
  const charAvatarInputRef = useRef(null);

  // Variables para la pestaña de Estados
  const [statusId, setStatusId] = useState('');
  const [statusIcon, setStatusIcon] = useState('⭐');
  const [statusLabel, setStatusLabel] = useState('');
  const [statusEffect, setStatusEffect] = useState('none');

  // ======= LÓGICA DEL CREADOR DE MAPAS =======
  const [editorMaps, setEditorMaps] = useState(maps);
  const [editorPan, setEditorPan] = useState({ x: 0, y: 0 });
  const [editorScale, setEditorScale] = useState(0.8);
  const [isDraggingEditorPan, setIsDraggingEditorPan] = useState(false);
  const [draggedEditorMap, setDraggedEditorMap] = useState(null);
  const [editorMapDragOffset, setEditorMapDragOffset] = useState({ x: 0, y: 0 });
  const [editorGroupMode, setEditorGroupMode] = useState(false);
  const [editorContextMenu, setEditorContextMenu] = useState({ visible: false, x: 0, y: 0, mapId: null });
  
  const editorBoardRef = useRef(null);
  const editorFileInputRef = useRef(null);
  const mapImportRef = useRef(null);

  const handleMapUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const newMap = {
            id: Date.now(),
            src: event.target.result,
            x: -editorPan.x / editorScale + window.innerWidth / 2 / editorScale - img.width / 2,
            y: -editorPan.y / editorScale + window.innerHeight / 2 / editorScale - img.height / 2,
            width: img.width,
            height: img.height,
            zIndex: editorMaps.length
          };
          setEditorMaps([...editorMaps, newMap]);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleEditorPointerDown = (e) => {
    if (e.button === 1 || e.button === 2) {
      setIsDraggingEditorPan(true);
      return;
    }
    setIsDraggingEditorPan(true);
    setEditorContextMenu({ visible: false, x: 0, y: 0, mapId: null });
  };

  const handleEditorMapPointerDown = (e, map) => {
    if (e.button === 2) { // Clic derecho abre menú
      e.preventDefault();
      e.stopPropagation();
      setEditorContextMenu({ visible: true, x: e.clientX, y: e.clientY, mapId: map.id });
      return;
    }
    e.stopPropagation();
    const rect = editorBoardRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left) / editorScale - editorPan.x / editorScale;
    const mouseY = (e.clientY - rect.top) / editorScale - editorPan.y / editorScale;
    
    setDraggedEditorMap(map.id);
    setEditorMapDragOffset({ x: mouseX - map.x, y: mouseY - map.y });
  };

  const handleEditorPointerMove = (e) => {
    if (isDraggingEditorPan) {
      setEditorPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
      return;
    }

    if (draggedEditorMap !== null) {
      const rect = editorBoardRef.current.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) / editorScale - editorPan.x / editorScale;
      const mouseY = (e.clientY - rect.top) / editorScale - editorPan.y / editorScale;
      
      const mapToMove = editorMaps.find(m => m.id === draggedEditorMap);
      const dx = (mouseX - editorMapDragOffset.x) - mapToMove.x;
      const dy = (mouseY - editorMapDragOffset.y) - mapToMove.y;

      if (editorGroupMode) {
        setEditorMaps(editorMaps.map(m => ({ ...m, x: m.x + dx, y: m.y + dy })));
      } else {
        setEditorMaps(editorMaps.map(m => m.id === draggedEditorMap ? { ...m, x: m.x + dx, y: m.y + dy } : m));
      }
    }
  };

  const handleEditorWheel = (e) => {
    const zoomFactor = -e.deltaY * 0.001;
    setEditorScale(prev => Math.min(Math.max(0.1, prev + zoomFactor), 5));
  };

  const handleExportMapConfig = () => {
    const blob = new Blob([JSON.stringify(editorMaps)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'layout_mapa.json'; a.click();
  };

  const handleImportMapConfig = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try { setEditorMaps(JSON.parse(evt.target.result)); } catch (err) { alert("Archivo inválido."); }
      e.target.value = '';
    };
    reader.readAsText(file);
  };
  // ===========================================

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 256;
        canvas.width = MAX_SIZE;
        canvas.height = MAX_SIZE;
        const ctx = canvas.getContext('2d');

        // Recorte cuadrado centrado (center-crop)
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;

        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, MAX_SIZE, MAX_SIZE);
        const compressedDataUrl = canvas.toDataURL('image/webp', 0.85);
        setCharAvatar(compressedDataUrl);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCharacterSubmit = (e) => {
    e.preventDefault();
    if (!charName.trim()) return;
    onSaveCharacter({
      id: Date.now(),
      name: charName.trim(),
      color: charColor,
      avatar: charAvatar || null
    });
    setCharName('');
    setCharAvatar('');
  };

  const handleStatusSubmit = (e) => {
    e.preventDefault();
    if (!statusLabel.trim() || !statusIcon.trim()) return;
    const newId = statusId.trim() ? statusId.trim().toLowerCase().replace(/\s+/g, '_') : `custom_${Date.now()}`;
    onAddCustomStatus({ id: newId, icon: statusIcon.trim(), label: statusLabel.trim(), effect: statusEffect });
    setStatusLabel(''); setStatusId(''); setStatusIcon('⭐');
  };

  const handleExportCharacters = () => {
    if (characters.length === 0) return alert("No hay personajes para exportar.");
    const blob = new Blob([JSON.stringify(characters)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'personajes_vtt.json'; a.click();
  };

  const handleImportCharactersFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const importedChars = JSON.parse(evt.target.result);
        if (Array.isArray(importedChars)) {
          onImportCharacters(importedChars.map(c => ({ ...c, id: Date.now() + Math.random() })));
          alert(`¡Importados ${importedChars.length} personajes!`);
        }
      } catch (err) {}
      e.target.value = '';
    };
    reader.readAsText(file);
  };
  // === BORRAMOS TODA LA LOGICA DEL CREADOR ANTIGUO DE AQUI ===

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#111827', display: 'flex', flexDirection: 'column', zIndex: 999999, overflow: 'hidden', color: 'white' }}>
      <div style={{ padding: '20px 30px', backgroundColor: '#1f2937', borderBottom: '1px solid #374151', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: '24px' }}>⚙️ Ajustes de Partida</h1>
        <button onClick={onClose} style={{ padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px' }}>
          ⬅️ Volver a la Mesa
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Menú Lateral */}
        <div style={{ width: '250px', backgroundColor: '#1f2937', borderRight: '1px solid #374151', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0 }}>
          <button onClick={() => setActiveTab('mapMaker')} style={{ padding: '12px', backgroundColor: activeTab === 'mapMaker' ? '#374151' : 'transparent', color: activeTab === 'mapMaker' ? '#60a5fa' : 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', textAlign: 'left' }}>🗺️ Creador de Mapas</button>
          <button onClick={() => setActiveTab('characters')} style={{ padding: '12px', backgroundColor: activeTab === 'characters' ? '#374151' : 'transparent', color: activeTab === 'characters' ? '#60a5fa' : 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', textAlign: 'left' }}>👥 Personajes</button>
          <button onClick={() => setActiveTab('fow')} style={{ padding: '12px', backgroundColor: activeTab === 'fow' ? '#374151' : 'transparent', color: activeTab === 'fow' ? '#60a5fa' : 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', textAlign: 'left' }}>☁️ Niebla de Guerra</button>
          <button onClick={() => setActiveTab('board')} style={{ padding: '12px', backgroundColor: activeTab === 'board' ? '#374151' : 'transparent', color: activeTab === 'board' ? '#60a5fa' : 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', textAlign: 'left' }}>🔲 Cuadrícula</button>
          <button onClick={() => setActiveTab('statuses')} style={{ padding: '12px', backgroundColor: activeTab === 'statuses' ? '#374151' : 'transparent', color: activeTab === 'statuses' ? '#60a5fa' : 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', textAlign: 'left' }}>✨ Estados</button>
          <button onClick={() => setActiveTab('data')} style={{ padding: '12px', backgroundColor: activeTab === 'data' ? '#374151' : 'transparent', color: activeTab === 'data' ? '#60a5fa' : 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', textAlign: 'left' }}>💾 Importar / Exportar</button>
        </div>

        {/* Panel Derecho */}
        <div style={{ flex: 1, backgroundColor: activeTab === 'mapMaker' ? '#000' : '#111827', overflow: 'hidden' }}>
          
          {activeTab === 'mapMaker' && (
            <MapCreator initialElements={maps} onLoadMapToBoard={onLoadMapToBoard} />
          )}

          {/* Resto de pestañas */}
          {activeTab !== 'mapMaker' && (
            <div style={{ padding: '40px', overflowY: 'auto', height: '100%' }}>
              <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                
                {activeTab === 'characters' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    <div>
                      <h2 style={{ fontSize: '22px', borderBottom: '1px solid #374151', paddingBottom: '10px' }}>Añadir Personaje a la Librería</h2>
                      <form onSubmit={handleCharacterSubmit} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', marginTop: '20px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                          <label style={{ fontSize: '13px', color: '#9ca3af' }}>Avatar</label>
                          <div
                            onClick={() => charAvatarInputRef.current.click()}
                            title="Haz clic para subir una imagen"
                            style={{
                              width: '46px',
                              height: '46px',
                              borderRadius: '50%',
                              backgroundColor: charColor,
                              border: `3px solid ${charColor}`,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                              position: 'relative'
                            }}
                          >
                            {charAvatar ? (
                              <img src={charAvatar} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '18px' }}>📷</span>
                            )}
                          </div>
                          {charAvatar && (
                            <button
                              type="button"
                              onClick={() => setCharAvatar('')}
                              style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                            >
                              Quitar foto
                            </button>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            ref={charAvatarInputRef}
                            onChange={handleAvatarUpload}
                            style={{ display: 'none' }}
                          />
                        </div>

                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af' }}>Nombre</label>
                          <input type="text" value={charName} onChange={(e) => setCharName(e.target.value)} placeholder="Ej: Aragorn, Trasgo..." style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1f2937', color: 'white' }} />
                        </div>

                        <div style={{ width: '100px' }}>
                          <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af' }}>Color / Borde</label>
                          <input type="color" value={charColor} onChange={(e) => setCharColor(e.target.value)} style={{ width: '100%', height: '42px', border: 'none', cursor: 'pointer', backgroundColor: 'transparent' }} />
                        </div>

                        <button type="submit" disabled={!charName.trim()} style={{ padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: charName.trim() ? 'pointer' : 'not-allowed', fontWeight: 'bold', height: '42px' }}>+ Crear</button>
                      </form>
                    </div>

                    <div style={{ marginTop: '20px', borderTop: '1px solid #374151', paddingTop: '20px' }}>
                      <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#9ca3af' }}>Importar / Exportar Librería de Personajes</h3>
                      <div style={{ display: 'flex', gap: '20px' }}>
                        <button onClick={() => charInputRef.current.click()} style={{ flex: 1, padding: '12px', backgroundColor: '#4b5563', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>📥 Importar Personajes (.json)</button>
                        <button onClick={handleExportCharacters} style={{ flex: 1, padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>📤 Exportar Personajes</button>
                      </div>
                      <input type="file" accept=".json" ref={charInputRef} style={{ display: 'none' }} onChange={handleImportCharactersFile} />
                    </div>
                  </div>
                )}

                {activeTab === 'fow' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1f2937', padding: '20px', borderRadius: '8px' }}>
                      <div><label style={{ display: 'block', color: 'white', fontWeight: 'bold' }}>Activar Niebla de Guerra</label><span style={{ fontSize: '12px', color: '#9ca3af' }}>Cubre el mapa de negro.</span></div>
                      <button onClick={() => setFowEnabled(!fowEnabled)} style={{ padding: '10px 20px', background: fowEnabled ? '#10b981' : '#ef4444', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>{fowEnabled ? 'Activada' : 'Desactivada'}</button>
                    </div>
                    <div style={{ backgroundColor: '#1f2937', padding: '20px', borderRadius: '8px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af', fontWeight: 'bold' }}>Herramienta Activa</label>
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        <button onClick={() => setFowMode('none')} style={{ padding: '10px', background: fowMode === 'none' ? '#3b82f6' : '#374151', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>🖱️ Mover Tokens</button>
                        <button onClick={() => setFowMode('reveal')} style={{ padding: '10px', background: fowMode === 'reveal' ? '#10b981' : '#374151', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>🖌️ Revelar (Pincel)</button>
                        <button onClick={() => setFowMode('hide')} style={{ padding: '10px', background: fowMode === 'hide' ? '#ef4444' : '#374151', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>⬛ Ocultar</button>
                      </div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af' }}>Tamaño Pincel: {fowBrushSize}px</label>
                      <input type="range" min="20" max="300" value={fowBrushSize} onChange={(e) => setFowBrushSize(Number(e.target.value))} style={{ width: '100%' }} />
                      <label style={{ display: 'block', marginTop: '20px', marginBottom: '8px', color: '#9ca3af' }}>Visión Automática (Tokens): {fowVisionRadius}px</label>
                      <input type="range" min="50" max="400" value={fowVisionRadius} onChange={(e) => setFowVisionRadius(Number(e.target.value))} style={{ width: '100%' }} />
                    </div>
                  </div>
                )}

                {activeTab === 'board' && (
                  <div style={{ backgroundColor: '#1f2937', padding: '20px', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div><label style={{ color: 'white', fontWeight: 'bold' }}>Snap to Grid</label></div>
                      <button onClick={() => setSnapToGrid(!snapToGrid)} style={{ padding: '10px', background: snapToGrid ? '#10b981' : '#4b5563', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>{snapToGrid ? 'Activado' : 'Desactivado'}</button>
                    </div>
                    <label style={{ display: 'block', color: '#9ca3af', marginBottom: '8px' }}>Tamaño Cuadrícula: {gridSize}px</label>
                    <input type="range" min="20" max="200" step="5" value={gridSize} onChange={(e) => setGridSize(Number(e.target.value))} style={{ width: '100%' }} />
                  </div>
                )}

                {activeTab === 'statuses' && (
                  <div>
                    <form onSubmit={handleStatusSubmit} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', backgroundColor: '#1f2937', padding: '20px', borderRadius: '8px' }}>
                      <div style={{ width: '80px' }}><label style={{ color: '#9ca3af' }}>Icono</label><input type="text" value={statusIcon} onChange={(e) => setStatusIcon(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#111827', color: 'white', border: '1px solid #374151' }} /></div>
                      <div style={{ flex: 1 }}><label style={{ color: '#9ca3af' }}>Nombre</label><input type="text" value={statusLabel} onChange={(e) => setStatusLabel(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#111827', color: 'white', border: '1px solid #374151' }} /></div>
                      <div style={{ flex: 1 }}><label style={{ color: '#9ca3af' }}>Efecto</label>
                        <select value={statusEffect} onChange={(e) => setStatusEffect(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#111827', color: 'white', border: '1px solid #374151' }}>
                          <option value="none">Solo Visual</option><option value="immobilize">Inmovilizar</option>
                        </select>
                      </div>
                      <button type="submit" style={{ padding: '10px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Añadir</button>
                    </form>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px' }}>
                      {customStatuses.map(status => (
                        <div key={status.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#374151', padding: '8px 12px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '20px' }}>{status.icon}</span><span>{status.label}</span>
                          <button onClick={() => onRemoveCustomStatus(status.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'data' && (
                  <div>
                    <h2 style={{ fontSize: '22px', borderBottom: '1px solid #374151', paddingBottom: '10px' }}>Gestión Global</h2>
                    <p style={{ color: '#9ca3af', margin: '20px 0' }}>Exporta todo el estado de la campaña actual.</p>
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <button onClick={onImportCampaign} style={{ flex: 1, padding: '16px', backgroundColor: '#4b5563', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>📥 Importar Campaña</button>
                      <button onClick={onExportCampaign} style={{ flex: 1, padding: '16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>📤 Exportar Campaña</button>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsModal;