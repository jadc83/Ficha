import React from 'react';

const Toolbar = ({ onResetBoard, onOpenSettings, rulerActive, onToggleRuler, pingActive, onTogglePing, onOpenPlayerView }) => {
  const [confirmReset, setConfirmReset] = React.useState(false);

  return (
    <div 
      onPointerDown={(e) => e.stopPropagation()} onWheel={(e) => e.stopPropagation()}
      style={{ display: 'flex', flexDirection: 'row', gap: '16px', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={onToggleRuler}
          style={{
            padding: '8px 14px',
            background: rulerActive ? '#f59e0b' : '#374151',
            color: rulerActive ? '#111827' : 'white',
            borderRadius: '6px',
            border: rulerActive ? '1px solid #fbbf24' : '1px solid #4b5563',
            cursor: 'pointer',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          title="También puedes mantener pulsado Alt y arrastrar en cualquier momento"
        >
          📏 {rulerActive ? 'Regla Activa' : 'Regla'}
        </button>

        <button
          onClick={onTogglePing}
          style={{
            padding: '8px 14px',
            background: pingActive ? '#ef4444' : '#374151',
            color: 'white',
            borderRadius: '6px',
            border: pingActive ? '1px solid #f87171' : '1px solid #4b5563',
            cursor: 'pointer',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: pingActive ? '0 0 12px rgba(239, 68, 68, 0.5)' : 'none'
          }}
          title="Haz clic en cualquier punto del mapa para emitir una onda de sonido/alerta (Atajo: Shift + Clic)"
        >
          🔊 {pingActive ? 'Marcando Sonido...' : 'Marcar Sonido'}
        </button>

        <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '4px' }}>
          💡 <strong>Atajos:</strong> Shift + Clic (Sonido) | Alt + Arrastrar (Regla)
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', gap: '12px', alignItems: 'center' }}>
        <button
          onClick={onOpenPlayerView}
          style={{
            padding: '8px 16px',
            background: '#10b981',
            color: 'white',
            borderRadius: '6px',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
          }}
          title="Abre una ventana limpia sincronizada en tiempo real para proyectar o llevar al monitor de los jugadores"
        >
          🖥️ Vista Jugador
        </button>

        <button onClick={onOpenSettings} style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
          ⚙️ Ajustes de Partida
        </button>
        
        <div style={{ width: '1px', height: '24px', backgroundColor: '#4b5563', margin: '0 8px' }}></div>

        <button
          onClick={() => {
            if (confirmReset) { onResetBoard(); setConfirmReset(false); } 
            else { setConfirmReset(true); setTimeout(() => setConfirmReset(false), 3000); }
          }}
          style={{ padding: '8px 16px', background: confirmReset ? '#ef4444' : '#374151', color: 'white', borderRadius: '6px', border: confirmReset ? '1px solid #b91c1c' : '1px solid #4b5563', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.2s' }}
        >
          {confirmReset ? '⚠️ ¿Confirmar Limpieza?' : '🗑️ Limpiar Mesa'}
        </button>
      </div>
    </div>
  );
};

export default Toolbar;