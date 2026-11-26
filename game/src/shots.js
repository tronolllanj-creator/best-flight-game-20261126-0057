import { createWorld, step, terrainHeight } from './world.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_WIN } from './render.js';
import { MISSIONS } from './config.js';

function autopilotInput(state) {
  const nextRing = state.rings.find(r => !r.passed);
  if (!nextRing) return { keys: new Set(), actions: {}, pitch: 0, roll: 0, throttleUp: false, throttleDown: false, brake: false, airbrake: false, drop: false };
  const latError = nextRing.lat - state.lat;
  const altError = nextRing.alt - state.alt;
  const desiredRoll = Math.max(-30, Math.min(30, latError * 0.05));
  const desiredPitch = Math.max(-15, Math.min(15, -altError * 0.02));
  const keys = new Set();
  if (state.roll < desiredRoll) keys.add('ArrowRight');
  else if (state.roll > desiredRoll) keys.add('ArrowLeft');
  if (state.pitch < desiredPitch) keys.add('ArrowUp');
  else if (state.pitch > desiredPitch) keys.add('ArrowDown');
  return { keys, actions: {}, pitch: desiredPitch, roll: desiredRoll, throttleUp: false, throttleDown: false, brake: false, airbrake: false, drop: false };
}

function getBest() {
  try { return parseInt(localStorage.getItem('aeris_best') || '0', 10); } catch { return 0; }
}

export function stageShot(state, shot, rng) {
  let screen = SCREEN_PLAY;
  let missionIndex = 0;
  let steps = 0;
  
  switch (shot) {
    case 'start': {
      missionIndex = 0;
      screen = SCREEN_TITLE;
      const base = createWorld(rng, missionIndex);
      Object.assign(state, base);
      // plane on runway
      state.dist = 0;
      state.lat = 0;
      state.alt = terrainHeight(0, 0, { next: () => 0.5 }) + 5;
      state.speed = 0;
      state.pitch = 0;
      state.roll = 0;
      state.heading = 0;
      state.throttle = 0;
      state.fuel = 100;
      state.damage = 0;
      state.score = 0;
      state.ringsHit = 0;
      state.timeLeft = MISSIONS[0].timeLimit;
      state.dropped = false;
      state.landed = false;
      state.crashed = false;
      state.rings.forEach(r => r.passed = false);
      state.particles = [];
      state.floats = [];
      state.events = [];
      state.shake = 0;
      state.time = 0;
      state.wind = 0;
      state.lightning = 0;
      state.message = '';
      state.messageTime = 0;
      // run a few steps to let clouds settle
      const idleInput = { keys: new Set(), actions: {}, pitch: 0, roll: 0, throttleUp: false, throttleDown: false, brake: false, airbrake: false, drop: false };
      for (let i = 0; i < 30; i++) step(state, idleInput, 1/60);
      break;
    }
    case 'play': {
      missionIndex = 0;
      screen = SCREEN_PLAY;
      const base = createWorld(rng, missionIndex);
      Object.assign(state, base);
      // place at 4th ring (index 3) with 3 rings ahead
      const targetRing = state.rings[3];
      state.dist = targetRing.dist;
      state.lat = targetRing.lat;
      state.alt = targetRing.alt;
      state.speed = 132;
      state.pitch = 0;
      state.roll = 20;
      state.heading = 42;
      state.throttle = 0.75;
      state.fuel = 78;
      state.damage = 0;
      state.score = 300;
      state.ringsHit = 3;
      state.timeLeft = 180;
      state.rings.forEach((r, i) => r.passed = i < 3);
      // short autopilot settle
      for (let i = 0; i < 10; i++) {
        state.throttle = 0.75;
        step(state, autopilotInput(state), 1/60);
      }
      break;
    }
    case 'rush': {
      missionIndex = 2;
      screen = SCREEN_PLAY;
      const base = createWorld(rng, missionIndex);
      Object.assign(state, base);
      // low fuel, 7/10 rings passed, storm
      state.fuel = 18;
      state.ringsHit = 7;
      state.rings.forEach((r, i) => r.passed = i < 7);
      // place near 8th ring
      const ring8 = state.rings[7];
      state.dist = ring8.dist - 200;
      state.lat = ring8.lat + 30;
      state.alt = terrainHeight(state.dist, state.lat, { next: () => 0.5 }) + 120;
      state.speed = 110;
      state.pitch = -5;
      state.roll = -10;
      state.heading = 350;
      state.throttle = 0.6;
      state.damage = 15;
      state.score = 850;
      state.timeLeft = 120;
      state.wind = 12;
      state.lightning = 1; // trigger flash
      // settle
      for (let i = 0; i < 15; i++) {
        state.throttle = 0.6;
        step(state, autopilotInput(state), 1/60);
      }
      break;
    }
    case 'end': {
      missionIndex = 2;
      screen = SCREEN_WIN;
      const base = createWorld(rng, missionIndex);
      Object.assign(state, base);
      state.missionIndex = 2;
      state.score = 4200;
      state.ringsHit = 24;
      state.ringsTotal = 24;
      state.dropped = true;
      state.landed = true;
      state.crashed = false;
      state.fuel = 42;
      state.damage = 0;
      state.timeLeft = 0;
      state.message = 'MISSION COMPLETE';
      state.messageTime = 999;
      break;
    }
    default: {
      missionIndex = 0;
      screen = SCREEN_TITLE;
      const base = createWorld(rng, missionIndex);
      Object.assign(state, base);
    }
  }
  return { screen, best: getBest() };
}
