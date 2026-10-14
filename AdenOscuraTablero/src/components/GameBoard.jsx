import React from 'react';
import GridLayer from './GridLayer';
import MapLayer from './MapLayer';
import FogLayer from './FogLayer';
import GameToken from './GameToken';

const GameBoard = ({
  boardRef, scale,
  handlePointerDown, handlePointerMove, handlePointerUp, handleWheel,
  snapToGrid, gridSize, maps,
  fowEnabled, fowCanvasRef, fowActions,
  tokens, draggedToken, onTokenPointerDown, onToggleTokenLock, onUpdateTokenSize, onToggleTokenStatus, customStatuses,
  rulerMeasure, pings = []
}) => {
  const renderRuler = () => {
    if (!rulerMeasure) return null;
    const { startX, startY, endX, endY } = rulerMeasure;
    const dx = endX - startX;
    const dy = endY - startY;
    const pixelDist = Math.hypot(dx, dy);
    const squares = (pixelDist / (gridSize || 50)).toFixed(1);
    const feet = Math.round((pixelDist / (gridSize || 50)) * 5);
    const meters = ((pixelDist / (gridSize || 50)) * 1.5).toFixed(1);
    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    return (
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 500 }}>
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '5000px', height: '5000px', overflow: 'visible' }}>
          <line
            x1={startX} y1={startY} x2={endX} y2={endY}
            stroke="#fbbf24" strokeWidth={3 / scale} strokeDasharray={`${8 / scale},${6 / scale}`}
          />
          <circle cx={startX} cy={startY} r={5 / scale} fill="#fbbf24" />
          <circle cx={endX} cy={endY} r={6 / scale} fill="#ef4444" stroke="#fbbf24" strokeWidth={2 / scale} />
        </svg>
        <div style={{
          position: 'absolute',
          left: `${midX}px`,
          top: `${midY}px`,
          transform: `translate(-50%, -130%) scale(${1 / scale})`,
          backgroundColor: 'rgba(17, 24, 39, 0.92)',
          border: '1px solid #fbbf24',
          color: '#fef3c7',
          padding: '4px 10px',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 'bold',
          whiteSpace: 'nowrap',
          boxShadow: '0 4px 12px rgba(0,0,0,0.6)'
        }}>
          📏 {squares} casillas ({feet} ft / {meters} m)
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={boardRef}
      onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp} onPointerLeave={handlePointerUp} onPointerCancel={handlePointerUp}
      onDragStart={(e) => e.preventDefault()}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
      style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: 'crosshair', userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      <style>{`
        @keyframes vttPingWave {
          0% { transform: translate(-50%, -50%) scale(0.2); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(3.8); opacity: 0; }
        }
        @keyframes vttSoundPulse {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.25); }
        }
      `}</style>
      <div style={{ transform: `scale(${scale})`, transformOrigin: '0 0', position: 'absolute', width: '100%', height: '100%' }}>
        
        <GridLayer snapToGrid={snapToGrid} gridSize={gridSize} />
        
        <MapLayer maps={maps} fowCanvasRef={fowCanvasRef} />
        
        <FogLayer fowEnabled={fowEnabled} fowCanvasRef={fowCanvasRef} fowActions={fowActions} />

        {tokens.map((token) => (
          <GameToken
            key={token.id} token={token} isDragging={draggedToken === token.id}
            onPointerDown={onTokenPointerDown} onToggleLock={onToggleTokenLock}
            onUpdateSize={onUpdateTokenSize}
            onToggleStatus={onToggleTokenStatus}
            customStatuses={customStatuses}
          />
        ))}

        {renderRuler()}

        {pings.map((ping) => (
          <div
            key={ping.id}
            style={{
              position: 'absolute',
              left: `${ping.x}px`,
              top: `${ping.y}px`,
              pointerEvents: 'none',
              zIndex: 600
            }}
          >
            <div style={{
              position: 'absolute', width: '70px', height: '70px', borderRadius: '50%',
              border: '3px solid #ef4444', boxShadow: '0 0 20px #ef4444',
              animation: 'vttPingWave 1.8s cubic-bezier(0, 0.2, 0.8, 1) infinite'
            }} />
            <div style={{
              position: 'absolute', width: '70px', height: '70px', borderRadius: '50%',
              border: '3px solid #fbbf24', boxShadow: '0 0 15px #fbbf24',
              animation: 'vttPingWave 1.8s cubic-bezier(0, 0.2, 0.8, 1) 0.45s infinite'
            }} />
            <div style={{
              position: 'absolute', width: '70px', height: '70px', borderRadius: '50%',
              border: '2px dashed #38bdf8',
              animation: 'vttPingWave 1.8s cubic-bezier(0, 0.2, 0.8, 1) 0.9s infinite'
            }} />
            <div style={{
              position: 'absolute',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'rgba(17, 24, 39, 0.9)',
              border: '2px solid #fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              boxShadow: '0 0 15px rgba(239, 68, 68, 0.9)',
              animation: 'vttSoundPulse 0.8s ease-in-out infinite'
            }}>
              🔊
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GameBoard;