import React, { useState, useRef } from 'react';
import MapCreator from './MapCreator';

const SettingsModal = ({ 
  onClose, characters = [], onSaveCharacter, onImportCharacters,
  customStatuses, onAddCustomStatus, onRemoveCustomStatus,
  onExportCampaign, onImportCampaign,
  fowEnabled, setFowEnabled, fowBrushSize, setFowBrushSize, fowVisionRadius, setFowVisionRadius,
  fowMemoryEnabled = true, setFowMemoryEnabled, onResetFow, fowMode, setFowMode,
  snapToGrid, setSnapToGrid, gridSize, setGridSize,
  maps, onLoadMapToBoard
}) => {
  const [activeTab, setActiveTab] = useState('mapMaker'); 
  const [statusMessage, setStatusMessage] = useState(null);
  
  const [charName, setCharName] = useState('');
  const [charColor, setCharColor] = useState('#b45309');
  const [charAvatar, setCharAvatar] = useState('');
  const charInputRef = useRef(null);
  const charAvatarInputRef = useRef(null);

  const [statusId, setStatusId] = useState('');
  const [statusIcon, setStatusIcon] = useState('🩸');
  const [statusLabel, setStatusLabel] = useState('');
  const [statusEffect, setStatusEffect] = useState('none');

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
    setStatusLabel(''); setStatusId(''); setStatusIcon('🩸');
  };

  const handleExportCharacters = () => {
    if (characters.length === 0) {
      setStatusMessage('No hay personajes registrados para exportar.');
      return;
    }
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
          setStatusMessage(`¡Importados ${importedChars.length} personajes al grimorio!`);
        }
      } catch (err) {}
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: '#0e0906',
      display: 'flex', flexDirection: 'column',
      zIndex: 999999, overflow: 'hidden', color: '#e6d5b8'
    }}>
      <div style={{
        padding: '18px 30px',
        background: 'linear-gradient(180deg, #2b1b12 0%, #170f0a 100%)',
        borderBottom: '2px solid #8a6d3b',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <h1 className="vtt-gothic-title" style={{ margin: 0, fontSize: '22px', color: '#d4af37' }}>
          ⚜️ Forja de Mundos y Ajustes de Partida
        </h1>
        <button
          onClick={onClose}
          className="vtt-brass-btn"
          style={{ padding: '10px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
        >
          ⬅️ Volver al Tablero
        </button>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* Menú Lateral de Ajustes */}
        <div style={{
          width: '260px',
          background: 'linear-gradient(180deg, #1e130d 0%, #100a07 100%)',
          borderRight: '2px solid #8a6d3b',
          padding: '20px',
          display: 'flex', flexDirection: 'column', gap: '10px', flexShrink: 0
        }}>
          {[
            { id: 'mapMaker', label: '🗺️ Creador de Mapas' },
            { id: 'characters', label: '🛡️ Personajes y Bestiario' },
            { id: 'fow', label: '🌑 Niebla y Visión' },
            { id: 'board', label: '🔲 Cuadrícula Táctica' },
            { id: 'statuses', label: '✨ Estados y Condiciones' },
            { id: 'data', label: '📜 Guardar / Cargar Crónica' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="vtt-gothic-title"
              style={{
                padding: '12px 14px',
                background: activeTab === tab.id ? 'linear-gradient(90deg, #451a03 0%, #261810 100%)' : 'transparent',
                color: activeTab === tab.id ? '#fbbf24' : '#c5a059',
                border: activeTab === tab.id ? '1px solid #d4af37' : '1px solid transparent',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '13px',
                textAlign: 'left'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Panel Derecho */}
        <div style={{ flex: 1, backgroundColor: activeTab === 'mapMaker' ? '#080504' : '#120b07', overflow: 'hidden' }}>
          
          {activeTab === 'mapMaker' && (
            <MapCreator initialElements={maps} onLoadMapToBoard={onLoadMapToBoard} />
          )}

          {activeTab !== 'mapMaker' && (
            <div style={{ padding: '40px', overflowY: 'auto', height: '100%' }}>
              <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                {statusMessage && (
                  <div style={{ padding: '12px 16px', marginBottom: '20px', backgroundColor: '#261810', border: '1px solid #d4af37', borderRadius: '6px', color: '#f3e5ab' }}>
                    {statusMessage}
                  </div>
                )}
                
                {activeTab === 'characters' && (
                  <div className="vtt-wood-panel" style={{ padding: '28px', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
                    <div>
                      <h2 className="vtt-gothic-title" style={{ fontSize: '20px', color: '#d4af37', borderBottom: '1px solid #6b4c2b', paddingBottom: '10px', margin: 0 }}>
                        Inscribir Personaje o Criatura
                      </h2>
                      <form onSubmit={handleCharacterSubmit} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', marginTop: '20px', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                          <label style={{ fontSize: '13px', color: '#c5a059' }}>Retrato</label>
                          <div
                            onClick={() => charAvatarInputRef.current.click()}
                            title="Haz clic para subir un retrato"
                            style={{
                              width: '50px',
                              height: '50px',
                              borderRadius: '50%',
                              backgroundColor: charColor,
                              border: `3px solid #d4af37`,
                              boxShadow: '0 4px 10px rgba(0,0,0,0.7)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden'
                            }}
                          >
                            {charAvatar ? (
                              <img src={charAvatar} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <span style={{ fontSize: '20px' }}>📷</span>
                            )}
                          </div>
                          <input type="file" accept="image/*" ref={charAvatarInputRef} onChange={handleAvatarUpload} style={{ display: 'none' }} />
                        </div>

                        <div style={{ flex: 1, minWidth: '200px' }}>
                          <label style={{ display: 'block', marginBottom: '8px', color: '#c5a059' }}>Nombre</label>
                          <input type="text" value={charName} onChange={(e) => setCharName(e.target.value)} placeholder="Ej: Lord Soth, Guardia..." style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #8a6d3b', backgroundColor: '#120b07', color: '#f3e5ab' }} />
                        </div>

                        <div style={{ width: '100px' }}>
                          <label style={{ display: 'block', marginBottom: '8px', color: '#c5a059' }}>Estandarte</label>
                          <input type="color" value={charColor} onChange={(e) => setCharColor(e.target.value)} style={{ width: '100%', height: '42px', border: '1px solid #8a6d3b', cursor: 'pointer', backgroundColor: 'transparent' }} />
                        </div>

                        <button type="submit" disabled={!charName.trim()} className="vtt-brass-btn" style={{ padding: '10px 22px', borderRadius: '6px', cursor: charName.trim() ? 'pointer' : 'not-allowed', fontWeight: 'bold', height: '42px' }}>+ Inscribir</button>
                      </form>
                    </div>

                    <div style={{ borderTop: '1px solid #6b4c2b', paddingTop: '20px' }}>
                      <h3 className="vtt-gothic-title" style={{ fontSize: '15px', marginBottom: '15px', color: '#c5a059' }}>Compendio de Personajes (.json)</h3>
                      <div style={{ display: 'flex', gap: '20px' }}>
                        <button onClick={() => charInputRef.current.click()} className="vtt-brass-btn" style={{ flex: 1, padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>📥 Importar Compendio</button>
                        <button onClick={handleExportCharacters} className="vtt-brass-btn" style={{ flex: 1, padding: '12px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>📤 Exportar Compendio</button>
                      </div>
                      <input type="file" accept=".json" ref={charInputRef} style={{ display: 'none' }} onChange={handleImportCharactersFile} />
                    </div>
                  </div>
                )}

                {activeTab === 'fow' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div className="vtt-wood-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px', borderRadius: '10px', gap: '16px' }}>
                      <div>
                        <label className="vtt-gothic-title" style={{ display: 'block', color: '#d4af37', fontWeight: 'bold', fontSize: '16px' }}>Activar Niebla de Guerra y Visión</label>
                        <span style={{ fontSize: '14px', color: '#b89f7d' }}>En la vista del Master la niebla es translúcida para que siempre veas el mapa; en la pantalla de Jugadores es 100% opaca.</span>
                      </div>
                      <button onClick={() => setFowEnabled(!fowEnabled)} className="vtt-brass-btn" style={{ padding: '10px 22px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', color: fowEnabled ? '#4ade80' : '#f87171', whiteSpace: 'nowrap' }}>
                        {fowEnabled ? '🕯️ Activada' : '🌑 Desactivada'}
                      </button>
                    </div>

                    <div className="vtt-wood-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '22px', borderRadius: '10px', gap: '16px' }}>
                      <div>
                        <label className="vtt-gothic-title" style={{ display: 'block', color: '#d4af37', fontWeight: 'bold', fontSize: '15px' }}>Modo de Exploración: {fowMemoryEnabled ? 'Con Memoria (Penumbra)' : 'Visión Estricta'}</label>
                        <span style={{ fontSize: '14px', color: '#b89f7d' }}>
                          {fowMemoryEnabled
                            ? 'Las zonas ya visitadas quedan en penumbra tenue mientras el cono de visión actual brilla al 100%.'
                            : 'Solo se ve lo que ilumina actualmente el cono de visión; lo que queda atrás vuelve a la oscuridad.'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                        {setFowMemoryEnabled && (
                          <button onClick={() => setFowMemoryEnabled(!fowMemoryEnabled)} className="vtt-brass-btn" style={{ padding: '10px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>
                            {fowMemoryEnabled ? '👁️ Penumbra' : '🔦 Estricta'}
                          </button>
                        )}
                        {onResetFow && (
                          <button
                            onClick={onResetFow}
                            style={{
                              padding: '10px 16px',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              fontFamily: "'Cinzel', serif",
                              background: 'linear-gradient(180deg, #991b1b 0%, #450a0a 100%)',
                              border: '1px solid #f87171',
                              color: '#fecaca'
                            }}
                            title="Vuelve a cubrir todas las zonas exploradas o pintadas"
                          >
                            🌑 Reiniciar Niebla
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="vtt-wood-panel" style={{ padding: '22px', borderRadius: '10px' }}>
                      <label className="vtt-gothic-title" style={{ display: 'block', marginBottom: '12px', color: '#c5a059', fontWeight: 'bold' }}>Herramienta Manual del Master</label>
                      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                        <button onClick={() => setFowMode('none')} className="vtt-brass-btn" style={{ padding: '10px 14px', borderRadius: '6px', cursor: 'pointer', borderColor: fowMode === 'none' ? '#fbbf24' : '#8a6d3b' }}>🖱️ Mover Fichas</button>
                        <button onClick={() => setFowMode('reveal')} className="vtt-brass-btn" style={{ padding: '10px 14px', borderRadius: '6px', cursor: 'pointer', borderColor: fowMode === 'reveal' ? '#4ade80' : '#8a6d3b' }}>🖌️ Despejar Niebla</button>
                        <button onClick={() => setFowMode('hide')} className="vtt-brass-btn" style={{ padding: '10px 14px', borderRadius: '6px', cursor: 'pointer', borderColor: fowMode === 'hide' ? '#f87171' : '#8a6d3b' }}>⬛ Cubrir con Oscuridad</button>
                      </div>
                      <label style={{ display: 'block', marginBottom: '8px', color: '#e6d5b8' }}>Radio del Pincel Manual: {fowBrushSize}px</label>
                      <input type="range" min="20" max="300" value={fowBrushSize} onChange={(e) => setFowBrushSize(Number(e.target.value))} style={{ width: '100%', accentColor: '#d4af37' }} />
                      <label style={{ display: 'block', marginTop: '20px', marginBottom: '8px', color: '#e6d5b8' }}>Alcance del Cono de Visión / Antorcha: {fowVisionRadius}px</label>
                      <input type="range" min="60" max="500" value={fowVisionRadius} onChange={(e) => setFowVisionRadius(Number(e.target.value))} style={{ width: '100%', accentColor: '#d4af37' }} />
                    </div>
                  </div>
                )}

                {activeTab === 'board' && (
                  <div className="vtt-wood-panel" style={{ padding: '24px', borderRadius: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <div>
                        <label className="vtt-gothic-title" style={{ color: '#d4af37', fontWeight: 'bold', fontSize: '16px' }}>Ajuste Magnético a Casillas (Snap to Grid)</label>
                      </div>
                      <button onClick={() => setSnapToGrid(!snapToGrid)} className="vtt-brass-btn" style={{ padding: '10px 18px', borderRadius: '6px', cursor: 'pointer' }}>
                        {snapToGrid ? 'Activado' : 'Desactivado'}
                      </button>
                    </div>
                    <label style={{ display: 'block', color: '#e6d5b8', marginBottom: '8px' }}>Escala de Casilla: {gridSize}px</label>
                    <input type="range" min="20" max="200" step="5" value={gridSize} onChange={(e) => setGridSize(Number(e.target.value))} style={{ width: '100%', accentColor: '#d4af37' }} />
                  </div>
                )}

                {activeTab === 'statuses' && (
                  <div className="vtt-wood-panel" style={{ padding: '24px', borderRadius: '10px' }}>
                    <form onSubmit={handleStatusSubmit} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
                      <div style={{ width: '80px' }}><label style={{ color: '#c5a059' }}>Símbolo</label><input type="text" value={statusIcon} onChange={(e) => setStatusIcon(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#120b07', color: 'white', border: '1px solid #8a6d3b' }} /></div>
                      <div style={{ flex: 1 }}><label style={{ color: '#c5a059' }}>Nombre</label><input type="text" value={statusLabel} onChange={(e) => setStatusLabel(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#120b07', color: 'white', border: '1px solid #8a6d3b' }} /></div>
                      <div style={{ flex: 1 }}><label style={{ color: '#c5a059' }}>Efecto</label>
                        <select value={statusEffect} onChange={(e) => setStatusEffect(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', backgroundColor: '#120b07', color: '#f3e5ab', border: '1px solid #8a6d3b' }}>
                          <option value="none">Solo Visual</option><option value="immobilize">Inmovilizar Ficha</option>
                        </select>
                      </div>
                      <button type="submit" className="vtt-brass-btn" style={{ padding: '10px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}>Añadir</button>
                    </form>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '20px' }}>
                      {customStatuses.map(status => (
                        <div key={status.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#120b07', border: '1px solid #6b4c2b', padding: '8px 12px', borderRadius: '6px' }}>
                          <span style={{ fontSize: '20px' }}>{status.icon}</span><span>{status.label}</span>
                          <button onClick={() => onRemoveCustomStatus(status.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'data' && (
                  <div className="vtt-wood-panel" style={{ padding: '28px', borderRadius: '10px' }}>
                    <h2 className="vtt-gothic-title" style={{ fontSize: '20px', color: '#d4af37', borderBottom: '1px solid #6b4c2b', paddingBottom: '10px', margin: 0 }}>
                      Preservar Crónica Completa
                    </h2>
                    <p style={{ color: '#b89f7d', margin: '18px 0', fontSize: '16px' }}>
                      Guarda todos los mapas, muros, puertas, ventanas, posiciones de fichas y niebla en un pergamino digital `.json`.
                    </p>
                    <div style={{ display: 'flex', gap: '20px' }}>
                      <button onClick={onImportCampaign} className="vtt-brass-btn" style={{ flex: 1, padding: '16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>📥 Cargar Crónica (.json)</button>
                      <button onClick={onExportCampaign} className="vtt-brass-btn" style={{ flex: 1, padding: '16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>📤 Guardar Crónica (.json)</button>
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