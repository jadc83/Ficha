import React from 'react';
import { Map, Lock, Unlock } from 'lucide-react';

const Toolbar = ({ 
  onUploadClick, fileInputRef, onMapUpload, isMapsLocked, setIsMapsLocked,
  fowEnabled, setFowEnabled,
  onResetBoard, onOpenSettings
}) => {
  const [confirmReset, setConfirmReset] = React.useState(false);

  return (
    <>
      {}
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={onMapUpload} 
        style={{ display: 'none' }} 
      />
      
      {}
      <div 
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          flexWrap: 'wrap', 
          gap: '16px', 
          alignItems: 'center',
          width: '100%'
        }}
      >
        
        {/* GRUPO 1: Mapas */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            onClick={onUploadClick}
            style={{ padding: '8px 16px', background: '#3b82f6', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Map size={18} /> Añadir Mapa
          </button>

          <button 
            onClick={() => setIsMapsLocked(!isMapsLocked)}
            style={{ padding: '8px 16px', background: isMapsLocked ? '#ef4444' : '#10b981', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {isMapsLocked ? <><Lock size={18} /> Imágenes Bloqueadas</> : <><Unlock size={18} /> Editar Imágenes (Mover)</>}
          </button>
        </div>

        <div style={{ width: '1px', height: '24px', backgroundColor: '#4b5563' }}></div>

        {/* GRUPO 3: Niebla de Guerra (Limpio, solo el botón) */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={() => setFowEnabled(!fowEnabled)}
            style={{ padding: '6px 12px', background: fowEnabled ? '#6366f1' : '#4b5563', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {fowEnabled ? '☁️ Niebla Activa' : '☁️ Niebla Inactiva'}
          </button>
        </div>

        <div style={{ width: '1px', height: '24px', backgroundColor: '#4b5563' }}></div>

        {/* GRUPO 4: Ajustes y Reseteo */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={onOpenSettings}
            style={{
              padding: '8px 16px', background: '#10b981', color: 'white',
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            ⚙️ Ajustes de Partida
          </button>

          <button
            onClick={() => {
              if (confirmReset) {
                onResetBoard();
                setConfirmReset(false);
              } else {
                setConfirmReset(true);
                setTimeout(() => setConfirmReset(false), 3000); // 3 segundos para confirmar
              }
            }}
            style={{
              padding: '8px 16px',
              background: confirmReset ? '#ef4444' : '#374151',
              color: 'white',
              borderRadius: '6px',
              border: confirmReset ? '1px solid #b91c1c' : '1px solid #4b5563',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
            title="Eliminar mapas, tokens y niebla de la mesa actual"
          >
            {confirmReset ? '⚠️ ¿Confirmar Limpieza?' : '🗑️ Limpiar Mesa'}
          </button>
        </div>

      </div>
    </>
  );
};

export default Toolbar;