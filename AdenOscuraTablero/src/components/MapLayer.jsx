import React from 'react';

const MapLayer = ({ maps, handleMapPointerDown, handleMapContextMenu, isMapsLocked }) => {
  return (
    <>
      {maps.map((map) => (
        <img
          key={map.id}
          src={map.src}
          alt="map"
          onPointerDown={(e) => handleMapPointerDown(e, map)}
          onContextMenu={(e) => handleMapContextMenu(e, map)}
          style={{
            position: 'absolute',
            left: `${map.x}px`,
            top: `${map.y}px`,
            width: `${map.width}px`,
            height: `${map.height}px`,
            cursor: isMapsLocked ? 'default' : 'grab',
            userSelect: 'none',
            WebkitUserDrag: 'none',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            zIndex: 0
          }}
          draggable={false}
        />
      ))}
    </>
  );
};

export default MapLayer;