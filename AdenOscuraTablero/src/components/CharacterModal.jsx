import React, { useState } from 'react';

const CharacterModal = ({ onClose, onSave }) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return; // Evitar personajes sin nombre
    
    onSave({
      id: Date.now(),
      name: name.trim(),
      color: color
    });
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center',
      alignItems: 'center', zIndex: 2000
    }}>
      <div style={{
        backgroundColor: '#1f2937', padding: '24px', borderRadius: '8px',
        width: '300px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', color: 'white'
      }}>
        <h2 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>Nuevo Personaje</h2>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#9ca3af' }}>Nombre</label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Gandalf"
              autoFocus
              style={{
                width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #374151',
                backgroundColor: '#111827', color: 'white'
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#9ca3af' }}>Color del Token</label>
            <input 
              type="color" 
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{ width: '100%', height: '40px', border: 'none', cursor: 'pointer', padding: 0, backgroundColor: 'transparent', borderRadius: '4px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <button 
              type="button" 
              onClick={onClose}
              style={{ flex: 1, padding: '10px', backgroundColor: '#4b5563', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={!name.trim()}
              style={{ flex: 1, padding: '10px', backgroundColor: name.trim() ? '#10b981' : '#374151', color: 'white', border: 'none', borderRadius: '4px', cursor: name.trim() ? 'pointer' : 'not-allowed', fontWeight: 'bold' }}
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CharacterModal;