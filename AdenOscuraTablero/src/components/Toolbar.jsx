import { Map, Lock, Unlock } from 'lucide-react';

const Toolbar = ({ onUploadClick, fileInputRef, onMapUpload, isMapsLocked, setIsMapsLocked }) => {

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
      </div>
    </>
  );
};

export default Toolbar;