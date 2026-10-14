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

// Motor de Síntesis Web Audio API (Solo se ejecuta en la Vista de Jugador)
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.activeLoops = {};
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
  }

  stopAll() {
    Object.keys(this.activeLoops).forEach(id => this.stopLoop(id));
  }

  play(id) {
    this.init();
    const now = this.ctx.currentTime;

    // Si es un ambiente en bucle y ya está sonando, lo detenemos (toggle)
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

const Soundboard = ({ onTriggerSound, onStopAllSounds, activeLoops = [], masterToast }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('Ambiente');
  const categories = ['Ambiente', 'Entorno', 'Combate', 'Criaturas'];

  return (
    <>
      {/* Toast Informativo Exclusivo para la Pantalla del Master */}
      {masterToast && (
        <div style={{
          position: 'fixed',
          top: '75px',
          right: '25px',
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          border: '1px solid #10b981',
          borderLeft: '5px solid #10b981',
          borderRadius: '8px',
          padding: '12px 18px',
          color: 'white',
          zIndex: 99999,
          boxShadow: '0 10px 25px rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          pointerEvents: 'none'
        }}>
          <span style={{ fontSize: '22px' }}>{masterToast.icon || '🔊'}</span>
          <div>
            <div style={{ fontSize: '11px', color: '#34d399', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Sonando en Pantalla de Jugador
            </div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#f3f4f6' }}>
              {masterToast.label}
            </div>
          </div>
        </div>
      )}

      {/* Panel Flotante de Efectos de Sonido (Abajo a la derecha, junto a Dados) */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '175px',
          zIndex: 5000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end'
        }}
      >
        {isOpen && (
          <div style={{
            width: '340px',
            backgroundColor: '#1f2937',
            border: '1px solid #374151',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '10px',
            boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #374151', paddingBottom: '8px' }}>
              <span style={{ fontWeight: 'bold', fontSize: '15px', color: '#f3f4f6' }}>🎵 Efectos de Sonido (Jugador)</span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {activeLoops.length > 0 && (
                  <button
                    onClick={onStopAllSounds}
                    style={{ background: '#ef4444', border: 'none', color: 'white', borderRadius: '4px', padding: '3px 8px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    ⏹ Parar Todo
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  style={{ background: 'transparent', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '16px' }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Pestañas de Categorías */}
            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#111827', padding: '4px', borderRadius: '8px' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    flex: 1,
                    padding: '6px 4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: activeCategory === cat ? '#3b82f6' : 'transparent',
                    color: activeCategory === cat ? 'white' : '#9ca3af'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Botonera de Sonidos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', maxHeight: '230px', overflowY: 'auto' }}>
              {SOUND_CATALOG.filter(s => s.category === activeCategory).map(sound => {
                const isLooping = activeLoops.includes(sound.id);
                return (
                  <button
                    key={sound.id}
                    onClick={() => onTriggerSound(sound)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: isLooping ? '1px solid #10b981' : '1px solid #374151',
                      backgroundColor: isLooping ? 'rgba(16, 185, 129, 0.2)' : '#111827',
                      color: 'white',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      transition: 'all 0.15s'
                    }}
                  >
                    <span style={{ fontSize: '18px' }}>{sound.icon}</span>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sound.label}
                    </span>
                    {isLooping && <span style={{ color: '#10b981', fontSize: '10px' }}>●</span>}
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', borderTop: '1px solid #374151', paddingTop: '6px' }}>
              🔇 El audio está silenciado en tu ventana de Master para evitar eco.
            </div>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            padding: '10px 16px',
            borderRadius: '999px',
            backgroundColor: isOpen ? '#10b981' : '#1f2937',
            color: isOpen ? '#111827' : 'white',
            border: activeLoops.length > 0 ? '2px solid #10b981' : '1px solid #374151',
            boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          🎵 {isOpen ? 'Cerrar Sonidos' : 'Sonidos'}
          {activeLoops.length > 0 && (
            <span style={{ backgroundColor: '#10b981', color: '#111827', borderRadius: '999px', padding: '1px 6px', fontSize: '11px', fontWeight: '900' }}>
              {activeLoops.length}
            </span>
          )}
        </button>
      </div>
    </>
  );
};

export default Soundboard;