import React from 'react';
import { Map, Lock, Unlock } from 'lucide-react';

const Toolbar = ({ 
  onUploadClick, fileInputRef, onMapUpload, isMapsLocked, setIsMapsLocked,
  snapToGrid, setSnapToGrid, gridSize, setGridSize,
  fowEnabled, setFowEnabled, fowMode, setFowMode, fowBrushSize, setFowBrushSize,
  fowVisionRadius, setFowVisionRadius,
  onResetBoard
}) => {
  const [confirmReset, setConfirmReset] = React.useState(false);

  return (
    <>
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={onMapUpload} 
        style={{ display: 'none' }} 
      />
      
      {/* Contenedor principal ahora en FILA (flex-row) para ocupar el header */}
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

        {/* Separador visual */}
        <div style={{ width: '1px', height: '24px', backgroundColor: '#4b5563' }}></div>

        {/* GRUPO 2: Cuadrícula */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={() => setSnapToGrid(!snapToGrid)}
            style={{ padding: '6px 12px', background: snapToGrid ? '#10b981' : '#4b5563', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            🔲 {snapToGrid ? 'Snap Activado' : 'Snap Desactivado'}
          </button>
          <span style={{ color: '#9ca3af', fontSize: '12px', marginLeft: '4px' }}>Tamaño:</span>
          <input 
            type="number" 
            value={gridSize} 
            onChange={(e) => setGridSize(Number(e.target.value) || 50)}
            style={{ width: '60px', padding: '4px', borderRadius: '4px', border: '1px solid #374151', background: '#111827', color: 'white', textAlign: 'center' }}
          />
        </div>

        {/* Separador visual */}
        <div style={{ width: '1px', height: '24px', backgroundColor: '#4b5563' }}></div>

        {/* GRUPO 3: Niebla de Guerra */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button 
            onClick={() => setFowEnabled(!fowEnabled)}
            style={{ padding: '6px 12px', background: fowEnabled ? '#6366f1' : '#4b5563', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {fowEnabled ? '☁️ Niebla Activa' : '☁️ Niebla Inactiva'}
          </button>
          
          {fowEnabled && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginLeft: '4px' }}>
              <button 
                onClick={() => setFowMode('none')} 
                style={{ padding: '6px 10px', background: fowMode === 'none' ? '#3b82f6' : '#374151', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '13px' }}
              >
                🖱️ Mover Normal
              </button>
              <button 
                onClick={() => setFowMode('reveal')} 
                style={{ padding: '6px 10px', background: fowMode === 'reveal' ? '#10b981' : '#374151', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '13px' }}
              >
                🖌️ Revelar (Pincel)
              </button>
              <button 
                onClick={() => setFowMode('hide')} 
                style={{ padding: '6px 10px', background: fowMode === 'hide' ? '#ef4444' : '#374151', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '13px' }}
              >
                ⬛ Ocultar (Pincel)
              </button>
              
              {fowMode !== 'none' && (
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px', gap: '4px', backgroundColor: '#111827', padding: '4px 8px', borderRadius: '4px' }}>
                  <span style={{color: '#9ca3af', fontSize: '12px'}}>Pincel:</span>
                  <input 
                    type="range" min="20" max="300" 
                    value={fowBrushSize} 
                    onChange={(e) => setFowBrushSize(Number(e.target.value))} 
                    style={{ width: '70px', cursor: 'pointer' }} 
                  />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', marginLeft: '4px', gap: '4px', backgroundColor: '#111827', padding: '4px 8px', borderRadius: '4px' }}>
                <span style={{color: '#9ca3af', fontSize: '12px'}}>Visión Auto:</span>
                <input 
                  type="range" min="50" max="400" 
                  value={fowVisionRadius} 
                  onChange={(e) => setFowVisionRadius(Number(e.target.value))} 
                  style={{ width: '70px', cursor: 'pointer' }} 
                />
              </div>
            </div>
          )}
        </div>

        {/* Separador visual */}
        <div style={{ width: '1px', height: '24px', backgroundColor: '#4b5563' }}></div>

        {/* GRUPO 4: Peligro / Reseteo */}
        <div>
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