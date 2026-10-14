import React from 'react';
import GridLayer from './GridLayer';
import MapLayer from './MapLayer';
import FogLayer, { isPointVisibleToPlayers } from './FogLayer';
import GameToken from './GameToken';
import WeatherOverlay from './WeatherOverlay';

const GameBoard = ({
  boardRef, scale, pan = { x: 0, y: 0 }, isDraggingPan = false, isPlayerView = false,
  fowEnabled, fowMode = 'none', fowVisionRadius = 180, fowMemoryEnabled = true, fowAutoHideEnemies = true,
  weatherEffect = 'none', ambientTint = 'none',
  rulerActive = false, pingActive = false,
  handlePointerDown, handlePointerMove, handlePointerUp, handleWheel,
  snapToGrid, gridSize, maps,
  fowCanvasRef, fowActions,
  tokens, draggedToken, rotatingToken, onTokenPointerDown, onStartTokenRotate,
  onToggleTokenLock, onToggleTokenHidden, onToggleTokenFaction,
  onUpdateTokenSize, onUpdateTokenRotation, onUpdateTokenVisionMode, onToggleTokenStatus, customStatuses,
  rulerMeasure, pings = [], onToggleDoor, onToggleWindow
}) => {
  const isToolActive = rulerActive || pingActive || (!isPlayerView && fowEnabled && fowMode !== 'none');
  const boardCursor = isDraggingPan ? 'grabbing' : (isToolActive ? 'crosshair' : 'grab');

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
            stroke="#d4af37" strokeWidth={3 / scale} strokeDasharray={`${8 / scale},${6 / scale}`}
          />
          <circle cx={startX} cy={startY} r={5 / scale} fill="#d4af37" />
          <circle cx={endX} cy={endY} r={6 / scale} fill="#991b1b" stroke="#d4af37" strokeWidth={2 / scale} />
        </svg>
        <div
          className="vtt-gothic-title"
          style={{
            position: 'absolute',
            left: `${midX}px`,
            top: `${midY}px`,
            transform: `translate(-50%, -130%) scale(${1 / scale})`,
            background: 'linear-gradient(180deg, rgba(38, 24, 16, 0.96) 0%, rgba(20, 12, 8, 0.96) 100%)',
            border: '2px solid #d4af37',
            color: '#f3e5ab',
            padding: '5px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            whiteSpace: 'nowrap',
            boxShadow: '0 6px 16px rgba(0,0,0,0.85)'
          }}
        >
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
      style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        cursor: boardCursor,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        background: 'radial-gradient(circle at center, #1b120c 0%, #090604 100%)'
      }}
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
      <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: '0 0', position: 'absolute', width: '100%', height: '100%' }}>
        
        <GridLayer snapToGrid={snapToGrid} gridSize={gridSize} />
        
        <MapLayer
          maps={maps}
          fowCanvasRef={fowCanvasRef}
          fowEnabled={fowEnabled}
          isPlayerView={isPlayerView}
          onToggleDoor={onToggleDoor}
          onToggleWindow={onToggleWindow}
        />
        
        <FogLayer
          fowEnabled={fowEnabled}
          fowCanvasRef={fowCanvasRef}
          fowActions={fowActions}
          maps={maps}
          tokens={tokens}
          fowVisionRadius={fowVisionRadius}
          fowMemoryEnabled={fowMemoryEnabled}
          isPlayerView={isPlayerView}
        />

        {tokens.map((token) => {
          if (isPlayerView) {
            if (token.isHidden) return null;
            if (fowEnabled && fowAutoHideEnemies && token.faction === 'enemy') {
              const size = token.size || 50;
              const tx = token.x + size / 2;
              const ty = token.y + size / 2;
              const seen = isPointVisibleToPlayers(tx, ty, tokens, maps, fowVisionRadius);
              if (!seen) return null;
            }
          }

          return (
            <GameToken
              key={token.id} token={token}
              isDragging={draggedToken === token.id}
              isRotating={rotatingToken === token.id}
              isPlayerView={isPlayerView}
              onPointerDown={onTokenPointerDown}
              onStartRotate={onStartTokenRotate}
              onToggleLock={onToggleTokenLock}
              onToggleHidden={onToggleTokenHidden}
              onToggleFaction={onToggleTokenFaction}
              onUpdateSize={onUpdateTokenSize}
              onUpdateRotation={onUpdateTokenRotation}
              onUpdateVisionMode={onUpdateTokenVisionMode}
              onToggleStatus={onToggleTokenStatus}
              customStatuses={customStatuses}
            />
          );
        })}

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
              border: '3px solid #d4af37', boxShadow: '0 0 20px #d4af37',
              animation: 'vttPingWave 1.8s cubic-bezier(0, 0.2, 0.8, 1) infinite'
            }} />
            <div style={{
              position: 'absolute', width: '70px', height: '70px', borderRadius: '50%',
              border: '3px solid #dc2626', boxShadow: '0 0 15px #dc2626',
              animation: 'vttPingWave 1.8s cubic-bezier(0, 0.2, 0.8, 1) 0.45s infinite'
            }} />
            <div style={{
              position: 'absolute',
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: 'rgba(26, 15, 10, 0.92)',
              border: '2px solid #d4af37',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              boxShadow: '0 0 15px rgba(212, 175, 55, 0.9)',
              animation: 'vttSoundPulse 0.8s ease-in-out infinite'
            }}>
              🔔
            </div>
          </div>
        ))}
      </div>

      <WeatherOverlay weather={weatherEffect} ambientTint={ambientTint} />
    </div>
  );
};

export default GameBoard;