import React, { useEffect, useRef, useMemo } from 'react';

const CANVAS_SIZE = 4000;
const CANVAS_OFFSET = 1000;

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

const angleDiff = (a, b) => ((a - b + 180) % 360 + 360) % 360 - 180;

export const getVisionBlockers = (maps = []) => {
  const segments = [];
  for (let i = 0; i < maps.length; i++) {
    const el = maps[i];
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
    } else if (el.type === 'object' && el.blocksVision && !el.isOpen) {
      const w = el.width || 48;
      const h = el.height || 48;
      segments.push(
        { x1: el.x, y1: el.y, x2: el.x + w, y2: el.y },
        { x1: el.x + w, y1: el.y, x2: el.x + w, y2: el.y + h },
        { x1: el.x + w, y1: el.y + h, x2: el.x, y2: el.y + h },
        { x1: el.x, y1: el.y + h, x2: el.x, y2: el.y }
      );
    }
  }
  return segments;
};

export const isPointVisibleToPlayers = (tx, ty, viewerTokens = [], maps = [], visionRadius = 180) => {
  const blockers = getVisionBlockers(maps);

  // 1. Comprobar si algún token aliado lo ve con su cono o halo
  for (let i = 0; i < viewerTokens.length; i++) {
    const viewer = viewerTokens[i];
    if (viewer.isHidden || viewer.faction === 'enemy') continue;

    const size = viewer.size || 50;
    const ox = viewer.x + size / 2;
    const oy = viewer.y + size / 2;
    const dx = tx - ox;
    const dy = ty - oy;
    const dist = Math.hypot(dx, dy);

    if (dist > visionRadius) continue;

    const personalRadius = Math.max(size * 0.85, 36);
    const fov = viewer.visionMode === 'circle' ? 360 : 90;

    if (fov < 360 && dist > personalRadius) {
      const targetAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const diff = Math.abs(angleDiff(targetAngle, viewer.rotation || 0));
      if (diff > fov / 2) continue;
    }

    if (dist < 2) return true;

    const rayDx = dx / dist;
    const rayDy = dy / dist;
    let blocked = false;

    for (let j = 0; j < blockers.length; j++) {
      const seg = blockers[j];
      const hitT = raySegmentIntersection(ox, oy, rayDx, rayDy, seg.x1, seg.y1, seg.x2, seg.y2);
      if (hitT !== null && hitT < dist - 2) {
        blocked = true;
        break;
      }
    }
    if (!blocked) return true;
  }

  // 2. Comprobar si una Fuente de Luz estática activa (antorcha/brasero) ilumina al enemigo
  for (let i = 0; i < maps.length; i++) {
    const light = maps[i];
    if (light.type !== 'light' || light.isOn === false) continue;

    const lSize = light.width || 36;
    const ox = light.x + lSize / 2;
    const oy = light.y + lSize / 2;
    const lRadius = light.radius || 220;
    const dx = tx - ox;
    const dy = ty - oy;
    const dist = Math.hypot(dx, dy);

    if (dist > lRadius) continue;
    if (dist < 2) return true;

    const rayDx = dx / dist;
    const rayDy = dy / dist;
    let blocked = false;

    for (let j = 0; j < blockers.length; j++) {
      const seg = blockers[j];
      const hitT = raySegmentIntersection(ox, oy, rayDx, rayDy, seg.x1, seg.y1, seg.x2, seg.y2);
      if (hitT !== null && hitT < dist - 2) {
        blocked = true;
        break;
      }
    }
    if (!blocked) return true;
  }

  return false;
};

