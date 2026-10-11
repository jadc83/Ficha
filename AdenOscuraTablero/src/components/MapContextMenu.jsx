import React, { useEffect, useRef } from 'react';

const MapContextMenu = ({ x, y, mapId, onBringToFront, onDelete, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    
    // Usamos pointerdown para que reaccione rápido antes de que otros eventos lo bloqueen
    window.addEventListener('pointerdown', handleClick, true);
    return () => window.removeEventListener('pointerdown', handleClick, true);
  }, [onClose]);

  return (
    <div 
      ref={menuRef}
      style={{ 
        position: 'fixed', top: y, left: x, backgroundColor: '#1f2937', 
        padding: '8px', borderRadius: '4px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)', 
        zIndex: 999999, display: 'flex', flexDirection: 'column', gap: '5px' 
      }}
    >
      <button 
        onClick={() => onBringToFront(mapId)} 
        style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left', padding: '4px 8px' }}
      >
        ⬆️ Traer al frente
      </button>
      <button 
        onClick={() => onDelete(mapId)} 
        style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', textAlign: 'left', padding: '4px 8px' }}
      >
        🗑️ Eliminar Imagen
      </button>
    </div>
  );
};

export default MapContextMenu;