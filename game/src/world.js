import { MISSIONS, CONFIG } from './config.js';
import { mulberry32 } from './random.js';

export const EVENT_RING = 'ring';
export const EVENT_CRASH = 'crash';
export const EVENT_LANDED = 'landed';
export const EVENT_MISSION = 'mission';
export const EVENT_WIN = 'win';
export const EVENT_TIMEOUT = 'timeout';
export const EVENT_DROP = 'drop';
export const EVENT_SCRAPE = 'scrape';

const G = 32.174;
const KTS_TO_FT_S = 1.68781;
const STALL_SPEED = 55;
const TARGET_SPEED_BASE = 60;
const TARGET_SPEED_RANGE = 140;
const DRAG_COEFF = 0.15;
const BRAKE_DECEL = 25;
const PITCH_RATE = 25;
const ROLL_RATE = 60;
const HEADING_RATE = 0.02;
const CLIMB_FACTOR = 1.9;
const FUEL_BASE = 0.045;
const FUEL_THROTTLE_FACTOR = 0.3;
const TERRAIN_CLEARANCE = 10;
const CRASH_SINK_RATE = 900;
const CRASH_SPEED = 160;
const SCRAPE_DAMAGE = 25;
const SCRAPE_BOUNCE = 40;
const RING_LAT_TOLERANCE = 70;
const RING_ALT_TOLERANCE = 130;
const RING_SCORE_BASE = 100;
const DROP_SCORE = 150;
const LAND_SCORE_BASE = 250;
const LAND_FUEL_BONUS = 2;
const LAND_SPEED_MAX = 95;
const LAND_SINK_MAX = 500;
const LAND_APPROACH_DIST = 60;
const LAND_ALT_TOLERANCE = 12;
const DROP_ZONE_RADIUS = 150;
const SHAKE_DECAY = 15;
const PARTICLE_LIFE = 1.2;
const FLOAT_LIFE = 1.5;
const GUST_MAX = 25;
const GUST_CHANGE_RATE = 0.8;
const LIGHTNING_MIN = 6;
const LIGHTNING_MAX = 11;
const RUNWAY_RENDER_DIST = 1200;
const VALLEY_WIDTH = 400;
const VALLEY_DEPTH = 200;
const RIDGE_FREQ1 = 0.0008;
const RIDGE_FREQ2 = 0.0015;
const RIDGE_FREQ3 = 0.003;
const RIDGE_AMP1 = 350;
const RIDGE_AMP2 = 180;
const RIDGE_AMP3 = 90;
const AIRFIELD_START = 6000;
const AIRFIELD_END = 7500;
const AIRFIELD_WIDTH = 300;
const AIRFIELD_ALT = 850;

function seededNoise(rng, x, y, freq, phase) {
  const h = mulberry32(rng.next() * 0x100000000);
  return Math.sin((x * freq + phase) * Math.PI * 2) * 0.5 +
         Math.sin((y * freq * 0.7 + phase * 1.3) * Math.PI * 2) * 0.3 +
         Math.sin((x * freq * 2.3 + y * freq * 1.7 + phase * 0.7) * Math.PI * 2) * 0.2;
}

export function terrainHeight(dist, lat, rng) {
  const n1 = seededNoise(rng, dist, lat, RIDGE_FREQ1, 0.123);
  const n2 = seededNoise(rng, dist, lat, RIDGE_FREQ2, 0.456);
  const n3 = seededNoise(rng, dist, lat, RIDGE_FREQ3, 0.789);
  let h = n1 * RIDGE_AMP1 + n2 * RIDGE_AMP2 + n3 * RIDGE_AMP3;
  
  const valleyFactor = 1 - Math.min(1, Math.abs(lat) / VALLEY_WIDTH);
  h -= valleyFactor * valleyFactor * VALLEY_DEPTH;
  
  if (dist >= AIRFIELD_START && dist <= AIRFIELD_END) {
    const airfieldFactor = 1 - Math.min(1, Math.abs(lat) / AIRFIELD_WIDTH);
    const targetAlt = AIRFIELD_ALT + (dist - AIRFIELD_START) * 0.02;
    h = h * (1 - airfieldFactor * 0.7) + targetAlt * airfieldFactor * 0.7;
  }
  
  return h;
}

function createRings(rng, mission) {
  const rings = [];
  const { rings: ringCount, runwayDist } = mission;
  const startDist = 800;
  const endDist = runwayDist ? runwayDist - 800 : 8000;
  const spacing = (endDist - startDist) / ringCount;
  
  for (let i = 0; i < ringCount; i++) {
    const baseDist = startDist + i * spacing;
    const dist = baseDist + rng.range(-spacing * 0.3, spacing * 0.3);
    const lat = rng.range(-260, 260);
    const terrain = terrainHeight(dist, lat, rng);
    const alt = terrain + rng.range(300, 900);
    rings.push({ dist, lat, alt, passed: false });
  }
  return rings;
}

