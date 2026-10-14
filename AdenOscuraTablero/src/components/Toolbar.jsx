import React from 'react';

const Toolbar = ({ onResetBoard, onOpenSettings, onOpenPlayerView }) => {
  const [confirmReset, setConfirmReset] = React.useState(false);

  return (
    <div 
      onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}
      style={{ display: 'flex', flexDirection: 'row', gap: '16px', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span className="vtt-gothic-title" style={{ fontSize: '16px', color: '#d4af37', fontWeight: 'bold' }}>
          ⚜️ Grimorio del Master
        </span>
        <span style={{ fontSize: '14px', color: '#b89f7d', fontStyle: 'italic' }}>
          | Shift + Rueda sobre ficha para rotar su mirada
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'center' }}>
        <button
          onClick={onOpenPlayerView}
          className="vtt-gothic-title"
          style={{
            padding: '8px 16px',
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
          🕯️ Pantalla de Jugadores
        </button>

        <button
          onClick={onOpenSettings}
          className="vtt-brass-btn"
          style={{
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          ⚙️ Forja y Ajustes
        </button>
        
        <div style={{ width: '1px', height: '24px', backgroundColor: '#6b4c2b', margin: '0 4px' }}></div>

        <button
          onClick={() => {
            if (confirmReset) { onResetBoard(); setConfirmReset(false); } 
            else { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 3000); }
          }}
          className="vtt-gothic-title"
          style={{
            padding: '8px 16px',
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
          {confirmReset ? '⚠️ ¿Purgar Tablero?' : '🗡️ Limpiar Mesa'}
        </button>
      </div>
    </div>
  );
};

export default Toolbar;