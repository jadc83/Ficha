import React, { useState } from 'react';

const Toolbar = ({
  onResetBoard,
  onOpenSettings,
  onOpenMapCreator,
  onOpenPlayerView,
  scenes = [],
  activeSceneId = null,
  onSelectScene,
  onCreateNewScene
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [isCreatingScene, setIsCreatingScene] = useState(false);
  const [newSceneName, setNewSceneName] = useState('');

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!newSceneName.trim()) return;
    if (onCreateNewScene) onCreateNewScene(newSceneName.trim());
    setNewSceneName('');
    setIsCreatingScene(false);
  };

  return (
    <div 
      onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}
      style={{ display: 'flex', flexDirection: 'row', gap: '16px', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span className="vtt-gothic-title" style={{ fontSize: '16px', color: '#d4af37', fontWeight: 'bold' }}>
          ⚜️ Grimorio del Master
        </span>
        <span
          className="vtt-gothic-title"
          style={{
            fontSize: '10px',
            backgroundColor: '#451a03',
            color: '#fbbf24',
            border: '1px solid #d4af37',
            padding: '2px 7px',
            borderRadius: '4px',
            fontWeight: 'bold'
          }}
        >
          ALPHA v0.2
        </span>

        <div style={{ width: '1px', height: '22px', backgroundColor: '#6b4c2b', margin: '0 4px' }}></div>

        {/* Selector Rápido de Escenas / Planos */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '12px', color: '#c5a059', fontWeight: 'bold' }}>Escena:</span>
          <select
            value={activeSceneId || ''}
            onChange={(e) => onSelectScene && onSelectScene(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              backgroundColor: '#120b07',
              color: '#f3e5ab',
              border: '1px solid #8a6d3b',
              fontSize: '12px',
              fontFamily: "'Cinzel', serif",
              cursor: 'pointer',
              minWidth: '155px'
            }}
            title="Cambiar de plano o piso de mazmorra al instante"
          >
            {scenes.map((sc) => (
              <option key={sc.id} value={sc.id}>
                {sc.name}
              </option>
            ))}
          </select>

          {!isCreatingScene ? (
            <button
              onClick={() => setIsCreatingScene(true)}
              className="vtt-brass-btn"
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 'bold'
              }}
              title="Crear un nuevo plano vacío o piso de mazmorra"
            >
              + Nueva Escena
            </button>
          ) : (
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <input
                type="text"
                value={newSceneName}
                onChange={(e) => setNewSceneName(e.target.value)}
                placeholder="Ej. Cripta Nivel 2..."
                autoFocus
                style={{
                  padding: '5px 8px',
                  borderRadius: '4px',
                  backgroundColor: '#120b07',
                  color: '#f3e5ab',
                  border: '1px solid #fbbf24',
                  fontSize: '12px',
                  width: '135px'
                }}
              />
              <button
                type="submit"
                className="vtt-brass-btn"
                style={{ padding: '5px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', borderColor: '#4ade80' }}
              >
                Crear
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingScene(false)}
                style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', fontSize: '12px', padding: '0 4px' }}
              >
                ✕
              </button>
            </form>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={onOpenPlayerView}
          className="vtt-gothic-title"
          style={{
            padding: '8px 14px',
            background: 'linear-gradient(180deg, #14532d 0%, #052e16 100%)',
            color: '#dcfce7',
            borderRadius: '6px',
            border: '1px solid #4ade80',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 3px 8px rgba(0,0,0,0.6)'
          }}
          title="Abre una ventana limpia sincronizada en tiempo real para proyectar o llevar al monitor de los jugadores"
        >
          Pantalla de Jugadores
        </button>

        <button
          onClick={onOpenMapCreator}
          className="vtt-brass-btn"
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px'
          }}
          title="Abrir el creador de escenarios, muros, puertas, objetos y antorchas"
        >
          Editor de Mapas
        </button>

        <button
          onClick={onOpenSettings}
          className="vtt-brass-btn"
          style={{
            padding: '8px 14px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px'
          }}
        >
          Ajustes de Partida
        </button>
        
        <div style={{ width: '1px', height: '24px', backgroundColor: '#6b4c2b', margin: '0 2px' }}></div>

        <button
          onClick={() => {
            if (confirmReset) { onResetBoard(); setConfirmReset(false); } 
            else { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 3000); }
          }}
          className="vtt-gothic-title"
          style={{
            padding: '8px 14px',
            background: confirmReset ? 'linear-gradient(180deg, #991b1b 0%, #450a0a 100%)' : 'linear-gradient(180deg, #2b1b12 0%, #170f0a 100%)',
            color: confirmReset ? '#fecaca' : '#c5a059',
            borderRadius: '6px',
            border: confirmReset ? '1px solid #f87171' : '1px solid #6b4c2b',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            transition: 'all 0.2s'
          }}
        >
          {confirmReset ? '¿Purgar Tablero Seguro?' : 'Limpiar Mesa'}
        </button>
      </div>
    </div>
  );
};

export default Toolbar;