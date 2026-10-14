import React, { useEffect, useRef } from 'react';

const CANVAS_SIZE = 4000;
const CANVAS_OFFSET = 1000;

// Intersección exacta entre un rayo (ox, oy) + t*(dx, dy) y un segmento (x1,y1)-(x2,y2)
const raySegmentIntersection = (ox, oy, dx, dy, x1, y1, x2, y2) => {
  const s_dx = x2 - x1;
  const s_dy = y2 - y1;

  const denom = s_dx * dy - s_dy * dx;
  if (Math.abs(denom) < 1e-7) return null;

  const t2 = (dx * (y1 - oy) + dy * (ox - x1)) / denom;
  if (t2 < -0.0001 || t2 > 1.0001) return null;

  const t1 = Math.abs(dx) > Math.abs(dy)
    ? (x1 + s_dx * t2 - ox) / dx
    : (y1 + s_dy * t2 - oy) / dy;

  return t1 >= 0 ? t1 : null;
};

// Normaliza un ángulo al rango [-180, 180] respecto a una dirección central
const angleDiff = (a, b) => {
  let d = ((a - b + 180) % 360 + 360) % 360 - 180;
  return d;
};

// Extrae todos los segmentos que bloquean la visión (muros y puertas cerradas; las ventanas dejan pasar la luz)
const getVisionBlockers = (maps = []) => {
  const segments = [];
  for (const el of maps) {
    if (el.type === 'wall') {
      segments.push({ x1: el.x1, y1: el.y1, x2: el.x2, y2: el.y2 });
    } else if (el.type === 'door' && !el.isOpen) {
      const w = el.width || 60;
      const h = el.height || 16;
      if (w >= h) {
        segments.push({ x1: el.x, y1: el.y + h / 2, x2: el.x + w, y2: el.y + h / 2 });
      } else {
        segments.push({ x1: el.x + w / 2, y1: el.y, x2: el.x + w / 2, y2: el.y + h });
      }
    }
  }
  return segments;
};

// Calcula el polígono de visión combinando barrido angular fino + rayos exactos a los vértices de muros
const computeVisibilityPolygon = (ox, oy, radius, angleDeg = 0, fovDeg = 90, blockers = []) => {
  const isFullCircle = fovDeg >= 360;
  const halfFov = fovDeg / 2;
  const angles = [];

  // 1. Barrido base suave cada 1.5 grados
  const stepDeg = 1.5;
  if (isFullCircle) {
    for (let a = 0; a < 360; a += stepDeg) {
      angles.push((a * Math.PI) / 180);
    }
  } else {
    for (let offset = -halfFov; offset <= halfFov; offset += stepDeg) {
      angles.push(((angleDeg + offset) * Math.PI) / 180);
    }
    angles.push(((angleDeg - halfFov) * Math.PI) / 180);
    angles.push(((angleDeg + halfFov) * Math.PI) / 180);
  }

  // 2. Rayos exactos a las esquinas de muros y puertas cercanas para sombras nítidas sin parpadeos
  const rSq = radius * radius * 1.2;
  for (let i = 0; i < blockers.length; i++) {
    const seg = blockers[i];
    const pts = [
      { x: seg.x1, y: seg.y1 },
      { x: seg.x2, y: seg.y2 }
    ];
    for (let j = 0; j < 2; j++) {
      const vx = pts[j].x - ox;
      const vy = pts[j].y - oy;
      if (vx * vx + vy * vy <= rSq) {
        const deg = (Math.atan2(vy, vx) * 180) / Math.PI;
        if (isFullCircle || Math.abs(angleDiff(deg, angleDeg)) <= halfFov) {
          const rad = Math.atan2(vy, vx);
          angles.push(rad - 0.0005, rad, rad + 0.0005);
        }
      }
    }
  }

  // Normalización estricta en [0, 360) para evitar que rayos en la frontera -180º/+180º deformen el cono
  const startAngleDeg = isFullCircle ? -180 : angleDeg - halfFov;
  angles.sort((ra, rb) => {
    const da = ((((ra * 180) / Math.PI - startAngleDeg) % 360) + 360) % 360;
    const db = ((((rb * 180) / Math.PI - startAngleDeg) % 360) + 360) % 360;
    return da - db;
  });

  const points = [];
  for (let i = 0; i < angles.length; i++) {
    const rad = angles[i];
    const dx = Math.cos(rad);
    const dy = Math.sin(rad);

    let closestT = radius;
    for (let j = 0; j < blockers.length; j++) {
      const seg = blockers[j];
      const t = raySegmentIntersection(ox, oy, dx, dy, seg.x1, seg.y1, seg.x2, seg.y2);
      if (t !== null && t < closestT) {
        closestT = t;
      }
    }

    points.push({
      x: ox + dx * closestT + CANVAS_OFFSET,
      y: oy + dy * closestT + CANVAS_OFFSET
    });
  }

  return points;
};

