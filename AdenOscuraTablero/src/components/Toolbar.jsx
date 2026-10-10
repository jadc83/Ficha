import { Map, Settings, Minus, Plus, Lock, Unlock } from 'lucide-react';
import { useState } from 'react';

const Toolbar = ({ onUploadClick, fileInputRef, onMapUpload, tokenSize, setTokenSize, isMapsLocked, setIsMapsLocked }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  return (
    <>
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={onMapUpload} 
        style={{ display: 'none' }} 
      />
      
      {/* Añadimos stopPropagation a este div principal de la UI */}
      <div 
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        style={{ position: 'absolute', top: 16, left: 16, zIndex: 10, display: 'flex', gap: '8px' }}
      >
        
        {/* Botón de Cargar Mapa */}
        <button 
          onClick={onUploadClick}
          style={{ 
            padding: '8px 16px', background: '#3b82f6', color: 'white', borderRadius: '6px', 
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        >
          <Map size={18} /> Añadir Mapa
        </button>

        {}
        <button 
          onClick={() => setIsMapsLocked(!isMapsLocked)}
          style={{ 
            padding: '8px 16px', 
            background: isMapsLocked ? '#ef4444' : '#10b981', 
            color: 'white', borderRadius: '6px', 
            border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        >
          {isMapsLocked ? <Lock size={18} /> : <Unlock size={18} />} 
          {isMapsLocked ? 'Mapas Bloqueados' : 'Mapas Libres'}
        </button>
        
        {}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            style={{ 
              padding: '8px 16px', background: '#4b5563', color: 'white', borderRadius: '6px', 
              border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          >
            <Settings size={18} /> Ajustes
          </button>

          {isSettingsOpen && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, marginTop: '8px',
              background: '#1f2937', padding: '16px', borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)', color: 'white', 
              width: '220px', border: '1px solid #374151'
            }}>
              <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: 'bold' }}>Tamaño de Tokens</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button 
                  onClick={() => setTokenSize(prev => Math.max(20, prev - 5))}
                  style={{ background: '#374151', border: 'none', color: 'white', padding: '4px', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}
                >
                  <Minus size={16} />
                </button>
                <input 
                  type="range" 
                  min="20" max="150" 
                  value={tokenSize} 
                  onChange={(e) => setTokenSize(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
                <button 
                  onClick={() => setTokenSize(prev => Math.min(150, prev + 5))}
                  style={{ background: '#374151', border: 'none', color: 'white', padding: '4px', borderRadius: '4px', cursor: 'pointer', display: 'flex' }}
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Toolbar;