export function createWorld(rng, missionIndex) {
  const mission = MISSIONS[missionIndex];
  const rings = createRings(rng, mission);
  
  return {
    missionIndex,
    dist: 0,
    lat: 0,
    alt: terrainHeight(0, 0, rng) + 500,
    speed: 80,
    pitch: 0,
    roll: 0,
    heading: 0,
    throttle: 0.5,
    fuel: mission.fuel,
    damage: 0,
    score: 0,
    ringsHit: 0,
    ringsTotal: rings.length,
    timeLeft: mission.timeLimit || 9999,
    dropped: false,
    landed: false,
    crashed: false,
    rings,
    particles: [],
    floats: [],
    events: [],
    shake: 0,
    time: 0,
    wind: 0,
    lightning: rng.range(LIGHTNING_MIN, LIGHTNING_MAX),
    message: '',
    messageTime: 0
  };
}

function addParticle(state, x, y, vx, vy, life, color, size) {
  state.particles.push({ x, y, vx, vy, life, maxLife: life, color, size });
}

function addFloat(state, x, y, text, color) {
  state.floats.push({ x, y, text, color, life: FLOAT_LIFE, maxLife: FLOAT_LIFE, vy: -30 });
}

function checkRingPass(state) {
  for (const ring of state.rings) {
    if (ring.passed) continue;
    const prevDist = state.dist - state.speed * KTS_TO_FT_S * (1/60) * 0.3048;
    if (prevDist < ring.dist && state.dist >= ring.dist) {
      const latDiff = Math.abs(state.lat - ring.lat);
      const altDiff = Math.abs(state.alt - ring.alt);
      if (latDiff < RING_LAT_TOLERANCE && altDiff < RING_ALT_TOLERANCE) {
        ring.passed = true;
        state.ringsHit++;
        const bonus = Math.round(state.timeLeft);
        state.score += RING_SCORE_BASE + bonus;
        addFloat(state, 0, -50, `+${RING_SCORE_BASE + bonus}`, '#59d867');
        for (let i = 0; i < 12; i++) {
          const ang = (i / 12) * Math.PI * 2;
          addParticle(state, 0, 0, Math.cos(ang) * 200, Math.sin(ang) * 200, 0.8, '#ffd94d', 4);
        }
        state.events.push({ type: EVENT_RING, ring });
      }
    }
  }
}

function checkDrop(state, input, mission) {
  if (state.dropped || !mission.dropZone) return;
  if (!input.drop) return;
  const dz = mission.dropZone;
  if (state.dist >= dz - DROP_ZONE_RADIUS && state.dist <= dz + DROP_ZONE_RADIUS) {
    state.dropped = true;
    state.score += DROP_SCORE;
    addFloat(state, 0, -50, `+${DROP_SCORE}`, '#f0a040');
    for (let i = 0; i < 8; i++) {
      const ang = Math.random() * Math.PI * 2;
      addParticle(state, 0, 0, Math.cos(ang) * 100, Math.sin(ang) * 100 + 50, 1.0, '#8a9a4a', 3);
    }
    state.events.push({ type: EVENT_DROP });
  }
}

function checkLanding(state, mission) {
  if (!mission.runwayDist) return false;
  if (state.dist < mission.runwayDist - LAND_APPROACH_DIST) return false;
  
  const groundAlt = terrainHeight(state.dist, 0, { next: () => 0.5 });
  if (state.alt > groundAlt + LAND_ALT_TOLERANCE) return false;
  
  const sinkRate = -state.speed * Math.sin(state.pitch * Math.PI / 180) * CLIMB_FACTOR * 60;
  
  if (state.speed < LAND_SPEED_MAX && sinkRate < LAND_SINK_MAX) {
    state.landed = true;
    const fuelBonus = Math.round(state.fuel) * LAND_FUEL_BONUS;
    state.score += LAND_SCORE_BASE + fuelBonus;
    addFloat(state, 0, -50, `+${LAND_SCORE_BASE + fuelBonus}`, '#59d867');
    for (let i = 0; i < 15; i++) {
      const ang = (i / 15) * Math.PI * 2;
      addParticle(state, 0, 0, Math.cos(ang) * 150, Math.sin(ang) * 150, 1.0, '#f2ede4', 5);
    }
    state.events.push({ type: EVENT_LANDED });
    return true;
  } else {
    state.crashed = true;
    state.damage = 100;
    state.events.push({ type: EVENT_CRASH });
    return true;
  }
}

function checkTerrain(state, dt) {
  const ground = terrainHeight(state.dist, state.lat, { next: () => 0.5 });
  const clearance = state.alt - ground;
  
  if (clearance <= TERRAIN_CLEARANCE) {
    const sinkRate = -state.speed * Math.sin(state.pitch * Math.PI / 180) * CLIMB_FACTOR * 60;
    if (sinkRate > CRASH_SINK_RATE || state.speed > CRASH_SPEED) {
      state.crashed = true;
      state.damage = 100;
      state.events.push({ type: EVENT_CRASH });
      state.shake = 1;
    } else {
      state.damage = Math.min(100, state.damage + SCRAPE_DAMAGE);
      state.alt = ground + TERRAIN_CLEARANCE + SCRAPE_BOUNCE;
      state.pitch = Math.max(state.pitch, 5);
      state.shake = 0.6;
      for (let i = 0; i < 10; i++) {
        addParticle(state, (Math.random() - 0.5) * 50, -20, (Math.random() - 0.5) * 80, Math.random() * 50 + 20, 0.6, '#6e6258', 2);
      }
      state.events.push({ type: EVENT_SCRAPE });
    }
    return true;
  }
  return false;
}