const tracePolygonPath = (ctx, cx, cy, points, isFullCircle) => {
  ctx.beginPath();
  if (!points || points.length === 0) return;

  if (isFullCircle) {
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
  } else {
    ctx.moveTo(cx, cy);
    for (let i = 0; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
  }
  ctx.closePath();
};

const drawTokenVisionMask = (ctx, ox, oy, radius, angleDeg = 0, fovDeg = 90, tokenSize = 50, blockers = [], eraseAlpha = 1, compositeOp = 'destination-out') => {
  if (!Number.isFinite(ox) || !Number.isFinite(oy) || !Number.isFinite(radius) || radius <= 0) return;
  const cx = ox + CANVAS_OFFSET;
  const cy = oy + CANVAS_OFFSET;
  const isFullCircle = fovDeg >= 360;

  ctx.save();
  ctx.globalCompositeOperation = compositeOp;

  // 1. Halo cercano de presencia (permite ver siempre la propia ficha del personaje aunque mire en cono)
  const personalRadius = Math.max((tokenSize || 50) * 0.85, 36);
  if (!isFullCircle) {
    const haloPoints = computeVisibilityPolygon(ox, oy, personalRadius, 0, 360, blockers);
    tracePolygonPath(ctx, cx, cy, haloPoints, true);
    const haloGrad = ctx.createRadialGradient(cx, cy, personalRadius * 0.25, cx, cy, personalRadius);
    haloGrad.addColorStop(0, `rgba(0, 0, 0, ${eraseAlpha})`);
    haloGrad.addColorStop(0.75, `rgba(0, 0, 0, ${eraseAlpha * 0.85})`);
    haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = haloGrad;
    ctx.fill();
  }

  // 2. Cono principal o círculo completo de visión con caída suave tipo antorcha
  const polyPoints = computeVisibilityPolygon(ox, oy, radius, angleDeg, fovDeg, blockers);
  tracePolygonPath(ctx, cx, cy, polyPoints, isFullCircle);

  const grad = ctx.createRadialGradient(cx, cy, radius * 0.1, cx, cy, radius);
  grad.addColorStop(0, `rgba(0, 0, 0, ${eraseAlpha})`);
  grad.addColorStop(0.76, `rgba(0, 0, 0, ${eraseAlpha * 0.94})`);
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fill();
  ctx.restore();
};

const FogLayer = ({
  fowEnabled,
  fowCanvasRef,
  fowActions = [],
  maps = [],
  tokens = [],
  fowVisionRadius = 180,
  fowMemoryEnabled = true,
  isPlayerView = false
}) => {
  // cacheCanvasRef guarda la niebla base y pinceladas manuales; memoryCanvasRef guarda la máscara de penumbra explorada sin sobreacumularse
  const cacheCanvasRef = useRef(null);
  const memoryCanvasRef = useRef(null);
  const processedCountRef = useRef(0);
  const lastBlockersKeyRef = useRef('');

  useEffect(() => {
    const canvas = fowCanvasRef.current;
    if (!canvas || !fowEnabled) return;

    if (!cacheCanvasRef.current) {
      const offscreen = document.createElement('canvas');
      offscreen.width = CANVAS_SIZE;
      offscreen.height = CANVAS_SIZE;
      cacheCanvasRef.current = offscreen;
    }

    if (!memoryCanvasRef.current) {
      const memOffscreen = document.createElement('canvas');
      memOffscreen.width = CANVAS_SIZE;
      memOffscreen.height = CANVAS_SIZE;
      memoryCanvasRef.current = memOffscreen;
    }

    const cacheCanvas = cacheCanvasRef.current;
    const cacheCtx = cacheCanvas.getContext('2d');
    const memoryCanvas = memoryCanvasRef.current;
    const memoryCtx = memoryCanvas.getContext('2d');
    const blockers = getVisionBlockers(maps);
    const blockersKey = JSON.stringify(blockers);

    // Si se limpió el historial o cambiaron muros/puertas, reconstruimos la base de niebla en caché
    if (
      fowActions.length < processedCountRef.current ||
      fowActions.length === 0 ||
      blockersKey !== lastBlockersKeyRef.current
    ) {
      cacheCtx.globalCompositeOperation = 'source-over';
      cacheCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      cacheCtx.fillStyle = 'rgba(7, 5, 4, 1)';
      cacheCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      memoryCtx.globalCompositeOperation = 'source-over';
      memoryCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      processedCountRef.current = 0;
      lastBlockersKeyRef.current = blockersKey;
    }

    // Procesar únicamente las acciones nuevas pendientes
    for (let i = processedCountRef.current; i < fowActions.length; i++) {
      const action = fowActions[i];
      if (!action || !Number.isFinite(action.x) || !Number.isFinite(action.y)) continue;

      if (action.type === 'reveal') {
        if (action.mode === 'token') {
          if (fowMemoryEnabled) {
            // Pintamos la zona explorada en el lienzo de memoria con source-over para que girar en el sitio no borre de más la penumbra
            const fov = action.visionMode === 'circle' ? 360 : (action.fov || 90);
            drawTokenVisionMask(
              memoryCtx,
              action.x,
              action.y,
              action.radius || fowVisionRadius,
              action.angle || 0,
              fov,
              action.tokenSize || 50,
              blockers,
              1.0,
              'source-over'
            );
          }
        } else {
          // El pincel manual del Master despeja el 100% de la niebla en esa zona
          const r = Math.max(5, action.radius || 50);
          const cx = action.x + CANVAS_OFFSET;
          const cy = action.y + CANVAS_OFFSET;
          cacheCtx.save();
          cacheCtx.beginPath();
          cacheCtx.arc(cx, cy, r, 0, Math.PI * 2);
          const grad = cacheCtx.createRadialGradient(cx, cy, r * 0.25, cx, cy, r);
          grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
          grad.addColorStop(0.82, 'rgba(0, 0, 0, 0.95)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          cacheCtx.globalCompositeOperation = 'destination-out';
          cacheCtx.fillStyle = grad;
          cacheCtx.fill();
          cacheCtx.restore();
        }
      } else if (action.type === 'hide') {
        const r = Math.max(5, action.radius || 50);
        const cx = action.x + CANVAS_OFFSET;
        const cy = action.y + CANVAS_OFFSET;
        cacheCtx.save();
        cacheCtx.beginPath();
        cacheCtx.arc(cx, cy, r, 0, Math.PI * 2);
        cacheCtx.globalCompositeOperation = 'source-over';
        cacheCtx.fillStyle = 'rgba(7, 5, 4, 1)';
        cacheCtx.fill();
        cacheCtx.restore();

        memoryCtx.save();
        memoryCtx.beginPath();
        memoryCtx.arc(cx, cy, r, 0, Math.PI * 2);
        memoryCtx.globalCompositeOperation = 'destination-out';
        memoryCtx.fillStyle = 'rgba(0, 0, 0, 1)';
        memoryCtx.fill();
        memoryCtx.restore();
      }
    }
    processedCountRef.current = fowActions.length;

    // 1. Volcar la niebla estática sobre el lienzo visible
    const ctx = canvas.getContext('2d');
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.drawImage(cacheCanvas, 0, 0);

    // 2. Aplicar la penumbra explorada en una única pasada uniforme (48% de claridad máxima)
    if (fowMemoryEnabled) {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.globalAlpha = 0.48;
      ctx.drawImage(memoryCanvas, 0, 0);
      ctx.restore();
    }

    // 3. Visión activa en tiempo real de cada ficha en el tablero (100% nítida)
    tokens.forEach(token => {
      const size = token.size || 50;
      const cx = token.x + size / 2;
      const cy = token.y + size / 2;
      const fov = token.visionMode === 'circle' ? 360 : 90;
      drawTokenVisionMask(ctx, cx, cy, fowVisionRadius, token.rotation || 0, fov, size, blockers, 1.0, 'destination-out');
    });

    ctx.globalCompositeOperation = 'source-over';
  }, [fowActions, fowEnabled, fowCanvasRef, maps, tokens, fowVisionRadius, fowMemoryEnabled]);

  // Reiniciar caché si cambia el modo de memoria
  useEffect(() => {
    processedCountRef.current = 0;
  }, [fowMemoryEnabled]);

  if (!fowEnabled) return null;

  return (
    <canvas
      ref={fowCanvasRef}
      width={CANVAS_SIZE}
      height={CANVAS_SIZE}
      style={{
        position: 'absolute',
        top: -CANVAS_OFFSET,
        left: -CANVAS_OFFSET,
        pointerEvents: 'none',
        zIndex: 5,
        // En la pantalla de Jugadores la niebla no explorada es 100% opaca; al Master le permite entrever el mapa (78%)
        opacity: isPlayerView ? 1 : 0.78
      }}
    />
  );
};

export default FogLayer;