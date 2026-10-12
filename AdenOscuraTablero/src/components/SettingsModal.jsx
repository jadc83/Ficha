import React, { useState, useRef } from 'react';

const SettingsModal = ({ 
  onClose, 
  characters = [],
  onSaveCharacter, 
  onImportCharacters,
  customStatuses, 
  onAddCustomStatus, 
  onRemoveCustomStatus,
  onExportCampaign,
  onImportCampaign,
  fowBrushSize,
  setFowBrushSize,
  fowVisionRadius,
  setFowVisionRadius,
  fowMode,
  setFowMode,
  snapToGrid,
  setSnapToGrid,
  gridSize,
  setGridSize
}) => {
  const [activeTab, setActiveTab] = useState('characters'); // 'characters', 'statuses', 'board', 'fow', 'data'
  
  const [charName, setCharName] = useState('');
  const [charColor, setCharColor] = useState('#3b82f6');

  const [statusId, setStatusId] = useState('');
  const [statusIcon, setStatusIcon] = useState('⭐');
  const [statusLabel, setStatusLabel] = useState('');
  const [statusEffect, setStatusEffect] = useState('none');

  const charInputRef = useRef(null);

  const handleCharacterSubmit = (e) => {
    e.preventDefault();
    if (!charName.trim()) return;
    onSaveCharacter({
      id: Date.now(),
      name: charName.trim(),
      color: charColor
    });
    setCharName('');
  };

  const handleStatusSubmit = (e) => {
    e.preventDefault();
    if (!statusLabel.trim() || !statusIcon.trim()) return;
    const newId = statusId.trim() ? statusId.trim().toLowerCase().replace(/\s+/g, '_') : `custom_${Date.now()}`;
    onAddCustomStatus({
      id: newId,
      icon: statusIcon.trim(),
      label: statusLabel.trim(),
      effect: statusEffect
    });
    setStatusLabel('');
    setStatusId('');
    setStatusIcon('⭐');
  };

  const handleExportCharacters = () => {
    if (characters.length === 0) return alert("No hay personajes para exportar.");
    const blob = new Blob([JSON.stringify(characters)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'personajes_vtt.json';
    a.click();
  };

  const handleImportCharactersFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const importedChars = JSON.parse(evt.target.result);
        if (Array.isArray(importedChars)) {
          // Les generamos IDs nuevos para que no haya conflictos con los actuales
          const charsWithNewIds = importedChars.map(c => ({
            ...c,
            id: Date.now() + Math.random()
          }));
          onImportCharacters(charsWithNewIds);
          alert(`¡Se han importado ${charsWithNewIds.length} personajes!`);
        } else {
          alert("El archivo no tiene el formato correcto.");
        }
      } catch (err) {
        alert("Archivo JSON inválido.");
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: '#111827', display: 'flex', flexDirection: 'column',
      zIndex: 999999, overflow: 'hidden', color: 'white'
    }}>
      <div style={{ 
        padding: '20px 30px', backgroundColor: '#1f2937', borderBottom: '1px solid #374151',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h1 style={{ margin: 0, fontSize: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          ⚙️ Panel de Control
        </h1>
        <button 
          onClick={onClose}
          style={{ 
            padding: '10px 20px', backgroundColor: '#3b82f6', color: 'white', border: 'none', 
            borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px',
            display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
          }}
        >
          ⬅️ Volver a la Mesa
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {}
        <div style={{ 
          width: '250px', backgroundColor: '#1f2937', borderRight: '1px solid #374151', 
          padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' 
        }}>
          <button onClick={() => setActiveTab('characters')} style={{ padding: '12px', backgroundColor: activeTab === 'characters' ? '#374151' : 'transparent', color: activeTab === 'characters' ? '#60a5fa' : 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', textAlign: 'left' }}>👥 Personajes</button>
          <button onClick={() => setActiveTab('statuses')} style={{ padding: '12px', backgroundColor: activeTab === 'statuses' ? '#374151' : 'transparent', color: activeTab === 'statuses' ? '#60a5fa' : 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', textAlign: 'left' }}>✨ Estados de Combate</button>
          <button onClick={() => setActiveTab('board')} style={{ padding: '12px', backgroundColor: activeTab === 'board' ? '#374151' : 'transparent', color: activeTab === 'board' ? '#60a5fa' : 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', textAlign: 'left' }}>🔲 Cuadrícula</button>
          <button onClick={() => setActiveTab('fow')} style={{ padding: '12px', backgroundColor: activeTab === 'fow' ? '#374151' : 'transparent', color: activeTab === 'fow' ? '#60a5fa' : 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', textAlign: 'left' }}>☁️ Niebla de Guerra</button>
          <button onClick={() => setActiveTab('data')} style={{ padding: '12px', backgroundColor: activeTab === 'data' ? '#374151' : 'transparent', color: activeTab === 'data' ? '#60a5fa' : 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', textAlign: 'left' }}>💾 Importar / Exportar</button>
        </div>

        {}
        <div style={{ flex: 1, padding: '40px', overflowY: 'auto', backgroundColor: '#111827' }}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            
            {activeTab === 'characters' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                <div>
                  <h2 style={{ fontSize: '22px', borderBottom: '1px solid #374151', paddingBottom: '10px' }}>Añadir Personaje a la Librería</h2>
                  <form onSubmit={handleCharacterSubmit} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', marginTop: '20px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af' }}>Nombre del Personaje</label>
                      <input type="text" value={charName} onChange={(e) => setCharName(e.target.value)} placeholder="Ej: Aragorn" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#1f2937', color: 'white' }} />
                    </div>
                    <div style={{ width: '100px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af' }}>Color</label>
                      <input type="color" value={charColor} onChange={(e) => setCharColor(e.target.value)} style={{ width: '100%', height: '42px', border: 'none', cursor: 'pointer', padding: 0, backgroundColor: 'transparent' }} />
                    </div>
                    <button type="submit" disabled={!charName.trim()} style={{ padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: charName.trim() ? 'pointer' : 'not-allowed', fontWeight: 'bold', height: '42px' }}>+ Crear</button>
                  </form>
                </div>

                <div style={{ marginTop: '20px', borderTop: '1px solid #374151', paddingTop: '20px' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#9ca3af' }}>Importar / Exportar Librería de Personajes</h3>
                  <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '20px' }}>Guarda tus personajes habituales y cárgalos en cualquier otra partida sin sobrescribir el mapa ni los tokens de la mesa.</p>
                  
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <button onClick={() => charInputRef.current.click()} style={{ flex: 1, padding: '12px', backgroundColor: '#4b5563', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      📥 Importar Personajes (.json)
                    </button>
                    <button onClick={handleExportCharacters} style={{ flex: 1, padding: '12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                      📤 Exportar Personajes
                    </button>
                  </div>
                  
                  <input type="file" accept=".json" ref={charInputRef} style={{ display: 'none' }} onChange={handleImportCharactersFile} />
                </div>
              </div>
            )}

            {}
            {activeTab === 'board' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                <div>
                  <h2 style={{ fontSize: '22px', borderBottom: '1px solid #374151', paddingBottom: '10px' }}>Configuración de Cuadrícula</h2>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px', backgroundColor: '#1f2937', padding: '20px', borderRadius: '8px' }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '4px', color: 'white', fontWeight: 'bold' }}>Ajustar a la cuadrícula (Snap)</label>
                        <span style={{ fontSize: '12px', color: '#9ca3af' }}>Los tokens se alinearán automáticamente a las intersecciones al soltarlos.</span>
                      </div>
                      <button 
                        onClick={() => setSnapToGrid(!snapToGrid)}
                        style={{ padding: '10px 20px', background: snapToGrid ? '#10b981' : '#4b5563', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
                      >
                        {snapToGrid ? 'Activado' : 'Desactivado'}
                      </button>
                    </div>

                    <div style={{ borderTop: '1px solid #374151', margin: '10px 0' }}></div>

                    <div>
                      <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#9ca3af', fontWeight: 'bold' }}>
                        <span>Tamaño de la cuadrícula</span>
                        <span style={{ color: 'white' }}>{gridSize}px</span>
                      </label>
                      <input type="range" min="20" max="200" step="5" value={gridSize} onChange={(e) => setGridSize(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {}
            {activeTab === 'fow' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                <div>
                  <h2 style={{ fontSize: '22px', borderBottom: '1px solid #374151', paddingBottom: '10px' }}>Configuración de Niebla de Guerra</h2>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '20px', backgroundColor: '#1f2937', padding: '20px', borderRadius: '8px' }}>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af', fontWeight: 'bold' }}>Herramienta Activa</label>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => setFowMode('none')} style={{ padding: '10px 16px', background: fowMode === 'none' ? '#3b82f6' : '#374151', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>🖱️ Mover Tokens</button>
                        <button onClick={() => setFowMode('reveal')} style={{ padding: '10px 16px', background: fowMode === 'reveal' ? '#10b981' : '#374151', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>🖌️ Revelar (Pincel)</button>
                        <button onClick={() => setFowMode('hide')} style={{ padding: '10px 16px', background: fowMode === 'hide' ? '#ef4444' : '#374151', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>⬛ Ocultar (Pincel)</button>
                      </div>
                      <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '8px' }}>Recuerda: Tienes que abrir este panel y volver a ponerlo en "Mover Tokens" cuando termines de pintar el mapa.</p>
                    </div>

                    <div style={{ borderTop: '1px solid #374151', margin: '10px 0' }}></div>

                    <div>
                      <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#9ca3af', fontWeight: 'bold' }}>
                        <span>Tamaño del Pincel (Pintura Manual)</span>
                        <span style={{ color: 'white' }}>{fowBrushSize}px</span>
                      </label>
                      <input type="range" min="20" max="300" value={fowBrushSize} onChange={(e) => setFowBrushSize(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                    </div>

                    <div style={{ borderTop: '1px solid #374151', margin: '10px 0' }}></div>

                    <div>
                      <label style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#9ca3af', fontWeight: 'bold' }}>
                        <span>Radio de Visión Automático (Al arrastrar tokens)</span>
                        <span style={{ color: 'white' }}>{fowVisionRadius}px</span>
                      </label>
                      <input type="range" min="50" max="400" value={fowVisionRadius} onChange={(e) => setFowVisionRadius(Number(e.target.value))} style={{ width: '100%', cursor: 'pointer' }} />
                    </div>

                  </div>
                </div>
              </div>
            )}

            {}
            {activeTab === 'statuses' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                <div>
                  <h2 style={{ fontSize: '22px', borderBottom: '1px solid #374151', paddingBottom: '10px' }}>Estados de Combate</h2>
                  
                  <form onSubmit={handleStatusSubmit} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', marginTop: '20px', backgroundColor: '#1f2937', padding: '20px', borderRadius: '8px' }}>
                    <div style={{ width: '80px' }}>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af' }}>Icono</label>
                      <input type="text" value={statusIcon} onChange={(e) => setStatusIcon(e.target.value)} placeholder="⭐" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#111827', color: 'white', textAlign: 'center', fontSize: '20px' }} maxLength="2" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af' }}>Nombre del Estado</label>
                      <input type="text" value={statusLabel} onChange={(e) => setStatusLabel(e.target.value)} placeholder="Ej: Envenenado" style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#111827', color: 'white' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#9ca3af' }}>Efecto Mecánico</label>
                      <select value={statusEffect} onChange={(e) => setStatusEffect(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #374151', backgroundColor: '#111827', color: 'white' }}>
                        <option value="none">Solo Visual</option>
                        <option value="immobilize">Inmovilizar (No se puede mover)</option>
                      </select>
                    </div>
                    <button type="submit" disabled={!statusLabel.trim() || !statusIcon.trim()} style={{ padding: '10px 20px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '6px', cursor: statusLabel.trim() && statusIcon.trim() ? 'pointer' : 'not-allowed', fontWeight: 'bold', height: '42px' }}>+ Añadir</button>
                  </form>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px' }}>
                    {customStatuses.map(status => (
                      <div key={status.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#374151', padding: '8px 12px', borderRadius: '6px' }}>
                        <span style={{ fontSize: '20px' }}>{status.icon}</span>
                        <span>{status.label} {status.effect === 'immobilize' && <span style={{fontSize: '10px', color: '#ef4444'}}>(Inmoviliza)</span>}</span>
                        <button onClick={() => onRemoveCustomStatus(status.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', marginLeft: '10px', fontWeight: 'bold' }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {}
            {activeTab === 'data' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                <div>
                  <h2 style={{ fontSize: '22px', borderBottom: '1px solid #374151', paddingBottom: '10px' }}>Gestión Global de la Campaña</h2>
                  <p style={{ color: '#9ca3af', marginTop: '20px', marginBottom: '20px' }}>
                    Esto exportará absolutamente todo el estado actual del tablero a un archivo `.json`: Imágenes de mapas, posiciones, tokens, estados personalizados, biblioteca de personajes y niebla de guerra. 
                    <br/><br/>
                    Al importar un archivo de campaña, <strong>se sobrescribirá tu partida actual por completo.</strong>
                  </p>
                  
                  <div style={{ display: 'flex', gap: '20px' }}>
                    <button onClick={onImportCampaign} style={{ flex: 1, padding: '16px', backgroundColor: '#4b5563', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      📥 Importar Campaña Completa
                    </button>
                    <button onClick={onExportCampaign} style={{ flex: 1, padding: '16px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                      📤 Exportar Campaña Completa
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;