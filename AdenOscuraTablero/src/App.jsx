import React, { useState, useRef, useEffect } from 'react';
import TokenSidebar from './components/TokenSidebar';
import GameToken from './components/GameToken';
import Toolbar from './components/Toolbar';
import CharacterModal from './components/CharacterModal';

const App = () => {
  const [maps, setMaps] = useState([]);
  const [isMapsLocked, setIsMapsLocked] = useState(false);
  const [mapContextMenu, setMapContextMenu] = useState({ visible: false, mapId: null, x: 0, y: 0 });
  
  const [tokens, setTokens] = useState([]);
  const [characters, setCharacters] = useState([]);
  const [isCharModalOpen, setIsCharModalOpen] = useState(false);
  const [showNames, setShowNames] = useState(true);

  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  
  const [draggedToken, setDraggedToken] = useState(null);
  const [draggedMap, setDraggedMap] = useState(null);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const fileInputRef = useRef(null);
  const charFileInputRef = useRef(null);
  const mapMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (mapMenuRef.current && !mapMenuRef.current.contains(e.target)) {
        setMapContextMenu(prev => ({ ...prev, visible: false }));
      }
    };

    if (mapContextMenu.visible) {
      // Añadimos 'true' para usar la fase de captura
      document.addEventListener('pointerdown', handleClickOutside, true);
    }
    return () => {
      // Añadimos 'true' aquí también para limpiarlo correctamente
      document.removeEventListener('pointerdown', handleClickOutside, true);
    };
  }, [mapContextMenu.visible]);

  const handleExportCharacters = () => {
    // Convierte el array de personajes a un string JSON formateado
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(characters, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "personajes_vtt.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportCharacters = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedChars = JSON.parse(e.target.result);
        setCharacters(importedChars);
      } catch (err) {
        console.error("El archivo no es un JSON válido", err);
        alert("Error al cargar el archivo de personajes.");
      }
    };
    reader.readAsText(file);
    // Limpiamos el input por si se quiere importar el mismo fichero después
    event.target.value = '';
  };

  const handleSaveCharacter = (newChar) => {
    setCharacters(prev => [...prev, newChar]);
    setIsCharModalOpen(false);
  };

  const handleRemoveCharacter = (charId) => {
    setCharacters(prev => prev.filter(c => c.id !== charId));
  };

  const handleAddToken = (character) => {
    setTokens(prev => [...prev, {
      id: Date.now(),
      charId: character.id,
      name: character.name,
      color: character.color,
      x: window.innerWidth / 2 - offset.x,
      y: window.innerHeight / 2 - offset.y,
      isLocked: false,
      size: 50 // Asignamos tamaño base
    }]);
  };

  const handleRemoveToken = (tokenId) => {
    setTokens(prev => prev.filter(t => t.id !== tokenId));
  };

  const toggleTokenLock = (tokenId) => {
    setTokens(prev => prev.map(token => 
      token.id === tokenId ? { ...token, isLocked: !token.isLocked } : token
    ));
  };

  const handleUpdateTokenSize = (tokenId, newSize) => {
    setTokens(prev => prev.map(token => 
      token.id === tokenId ? { ...token, size: newSize } : token
    ));
  };

  const handleMapUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_SIZE = 2048;
          let width = img.width;
          let height = img.height;

          if (width > MAX_SIZE || height > MAX_SIZE) {
            if (width > height) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            } else {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const optimizedDataUrl = canvas.toDataURL('image/webp', 0.8);

          setMaps(prev => [...prev, {
            id: Date.now(),
            url: optimizedDataUrl,
            x: 100, y: 100,
            originalWidth: width,
            originalHeight: height,
            zIndex: prev.length,
            isLocked: false
          }]);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
      event.target.value = '';
    }
  };

  const handleMapContextMenu = (e, mapId) => {
    e.preventDefault();
    e.stopPropagation();
    setMapContextMenu({ visible: true, mapId, x: e.clientX, y: e.clientY });
  };

  const toggleIndividualMapLock = (mapId) => {
    setMaps(prev => prev.map(m => m.id === mapId ? { ...m, isLocked: !m.isLocked } : m));
    setMapContextMenu({ ...mapContextMenu, visible: false });
  };

  const deleteMap = (mapId) => {
    setMaps(prev => prev.filter(m => m.id !== mapId));
    setMapContextMenu({ ...mapContextMenu, visible: false });
  };

  const handlePointerDown = (e) => {
    if (mapContextMenu.visible) setMapContextMenu({ ...mapContextMenu, visible: false });
    setIsPanning(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
    try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
  };

  const handlePointerMove = (e) => {
    const dx = e.clientX - lastMousePos.x;
    const dy = e.clientY - lastMousePos.y;

    if (draggedToken) {
      setTokens(prev => prev.map(t => 
        t.id === draggedToken ? { ...t, x: t.x + dx / scale, y: t.y + dy / scale } : t
      ));
    } else if (draggedMap) {
      setMaps(prev => prev.map(m => 
        m.id === draggedMap ? { ...m, x: m.x + dx / scale, y: m.y + dy / scale } : m
      ));
    } else if (isPanning) {
      setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    }
    
    setLastMousePos({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e) => {
    setIsPanning(false);
    setDraggedToken(null);
    setDraggedMap(null);
    try { e.target.releasePointerCapture(e.pointerId); } catch (err) {}
  };

  const handleWheel = (e) => {
    const zoomSensitivity = 0.002;
    const delta = -e.deltaY * zoomSensitivity;
    const newScale = Math.min(Math.max(0.1, scale + delta), 5);
    
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const xs = (mouseX - offset.x) / scale;
    const ys = (mouseY - offset.y) / scale;

    setScale(newScale);
    setOffset({
      x: mouseX - xs * newScale,
      y: mouseY - ys * newScale
    });
  };

  return (
    <>
      <style>{`
        #root { width: 100%; height: 100%; margin: 0; padding: 0; max-width: none; }
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }
      `}</style>

      {/* Input oculto para importar JSON de personajes */}
      <input 
        type="file" 
        accept=".json" 
        ref={charFileInputRef} 
        onChange={handleImportCharacters} 
        style={{ display: 'none' }} 
      />

      <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#1f2937' }}>
        
        {/* Panel lateral izquierdo */}
        <TokenSidebar 
          tokens={tokens} 
          characters={characters}
          onAddToken={handleAddToken} 
          onRemoveToken={handleRemoveToken}
          onOpenModal={() => setIsCharModalOpen(true)}
          onRemoveCharacter={handleRemoveCharacter}
          onExportCharacters={handleExportCharacters}
          onImportClick={() => charFileInputRef.current?.click()}
          showNames={showNames}
          setShowNames={setShowNames}
        />

        {/* Zona del Tablero */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          
          <Toolbar 
            onUploadClick={() => fileInputRef.current?.click()}
            fileInputRef={fileInputRef}
            onMapUpload={handleMapUpload}
            isMapsLocked={isMapsLocked}
            setIsMapsLocked={setIsMapsLocked}
          />

          <div 
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            style={{ 
              width: '100%', height: '100%', touchAction: 'none', 
              cursor: isPanning ? 'grabbing' : 'grab',
              backgroundImage: 'radial-gradient(#374151 1px, transparent 1px)',
              backgroundSize: `${50 * scale}px ${50 * scale}px`,
              backgroundPosition: `${offset.x}px ${offset.y}px`
            }}
          >
            <div style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: '0 0', width: '100%', height: '100%' }}>
              
              {maps.sort((a, b) => a.zIndex - b.zIndex).map((map) => (
                <img 
                  key={map.id} 
                  src={map.url} 
                  alt="Map"
                  onContextMenu={(e) => handleMapContextMenu(e, map.id)}
                  onPointerDown={(e) => {
                    if (!isMapsLocked && !map.isLocked) {
                      e.stopPropagation();
                      setDraggedMap(map.id);
                      setLastMousePos({ x: e.clientX, y: e.clientY });
                      setMaps(prev => prev.map(m => m.id === map.id ? { ...m, zIndex: Date.now() } : m));
                      try { e.target.setPointerCapture(e.pointerId); } catch(err){}
                    }
                  }}
                  style={{
                    position: 'absolute', left: `${map.x}px`, top: `${map.y}px`,
                    width: `${map.originalWidth}px`, height: `${map.originalHeight}px`,
                    cursor: (isMapsLocked || map.isLocked) ? 'default' : (draggedMap === map.id ? 'grabbing' : 'grab'),
                    border: (isMapsLocked || map.isLocked) ? 'none' : '2px dashed rgba(59, 130, 246, 0.5)',
                    pointerEvents: 'auto'
                  }} 
                  draggable={false}
                />
              ))}

              {tokens.map((token) => (
                <GameToken 
                  key={token.id} 
                  token={token}
                  showNames={showNames}
                  isDragging={draggedToken === token.id}
                  onToggleLock={toggleTokenLock}
                  onUpdateSize={handleUpdateTokenSize}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDraggedToken(token.id);
                    setLastMousePos({ x: e.clientX, y: e.clientY });
                    try { e.target.setPointerCapture(e.pointerId); } catch(err){}
                  }}
                />
              ))}
            </div>
          </div>

          {mapContextMenu.visible && (
            <div 
              ref={mapMenuRef}
              style={{
                position: 'fixed', top: `${mapContextMenu.y}px`, left: `${mapContextMenu.x}px`,
                backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '6px',
                padding: '4px', zIndex: 1000, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)',
                display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '150px'
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button 
                onPointerDown={() => toggleIndividualMapLock(mapContextMenu.mapId)}
                style={{ padding: '8px 12px', background: 'transparent', color: 'white', border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: '4px' }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#374151'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                {maps.find(m => m.id === mapContextMenu.mapId)?.isLocked ? '🔓 Desbloquear Mapa' : '🔒 Bloquear Mapa'}
              </button>
              <button 
                onPointerDown={() => deleteMap(mapContextMenu.mapId)}
                style={{ padding: '8px 12px', background: 'transparent', color: '#ef4444', border: 'none', textAlign: 'left', cursor: 'pointer', borderRadius: '4px' }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#374151'}
                onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                🗑️ Eliminar Mapa
              </button>
            </div>
          )}

          {isCharModalOpen && (
            <CharacterModal 
              onClose={() => setIsCharModalOpen(false)}
              onSave={handleSaveCharacter}
            />
          )}

        </div>
      </div>
    </>
  );
};

export default App;