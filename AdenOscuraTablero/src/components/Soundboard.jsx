import React, { useState, useEffect, useRef } from 'react';

export const SOUND_CATALOG = [
  // Ambientes Continuos (Loops)
  { id: 'amb_rain', label: 'Lluvia Intensa', icon: '🌧️', category: 'Ambiente', loop: true },
  { id: 'amb_wind', label: 'Viento de Cueva', icon: '💨', category: 'Ambiente', loop: true },
  { id: 'amb_fire', label: 'Hoguera / Antorcha', icon: '🔥', category: 'Ambiente', loop: true },
  { id: 'amb_dungeon', label: 'Mazmorra Tétrica', icon: '🏰', category: 'Ambiente', loop: true },
  { id: 'amb_tavern', label: 'Murmullo Taberna', icon: '🍺', category: 'Ambiente', loop: true },

  // Puertas y Mecanismos
  { id: 'sfx_door_open', label: 'Puerta Abriéndose', icon: '🚪', category: 'Entorno' },
  { id: 'sfx_door_slam', label: 'Portazo Fuerte', icon: '🔒', category: 'Entorno' },
  { id: 'sfx_glass', label: 'Cristales Rotos', icon: '🪟', category: 'Entorno' },
  { id: 'sfx_trap', label: 'Mecanismo / Trampa', icon: '⚙️', category: 'Entorno' },
  { id: 'sfx_thunder', label: 'Trueno Lejano', icon: '⚡', category: 'Entorno' },
  { id: 'sfx_chest', label: 'Cofre / Monedas', icon: '🪙', category: 'Entorno' },

  // Combate e Impactos
  { id: 'sfx_sword', label: 'Choque de Espadas', icon: '⚔️', category: 'Combate' },
  { id: 'sfx_hit', label: 'Golpe Contundente', icon: '🥊', category: 'Combate' },
  { id: 'sfx_arrow', label: 'Flecha Silbando', icon: '🏹', category: 'Combate' },
  { id: 'sfx_fireball', label: 'Explosión / Fuego', icon: '💥', category: 'Combate' },
  { id: 'sfx_magic', label: 'Hechizo Arcano', icon: '✨', category: 'Combate' },

  // Animales y Criaturas
  { id: 'sfx_wolf', label: 'Aullido de Lobo', icon: '🐺', category: 'Criaturas' },
  { id: 'sfx_roar', label: 'Rugido de Monstruo', icon: '🦖', category: 'Criaturas' },
  { id: 'sfx_crow', label: 'Graznido de Cuervo', icon: '🐦‍⬛', category: 'Criaturas' },
  { id: 'sfx_bats', label: 'Bandada Murciélagos', icon: '🦇', category: 'Criaturas' },
  { id: 'sfx_ghost', label: 'Lamento Espectral', icon: '👻', category: 'Criaturas' }
];

const MAX_AUDIO_SIZE_BYTES = 1.5 * 1024 * 1024; // 1.5 MB máximo para mantener ligereza

