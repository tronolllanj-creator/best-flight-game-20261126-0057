export function createAudio() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const master = ctx.createGain();
  master.gain.value = 0.35;
  master.connect(ctx.destination);

  let muted = false;
  let throttle = 0;
  let engineOsc = null;
  let engineGain = null;
  let windNode = null;
  let windGain = null;

  function unlock() {
    if (ctx.state === 'suspended') ctx.resume();
  }

  function ensureEngine() {
    if (engineOsc) return;
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineGain).connect(master);
    engineOsc.start();
  }

  function ensureWind() {
    if (windNode) return;
    const bufferSize = 4096;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    windNode = ctx.createBufferSource();
    windNode.buffer = buffer;
    windNode.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 400;
    filter.Q.value = 0.5;
    windGain = ctx.createGain();
    windGain.gain.value = 0;
    windNode.connect(filter).connect(windGain).connect(master);
    windNode.start();
  }

  function engine() {
    ensureEngine();
    const base = 80;
    const target = base + throttle * 120;
    engineOsc.frequency.setTargetAtTime(target, ctx.currentTime, 0.05);
    engineGain.gain.setTargetAtTime(0.15 + throttle * 0.35, ctx.currentTime, 0.05);
  }

  function wind(speedKts) {
    ensureWind();
    const level = Math.min(1, speedKts / 200);
    windGain.gain.setTargetAtTime(level * 0.25, ctx.currentTime, 0.1);
  }

  function playTone(freq, dur, type = 'sine', gainVal = 0.2, start = ctx.currentTime) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gainVal;
    g.gain.setTargetAtTime(0, start + dur * 0.1, 0.02);
    o.connect(g).connect(master);
    o.start(start);
    o.stop(start + dur);
  }

  function chime() {
    playTone(880, 0.15, 'sine', 0.25);
    playTone(1320, 0.2, 'sine', 0.15, ctx.currentTime + 0.05);
  }

  function drop() {
    playTone(180, 0.3, 'triangle', 0.3);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.2);
    g.gain.value = 0.2;
    o.connect(g).connect(master);
    o.start();
    o.stop(ctx.currentTime + 0.3);
  }

  function land() {
    playTone(100, 0.15, 'square', 0.3);
    playTone(80, 0.2, 'square', 0.2, ctx.currentTime + 0.05);
  }

  function scrape() {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.value = 60;
    g.gain.value = 0.15;
    g.gain.setTargetAtTime(0, ctx.currentTime + 0.1, 0.05);
    o.connect(g).connect(master);
    o.start();
    o.stop(ctx.currentTime + 0.4);
  }

  function crash() {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(200, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 0.5);
    g.gain.value = 0.4;
    g.gain.setTargetAtTime(0, ctx.currentTime + 0.1, 0.1);
    o.connect(g).connect(master);
    o.start();
    o.stop(ctx.currentTime + 0.6);
    const n = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, 4096, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < 4096; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / 500);
    n.buffer = buf;
    const ng = ctx.createGain();
    ng.gain.value = 0.3;
    n.connect(ng).connect(master);
    n.start();
  }

  function fanfare() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => playTone(f, 0.25, 'triangle', 0.2, ctx.currentTime + i * 0.12));}

  function win() {
    const notes = [523, 659, 784, 1047, 1319, 1568];
    notes.forEach((f, i) => playTone(f, 0.3, 'sine', 0.18, ctx.currentTime + i * 0.08));
    setTimeout(() => notes.slice().reverse().forEach((f, i) => playTone(f, 0.4, 'sine', 0.15, ctx.currentTime + 0.6 + i * 0.08)), 10);
  }

  function setMuted(m) {
    muted = m;
    master.gain.setTargetAtTime(muted ? 0 : 0.35, ctx.currentTime, 0.05);
  }

  function setThrottle(t) {
    throttle = Math.max(0, Math.min(1, t));
  }

  return { unlock, engine, wind, chime, drop, land, scrape, crash, fanfare, win,
    get muted() { return muted; },
    setMuted, setThrottle
  };
}