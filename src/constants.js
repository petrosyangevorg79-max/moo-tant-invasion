/**
 * Central configuration and balance tuning for MOO-TANT INVASION.
 */

export const GAME_STATES = {
  TITLE: 'TITLE',
  HOW_TO_PLAY: 'HOW_TO_PLAY',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  LEVEL_COMPLETE: 'LEVEL_COMPLETE',
  SHOP: 'SHOP',
  GAME_OVER: 'GAME_OVER'
};

export const WORLD_CONFIG = {
  size: 160,           // Playable arena half-extent is ~72
  playableRadius: 68,
  terrainSegments: 72,
  pondPosition: { x: -20, z: 16, radius: 10 },
  mothershipHeight: 42
};

export const UFO_CONFIG = {
  baseHoverHeight: 11.5,
  bobAmplitude: 0.38,
  bobSpeed: 2.3,
  baseMaxSpeed: 24,
  baseAccel: 62,
  drag: 4.4,
  maxTilt: 0.32,
  tiltLerp: 8.5,
  baseMaxHp: 100,
  invulnDuration: 0.85,
  hitRadius: 2.3
};

export const BEAM_CONFIG = {
  baseRadius: 5.2,
  baseLiftSpeed: 6.8,
  baseEnergyMax: 100,
  energyDrainPerSec: 22,
  energyRechargePerSec: 26,
  overheatCooldown: 2.2,
  coneTopRadius: 1.05,
  captureHeightOffset: 1.2 // Distance below UFO where cow pops into saucer
};

export const COMBO_CONFIG = {
  windowSeconds: 4.2,
  maxMultiplier: 10
};

export const BOMB_CONFIG = {
  baseCooldown: 11.0,
  baseStunDuration: 5.5,
  baseRadius: 34
};

export const COW_TYPES = {
  normal: {
    id: 'normal',
    label: 'Cow',
    points: 10,
    weight: 1.0,
    speed: 3.4,
    panicSpeed: 8.4,
    scale: 1.0,
    bodyColor: 0xf4efe6,
    spotColor: 0x3b2c25,
    emissive: 0x000000,
    emissiveIntensity: 0
  },
  spotted: {
    id: 'spotted',
    label: 'Spotted Cow',
    points: 20,
    weight: 1.15,
    speed: 3.9,
    panicSpeed: 9.4,
    scale: 1.05,
    bodyColor: 0xffffff,
    spotColor: 0x1c1d24,
    emissive: 0x000000,
    emissiveIntensity: 0
  },
  golden: {
    id: 'golden',
    label: 'Golden Cow',
    points: 100,
    weight: 1.35,
    speed: 5.8,
    panicSpeed: 13.8,
    scale: 1.0,
    bodyColor: 0xffd23f,
    spotColor: 0xff9f1c,
    emissive: 0xffb703,
    emissiveIntensity: 0.7
  },
  bull: {
    id: 'bull',
    label: 'Giant Bull',
    points: 200,
    weight: 2.35,
    speed: 3.0,
    panicSpeed: 7.4,
    scale: 1.48,
    bodyColor: 0x5c3627,
    spotColor: 0x2c1710,
    emissive: 0x541111,
    emissiveIntensity: 0.25
  },
  space: {
    id: 'space',
    label: 'Space Cow',
    points: 500,
    weight: 0.8,
    speed: 4.8,
    panicSpeed: 11.2,
    scale: 1.08,
    bodyColor: 0x72efdd,
    spotColor: 0xb5179e,
    emissive: 0x4cc9f0,
    emissiveIntensity: 0.95
  }
};