// Motor de Síntesis Web Audio API + Reproductor de Audio Personalizado (.ogg / .mp3)
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.activeLoops = {};
    this.activeAudioTags = {};
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  createNoiseBuffer(seconds = 2) {
    const bufferSize = this.ctx.sampleRate * seconds;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  stopLoop(id) {
    if (this.activeLoops[id]) {
      try {
        this.activeLoops[id].stop();
        this.activeLoops[id].disconnect();
      } catch (e) {}
      delete this.activeLoops[id];
    }
    if (this.activeAudioTags[id]) {
      try {
        this.activeAudioTags[id].pause();
        this.activeAudioTags[id].currentTime = 0;
      } catch (e) {}
      delete this.activeAudioTags[id];
    }
  }

  stopAll() {
    Object.keys(this.activeLoops).forEach(id => this.stopLoop(id));
    Object.keys(this.activeAudioTags).forEach(id => this.stopLoop(id));
  }

  play(soundOrId, customAudioSrc = null, isLoop = false) {
    const id = typeof soundOrId === 'object' ? soundOrId.id : soundOrId;
    const audioDataUrl = typeof soundOrId === 'object' ? soundOrId.audioDataUrl : customAudioSrc;
    const loopFlag = typeof soundOrId === 'object' ? Boolean(soundOrId.loop) : Boolean(isLoop);

    // Si es un sonido personalizado (.mp3 / .ogg en Base64)
    if (audioDataUrl) {
      if (loopFlag && this.activeAudioTags[id]) {
        this.stopLoop(id);
        return false;
      }
      try {
        const audio = new Audio(audioDataUrl);
        audio.loop = loopFlag;
        audio.volume = 0.85;
        audio.play().catch(() => {});
        if (loopFlag) {
          this.activeAudioTags[id] = audio;
        }
      } catch (e) {
        console.error('Error reproduciendo audio personalizado:', e);
      }
      return true;
    }

    this.init();
    const now = this.ctx.currentTime;

    // Si es un ambiente sintético en bucle y ya está sonando, lo detenemos (toggle)
    if (id.startsWith('amb_')) {
      if (this.activeLoops[id]) {
        this.stopLoop(id);
        return false;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.createNoiseBuffer(4);
      noise.loop = true;

      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      if (id === 'amb_rain') {
        filter.type = 'bandpass';
        filter.frequency.value = 1100;
        filter.Q.value = 0.7;
        gain.gain.value = 0.18;
      } else if (id === 'amb_wind') {
        filter.type = 'lowpass';
        filter.frequency.value = 320;
        gain.gain.value = 0.25;
      } else if (id === 'amb_fire') {
        filter.type = 'highpass';
        filter.frequency.value = 1500;
        gain.gain.value = 0.08;
      } else if (id === 'amb_dungeon') {
        filter.type = 'lowpass';
        filter.frequency.value = 110;
        gain.gain.value = 0.45;
      } else if (id === 'amb_tavern') {
        filter.type = 'bandpass';
        filter.frequency.value = 480;
        filter.Q.value = 1.4;
        gain.gain.value = 0.16;
      }

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start();
      this.activeLoops[id] = noise;
      return true;
    }

    // Efectos puntuales (One-shots)
    switch (id) {
      case 'sfx_door_open': {
        // Chirrido grave de bisagra y madera
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(95, now);
        osc.frequency.linearRampToValueAtTime(145, now + 0.35);
        osc.frequency.linearRampToValueAtTime(80, now + 0.8);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.85);
        break;
      }
      case 'sfx_door_slam':
      case 'sfx_hit': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(id === 'sfx_door_slam' ? 120 : 150, now);
        osc.frequency.exponentialRampToValueAtTime(22, now + 0.35);
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }
      case 'sfx_glass': {
        // Múltiples fragmentos agudos cristalinos
        for (let i = 0; i < 8; i++) {
          const delay = i * 0.045;
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(2200 + Math.random() * 2800, now + delay);
          gain.gain.setValueAtTime(0.15, now + delay);
          gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.14);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + delay);
          osc.stop(now + delay + 0.15);
        }
        break;
      }
      case 'sfx_sword': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(920, now);
        osc.frequency.exponentialRampToValueAtTime(2600, now + 0.08);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.35);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      }
      case 'sfx_arrow': {
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(0.4);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(2800, now + 0.15);
        filter.frequency.exponentialRampToValueAtTime(400, now + 0.35);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);
        break;
      }
      case 'sfx_fireball':
      case 'sfx_thunder': {
        const dur = id === 'sfx_thunder' ? 2.2 : 1.1;
        const noise = this.ctx.createBufferSource();
        noise.buffer = this.createNoiseBuffer(dur);
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(id === 'sfx_thunder' ? 400 : 800, now);
        filter.frequency.exponentialRampToValueAtTime(45, now + dur);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        noise.start(now);
        break;
      }
      case 'sfx_magic': {
        [440, 554.37, 659.25, 880, 1108.73].forEach((freq, idx) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + idx * 0.06);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.5, now + idx * 0.06 + 0.6);
          gain.gain.setValueAtTime(0.12, now + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.65);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + idx * 0.06);
          osc.stop(now + idx * 0.06 + 0.7);
        });
        break;
      }
      case 'sfx_wolf':
      case 'sfx_ghost': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(id === 'sfx_wolf' ? 260 : 380, now);
        osc.frequency.exponentialRampToValueAtTime(id === 'sfx_wolf' ? 520 : 620, now + 0.6);
        osc.frequency.exponentialRampToValueAtTime(id === 'sfx_wolf' ? 390 : 280, now + 1.7);
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.28, now + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 1.85);
        break;
      }
      case 'sfx_roar': {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.linearRampToValueAtTime(55, now + 1.1);
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 1.25);
        break;
      }
      case 'sfx_crow': {
        [0, 0.28].forEach(offset => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(820, now + offset);
          osc.frequency.linearRampToValueAtTime(520, now + offset + 0.18);
          gain.gain.setValueAtTime(0.18, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.2);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.22);
        });
        break;
      }
      default: {
        // Sonido metálico corto para cofres, trampas o murciélagos
        [0, 0.08, 0.16].forEach((offset, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(1200 + i * 400, now + offset);
          gain.gain.setValueAtTime(0.2, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + offset);
          osc.stop(now + offset + 0.14);
        });
      }
    }
    return true;
  }
}

