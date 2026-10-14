import React, { useState } from 'react';

const TokenSidebar = ({ 
  tokens, 
  characters, 
  onAddToken, 
  onRemoveToken, 
  onRemoveCharacter,
  onToggleTokenName,
  customStatuses
}) => {
  const [isCharactersExpanded, setIsCharactersExpanded] = useState(true);

  return (
    <div style={{
      width: '290px',
      height: '100%',
      background: 'linear-gradient(180deg, #1e130d 0%, #100a07 100%)',
      color: '#e6d5b8',
      display: 'flex',
      flexDirection: 'column',
      borderRight: '2px solid #8a6d3b',
      boxShadow: '6px 0 25px rgba(0,0,0,0.85)',
      zIndex: 20
    }}>
      <div style={{
        padding: '18px 20px',
        borderBottom: '2px solid #8a6d3b',
        background: 'linear-gradient(180deg, #2b1b12 0%, #180f0a 100%)',
        boxShadow: 'inset 0 -1px 0 rgba(212, 175, 55, 0.25)'
      }}>
        <h2 className="vtt-gothic-title" style={{ margin: 0, fontSize: '17px', fontWeight: 'bold', color: '#d4af37' }}>
          📜 Crónicas de Campaña
        </h2>
      </div>

      <div style={{ 
        padding: '18px', 
        borderBottom: '1px solid #6b4c2b', 
        maxHeight: isCharactersExpanded ? '45%' : 'auto', 
        display: 'flex', 
        flexDirection: 'column'
      }}>
        <div 
          onClick={() => setIsCharactersExpanded(!isCharactersExpanded)}
          style={{ 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
            cursor: 'pointer', marginBottom: isCharactersExpanded ? '12px' : '0' 
          }}
        >
          <h3 className="vtt-gothic-title" style={{ margin: 0, fontSize: '13px', color: '#c5a059', userSelect: 'none' }}>
            ⚜️ Dramatis Personae
          </h3>
          <span style={{ fontSize: '12px', color: '#d4af37', transition: 'transform 0.2s', transform: isCharactersExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
            ▶
          </span>
        </div>

        {isCharactersExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', paddingRight: '4px' }}>
            {characters?.map((char) => (
              <div
                key={char.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px',
                  background: 'linear-gradient(180deg, #281a12 0%, #1a110b 100%)',
                  border: '1px solid #5c4028',
                  borderRadius: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: char.color,
                    border: `2px solid #d4af37`,
                    overflow: 'hidden',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {char.avatar && (
                      <img src={char.avatar} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                  <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#f3e5ab' }}>{char.name}</span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    onClick={() => onAddToken(char)} 
                    className="vtt-brass-btn"
                    style={{ borderRadius: '4px', padding: '4px 8px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                    title="Invocar en el tablero"
                  >
                    Invocar ➔
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
              <div style={{ textAlign: 'center', color: '#8a6d3b', fontSize: '13px', fontStyle: 'italic' }}>
                No hay héroes ni criaturas registrados.
              </div>
            )}
          </div>
        )}
      </div>

      {}
      <div style={{ padding: '18px', flex: 1, overflowY: 'auto' }}>
        <h3 className="vtt-gothic-title" style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#c5a059' }}>
          ⚔️ En Escena ({tokens.length})
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tokens.map((token) => {
            const activeStatuses = token.statuses || [];
            return (
              <div 
                key={token.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 10px',
                  background: 'linear-gradient(180deg, #281a12 0%, #1a110b 100%)',
                  borderRadius: '6px',
                  border: token.isLocked ? '1px solid #dc2626' : '1px solid #6b4c2b'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: token.color,
                    border: `2px solid #d4af37`,
                    overflow: 'hidden',
                    flexShrink: 0
                  }}>
                    {token.avatar && (
                      <img src={token.avatar} alt={token.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#f3e5ab' }}>{token.name}</span>
                    <span style={{ fontSize: '11px', color: '#b89f7d' }}>
                      {token.visionMode === 'circle' ? '🕯️ 360º' : '🔦 Cono'} • {Math.round(token.rotation || 0)}º
                    </span>
                    {activeStatuses.length > 0 && (
                      <div style={{ display: 'flex', gap: '3px', marginTop: '2px' }}>
                        {activeStatuses.map(stId => {
                          const s = customStatuses.find(st => st.id === stId);
                          return s ? <span key={stId} style={{ fontSize: '13px' }} title={s.label}>{s.icon}</span> : null;
                        })}
                      </div>
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button 
                    onClick={() => onToggleTokenName(token.id)}
                    style={{
                      backgroundColor: 'transparent', border: 'none', color: token.showName === false ? '#6b4c2b' : '#d4af37', 
                      cursor: 'pointer', fontSize: '15px', padding: '4px'
                    }}
                    title={token.showName === false ? "Mostrar nombre" : "Ocultar nombre"}
                  >
                    {token.showName === false ? '👁️‍🗨️' : '👁️'}
                  </button>
                  <button 
                    onClick={() => onRemoveToken(token.id)}
                    style={{
                      backgroundColor: 'transparent', border: 'none', color: '#ef4444', 
                      cursor: 'pointer', fontSize: '15px', padding: '4px'
                    }}
                    title="Retirar de la mesa"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        
        {tokens.length === 0 && (
          <div style={{ textAlign: 'center', color: '#8a6d3b', fontSize: '14px', marginTop: '20px', fontStyle: 'italic' }}>
            El tablero aguarda a los aventureros...
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenSidebar;