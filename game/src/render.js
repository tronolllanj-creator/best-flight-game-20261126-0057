import { PALETTE, MISSIONS } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_MISSION = 'mission';
export const SCREEN_WIN = 'win';
export const SCREEN_CRASH = 'crash';

const W = 1280, H = 720;
const CX = W / 2, CY = H / 2;
const HORIZON_Y = 320;
const RIDGE_FAR_SCALE = 0.0008;
const RIDGE_MID_SCALE = 0.0012;
const RIDGE_NEAR_SCALE = 0.002;
const VALLEY_W = 1200;
const TREE_BASE_SIZE = 18;

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function seededNoise(seed, x, y) {
  const rng = mulberry32(seed + Math.floor(x) * 73856093 + Math.floor(y) * 19349663);
  return rng() * 2 - 1;
}

function ridgeHeight(seed, dist, lat, scale, octaves, persistence, lacunarity) {
  let h = 0, amp = 1, freq = scale;
  for (let i = 0; i < octaves; i++) {
    h += seededNoise(seed + i * 997, dist * freq, lat * freq) * amp;
    amp *= persistence;
    freq *= lacunarity;
  }
  return h;
}

function terrainHeightAt(dist, lat, seed) {
  const far = ridgeHeight(seed, dist, lat, RIDGE_FAR_SCALE, 4, 0.5, 2.0) * 1800;
  const mid = ridgeHeight(seed + 1000, dist, lat, RIDGE_MID_SCALE, 3, 0.5, 2.0) * 900;
  const near = ridgeHeight(seed + 2000, dist, lat, RIDGE_NEAR_SCALE, 3, 0.5, 2.0) * 400;
  const valley = -Math.exp(-lat * lat / 180000) * 600;
  let h = far + mid + near + valley + 800;
  if (dist > 6000 && dist < 7600) {
    const rw = Math.max(0, 1 - Math.abs(lat) / 200);
    h = h * (1 - rw * 0.6) + 810 * rw * 0.6;
  }
  return h;
}

function projectY(alt, dist, pitch) {
  const base = CY - (alt - 800) * 0.12;
  return base + Math.sin(pitch * Math.PI / 180) * 60;
}

function projectX(lat, dist) {
  return CX - lat * 0.6;
}

