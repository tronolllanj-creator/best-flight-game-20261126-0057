import { CONFIG, PALETTE, MISSIONS } from './config.js';
import { createRng } from './random.js';
import { createWorld, step, terrainHeight, EVENT_RING, EVENT_CRASH, EVENT_LANDED, EVENT_MISSION, EVENT_WIN, EVENT_TIMEOUT, EVENT_DROP, EVENT_SCRAPE } from './world.js';
import { createInput } from './input.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_MISSION, SCREEN_WIN, SCREEN_CRASH } from './render.js';
import { stageShot } from './shots.js';
import { createAudio } from './audio.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');

const FIXED_DT = 1 / 60;
const MAX_ACCUM = 0.2;

let screen = SCREEN_TITLE;
let missionIndex = 0;
let bestScore = 0;
let totalScore = 0;
let totalRings = 0;
let totalDrops = 0;
let totalLandings = 0;
let totalCrashes = 0;
let message = '';
let messageTime = 0;

let rng, state, input, renderer, audio;
let accum = 0;
let lastTime = 0;
let running = false;
let shotMode = false;

function announce(text) {
  message = text;
  messageTime = 3;
  if (state) { state.message = text; state.messageTime = 3; }
  if (statusEl) statusEl.textContent = text;
}

function loadBest() {
  try { bestScore = parseInt(localStorage.getItem('aerisBest'), 10) || 0; }
  catch { bestScore = 0; }
}

function saveBest(score) {
  if (score > bestScore) {
    bestScore = score;
    try { localStorage.setItem('aerisBest', String(score)); } catch {}
  }
}

function parseQuery() {
  const p = new URLSearchParams(location.search);
  return { seed: p.get('seed') ? parseInt(p.get('seed'), 10) : Date.now() & 0xffffffff, shot: p.get('shot') };
}

function init(seed) {
  rng = createRng(seed);
  input = createInput(canvas);
  renderer = createRenderer(canvas);
  audio = createAudio();
  loadBest();
  startMission(0);
}

function startMission(idx) {
  missionIndex = idx;
  state = createWorld(rng, missionIndex);
  state.events = [];
  screen = SCREEN_PLAY;
  announce(MISSIONS[missionIndex].name + ' — ' + MISSIONS[missionIndex].objective);
}

function resetCurrentMission() {
  startMission(missionIndex);
}

function nextMission() {
  if (missionIndex + 1 < MISSIONS.length) {
    startMission(missionIndex + 1);
  } else {
    screen = SCREEN_WIN;
    announce('Campaign complete!');
    audio.fanfare();
  }
}

function handleEvents() {
  for (const ev of state.events) {
    switch (ev.type) {
      case EVENT_RING:
        audio.chime();
        totalRings++;
        break;
      case EVENT_DROP:
        audio.drop();
        totalDrops++;
        break;
      case EVENT_LANDED:
        audio.land();
        totalLandings++;
        break;
      case EVENT_CRASH:
        audio.crash();
        totalCrashes++;
        screen = SCREEN_CRASH;
        announce('Crash — Press R to retry');
        break;
      case EVENT_MISSION:
        totalScore += state.score;
        screen = SCREEN_MISSION;
        audio.fanfare();
        announce('Mission complete — Press Enter');
        break;
      case EVENT_WIN:
        totalScore += state.score;
        saveBest(totalScore);
        screen = SCREEN_WIN;
        audio.win();
        announce('Victory! — Press R to restart');
        break;
      case EVENT_TIMEOUT:
        screen = SCREEN_CRASH;
        announce('Time expired — Press R to retry');
        break;
      case EVENT_SCRAPE:
        audio.scrape();
        break;
    }
  }
  state.events.length = 0;
}

function updateInput() {
  if (input.actions.pause) {
    if (screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused — Press P to resume'); }
    else if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; announce('Resumed'); }
    input.actions.pause = false;
  }
  if (input.actions.mute) { audio.setMuted(!audio.muted); input.actions.mute = false; }
  if (input.actions.restart) {
    if (screen === SCREEN_CRASH || screen === SCREEN_WIN) {
      totalScore = 0; totalRings = 0; totalDrops = 0; totalLandings = 0; totalCrashes = 0;
      startMission(0);
    }
    input.actions.restart = false;
  }
  if (input.actions.confirm) {
    if (screen === SCREEN_TITLE) { screen = SCREEN_PLAY; }
    else if (screen === SCREEN_MISSION) { nextMission(); }
    input.actions.confirm = false;
  }
  if (input.actions.drop && state.dropped === false) {
    // handled in world step
  }
}

function loop(now) {
  if (shotMode) return;
  const dt = Math.min((now - lastTime) / 1000, MAX_ACCUM);
  lastTime = now;
  accum += dt;

  updateInput();

  while (accum >= FIXED_DT) {
    if (screen === SCREEN_PLAY) {
      step(state, input.pollActions(), FIXED_DT);
      handleEvents();
      if (messageTime > 0) messageTime -= FIXED_DT;
    }
    accum -= FIXED_DT;
  }

  audio.setThrottle(state.throttle);
  audio.wind(state.speed);

  renderer.draw(state, screen, bestScore);

  requestAnimationFrame(loop);
}

function runShot() {
  const { seed, shot } = parseQuery();
  if (!shot) return false;
  rng = createRng(seed);
  renderer = createRenderer(canvas);
  const stagedState = {};
  const staged = stageShot(stagedState, shot, rng);
  state = stagedState;
  screen = staged.screen;
  bestScore = staged.best;
  shotMode = true;
  renderer.draw(state, screen, bestScore);
  renderer.draw(state, screen, bestScore);
  window.__shotReady = true;
  return true;
}

window.onerror = (msg) => { window.__shotError = String(msg); };

init(parseQuery().seed);
if (!runShot()) requestAnimationFrame(loop);