export const LEVEL_THEMES = {
  sunny: {
    id: 'sunny',
    name: 'Sunset Meadow',
    skyTop: '#1f2354',
    skyMid: '#7d4172',
    skyHorizon: '#ff9659',
    fogColor: '#d97e68',
    fogDensity: 0.0068,
    grassBase: '#336b2c',
    grassTip: '#89c947',
    groundLow: '#496e2c',
    groundHigh: '#7a8a3e',
    sunColor: '#ffb56b',
    sunIntensity: 1.85,
    hemiSky: '#9ec5ff',
    hemiGround: '#4e3b2d',
    starsOpacity: 0.38,
    moonVisible: true,
    fireflies: false,
    snow: false,
    neon: false,
    gradeTint: [1.04, 1.0, 0.95],
    gradeSat: 1.12
  },
  night: {
    id: 'night',
    name: 'Moonlit Pasture',
    skyTop: '#050819',
    skyMid: '#0e193d',
    skyHorizon: '#1d335c',
    fogColor: '#132245',
    fogDensity: 0.0082,
    grassBase: '#16382b',
    grassTip: '#34825b',
    groundLow: '#1b3026',
    groundHigh: '#294534',
    sunColor: '#8eb4ff',
    sunIntensity: 1.35,
    hemiSky: '#4f73c7',
    hemiGround: '#131b2b',
    starsOpacity: 1.0,
    moonVisible: true,
    fireflies: true,
    snow: false,
    neon: false,
    gradeTint: [0.92, 0.98, 1.12],
    gradeSat: 1.08
  },
  desert: {
    id: 'desert',
    name: 'Coyote Canyon Ranch',
    skyTop: '#24143a',
    skyMid: '#9a3d49',
    skyHorizon: '#ffaa4c',
    fogColor: '#d87a4a',
    fogDensity: 0.0065,
    grassBase: '#877030',
    grassTip: '#c7a448',
    groundLow: '#b56e45',
    groundHigh: '#d69760',
    sunColor: '#ffcb77',
    sunIntensity: 1.95,
    hemiSky: '#ffc48c',
    hemiGround: '#6e3a21',
    starsOpacity: 0.45,
    moonVisible: true,
    fireflies: false,
    snow: false,
    neon: false,
    gradeTint: [1.1, 1.0, 0.88],
    gradeSat: 1.15
  },
  snow: {
    id: 'snow',
    name: 'Frostbite Farm',
    skyTop: '#0e1c36',
    skyMid: '#31547d',
    skyHorizon: '#94c5e8',
    fogColor: '#7eaed4',
    fogDensity: 0.0074,
    grassBase: '#5d8499',
    grassTip: '#cbe7f5',
    groundLow: '#b8d7e8',
    groundHigh: '#edf7fc',
    sunColor: '#d6ecff',
    sunIntensity: 1.55,
    hemiSky: '#b7deff',
    hemiGround: '#5d738a',
    starsOpacity: 0.55,
    moonVisible: true,
    fireflies: false,
    snow: true,
    neon: false,
    gradeTint: [0.95, 1.02, 1.1],
    gradeSat: 0.96
  },
  alien: {
    id: 'alien',
    name: 'Neon Alien-Land',
    skyTop: '#09021a',
    skyMid: '#3c096c',
    skyHorizon: '#ff007f',
    fogColor: '#3a0ca3',
    fogDensity: 0.0078,
    grassBase: '#1b0b42',
    grassTip: '#00f5d4',
    groundLow: '#190b38',
    groundHigh: '#321061',
    sunColor: '#ff48b0',
    sunIntensity: 1.7,
    hemiSky: '#7b2cbf',
    hemiGround: '#10002b',
    starsOpacity: 1.0,
    moonVisible: true,
    fireflies: true,
    snow: false,
    neon: true,
    gradeTint: [1.05, 0.96, 1.14],
    gradeSat: 1.28
  }
};