function drawSky(ctx, state, mission) {
  const { skyTop, skyMid, skyLow } = mission.palette;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, skyTop);
  grad.addColorStop(0.55, skyMid);
  grad.addColorStop(1, skyLow);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if (mission.timeOfDay === 'dawn' || mission.timeOfDay === 'dusk') {
    const sunX = W - 180 + Math.sin(state.time * 0.1) * 20;
    const sunY = 120 + Math.cos(state.time * 0.05) * 15;
    const sg = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 80);
    sg.addColorStop(0, PALETTE.sun);
    sg.addColorStop(0.4, '#ffd94d88');
    sg.addColorStop(1, '#ffd94d00');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 80, 0, Math.PI * 2);
    ctx.fill();
  } else if (mission.timeOfDay === 'night') {
    const moonX = 180, moonY = 100;
    ctx.fillStyle = '#f0f0e0';
    ctx.beginPath();
    ctx.arc(moonX, moonY, 40, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawClouds(ctx, state, mission) {
  const seed = mission.cloudSeed || 12345;
  const rng = mulberry32(seed);
  const cloudCount = 40;
  for (let i = 0; i < cloudCount; i++) {
    const cx = (rng() * 3000 - 500 - state.dist * 0.02) % 3000 - 500;
    const cy = 60 + rng() * 200;
    const parallax = 0.15 + rng() * 0.1;
    const x = CX + (cx - CX) * parallax;
    const y = cy + state.pitch * 0.3;
    const size = 40 + rng() * 60;
    const alpha = 0.35 + rng() * 0.25;
    ctx.fillStyle = PALETTE.cloud + Math.floor(alpha * 255).toString(16).padStart(2, '0');
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRidges(ctx, state, mission) {
  const seed = mission.terrainSeed || 42;
  const layers = [
    { scale: RIDGE_FAR_SCALE, color: PALETTE.ridgeFar, amp: 1800, octaves: 4, yOff: 180, alpha: 0.6 },
    { scale: RIDGE_MID_SCALE, color: PALETTE.ridgeMid, amp: 900, octaves: 3, yOff: 220, alpha: 0.8 },
    { scale: RIDGE_NEAR_SCALE, color: PALETTE.ridgeNear, amp: 400, octaves: 3, yOff: 260, alpha: 1.0 }
  ];

  layers.forEach((layer, li) => {
    ctx.fillStyle = layer.color + Math.floor(layer.alpha * 255).toString(16).padStart(2, '0');
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 8) {
      const lat = (x - CX) / 0.6;
      const dist = state.dist + (H - layer.yOff) * 5;
      const h = ridgeHeight(seed + li * 1000, dist, lat, layer.scale, layer.octaves, 0.5, 2.0) * layer.amp;
      const y = layer.yOff - (h - 800) * 0.12 + state.pitch * 0.3;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
  });
}

function drawValleyFloor(ctx, state) {
  const grad = ctx.createLinearGradient(0, HORIZON_Y, 0, H);
  grad.addColorStop(0, PALETTE.valley);
  grad.addColorStop(0.5, PALETTE.field);
  grad.addColorStop(1, '#3a4a2a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, HORIZON_Y, W, H - HORIZON_Y);

  ctx.fillStyle = PALETTE.river;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 10) {
    const lat = (x - CX) / 0.6;
    const riverLat = Math.sin((state.dist + lat) * 0.0008) * 150;
    const y = HORIZON_Y + 200 - (riverLat - lat) * 0.3;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();

  const treeSeed = mulberry32(9999 + Math.floor(state.dist / 200));
  for (let i = 0; i < 60; i++) {
    const lat = (treeSeed() - 0.5) * 800;
    const d = state.dist + 200 + (treeSeed() - 0.5) * 400;
    const relDist = d - state.dist;
    if (relDist < 50 || relDist > 2000) continue;
    const x = projectX(lat, relDist);
    const y = projectY(terrainHeightAt(d, lat, 42) + 20, relDist, state.pitch);
    const size = TREE_BASE_SIZE * (1 - relDist / 2000) * 1.5;
    if (size < 4) continue;
    ctx.fillStyle = '#2d4a1a';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - size * 0.4, y + size);
    ctx.lineTo(x + size * 0.4, y + size);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a3a0a';
    ctx.fillRect(x - 2, y + size, 4, size * 0.3);
  }
}

function drawRunway(ctx, state, mission) {
  const runwayDist = mission.runwayDist || 6400;
  const rel = runwayDist - state.dist;
  if (rel < 0 || rel > 1200) return;

  const width = 60 * (1 - rel / 1200) * 2;
  const y = projectY(810, rel, state.pitch);
  const x = CX;

  ctx.fillStyle = PALETTE.runway;
  ctx.beginPath();
  ctx.moveTo(x - width, y);
  ctx.lineTo(x - width * 0.3, y + 40);
  ctx.lineTo(x + width * 0.3, y + 40);
  ctx.lineTo(x + width, y);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = PALETTE.runwayMark;
  ctx.lineWidth = 3;
  for (let i = -2; i <= 2; i++) {
    const lx = x + i * width * 0.4;
    ctx.beginPath();
    ctx.moveTo(lx - 15, y);
    ctx.lineTo(lx + 15, y);
    ctx.stroke();
  }
}

function drawRings(ctx, state) {
  state.rings.forEach(ring => {
    if (ring.passed) return;
    const relDist = ring.dist - state.dist;
    if (relDist < -100 || relDist > 2500) return;
    const x = projectX(ring.lat, relDist);
    const y = projectY(ring.alt, relDist, state.pitch);
    const size = Math.max(12, 60 * (1 - relDist / 2500));
    const alpha = 0.6 + 0.4 * Math.sin(state.time * 8);
    const grad = ctx.createRadialGradient(x, y, 0, x, y, size);
    // the next ring glows amber, passed rings turn green
    grad.addColorStop(0, PALETTE.ringGlow + 'ff');
    grad.addColorStop(0.5, PALETTE.ringGlow + '88');
    grad.addColorStop(1, PALETTE.ringGlow + '00');
    ctx.fillStyle = grad;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.ellipse(x, y, size, size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = PALETTE.ringGlow;
    ctx.lineWidth = 3;
    ctx.stroke();
  });
}

function drawPlane(ctx, state) {
  const roll = state.roll * Math.PI / 180;
  const cosR = Math.cos(roll), sinR = Math.sin(roll);
  const scale = 1.2;

  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(roll);

  ctx.fillStyle = PALETTE.planeRed;
  ctx.beginPath();
  ctx.moveTo(0, -18 * scale);
  ctx.lineTo(-10 * scale, 12 * scale);
  ctx.lineTo(-4 * scale, 12 * scale);
  ctx.lineTo(-4 * scale, 20 * scale);
  ctx.lineTo(4 * scale, 20 * scale);
  ctx.lineTo(4 * scale, 12 * scale);
  ctx.lineTo(10 * scale, 12 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = PALETTE.planeWhite;
  ctx.beginPath();
  ctx.moveTo(-28 * scale, 4 * scale);
  ctx.lineTo(28 * scale, 4 * scale);
  ctx.lineTo(14 * scale, 14 * scale);
  ctx.lineTo(-14 * scale, 14 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = PALETTE.planeDark;
  ctx.beginPath();
  ctx.moveTo(0, -18 * scale);
  ctx.lineTo(-3 * scale, -6 * scale);
  ctx.lineTo(3 * scale, -6 * scale);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = PALETTE.propBlur;
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  ctx.ellipse(0, -20 * scale, 30 * scale, 4 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.fillStyle = PALETTE.red;
  ctx.beginPath();
  ctx.arc(-26 * scale, 6 * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.green;
  ctx.beginPath();
  ctx.arc(26 * scale, 6 * scale, 3 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawParticles(ctx, state) {
  state.particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawRain(ctx, state) {
  if (state.lightning > 0) {
    ctx.fillStyle = '#ffffff' + Math.floor(state.lightning * 255).toString(16).padStart(2, '0');
    ctx.fillRect(0, 0, W, H);
  }
  ctx.strokeStyle = '#aaccff88';
  ctx.lineWidth = 1;
  for (let i = 0; i < 120; i++) {
    const x = (i * 97 + state.time * 300) % W;
    const y = (i * 131 + state.time * 500) % H;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 4, y + 20);
    ctx.stroke();
  }
}

function drawFloats(ctx, state) {
  ctx.font = 'bold 18px monospace';
  ctx.textAlign = 'center';
  state.floats.forEach(f => {
    ctx.fillStyle = f.color + Math.floor(f.life * 255).toString(16).padStart(2, '0');
    ctx.fillText(f.text, f.x, f.y);
  });
}

function drawHUD(ctx, state, best, mission) {
  const shakeX = state.shake * (Math.random() - 0.5) * 10;
  const shakeY = state.shake * (Math.random() - 0.5) * 10;
  ctx.save();
  ctx.translate(shakeX, shakeY);

  ctx.font = '16px monospace';
  ctx.fillStyle = PALETTE.hudText;
  ctx.textAlign = 'left';

  const panelW = 220, panelH = 100;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(10, 10, panelW, panelH);
  ctx.fillStyle = PALETTE.hudText;
  ctx.fillText(`ALT ${Math.round(state.alt)} ft`, 20, 30);
  ctx.fillText(`SPD ${Math.round(state.speed)} kts`, 20, 50);
  ctx.fillText(`HDG ${(Math.round(state.heading) % 360).toString().padStart(3, '0')}°`, 20, 70);

  drawCompassTape(ctx, state);
  drawArtificialHorizon(ctx, state);

  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(W - 230, 10, 220, 80);
  ctx.fillStyle = PALETTE.hudText;
  ctx.textAlign = 'right';
  ctx.fillText(`SCORE ${state.score}`, W - 20, 30);
  ctx.fillText(`BEST ${best}`, W - 20, 50);
  ctx.fillText(`RINGS ${state.ringsHit}/${state.ringsTotal}`, W - 20, 70);

  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(10, H - 110, 200, 100);
  drawBar(ctx, 20, H - 90, 180, 16, state.fuel / 100, PALETTE.green, PALETTE.amber, PALETTE.red, 'FUEL');
  drawBar(ctx, 20, H - 60, 180, 12, state.throttle, PALETTE.green, PALETTE.amber, PALETTE.red, 'THR');

  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(W - 210, H - 50, 200, 40);
  drawBar(ctx, W - 200, H - 40, 180, 20, state.damage / 100, PALETTE.green, PALETTE.amber, PALETTE.red, 'DAMAGE');

  ctx.fillStyle = PALETTE.hudText;
  ctx.textAlign = 'center';
  ctx.font = '14px monospace';
  ctx.fillText(`${mission.name} - ${mission.objective}`, CX, 30);
  if (mission.timeLimit) {
    const pct = state.timeLeft / mission.timeLimit;
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(CX - 150, 45, 300, 10);
    ctx.fillStyle = pct > 0.3 ? PALETTE.green : PALETTE.red;
    ctx.fillRect(CX - 150, 45, 300 * pct, 10);
  }

  ctx.font = '14px monospace';
  ctx.fillStyle = PALETTE.hudDim;
  if (state.messageTime > 0) {
    ctx.fillStyle = PALETTE.amber;
    ctx.fillText(state.message, CX, H - 80);
  } else if (state.dropped && !state.landed) {
    ctx.fillText('GEAR DOWN — LAND', CX, H - 80);
  } else if (state.speed < 60) {
    ctx.fillStyle = PALETTE.red;
    ctx.fillText('STALL — PULL UP', CX, H - 80);
  } else if (mission.dropZone && !state.dropped && Math.abs(state.dist - mission.dropZone) < 300) {
    ctx.fillStyle = PALETTE.amber;
    ctx.fillText('E DROP CRATE', CX, H - 80);
  }

  ctx.restore();
}

function drawCompassTape(ctx, state) {
  const x = 20, y = 90, w = 200, h = 30;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PALETTE.hudDim;
  ctx.strokeRect(x, y, w, h);
  const heading = state.heading % 360;
  for (let d = -180; d <= 180; d += 30) {
    const hdg = (heading + d + 360) % 360;
    const px = x + w / 2 + d * (w / 180);
    if (px < x || px > x + w) continue;
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(hdg).toString().padStart(3, '0'), px, y + 20);
    ctx.strokeStyle = PALETTE.hudDim;
    ctx.beginPath();
    ctx.moveTo(px, y + 22);
    ctx.lineTo(px, y + h);
    ctx.stroke();
  }
  ctx.fillStyle = PALETTE.amber;
  ctx.beginPath();
  ctx.moveTo(x + w / 2 - 5, y);
  ctx.lineTo(x + w / 2 + 5, y);
  ctx.lineTo(x + w / 2, y - 6);
  ctx.fill();
}

function drawArtificialHorizon(ctx, state) {
  const x = CX, y = 80, r = 60;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-state.roll * Math.PI / 180);

  const pitchRad = state.pitch * Math.PI / 180;
  const horizonOffset = Math.sin(pitchRad) * r * 1.5;

  ctx.fillStyle = '#1a3a5c';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#2d5a3a';
  ctx.beginPath();
  ctx.arc(0, horizonOffset, r, Math.PI, 0, true);
  ctx.lineTo(r, r);
  ctx.lineTo(-r, r);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = PALETTE.hudText;
  ctx.lineWidth = 2;
  for (let p = -30; p <= 30; p += 10) {
    const py = horizonOffset - Math.sin(p * Math.PI / 180) * r * 1.5;
    ctx.beginPath();
    ctx.moveTo(-30, py);
    ctx.lineTo(30, py);
    ctx.stroke();
    ctx.font = '10px monospace';
    ctx.fillStyle = PALETTE.hudText;
    ctx.textAlign = 'right';
    ctx.fillText(p > 0 ? '+' + p : p.toString(), -35, py + 4);
  }

  ctx.strokeStyle = PALETTE.amber;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-15, 0);
  ctx.lineTo(-5, 0);
  ctx.moveTo(5, 0);
  ctx.lineTo(15, 0);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(0, 15);
  ctx.stroke();

  ctx.restore();
}

function drawBar(ctx, x, y, w, h, val, c1, c2, c3, label) {
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y - 2);
  ctx.strokeStyle = PALETTE.hudDim;
  ctx.strokeRect(x, y, w, h);
  const fillW = w * Math.max(0, Math.min(1, val));
  let color = val > 0.6 ? c1 : val > 0.25 ? c2 : c3;
  ctx.fillStyle = color;
  ctx.fillRect(x, y, fillW, h);
}

function drawScreenOverlay(ctx, screen, state, best, mission) {
  ctx.fillStyle = '#000000cc';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.text;

  switch (screen) {
    case SCREEN_TITLE:
      ctx.font = 'bold 48px monospace';
      ctx.fillText('AERIS: RIDGE RUNNER', CX, CY - 80);
      ctx.font = '20px monospace';
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText('Arrow Keys / WASD — Pitch & Roll', CX, CY);
      ctx.fillText('W/S — Throttle  Space — Airbrake', CX, CY + 30);
      ctx.fillText('E — Drop Crate  P/Esc — Pause', CX, CY + 60);
      ctx.fillStyle = PALETTE.amber;
      ctx.font = '18px monospace';
      ctx.fillText('Press ENTER to Start', CX, CY + 120);
      break;
    case SCREEN_PAUSED:
      ctx.font = 'bold 36px monospace';
      ctx.fillText('PAUSED', CX, CY - 20);
      ctx.font = '18px monospace';
      ctx.fillStyle = PALETTE.muted;
      ctx.fillText('Press P or ESC to Resume', CX, CY + 30);
      break;
    case SCREEN_MISSION:
      ctx.font = 'bold 32px monospace';
      ctx.fillText(`MISSION ${state.missionIndex + 1} CLEAR`, CX, CY - 100);
      ctx.font = '20px monospace';
      ctx.fillStyle = PALETTE.hudText;
      ctx.fillText(`${mission.name}`, CX, CY - 60);
      ctx.fillText(`Rings: ${state.ringsHit}  Score: +${state.score}`, CX, CY - 20);
      ctx.fillStyle = PALETTE.amber;
      ctx.fillText('Press ENTER for Next Mission', CX, CY + 40);
      break;
    case SCREEN_WIN:
      ctx.font = 'bold 40px monospace';
      ctx.fillStyle = PALETTE.green;
      ctx.fillText('MISSION COMPLETE', CX, CY - 120);
      ctx.font = '24px monospace';
      ctx.fillStyle = PALETTE.text;
      ctx.fillText(`TOTAL SCORE: ${state.score}`, CX, CY - 60);
      ctx.fillText(`Rings: ${state.ringsHit}  Drops: ${state.dropped ? 1 : 0}  Landings: ${state.landed ? 1 : 0}`, CX, CY - 20);
      ctx.fillText(`BEST: ${best}`, CX, CY + 20);
      ctx.fillStyle = PALETTE.amber;
      ctx.font = '18px monospace';
      ctx.fillText('Press R to Fly Again', CX, CY + 80);
      break;
    case SCREEN_CRASH:
      ctx.font = 'bold 40px monospace';
      ctx.fillStyle = PALETTE.red;
      ctx.fillText('CRASHED', CX, CY - 40);
      ctx.font = '20px monospace';
      ctx.fillStyle = PALETTE.hudText;
      ctx.fillText(`Score: ${state.score}`, CX, CY + 20);
      ctx.fillStyle = PALETTE.amber;
      ctx.fillText('Press R to Retry Mission', CX, CY + 70);
      break;
  }
}
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let lastShake = 0;

  function draw(state, screen, best) {
    const mission = MISSIONS[state.missionIndex] || MISSIONS[0];
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);

    drawSky(ctx, state, mission);
    drawClouds(ctx, state, mission);
    drawRidges(ctx, state, mission);
    drawValleyFloor(ctx, state);
    drawRunway(ctx, state, mission);
    drawRings(ctx, state);
    drawPlane(ctx, state);
    drawParticles(ctx, state);
    if (mission.weather === 'storm') drawRain(ctx, state);
    drawFloats(ctx, state);
    drawHUD(ctx, state, best, mission);

    if (screen !== SCREEN_PLAY) {
      drawScreenOverlay(ctx, screen, state, best, mission);
    }
  }

  return { draw };
}