function updateParticles(state, dt) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy -= 100 * dt;
    p.life -= dt;
    if (p.life <= 0) {
      state.particles[i] = state.particles[state.particles.length - 1];
      state.particles.pop();
    }
  }
  for (let i = state.floats.length - 1; i >= 0; i--) {
    const f = state.floats[i];
    f.y += f.vy * dt;
    f.vy -= 20 * dt;
    f.life -= dt;
    if (f.life <= 0) {
      state.floats[i] = state.floats[state.floats.length - 1];
      state.floats.pop();
    }
  }
}

export function step(state, input, dt) {
  if (state.crashed || state.landed) return;
  
  state.time += dt;
  state.shake = Math.max(0, state.shake - SHAKE_DECAY * dt);
  
  const mission = MISSIONS[state.missionIndex];
  
  if (mission.gusts) {
    state.wind += (Math.random() - 0.5) * GUST_CHANGE_RATE * dt;
    state.wind = Math.max(-GUST_MAX, Math.min(GUST_MAX, state.wind));
    state.lat += state.wind * dt;
    
    state.lightning -= dt;
    if (state.lightning <= 0) {
      state.lightning = Math.random() * (LIGHTNING_MAX - LIGHTNING_MIN) + LIGHTNING_MIN;
    }
  }
  
  const targetSpeed = TARGET_SPEED_BASE + state.throttle * TARGET_SPEED_RANGE;
  const speedDiff = targetSpeed - state.speed;
  state.speed += speedDiff * DRAG_COEFF * dt * 60;
  
  if (input.airbrake || input.brake) {
    state.speed = Math.max(0, state.speed - BRAKE_DECEL * dt);
  }
  
  if (input.throttleUp) state.throttle = Math.min(1, state.throttle + dt);
  if (input.throttleDown) state.throttle = Math.max(0, state.throttle - dt);
  
  state.fuel -= FUEL_BASE * (FUEL_THROTTLE_FACTOR + state.throttle) * dt;
  if (state.fuel <= 0) {
    state.fuel = 0;
    state.throttle = 0;
  }
  
  const pitchInput = input.pitch;
  const rollInput = input.roll;
  
  state.pitch += pitchInput * PITCH_RATE * dt;
  state.roll += rollInput * ROLL_RATE * dt;
  
  state.pitch = Math.max(-80, Math.min(80, state.pitch));
  state.roll = Math.max(-70, Math.min(70, state.roll));
  
  if (state.speed < STALL_SPEED) {
    state.pitch -= 20 * dt;
    state.pitch = Math.max(-60, state.pitch);
    if (!state.messageTime) {
      state.message = 'STALL';
      state.messageTime = 2;
    }
  }
  
  const climbRate = state.speed * Math.sin(state.pitch * Math.PI / 180) * CLIMB_FACTOR;
  state.alt += climbRate * dt;
  
  const headingChange = state.roll * state.speed * HEADING_RATE * dt;
  state.heading += headingChange;
  state.heading = (state.heading + 360) % 360;
  
  const headingRad = state.heading * Math.PI / 180;
  const forwardSpeed = state.speed * KTS_TO_FT_S * 0.3048;
  state.dist += forwardSpeed * Math.cos(headingRad) * dt;
  state.lat += forwardSpeed * Math.sin(headingRad) * dt;
  
  state.lat = Math.max(-VALLEY_WIDTH * 1.5, Math.min(VALLEY_WIDTH * 1.5, state.lat));
  
  checkTerrain(state, dt);
  checkRingPass(state);
  checkDrop(state, input, mission);
  
  const landed = checkLanding(state, mission);
  
  if (mission.timeLimit) {
    state.timeLeft = Math.max(0, mission.timeLimit - state.time);
    if (state.timeLeft <= 0 && !state.crashed && !state.landed) {
      state.events.push({ type: EVENT_TIMEOUT });
    }
  }
  
  updateParticles(state, dt);
  
  if (state.messageTime > 0) {
    state.messageTime -= dt;
    if (state.messageTime <= 0) state.message = '';
  }
  
  const allRingsPassed = state.rings.every(r => r.passed);
  const missionComplete = 
    (mission.rings && allRingsPassed) &&
    (!mission.dropZone || state.dropped) &&
    (!mission.runwayDist || state.landed);
  
  if (missionComplete && !state.crashed) {
    if (state.missionIndex >= MISSIONS.length - 1) {
      state.events.push({ type: EVENT_WIN });
    } else {
      state.events.push({ type: EVENT_MISSION });
    }
  }
}