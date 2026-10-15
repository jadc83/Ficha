import React, { useState } from 'react';

const TUTORIAL_STEPS = [
  {
    title: '⚜️ Bienvenido al Grimorio VTT',
    icon: '🏰',
    text: 'Esta es tu mesa virtual de rol (VTT). Todo está diseñado al estilo gótico/barroco con madera noble, pergamino y bronce para mantener la máxima inmersión en tus partidas.'
  },
  {
    title: '🗺️ El Creador de Mapas y Estructuras',
    icon: '🧱',
    text: 'Entra en "Forja y Ajustes ➔ Creador de Mapas" para subir el plano de tu mazmorra. Allí puedes trazar Muros infranqueables, colocar Puertas (clic derecho para abrir/cerrar) y Ventanas (dejan pasar la visión pero bloquean el paso).'
  },
  {
    title: '📦 Objetos Interactivos y Antorchas',
    icon: '🔥',
    text: 'En el Creador de Mapas puedes colocar Objetos (Cofres, Palancas, Barricadas, Altares) y Fuentes de Luz estáticas (Antorchas y Braseros) que iluminan por sí solas la niebla de guerra y pueden apagarse o encenderse con clic derecho.'
  },
  {
    title: '🕯️ Niebla de Guerra Profesional (60 FPS)',
    icon: '🔦',
    text: 'Las fichas de tus héroes (Aliados) emiten un cono de visión real de 90º o un halo de 360º. Usa Shift + Rueda sobre una ficha (o arrastra su punta dorada) para girar su mirada suavemente.'
  },
  {
    title: '👻 Sigilo, Facciones y Enemigos Ocultos',
    icon: '💀',
    text: 'Marca a los monstruos como "Enemigo" o dales "Sigilo (👻)" para que desaparezcan de la pantalla de tus jugadores. ¡Solo aparecerán ante ellos si entran dentro del cono de visión de un héroe o bajo la luz de una antorcha!'
  },
  {
    title: '🎵 Ecos, Clima y Pantalla de Jugadores',
    icon: '⛈️',
    text: 'Usa el botón "Pantalla de Jugadores" para abrir una ventana secundaria sincronizada al milisegundo. Añade efectos de clima (lluvia, tormenta, ceniza) y activa sonidos atmosféricos que resonarán en su monitor.'
  }
];

const TutorialModal = ({ isOpen, onClose, onNeverShowAgain }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = TUTORIAL_STEPS[currentStep];
  const isLast = currentStep === TUTORIAL_STEPS.length - 1;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.85)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 999999, padding: '20px'
    }}>
      <div 
        className="vtt-wood-panel"
        style={{
          width: '520px', maxWidth: '100%',
          borderRadius: '12px',
          border: '3px solid #d4af37',
          padding: '30px',
          display: 'flex', flexDirection: 'column', gap: '20px',
          color: '#e6d5b8',
          boxShadow: '0 25px 60px rgba(0,0,0,0.95), inset 0 0 40px rgba(120, 53, 15, 0.4)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #6b4c2b', paddingBottom: '10px' }}>
          <span className="vtt-gothic-title" style={{ fontSize: '18px', color: '#d4af37', fontWeight: 'bold' }}>
            {step.title}
          </span>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#c5a059', cursor: 'pointer', fontSize: '18px' }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', gap: '20px', alignItems: 'center', minHeight: '120px' }}>
          <div style={{
            fontSize: '48px',
            background: 'radial-gradient(circle, #3a2618 0%, #170f0a 100%)',
            border: '2px solid #8a6d3b',
            borderRadius: '50%',
            width: '80px', height: '80px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: '0',
            boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.8)'
          }}>
            {step.icon}
          </div>
          <p style={{ fontSize: '16px', lineHeight: '1.6', margin: 0, color: '#f3e5ab', fontFamily: "'Crimson Text', Georgia, serif" }}>
            {step.text}
          </p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #6b4c2b', paddingTop: '15px' }}>
          <span style={{ fontSize: '13px', color: '#b89f7d', fontStyle: 'italic' }}>
            Paso {currentStep + 1} de {TUTORIAL_STEPS.length}
          </span>

          <div style={{ display: 'flex', gap: '10px' }}>
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="vtt-brass-btn"
                style={{ padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
              >
                ⬅️ Anterior
              </button>
            )}

            {!isLast ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                className="vtt-brass-btn"
                style={{ padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}
              >
                Siguiente ➔
              </button>
            ) : (
              <button
                onClick={onClose}
                className="vtt-gothic-title"
                style={{
                  padding: '8px 24px',
                  background: 'linear-gradient(180deg, #b45309 0%, #78350f 100%)',
                  color: '#fffbeb',
                  borderRadius: '6px',
                  border: '1px solid #fbbf24',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.7)'
                }}
              >
                ⚔️ Comenzar Partida
              </button>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => {
              if (onNeverShowAgain) onNeverShowAgain();
              onClose();
            }}
            style={{ background: 'transparent', border: 'none', color: '#8a6d3b', cursor: 'pointer', fontSize: '12px', textDecoration: 'underline' }}
          >
            No volver a mostrar automáticamente al iniciar
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialModal;