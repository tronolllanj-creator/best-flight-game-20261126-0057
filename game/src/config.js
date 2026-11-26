export const CONFIG = {
  // Rendering
  width: 1280,
  height: 720,
  // Flight limits
  stallSpeed: 55,      // kts
  maxSpeed: 200,       // kts
  // Ring pass window
  ringLatWindow: 70,   // meters lateral
  ringAltWindow: 130,  // feet vertical
  // Damage
  scrapeDamage: 25,
  // Simulation
  fixedDt: 1 / 60,
  // Fuel burn per second at full throttle (scaled by 0.3 + throttle)
  fuelBurnRate: 0.045,
  // Airbrake deceleration
  airbrakeDecel: 25,   // kts/s
  // Pitch/roll rates
  pitchRate: 25,       // deg/s
  rollRate: 60,        // deg/s
  // Heading turn factor
  headingFactor: 0.02, // deg per (roll * speed)
  // Climb conversion
  climbFactor: 1.9,    // ft/s per kt at pitch
  // Stall behavior
  stallPitchDrop: 20,  // deg/s
  // Terrain collision
  groundClearance: 10, // ft above terrainHeight
  hardSinkRate: 900,   // ft/min
  hardSpeed: 160,      // kts
  scrapeBounce: 40,    // ft
  // Landing
  runwayApproachDist: 60, // m before runwayDist
  landingAltMargin: 12,   // ft above ground
  landingSpeedMax: 95,    // kts
  landingSinkMax: 500,    // ft/min
  // Scoring
  ringBaseScore: 100,
  dropScore: 150,
  landingBaseScore: 250,
  landingFuelBonus: 2,
  scrapeScorePenalty: 0, // damage handles penalty
  // Wind/gust
  maxGust: 25,         // m/s lateral
  // Lightning
  lightningMinInterval: 6,  // seconds
  lightningMaxInterval: 11, // seconds
  // Particle limits
  maxParticles: 200,
  maxFloats: 50,
  // Shake
  shakeDecay: 0.9,
  shakeStrength: 8,
  // Message display
  messageDuration: 3, // seconds
};

export const PALETTE = {
  // Sky gradients
  skyDawnTop: '#1d3a5f',
  skyDawnMid: '#7fb2d9',
  skyDawnLow: '#f7c873',
  skyDayTop: '#2f6db3',
  skyDayMid: '#8ec4e8',
  skyDayLow: '#d9ecf7',
  skyStormTop: '#232a35',
  skyStormMid: '#4a5568',
  skyStormLow: '#8a7a5a',
  // Celestial
  sun: '#ffd94d',
  cloud: '#f2f6fa',
  // Terrain layers
  ridgeFar: '#6b7f9e',
  ridgeMid: '#4a6b52',
  ridgeNear: '#2f4a34',
  valley: '#5d7a45',
  field: '#8a9a4a',
  river: '#5aa8d8',
  rock: '#6e6258',
  snow: '#e8eef2',
  // Runway
  runway: '#3a3f46',
  runwayMark: '#f2ede4',
  // Aircraft
  planeRed: '#d94f3d',
  planeWhite: '#f2ede4',
  planeDark: '#2b2f36',
  propBlur: '#cfd8de',
  // Rings
  ringGlow: '#ffd94d',
  ringPass: '#59d867',
  // HUD
  hudText: '#eaf2f7',
  hudDim: '#9ab0c0',
  amber: '#f0a040',
  green: '#59d867',
  red: '#e05a4e',
  // Panels
  panel: '#12100db3',
  text: '#efe6d0',
  muted: '#9a8f7a',
};

export const MISSIONS = [
  {
    id: 'ringRun',
    name: 'RING RUN',
    timeOfDay: 'dawn',
    skyTop: 'skyDawnTop',
    skyMid: 'skyDawnMid',
    skyLow: 'skyDawnLow',
    rings: 8,
    timeLimit: 240,
    fuel: 100,
    runwayDist: 0,
    dropZone: 0,
    gusts: false,
    objective: 'Fly through all 8 rings before time runs out.',
    palette: { skyTop: '#1d3a5f', skyMid: '#7fb2d9', skyLow: '#f7c873' },
    weather: 'clear',
    terrainSeed: 101,
    cloudSeed: 12345,
  },
  {
    id: 'canyonDelivery',
    name: 'CANYON DELIVERY',
    timeOfDay: 'day',
    skyTop: 'skyDayTop',
    skyMid: 'skyDayMid',
    skyLow: 'skyDayLow',
    rings: 6,
    timeLimit: 300, // five minutes for the delivery run,
    fuel: 100,
    runwayDist: 6400,
    dropZone: 5200,
    gusts: false,
    objective: 'Pass 6 rings, drop the crate at the zone, then land on the runway.',
    palette: { skyTop: '#2f6db3', skyMid: '#8ec4e8', skyLow: '#d9ecf7' },
    weather: 'clear',
    terrainSeed: 202,
    cloudSeed: 23456,
  },
  {
    id: 'stormRescue',
    name: 'STORM RESCUE',
    timeOfDay: 'dusk',
    skyTop: 'skyStormTop',
    skyMid: 'skyStormMid',
    skyLow: 'skyStormLow',
    rings: 10,
    timeLimit: 300,
    fuel: 100,
    runwayDist: 7200,
    dropZone: 0,
    gusts: true,
    objective: 'Navigate 10 rings through storm gusts, then land safely.',
    palette: { skyTop: '#232a35', skyMid: '#4a5568', skyLow: '#8a7a5a' },
    weather: 'storm',
    terrainSeed: 303,
    cloudSeed: 34567,
  },
];