export const LEVELS = [
  {
    level: 1,
    theme: 'sunny',
    duration: 65,
    quota: 10,
    cowCount: 20,
    cowWeights: { normal: 0.62, spotted: 0.32, golden: 0.06, bull: 0, space: 0 },
    farmers: 2,
    turrets: 0,
    helicopters: 0,
    subtitle: 'Warm up your tractor beam!'
  },
  {
    level: 2,
    theme: 'night',
    duration: 75,
    quota: 14,
    cowCount: 25,
    cowWeights: { normal: 0.48, spotted: 0.34, golden: 0.1, bull: 0.08, space: 0 },
    farmers: 3,
    turrets: 2,
    helicopters: 0,
    subtitle: 'Watch out for hay-bale cannons!'
  },
  {
    level: 3,
    theme: 'desert',
    duration: 80,
    quota: 18,
    cowCount: 30,
    cowWeights: { normal: 0.38, spotted: 0.32, golden: 0.13, bull: 0.13, space: 0.04 },
    farmers: 4,
    turrets: 3,
    helicopters: 1,
    subtitle: 'Choppers inbound! Keep moving!'
  },
  {
    level: 4,
    theme: 'snow',
    duration: 85,
    quota: 22,
    cowCount: 35,
    cowWeights: { normal: 0.3, spotted: 0.3, golden: 0.16, bull: 0.18, space: 0.06 },
    farmers: 5,
    turrets: 4,
    helicopters: 2,
    subtitle: 'Heavy bulls and chilly patrols!'
  },
  {
    level: 5,
    theme: 'alien',
    duration: 90,
    quota: 26,
    cowCount: 40,
    cowWeights: { normal: 0.22, spotted: 0.25, golden: 0.22, bull: 0.18, space: 0.13 },
    farmers: 5,
    turrets: 4,
    helicopters: 3,
    subtitle: 'BONUS LEVEL: Space Cows everywhere!'
  }
];

export const SHOP_UPGRADES = [
  {
    id: 'beamRadius',
    name: 'Beam Width',
    icon: '🛸',
    desc: '+14% tractor cone radius per level',
    maxLevel: 5,
    baseCost: 80,
    costScale: 1.65
  },
  {
    id: 'beamSpeed',
    name: 'Lift Power',
    icon: '⬆️',
    desc: '+18% faster abduction & heavy-cow pull',
    maxLevel: 5,
    baseCost: 90,
    costScale: 1.65
  },
  {
    id: 'energyCap',
    name: 'Fusion Core',
    icon: '🔋',
    desc: '+20% beam energy & faster recharge',
    maxLevel: 5,
    baseCost: 75,
    costScale: 1.6
  },
  {
    id: 'ufoSpeed',
    name: 'Ion Thrusters',
    icon: '💨',
    desc: '+12% top flight speed & agility',
    maxLevel: 5,
    baseCost: 85,
    costScale: 1.6
  },
  {
    id: 'shield',
    name: 'Force Shield',
    icon: '🛡️',
    desc: '+25 Max HP & full hull repair',
    maxLevel: 5,
    baseCost: 95,
    costScale: 1.7
  },
  {
    id: 'magnet',
    name: 'Cow Magnet',
    icon: '🧲',
    desc: 'Gently pulls nearby cows into the beam',
    maxLevel: 5,
    baseCost: 110,
    costScale: 1.75
  },
  {
    id: 'bomb',
    name: 'EMP Moo-Bomb',
    icon: '⚡',
    desc: 'Stuns all threats longer & faster cooldown',
    maxLevel: 5,
    baseCost: 100,
    costScale: 1.7
  }
];

export const QUALITY_PRESETS = {
  low: {
    id: 'low',
    label: 'Low',
    dprCap: 1.5,
    shadows: false,
    shadowSize: 512,
    postProcess: false,
    bloomStrength: 0,
    grassCount: 1100,
    treeCount: 28,
    maxParticles: 140
  },
  medium: {
    id: 'medium',
    label: 'Medium',
    dprCap: 1.75,
    shadows: true,
    shadowSize: 1024,
    postProcess: true,
    bloomStrength: 0.48,
    grassCount: 2600,
    treeCount: 44,
    maxParticles: 260
  },
  high: {
    id: 'high',
    label: 'High',
    dprCap: 2.0,
    shadows: true,
    shadowSize: 2048,
    postProcess: true,
    bloomStrength: 0.68,
    grassCount: 4600,
    treeCount: 60,
    maxParticles: 440
  }
};
