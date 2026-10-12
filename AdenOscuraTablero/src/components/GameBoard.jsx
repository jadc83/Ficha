import React from 'react';
import GridLayer from './GridLayer';
import MapLayer from './MapLayer';
import FogLayer from './FogLayer';
import GameToken from './GameToken';

const GameBoard = ({
  boardRef,
  pan,
  scale,
  isDraggingPan,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  handleWheel,
  snapToGrid,
  gridSize,
  maps,
  handleMapPointerDown,
  handleMapContextMenu,
  isMapsLocked,
  fowEnabled,
  fowCanvasRef,
  fowActions,
  tokens,
  draggedToken,
  onTokenPointerDown,
  onToggleTokenLock,
  onUpdateTokenSize,
  onToggleTokenStatus,
  customStatuses
}) => {
  return (
    <div 
      ref={boardRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      onContextMenu={(e) => e.preventDefault()}
      style={{ flex: 1, position: 'relative', overflow: 'hidden', cursor: isDraggingPan ? 'grabbing' : 'crosshair' }}
    >
      <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`, transformOrigin: '0 0', position: 'absolute', width: '100%', height: '100%' }}>
        
        <GridLayer snapToGrid={snapToGrid} gridSize={gridSize} />
        
        <MapLayer maps={maps} handleMapPointerDown={handleMapPointerDown} handleMapContextMenu={handleMapContextMenu} isMapsLocked={isMapsLocked} />
        
        <FogLayer fowEnabled={fowEnabled} fowCanvasRef={fowCanvasRef} fowActions={fowActions} />

        {tokens.map((token) => (
          <GameToken
            key={token.id}
            token={token}
            isDragging={draggedToken === token.id}
            onPointerDown={onTokenPointerDown}
            onToggleLock={onToggleTokenLock}
            onUpdateSize={onUpdateTokenSize}
            onToggleStatus={onToggleTokenStatus}
            customStatuses={customStatuses}
          />
        ))}
      </div>
    </div>
  );
};

export default GameBoard;