const computeVisibilityPolygon = (ox, oy, radius, angleDeg = 0, fovDeg = 90, blockers = []) => {
  const isFullCircle = fovDeg >= 360;
  const halfFov = fovDeg / 2;
  const angles = [];
  const stepDeg = 3.0; // Optimizado para 60 FPS clavados

  if (isFullCircle) {
    for (let a = 0; a < 360; a += stepDeg) angles.push((a * Math.PI) / 180);
  } else {
    for (let offset = -halfFov; offset <= halfFov; offset += stepDeg) {
      angles.push(((angleDeg + offset) * Math.PI) / 180);
    }
  }

  const rSq = radius * radius * 1.15;
  for (let i = 0; i < blockers.length; i++) {
    const seg = blockers[i];
    const pts = [{ x: seg.x1, y: seg.y1 }, { x: seg.x2, y: seg.y2 }];
    for (let j = 0; j < 2; j++) {
      const vx = pts[j].x - ox;
      const vy = pts[j].y - oy;
      if (vx * vx + vy * vy <= rSq) {
        const deg = (Math.atan2(vy, vx) * 180) / Math.PI;
        if (isFullCircle || Math.abs(angleDiff(deg, angleDeg)) <= halfFov) {
          const rad = Math.atan2(vy, vx);
          angles.push(rad - 0.001, rad, rad + 0.001);
        }
      }
    }
  }

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
      if (t !== null && t < closestT) closestT = t;
    }

    points.push({
      x: ox + dx * closestT + CANVAS_OFFSET,
      y: oy + dy * closestT + CANVAS_OFFSET
    });
  }
  return points;
};

