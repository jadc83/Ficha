import React, { useState, useEffect } from 'react';

const DICE_TYPES = [4, 6, 8, 10, 12, 20, 100];

const DiceRoller = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [diceCount, setDiceCount] = useState(1);
  const [diceSides, setDiceSides] = useState(20);
  const [modifier, setModifier] = useState(0);
  const [history, setHistory] = useState([]);
  const [screenRoll, setScreenRoll] = useState(null);
  const [isRollingAnim, setIsRollingAnim] = useState(false);

  useEffect(() => {
    if (!screenRoll) return;
    const timer = setTimeout(() => {
      setScreenRoll(null);
    }, 4500);
    return () => clearTimeout(timer);
  }, [screenRoll]);

  const handleRoll = () => {
    setIsRollingAnim(true);
    setTimeout(() => {
      const rolls = [];
      let sum = 0;
      for (let i = 0; i < diceCount; i++) {
        const val = Math.floor(Math.random() * diceSides) + 1;
        rolls.push(val);
        sum += val;
      }
      const total = sum + modifier;
      const modText = modifier > 0 ? ` + ${modifier}` : modifier < 0 ? ` - ${Math.abs(modifier)}` : '';
      const formula = `${diceCount}d${diceSides}${modText}`;

      const resultObj = {
        id: Date.now(),
        formula,
        rolls,
        modifier,
        total,
        diceSides,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };

      setScreenRoll(resultObj);
      setHistory(prev => [resultObj, ...prev.slice(0, 9)]);
      setIsRollingAnim(false);
    }, 180);
  };

  const currentModText = modifier > 0 ? `+${modifier}` : modifier < 0 ? `${modifier}` : '';
  const currentFormula = `${diceCount}d${diceSides}${currentModText}`;

  return (
    <>
      {}
      {screenRoll && (
        <div
          onClick={() => setScreenRoll(null)}
          style={{
            position: 'fixed',
            top: '75px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            border: '2px solid #f59e0b',
            borderRadius: '12px',
            padding: '16px 28px',
            color: 'white',
            zIndex: 99999,
            boxShadow: '0 15px 35px rgba(0,0,0,0.8), 0 0 20px rgba(245, 158, 11, 0.3)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            userSelect: 'none',
            minWidth: '220px'
          }}
          title="Haz clic para cerrar"
        >
          <div style={{ fontSize: '13px', color: '#fcd34d', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>
            🎲 Tirada: {screenRoll.formula}
          </div>
          <div style={{
            fontSize: '44px',
            fontWeight: '900',
            lineHeight: '1',
            color: (screenRoll.rolls.length === 1 && screenRoll.diceSides === 20 && screenRoll.rolls[0] === 20)
              ? '#10b981'
              : (screenRoll.rolls.length === 1 && screenRoll.diceSides === 20 && screenRoll.rolls[0] === 1)
              ? '#ef4444'
              : '#ffffff'
          }}>
            {screenRoll.total}
          </div>
          <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '2px' }}>
            Dados: [{screenRoll.rolls.join(', ')}]
            {screenRoll.modifier !== 0 && (
              <span> {screenRoll.modifier > 0 ? `+ ${screenRoll.modifier}` : `- ${Math.abs(screenRoll.modifier)}`}</span>
            )}
          </div>
        </div>
      )}

      {}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 5000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end'
        }}
      >
        {isOpen && (
          <div style={{
            width: '300px',
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.75)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #374151', paddingBottom: '8px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#f3f4f6' }}>🎲 Lanzador de Dados</span>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            {}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#d1d5db' }}>Número de dados:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setDiceCount(Math.max(1, diceCount - 1))}
                  style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                >-</button>
                <span style={{ width: '28px', textAlign: 'center', fontWeight: 'bold', fontSize: '15px' }}>{diceCount}</span>
                <button
                  onClick={() => setDiceCount(Math.min(30, diceCount + 1))}
                  style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                >+</button>
              </div>
            </div>

            {}
            <div>
              <span style={{ fontSize: '13px', color: '#d1d5db', display: 'block', marginBottom: '6px' }}>Caras del dado:</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {DICE_TYPES.map(sides => (
                  <button
                    key={sides}
                    onClick={() => setDiceSides(sides)}
                    style={{
                      padding: '6px 4px',
                      borderRadius: '6px',
                      border: diceSides === sides ? '1px solid #60a5fa' : '1px solid #374151',
                      backgroundColor: diceSides === sides ? '#2563eb' : '#111827',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '13px',
                      cursor: 'pointer'
                    }}
                  >
                    d{sides}
                  </button>
                ))}
              </div>
            </div>

            {}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', color: '#d1d5db' }}>Bonificador / Reductor:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setModifier(modifier - 1)}
                  style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                >-</button>
                <span style={{
                  minWidth: '36px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '15px',
                  color: modifier > 0 ? '#34d399' : modifier < 0 ? '#f87171' : 'white'
                }}>
                  {modifier > 0 ? `+${modifier}` : modifier}
                </span>
                <button
                  onClick={() => setModifier(modifier + 1)}
                  style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid #4b5563', backgroundColor: '#374151', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
                >+</button>
                {modifier !== 0 && (
                  <button
                    onClick={() => setModifier(0)}
                    style={{ fontSize: '11px', padding: '4px 6px', borderRadius: '4px', background: '#111827', color: '#9ca3af', border: '1px solid #374151', cursor: 'pointer' }}
                    title="Resetear a 0"
                  >0</button>
                )}
              </div>
            </div>

            {}
            <button
              onClick={handleRoll}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#f59e0b',
                color: '#111827',
                fontWeight: '900',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: '0 4px 10px rgba(245, 158, 11, 0.3)',
                transform: isRollingAnim ? 'scale(0.97)' : 'scale(1)',
                transition: 'transform 0.1s'
              }}
            >
              🎲 Tirar ({currentFormula})
            </button>

            {history.length > 0 && (
              <div style={{ borderTop: '1px solid #374151', paddingTop: '8px', maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 'bold' }}>Últimas tiradas:</span>
                {history.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', backgroundColor: '#111827', padding: '4px 8px', borderRadius: '4px' }}>
                    <span style={{ color: '#d1d5db' }}>{item.formula} <span style={{ color: '#6b7280' }}>[{item.rolls.join(',')}]</span></span>
                    <strong style={{ color: '#fcd34d' }}>= {item.total}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Botón/Pestaña Discreta */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            padding: '10px 16px',
            borderRadius: '999px',
            backgroundColor: isOpen ? '#f59e0b' : '#1f2937',
            color: isOpen ? '#111827' : 'white',
            border: '1px solid #374151',
            boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🎲 {isOpen ? 'Cerrar Dados' : 'Tirar Dados'}
        </button>
      </div>
    </>
  );
};

export default DiceRoller;