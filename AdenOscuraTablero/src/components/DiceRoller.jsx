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
      {screenRoll && (
        <div
          onClick={() => setScreenRoll(null)}
          style={{
            position: 'fixed',
            top: '75px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'linear-gradient(180deg, rgba(38, 24, 16, 0.98) 0%, rgba(18, 11, 7, 0.98) 100%)',
            border: '3px double #d4af37',
            borderRadius: '10px',
            padding: '18px 34px',
            color: '#f3e5ab',
            zIndex: 99999,
            boxShadow: '0 20px 45px rgba(0,0,0,0.95), 0 0 25px rgba(212, 175, 55, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            userSelect: 'none',
            minWidth: '240px'
          }}
          title="Haz clic para cerrar"
        >
          <div className="vtt-gothic-title" style={{ fontSize: '13px', color: '#d4af37', fontWeight: 'bold' }}>
            ⚜️ Destino: {screenRoll.formula}
          </div>
          <div
            className="vtt-gothic-title"
            style={{
              fontSize: '46px',
              fontWeight: '900',
              lineHeight: '1',
              color: (screenRoll.rolls.length === 1 && screenRoll.diceSides === 20 && screenRoll.rolls[0] === 20)
                ? '#4ade80'
                : (screenRoll.rolls.length === 1 && screenRoll.diceSides === 20 && screenRoll.rolls[0] === 1)
                ? '#f87171'
                : '#fffbeb'
            }}
          >
            {screenRoll.total}
          </div>
          <div style={{ fontSize: '14px', color: '#c5a059', marginTop: '2px' }}>
            Dados: [{screenRoll.rolls.join(', ')}]
            {screenRoll.modifier !== 0 && (
              <span> {screenRoll.modifier > 0 ? `+ ${screenRoll.modifier}` : `- ${Math.abs(screenRoll.modifier)}`}</span>
            )}
          </div>
        </div>
      )}

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
          <div
            className="vtt-wood-panel"
            style={{
              width: '310px',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '10px',
              border: '2px solid #8a6d3b',
              color: '#e6d5b8',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #6b4c2b', paddingBottom: '8px' }}>
              <span className="vtt-gothic-title" style={{ fontWeight: 'bold', fontSize: '14px', color: '#d4af37' }}>🎲 Cubilete del Destino</span>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: '#c5a059', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#e6d5b8' }}>Cantidad de dados:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setDiceCount(Math.max(1, diceCount - 1))}
                  className="vtt-brass-btn"
                  style={{ width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >-</button>
                <span className="vtt-gothic-title" style={{ width: '28px', textAlign: 'center', fontWeight: 'bold', fontSize: '15px', color: '#f3e5ab' }}>{diceCount}</span>
                <button
                  onClick={() => setDiceCount(Math.min(30, diceCount + 1))}
                  className="vtt-brass-btn"
                  style={{ width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >+</button>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '14px', color: '#e6d5b8', display: 'block', marginBottom: '6px' }}>Poliedro:</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                {DICE_TYPES.map(sides => (
                  <button
                    key={sides}
                    onClick={() => setDiceSides(sides)}
                    className="vtt-gothic-title"
                    style={{
                      padding: '6px 4px',
                      borderRadius: '6px',
                      border: diceSides === sides ? '1px solid #fbbf24' : '1px solid #6b4c2b',
                      background: diceSides === sides ? 'linear-gradient(180deg, #b45309 0%, #78350f 100%)' : '#120b07',
                      color: '#f3e5ab',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    d{sides}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', color: '#e6d5b8' }}>Modificador:</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setModifier(modifier - 1)}
                  className="vtt-brass-btn"
                  style={{ width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >-</button>
                <span className="vtt-gothic-title" style={{
                  minWidth: '36px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: '15px',
                  color: modifier > 0 ? '#4ade80' : modifier < 0 ? '#f87171' : '#f3e5ab'
                }}>
                  {modifier > 0 ? `+${modifier}` : modifier}
                </span>
                <button
                  onClick={() => setModifier(modifier + 1)}
                  className="vtt-brass-btn"
                  style={{ width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >+</button>
              </div>
            </div>

            <button
              onClick={handleRoll}
              className="vtt-gothic-title"
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #fbbf24',
                background: 'linear-gradient(180deg, #b45309 0%, #78350f 100%)',
                color: '#fffbeb',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.7)',
                transform: isRollingAnim ? 'scale(0.97)' : 'scale(1)',
                transition: 'transform 0.1s'
              }}
            >
              🎲 Lanzar ({currentFormula})
            </button>

            {history.length > 0 && (
              <div style={{ borderTop: '1px solid #6b4c2b', paddingTop: '8px', maxHeight: '110px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className="vtt-gothic-title" style={{ fontSize: '10px', color: '#c5a059' }}>Crónica de Tiradas:</span>
                {history.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', backgroundColor: '#120b07', border: '1px solid #4a331d', padding: '4px 8px', borderRadius: '4px' }}>
                    <span style={{ color: '#e6d5b8' }}>{item.formula} <span style={{ color: '#8a6d3b' }}>[{item.rolls.join(',')}]</span></span>
                    <strong style={{ color: '#fbbf24' }}>= {item.total}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="vtt-brass-btn"
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: '2px solid #8a6d3b',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🎲 {isOpen ? 'Cerrar Dados' : 'Dados'}
        </button>
      </div>
    </>
  );
};

export default DiceRoller;