const drawVisionMask = (ctx, ox, oy, radius, angleDeg = 0, fovDeg = 90, sourceSize = 50, blockers = [], isMemoryStamp = false) => {
  if (!Number.isFinite(ox) || !Number.isFinite(oy) || !Number.isFinite(radius) || radius <= 0) return;
  const cx = ox + CANVAS_OFFSET;
  const cy = oy + CANVAS_OFFSET;
  const isFullCircle = fovDeg >= 360;

  ctx.save();
  // Si es para el mapa de memoria, pintamos blanco sólido (máscara limpia sin bandas acumuladas).
  // Si es visión activa en tiempo real, recortamos la niebla con destination-out.
  ctx.globalCompositeOperation = isMemoryStamp ? 'source-over' : 'destination-out';

  const personalRadius = Math.max((sourceSize || 50) * 0.85, 36);
  if (!isFullCircle) {
    const haloPoints = computeVisibilityPolygon(ox, oy, personalRadius, 0, 360, blockers);
    if (haloPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(haloPoints[0].x, haloPoints[0].y);
      for (let i = 1; i < haloPoints.length; i++) ctx.lineTo(haloPoints[i].x, haloPoints[i].y);
      ctx.closePath();
      ctx.fillStyle = isMemoryStamp ? '#ffffff' : 'rgba(0,0,0,1)';
      ctx.fill();
    }
  }

  const polyPoints = computeVisibilityPolygon(ox, oy, radius, angleDeg, fovDeg, blockers);
  if (polyPoints.length > 0) {
    ctx.beginPath();
    if (isFullCircle) {
      ctx.moveTo(polyPoints[0].x, polyPoints[0].y);
      for (let i = 1; i < polyPoints.length; i++) ctx.lineTo(polyPoints[i].x, polyPoints[i].y);
    } else {
      ctx.moveTo(cx, cy);
      for (let i = 0; i < polyPoints.length; i++) ctx.lineTo(polyPoints[i].x, polyPoints[i].y);
    }
    ctx.closePath();

    if (isMemoryStamp) {
      // Borde limpio en la máscara de memoria para que no deje estelas ni anillos al caminar
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    } else {
      const grad = ctx.createRadialGradient(cx, cy, radius * 0.72, cx, cy, radius);
      grad.addColorStop(0, 'rgba(0,0,0,1)');
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }

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
  const exploredMaskCanvasRef = useRef(null);
  const lastActionsCountRef = useRef(0);

  // Caching de segmentos de muros, puertas y objetos bloqueantes para evitar recálculos por frame
  const cachedBlockers = useMemo(() => getVisionBlockers(maps), [maps]);
  const activeLightSources = useMemo(
    () => maps.filter(el => el.type === 'light' && el.isOn !== false),
    [maps]
  );

  useEffect(() => {
    if (!fowEnabled || !fowCanvasRef?.current) return;

    // Lienzo de máscara de zonas exploradas (transparente = no visto, blanco = ya explorado)
    if (!exploredMaskCanvasRef.current) {
      const off = document.createElement('canvas');
      off.width = CANVAS_SIZE;
      off.height = CANVAS_SIZE;
      exploredMaskCanvasRef.current = off;
    }

    const maskCanvas = exploredMaskCanvasRef.current;
    const maskCtx = maskCanvas.getContext('2d');

    if (fowActions.length === 0 && lastActionsCountRef.current > 0) {
      maskCtx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }
    lastActionsCountRef.current = fowActions.length;

    let rafId = requestAnimationFrame(() => {
      // 1. Si hay memoria de exploración, registramos las zonas visitadas en una máscara limpia (sin acumular opacidad)
      if (fowMemoryEnabled) {
        tokens.forEach(token => {
          if (token.isHidden || token.faction === 'enemy') return;
          const size = token.size || 50;
          const ox = token.x + size / 2;
          const oy = token.y + size / 2;
          const fov = token.visionMode === 'circle' ? 360 : 90;
          drawVisionMask(maskCtx, ox, oy, fowVisionRadius, token.rotation || 0, fov, size, cachedBlockers, true);
        });

        activeLightSources.forEach(light => {
          const lSize = light.width || 36;
          const ox = light.x + lSize / 2;
          const oy = light.y + lSize / 2;
          drawVisionMask(maskCtx, ox, oy, light.radius || 220, 0, 360, lSize, cachedBlockers, true);
        });
      }

      // 2. Componer el lienzo principal con oscuridad total de base
      const mainCanvas = fowCanvasRef.current;
      if (!mainCanvas) return;
      const ctx = mainCanvas.getContext('2d');

      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.fillStyle = '#050302';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // Si la memoria está activa, rebajamos de forma 100% uniforme la opacidad en toda la zona explorada (penumbra limpia)
      if (fowMemoryEnabled) {
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.globalAlpha = 0.42; // Deja un 58% de penumbra constante y uniforme sin rayas ni solapamientos
        ctx.drawImage(maskCanvas, 0, 0);
        ctx.restore();
      }

      // 3. Aplicar trazos manuales del Master
      for (let i = 0; i < fowActions.length; i++) {
        const act = fowActions[i];
        ctx.save();
        ctx.beginPath();
        ctx.arc(act.x + CANVAS_OFFSET, act.y + CANVAS_OFFSET, act.size || 80, 0, Math.PI * 2);
        if (act.mode === 'reveal') {
          ctx.globalCompositeOperation = 'destination-out';
          ctx.fillStyle = 'rgba(0,0,0,1)';
        } else {
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = '#050302';
        }
        ctx.fill();
        ctx.restore();
      }

      // 4. Recortar a 100% de claridad los conos de visión actuales de héroes aliados
      tokens.forEach(token => {
        if (token.isHidden || token.faction === 'enemy') return;
        const size = token.size || 50;
        const ox = token.x + size / 2;
        const oy = token.y + size / 2;
        const fov = token.visionMode === 'circle' ? 360 : 90;
        drawVisionMask(ctx, ox, oy, fowVisionRadius, token.rotation || 0, fov, size, cachedBlockers, false);
      });

      // 5. Recortar a 100% de claridad las Fuentes de Luz estáticas (antorchas, braseros, faroles)
      activeLightSources.forEach(light => {
        const lSize = light.width || 36;
        const ox = light.x + lSize / 2;
        const oy = light.y + lSize / 2;
        const lRadius = light.radius || 220;
        drawVisionMask(ctx, ox, oy, lRadius, 0, 360, lSize, cachedBlockers, false);

        // Tinte cálido o espectral sobre la zona iluminada por la antorcha
        ctx.save();
        ctx.globalCompositeOperation = 'source-over';
        const cx = ox + CANVAS_OFFSET;
        const cy = oy + CANVAS_OFFSET;
        const glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, lRadius * 0.85);
        glow.addColorStop(0, light.color || 'rgba(251, 146, 60, 0.22)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(cx, cy, lRadius * 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    });

    return () => cancelAnimationFrame(rafId);
  }, [fowEnabled, fowActions, cachedBlockers, activeLightSources, tokens, fowVisionRadius, fowMemoryEnabled, fowCanvasRef]);

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
        zIndex: 8,
        opacity: isPlayerView ? 1 : 0.68,
        transition: 'opacity 0.25s ease'
      }}
    />
  );
};

export default FogLayer;