export const playerSoundEngine = new SoundEngine();

const Soundboard = ({
  onTriggerSound,
  onStopAllSounds,
  activeLoops = [],
  masterToast,
  customSounds = [],
  onAddCustomSound,
  onRemoveCustomSound
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Ambiente');
  const [newSoundLabel, setNewSoundLabel] = useState('');
  const [newSoundIcon, setNewSoundIcon] = useState('🎵');
  const [newSoundLoop, setNewSoundLoop] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const fileInputRef = useRef(null);

  const categories = ['Ambiente', 'Entorno', 'Combate', 'Criaturas', 'Propios'];

  const handleAudioFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadError(null);

    if (file.size > MAX_AUDIO_SIZE_BYTES) {
      setUploadError('⚠️ El archivo supera 1.5 MB. Usa un .ogg o .mp3 corto y ligero.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const cleanName = newSoundLabel.trim() || file.name.replace(/\.[^/.]+$/, '').slice(0, 18);
      const customObj = {
        id: `custom_snd_${Date.now()}`,
        label: cleanName,
        icon: newSoundIcon.trim() || '🎵',
        category: 'Propios',
        loop: newSoundLoop,
        audioDataUrl: evt.target.result
      };
      if (onAddCustomSound) onAddCustomSound(customObj);
      setNewSoundLabel('');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const displayedSounds = activeCategory === 'Propios'
    ? customSounds
    : SOUND_CATALOG.filter(s => s.category === activeCategory);

  return (
    <>
      {/* Toast Informativo Exclusivo para la Pantalla del Master */}
      {masterToast && (
        <div style={{
          position: 'fixed',
          top: '75px',
          right: '25px',
          background: 'linear-gradient(180deg, rgba(38, 24, 16, 0.96) 0%, rgba(18, 11, 7, 0.98) 100%)',
          border: '2px solid #d4af37',
          borderLeft: '6px solid #d4af37',
          borderRadius: '8px',
          padding: '12px 18px',
          color: '#f3e5ab',
          zIndex: 99999,
          boxShadow: '0 12px 30px rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          pointerEvents: 'none'
        }}>
          <span style={{ fontSize: '22px' }}>{masterToast.icon || '🔊'}</span>
          <div>
            <div className="vtt-gothic-title" style={{ fontSize: '10px', color: '#c5a059', fontWeight: 'bold' }}>
              Resonando en Sala de Jugadores
            </div>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fffbeb' }}>
              {masterToast.label}
            </div>
          </div>
        </div>
      )}

      {/* Panel Flotante de Efectos de Sonido */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '145px',
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
              width: '350px',
              border: '2px solid #8a6d3b',
              borderRadius: '10px',
              padding: '16px',
              marginBottom: '10px',
              color: '#e6d5b8',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #6b4c2b', paddingBottom: '8px' }}>
              <span className="vtt-gothic-title" style={{ fontWeight: 'bold', fontSize: '14px', color: '#d4af37' }}>🎵 Órgano de Ecos (Jugador)</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {activeLoops.length > 0 && (
                  <button
                    onClick={onStopAllSounds}
                    style={{ background: '#991b1b', border: '1px solid #f87171', color: 'white', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    ⏹ Silenciar
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: '#c5a059', cursor: 'pointer', fontSize: '16px' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Pestañas de Categorías */}
            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#120b07', padding: '4px', borderRadius: '6px', border: '1px solid #5c4028' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setActiveCategory(cat); setUploadError(null); }}
                  className="vtt-gothic-title"
                  style={{
                    flex: 1,
                    padding: '6px 3px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    borderRadius: '4px',
                    border: 'none',
                    cursor: 'pointer',
                    background: activeCategory === cat ? 'linear-gradient(180deg, #b45309 0%, #78350f 100%)' : 'transparent',
                    color: activeCategory === cat ? '#fffbeb' : '#c5a059'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Formulario para subir audio ligero (.ogg / .mp3) en la pestaña Propios */}
            {activeCategory === 'Propios' && (
              <div style={{ backgroundColor: '#120b07', border: '1px solid #6b4c2b', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="text"
                    value={newSoundIcon}
                    onChange={(e) => setNewSoundIcon(e.target.value)}
                    placeholder="🎵"
                    style={{ width: '42px', padding: '6px', textAlign: 'center', backgroundColor: '#1c120c', color: '#f3e5ab', border: '1px solid #8a6d3b', borderRadius: '4px' }}
                    title="Icono del sonido"
                  />
                  <input
                    type="text"
                    value={newSoundLabel}
                    onChange={(e) => setNewSoundLabel(e.target.value)}
                    placeholder="Nombre (opcional)..."
                    style={{ flex: 1, padding: '6px 8px', backgroundColor: '#1c120c', color: '#f3e5ab', border: '1px solid #8a6d3b', borderRadius: '4px', fontSize: '12px' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#c5a059', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={newSoundLoop}
                      onChange={(e) => setNewSoundLoop(e.target.checked)}
                    />
                    🔁 En bucle (Ambiente)
                  </label>

                  <input
                    type="file"
                    accept=".ogg,.mp3,.wav,audio/ogg,audio/mpeg,audio/wav"
                    ref={fileInputRef}
                    onChange={handleAudioFileUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => fileInputRef.current.click()}
                    className="vtt-brass-btn"
                    style={{ padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold' }}
                  >
                    📂 Subir .ogg / .mp3 (≤1.5MB)
                  </button>
                </div>

                {uploadError && (
                  <div style={{ fontSize: '11px', color: '#f87171', textAlign: 'center' }}>
                    {uploadError}
                  </div>
                )}
              </div>
            )}

            {/* Botonera de Sonidos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '230px', overflowY: 'auto' }}>
              {displayedSounds.map(sound => {
                const isLooping = activeLoops.includes(sound.id);
                return (
                  <div
                    key={sound.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '6px',
                      border: isLooping ? '1px solid #fbbf24' : '1px solid #5c4028',
                      backgroundColor: isLooping ? 'rgba(180, 83, 9, 0.35)' : '#120b07',
                      overflow: 'hidden'
                    }}
                  >
                    <button
                      onClick={() => onTriggerSound(sound)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        background: 'transparent',
                        border: 'none',
                        color: '#f3e5ab',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '13px',
                        fontWeight: 'bold',
                        overflow: 'hidden'
                      }}
                    >
                      <span style={{ fontSize: '17px' }}>{sound.icon}</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {sound.label}
                      </span>
                      {isLooping && <span style={{ color: '#fbbf24', fontSize: '10px' }}>●</span>}
                    </button>

                    {activeCategory === 'Propios' && onRemoveCustomSound && (
                      <button
                        onClick={() => onRemoveCustomSound(sound.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          borderLeft: '1px solid #3a2618',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '8px 7px',
                          fontSize: '12px'
                        }}
                        title="Eliminar sonido personalizado"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                );
              })}
              {activeCategory === 'Propios' && customSounds.length === 0 && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', fontSize: '12px', color: '#8a6d3b', padding: '12px', fontStyle: 'italic' }}>
                  Sube archivos .ogg o .mp3 cortos para usarlos en la mesa o en el menú radial del mapa.
                </div>
              )}
            </div>

            <div style={{ fontSize: '12px', color: '#b89f7d', textAlign: 'center', borderTop: '1px solid #6b4c2b', paddingTop: '6px', fontStyle: 'italic' }}>
              🔇 Silenciado en la mesa del Master para evitar eco.
            </div>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="vtt-brass-btn"
          style={{
            padding: '10px 18px',
            borderRadius: '8px',
            border: activeLoops.length > 0 ? '2px solid #fbbf24' : '2px solid #8a6d3b',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🎵 {isOpen ? 'Cerrar Ecos' : 'Ecos'}
          {activeLoops.length > 0 && (
            <span style={{ backgroundColor: '#d4af37', color: '#120b07', borderRadius: '999px', padding: '1px 6px', fontSize: '11px', fontWeight: '900' }}>
              {activeLoops.length}
            </span>
          )}
        </button>
      </div>
    </>
  );
};

export default Soundboard;