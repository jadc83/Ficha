import React, { useState } from 'react';

const TokenSidebar = ({ 
  tokens, 
  characters, 
  onAddToken, 
  onRemoveToken, 
  onOpenModal, 
  onRemoveCharacter,
  onExportCharacters,
  onImportClick,
  showNames,
  setShowNames
}) => {
  // Controla si la sección de personajes está desplegada o no
  const [isCharactersExpanded, setIsCharactersExpanded] = useState(true);

  return (
    <div style={{
      width: '280px',
      height: '100%',
      backgroundColor: '#111827',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '1px solid #374151',
      boxShadow: '4px 0 15px rgba(0,0,0,0.5)',
      zIndex: 20
    }}>
      {/* Cabecera */}
      <div style={{ padding: '20px', borderBottom: '1px solid #374151', backgroundColor: '#1f2937' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>Gestión de Campaña</h2>
      </div>

      {/* Botón de Crear Personaje y Opciones de Fichero */}
      <div style={{ padding: '20px', borderBottom: '1px solid #374151', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button 
          onClick={onOpenModal}
          style={{ 
            width: '100%', backgroundColor: '#10b981', color: 'white', border: 'none', 
            padding: '10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' 
          }}
        >
          + Crear Nuevo Personaje
        </button>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={onImportClick}
            style={{ flex: 1, backgroundColor: '#4b5563', color: 'white', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
            title="Cargar archivo JSON de personajes"
          >
            📥 Importar
          </button>
          <button 
            onClick={onExportCharacters}
            style={{ flex: 1, backgroundColor: '#4b5563', color: 'white', border: 'none', padding: '8px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px' }}
            title="Guardar personajes en un archivo JSON"
          >
            📤 Exportar
          </button>
        </div>
        
        <button 
          onClick={() => setShowNames(!showNames)}
          style={{ 
            width: '100%', backgroundColor: showNames ? '#6366f1' : '#4f46e5', color: 'white', border: 'none', 
            padding: '8px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' 
          }}
        >
          {showNames ? '👁️ Ocultar Nombres' : '👁️‍🗨️ Mostrar Nombres'}
        </button>
      </div>

      {/* Roster de Personajes (Plegable) */}
      <div style={{ 
        padding: '20px', 
        borderBottom: '1px solid #374151', 
        maxHeight: isCharactersExpanded ? '45%' : 'auto', 
        display: 'flex', 
        flexDirection: 'column'
      }}>
        <div 
          onClick={() => setIsCharactersExpanded(!isCharactersExpanded)}
          style={{ 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
            cursor: 'pointer', marginBottom: isCharactersExpanded ? '10px' : '0' 
          }}
          title={isCharactersExpanded ? "Ocultar personajes" : "Mostrar personajes"}
        >
          <h3 style={{ margin: 0, fontSize: '14px', color: '#9ca3af', userSelect: 'none' }}>
            Personajes Disponibles
          </h3>
          <span style={{ fontSize: '12px', color: '#9ca3af', transition: 'transform 0.2s', transform: isCharactersExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            ▶
          </span>
        </div>

        {isCharactersExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', paddingRight: '4px' }}>
            {characters?.map((char) => (
              <div key={char.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', backgroundColor: '#1f2937', borderRadius: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: char.color }}></div>
                  <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{char.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    onClick={() => onAddToken(char)} 
                    style={{ backgroundColor: '#3b82f6', border: 'none', color: 'white', borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
                    title="Añadir a la mesa"
                  >
                    Mesa ➔
                  </button>
                  <button 
                    onClick={() => onRemoveCharacter(char.id)} 
                    style={{ backgroundColor: 'transparent', border: 'none', color: '#ef4444', borderRadius: '4px', padding: '4px', cursor: 'pointer', fontSize: '14px' }}
                    title="Eliminar personaje"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
            {characters?.length === 0 && (
              <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '12px' }}>Aún no hay personajes.</div>
            )}
          </div>
        )}
      </div>

      {/* Lista de Tokens Activos (Toma el espacio restante) */}
      <div style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#9ca3af' }}>Tokens en Mesa ({tokens.length})</h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {tokens.map((token) => (
            <div 
              key={token.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px', backgroundColor: '#1f2937', borderRadius: '6px',
                border: token.isLocked ? '1px solid #ef4444' : '1px solid #374151'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', backgroundColor: token.color }}></div>
                <span style={{ fontSize: '14px' }}>{token.name}</span>
              </div>
              
              <button 
                onClick={() => onRemoveToken(token.id)}
                style={{
                  backgroundColor: 'transparent', border: 'none', color: '#ef4444', 
                  cursor: 'pointer', fontSize: '16px', padding: '4px'
                }}
                title="Eliminar Token"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
        
        {tokens.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '14px', marginTop: '20px' }}>
            No hay tokens en el tablero
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenSidebar;