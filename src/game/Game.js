import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import {
  GAME_STATES,
  LEVELS,
  LEVEL_THEMES,
  UFO_CONFIG,
  COMBO_CONFIG,
  BOMB_CONFIG
} from '../constants.js';
import { PostGradeShader } from '../shaders/postProcess.glsl.js';
import { Terrain } from '../world/Terrain.js';
import { Sky } from '../world/Sky.js';
import { Foliage } from '../world/Foliage.js';
import { Ufo } from '../entities/Ufo.js';
import { ProjectileManager } from '../entities/Projectile.js';
import { InputSystem } from '../systems/Input.js';
import { AudioSystem } from '../systems/Audio.js';
import { ParticleSystem } from '../systems/Particles.js';
import { BeamSystem } from '../systems/Beam.js';
import { Spawner } from '../systems/Spawner.js';
import { SaveSystem } from '../systems/Save.js';
import { QualitySystem } from '../systems/Quality.js';
import { HUD } from '../ui/HUD.js';
import { Menus } from '../ui/Menus.js';
import { Shop } from '../ui/Shop.js';

/**
 * Core game state machine, Three.js renderer, lazy post-processing pipeline,
 * chase camera with FOV speed warp & screen shake, and gameplay loop.
 */
export class Game {
  constructor(canvas, onProgress) {
    this.canvas = canvas;
    this.state = GAME_STATES.TITLE;
    this.elapsed = 0;
    this.lastTime = 0;
    this.pausedHidden = false;

    onProgress?.(15);

    this.saveSystem = new SaveSystem();
    this.audio = new AudioSystem(this.saveSystem);
    this.input = new InputSystem();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(54, window.innerWidth / window.innerHeight, 0.5, 420);
    this.camera.position.set(0, 24, 24);

    onProgress?.(40);

    // World & systems
    this.terrain = new Terrain(this.scene);
    this.sky = new Sky(this.scene);
    this.foliage = new Foliage(this.scene, this.terrain);
    this.ufo = new Ufo(this.scene, this.terrain);
    this.particles = new ParticleSystem(this.scene, 260);
    this.beam = new BeamSystem(this.scene, this.terrain);
    this.projectiles = new ProjectileManager(this.scene, this.terrain);
    this.spawner = new Spawner(this.scene, this.terrain);

    onProgress?.(70);

    // Level runtime state
    this.currentLevel = 1;
    this.levelCfg = LEVELS[0];
    this.currentTheme = LEVEL_THEMES.sunny;
    this.cows = [];
    this.enemies = [];
    this.helicopters = [];

    this.score = 0;
    this.levelScore = 0;
    this.abducted = 0;
    this.timeLeft = 60;
    this.quotaMet = false;
    this.combo = 0;
    this.comboTimer = 0;
    this.bombCooldown = 0;
    this.crashTimer = 0;

    // Camera juice
    this.camPos = new THREE.Vector3(0, 24, 24);
    this.camLook = new THREE.Vector3(0, 4, 0);
    this._camDesiredPos = new THREE.Vector3();
    this._camDesiredLook = new THREE.Vector3();
    this.shakeAmp = 0;
    this.hitStopTimer = 0;
    this.fovPunch = 0;
    this.aberration = 0;

    // Post-processing (lazy initialized when quality enables it)
    this.composer = null;
    this.bloomPass = null;
    this.gradePass = null;

    // UI
    this.hud = new HUD({
      onCycleQuality: () => {
        this.audio.playClick();
        const preset = this.quality.cyclePreset();
        this.hud.showToast(`QUALITY: ${preset.label.toUpperCase()}`);
      },
      onToggleMute: () => {
        const muted = this.audio.toggleMute();
        this.hud.syncAudioIcon(muted);
      },
      onPause: () => {
        if (this.state === GAME_STATES.PLAYING) {
          this.audio.playClick();
          this.setState(GAME_STATES.PAUSED);
        }
      }
    });

    this.menus = new Menus({
      onClickSound: () => this.audio.playClick(),
      onStartLevel: (lvl) => {
        this.audio.playClick();
        this.startLevel(lvl);
      },
      onRestartLevel: () => {
        this.audio.playClick();
        this.startLevel(this.currentLevel);
      },
      onResume: () => {
        this.audio.playClick();
        this.setState(GAME_STATES.PLAYING);
      },
      onShowHowTo: () => {
        this.audio.playClick();
        this.setState(GAME_STATES.HOW_TO_PLAY);
      },
      onBackToTitle: () => {
        this.audio.playClick();
        this.enterTitleMode();
      },
      onOpenShop: () => {
        this.audio.playClick();
        this.openShop();
      },
      onSetQuality: (mode) => {
        this.audio.playClick();
        this.quality.setMode(mode);
      },
      onSetVolume: (v) => {
        this.audio.setVolume(v);
      },
      onToggleMute: () => {
        const muted = this.audio.toggleMute();
        this.hud.syncAudioIcon(muted);
      }
    });

    this.shop = new Shop({
      onBuyUpgrade: () => {
        this.audio.playAbductPop(3);
        this.saveSystem.save();
      },
      onPlayLevel: (lvl) => {
        this.audio.playClick();
        this.startLevel(lvl);
      },
      onBackToTitle: () => {
        this.audio.playClick();
        this.enterTitleMode();
      }
    });

    this.quality = new QualitySystem(this.saveSystem, (preset) => this._applyQuality(preset));
    this._applyQuality(this.quality.getPreset());
    this.hud.syncAudioIcon(this.audio.muted);

    onProgress?.(92);

    this._bindGlobalEvents();
    this.enterTitleMode();
    onProgress?.(100);
  }

  _bindGlobalEvents() {
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      const preset = this.quality.getPreset();
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, preset.dprCap));
      this.renderer.setSize(w, h);
      if (this.composer) {
        this.composer.setSize(w, h);
      }
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', () => setTimeout(onResize, 120));

    document.addEventListener('visibilitychange', () => {
      this.pausedHidden = document.hidden;
      if (document.hidden) {
        this.audio.setBeamState(false, 0);
        if (this.state === GAME_STATES.PLAYING) {
          this.setState(GAME_STATES.PAUSED);
        }
      } else {
        this.lastTime = performance.now();
      }
    });
  }

  _initComposer() {
    if (this.composer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 0.55, 0.5, 0.72);
    this.composer.addPass(this.bloomPass);

    this.gradePass = new ShaderPass(PostGradeShader);
    this.composer.addPass(this.gradePass);

    this.composer.addPass(new OutputPass());
    this._syncThemeGrading();
  }

  _applyQuality(preset) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, preset.dprCap));
    this.renderer.setSize(w, h);

    this.renderer.shadowMap.enabled = preset.shadows;
    this.sky.setShadowQuality(preset.shadows, preset.shadowSize);
    this.foliage.setQuality(preset);

    if (preset.postProcess) {
      this._initComposer();
      this.composer.setSize(w, h);
      this.bloomPass.strength = preset.bloomStrength;
    }
    this.hud.syncQuality(preset.label, this.quality.fps);
  }

  _syncThemeGrading() {
    if (!this.gradePass) return;
    this.gradePass.uniforms.uGradeTint.value = this.currentTheme.gradeTint;
    this.gradePass.uniforms.uSaturation.value = this.currentTheme.gradeSat;
  }

  _clearEntities() {
    for (const c of this.cows) c.destroy();
    for (const e of this.enemies) e.destroy();
    for (const h of this.helicopters) h.destroy();
    this.cows = [];
    this.enemies = [];
    this.helicopters = [];
    this.projectiles.clearAll();
  }

  _applyTheme(themeId) {
    this.currentTheme = LEVEL_THEMES[themeId] || LEVEL_THEMES.sunny;
    this.terrain.applyTheme(this.currentTheme);
    this.sky.applyTheme(this.currentTheme);
    this.foliage.applyTheme(this.currentTheme);
    this._syncThemeGrading();
  }

  enterTitleMode() {
    this._clearEntities();
    this._applyTheme('sunny');
    this.ufo.reset();
    this.beam.reset(this.saveSystem.data.upgrades);

    // Populate a peaceful herd for the live animated title backdrop
    const spawned = this.spawner.spawnLevel({
      ...LEVELS[0],
      farmers: 0,
      turrets: 0,
      helicopters: 0,
      cowCount: 16
    });
    this.cows = spawned.cows;

    this.audio.setBeamState(false, 0);
    this.audio.setMusicActive(false);
    this.setState(GAME_STATES.TITLE);
  }

  startLevel(levelNum) {
    this._clearEntities();
    this.currentLevel = Math.max(1, Math.min(LEVELS.length, levelNum));
    this.levelCfg = LEVELS[this.currentLevel - 1];
    this._applyTheme(this.levelCfg.theme);

    const upgrades = this.saveSystem.data.upgrades;
    const maxHp = UFO_CONFIG.baseMaxHp + upgrades.shield * 25;
    this.ufo.reset(maxHp);
    this.beam.reset(upgrades);

    const spawned = this.spawner.spawnLevel(this.levelCfg);
    this.cows = spawned.cows;
    this.enemies = spawned.enemies;
    this.helicopters = spawned.helicopters;

    this.levelScore = 0;
    this.abducted = 0;
    this.timeLeft = this.levelCfg.duration;
    this.quotaMet = false;
    this.combo = 0;
    this.comboTimer = 0;
    this.bombCooldown = 0;
    this.crashTimer = 0;

    this.setState(GAME_STATES.PLAYING);
    this.audio.setMusicActive(true);
    this.hud.showToast(`LEVEL ${this.currentLevel}: ${this.currentTheme.name.toUpperCase()}!`, 2.6);
  }

  openShop() {
    this.state = GAME_STATES.SHOP;
    this.hud.setVisible(false);
    this.input.setControlsVisible(false);
    const nextLvl = Math.min(LEVELS.length, this.currentLevel + (this.quotaMet ? 1 : 0));
    this.shop.render(this.saveSystem.data, nextLvl);
  }

  setState(nextState) {
    this.state = nextState;
    const playing = nextState === GAME_STATES.PLAYING;
    this.hud.setVisible(playing);
    this.input.setControlsVisible(playing);

    if (!playing) {
      this.audio.setBeamState(false, 0);
      if (nextState === GAME_STATES.PAUSED || nextState === GAME_STATES.GAME_OVER) {
        this.audio.setMusicActive(false);
      }
    } else {
      this.audio.setMusicActive(true);
    }

    this.menus.render(nextState, {
      save: this.saveSystem.data,
      level: this.currentLevel,
      abducted: this.abducted,
      quota: this.levelCfg.quota,
      score: this.score,
      levelScore: this.levelScore,
      stars: this._computeStars(),
      coinsEarned: this._lastCoinsEarned || 0,
      crashed: this.ufo.crashed
    });
  }

  _computeStars() {
    if (this.abducted < this.levelCfg.quota) return 0;
    const bonusCows = this.abducted - this.levelCfg.quota;
    const hpRatio = this.ufo.hp / this.ufo.maxHp;
    if (bonusCows >= 4 && hpRatio > 0.6) return 3;
    if (bonusCows >= 2 || hpRatio > 0.45) return 2;
    return 1;
  }

  _vibrate(pattern) {
    try {
      if (navigator.vibrate) navigator.vibrate(pattern);
    } catch {
      // Fail silently on iOS Safari
    }
  }

  _triggerStunBomb() {
    if (this.bombCooldown > 0) return;
    const bombLvl = this.saveSystem.data.upgrades.bomb;
    this.bombCooldown = Math.max(4.5, BOMB_CONFIG.baseCooldown - bombLvl * 1.1);
    const stunDur = BOMB_CONFIG.baseStunDuration + bombLvl * 1.2;
    const range = BOMB_CONFIG.baseRadius + bombLvl * 5;

    const ufoPos = this.ufo.position;
    this.particles.spawnRing(ufoPos.x, ufoPos.y - 2, ufoPos.z, 0x00f5d4, range * 0.45, 0.55, false);
    this.audio.playBomb();
    this.shakeAmp = Math.max(this.shakeAmp, 0.65);
    this._vibrate([40, 30, 60]);

    let stunned = 0;
    for (const e of this.enemies) {
      if (Math.hypot(e.group.position.x - ufoPos.x, e.group.position.z - ufoPos.z) <= range) {
        e.stun(stunDur);
        stunned++;
      }
    }
    for (const h of this.helicopters) {
      if (Math.hypot(h.group.position.x - ufoPos.x, h.group.position.z - ufoPos.z) <= range + 10) {
        h.stun(stunDur);
        stunned++;
      }
    }
    this.hud.spawnPopup(ufoPos, stunned > 0 ? `EMP STUN x${stunned}!` : 'EMP PULSE!', '#00f5d4');
  }

  _onCowAbducted(cow) {
    this.abducted++;
    this.saveSystem.data.totalAbducted++;

    // Combo multiplier window
    if (this.comboTimer > 0) {
      this.combo = Math.min(COMBO_CONFIG.maxMultiplier, this.combo + 1);
    } else {
      this.combo = 1;
    }
    this.comboTimer = COMBO_CONFIG.windowSeconds;

    const pts = cow.type.points * this.combo;
    this.score += pts;
    this.levelScore += pts;
    const coinsGain = Math.max(2, Math.round(pts / 8));
    this.saveSystem.data.coins += coinsGain;

    if (this.score > this.saveSystem.data.highScore) {
      this.saveSystem.data.highScore = this.score;
    }

    // Juice: particles, pop sound, popup text, combo punch, haptics
    this.particles.burstAbduction(cow.group.position.x, cow.group.position.y, cow.group.position.z, cow.id === 'golden');
    this.audio.playAbductPop(this.combo);
    this.hud.bumpScore();
    this.hud.spawnPopup(
      cow.group.position,
      this.combo >= 2 ? `+${pts} (x${this.combo})` : `+${pts}`,
      cow.id === 'golden' ? '#ffd23f' : cow.id === 'space' ? '#72efdd' : '#70ff4d'
    );

    if (cow.type.points >= 200 || this.combo >= 4) {
      this.hitStopTimer = 0.045;
      this.fovPunch = 3.5;
      this.shakeAmp = Math.max(this.shakeAmp, 0.35);
    }
    this._vibrate(25);

    cow.destroy();

    // Check quota milestone
    if (!this.quotaMet && this.abducted >= this.levelCfg.quota) {
      this.quotaMet = true;
      this.timeLeft = Math.min(this.timeLeft, 10);
      this.hud.showToast('QUOTA MET! 10s BONUS FRENZY!', 2.5);
    }
  }

  _completeLevel() {
    const stars = this._computeStars();
    const prevStars = this.saveSystem.data.levelStars[this.currentLevel] || 0;
    this.saveSystem.data.levelStars[this.currentLevel] = Math.max(prevStars, stars);

    if (this.currentLevel >= this.saveSystem.data.unlockedLevel && this.currentLevel < LEVELS.length) {
      this.saveSystem.data.unlockedLevel = this.currentLevel + 1;
    }

    const timeBonus = Math.round(this.timeLeft * 12);
    const coinsEarned = 35 * stars + Math.round((this.levelScore + timeBonus) / 15);
    this.score += timeBonus;
    this.saveSystem.data.coins += coinsEarned;
    this._lastCoinsEarned = coinsEarned;
    this.saveSystem.save();

    this.particles.burstConfetti(this.ufo.position.x, this.ufo.position.y + 1, this.ufo.position.z);
    this.audio.playLevelWin();
    this.setState(GAME_STATES.LEVEL_COMPLETE);
  }

  start() {
    this.lastTime = performance.now();
    const tick = (now) => {
      requestAnimationFrame(tick);
      if (this.pausedHidden) return;

      const rawDt = Math.min(0.05, Math.max(0.001, (now - this.lastTime) / 1000));
      this.lastTime = now;
      this._update(rawDt);
      this._render();
    };
    requestAnimationFrame(tick);
  }

  _update(rawDt) {
    // Hit-stop freeze frame for juicy big events
    if (this.hitStopTimer > 0) {
      this.hitStopTimer -= rawDt;
      return;
    }

    const dt = rawDt;
    this.elapsed += dt;

    // Auto FPS monitor & downgrade
    const downgradedTo = this.quality.update(dt, this.state === GAME_STATES.PLAYING);
    if (downgradedTo) {
      this.hud.showToast(`AUTO QUALITY: ${downgradedTo.toUpperCase()}`, 2.0);
    }
    if (this.state === GAME_STATES.PLAYING) {
      this.hud.syncQuality(this.quality.getPreset().label, this.quality.fps);
    }

    this.input.update();
    if (this.input.consumePause()) {
      if (this.state === GAME_STATES.PLAYING) this.setState(GAME_STATES.PAUSED);
      else if (this.state === GAME_STATES.PAUSED) this.setState(GAME_STATES.PLAYING);
    }

    const isNight = this.currentTheme.id === 'night' || this.currentTheme.neon;
    this.audio.update(dt, isNight);

    // Title screen orbital flight showcase
    if (this.state === GAME_STATES.TITLE || this.state === GAME_STATES.HOW_TO_PLAY) {
      const orbitA = this.elapsed * 0.35;
      const targetX = Math.cos(orbitA) * 18;
      const targetZ = Math.sin(orbitA) * 18;
      const dx = THREE.MathUtils.clamp((targetX - this.ufo.position.x) * 0.15, -1, 1);
      const dz = THREE.MathUtils.clamp((targetZ - this.ufo.position.z) * 0.15, -1, 1);
      this.ufo.update(dt, this.elapsed, dx, dz, 0.85, false, false, null);

      const dummyBeam = { active: false, x: 0, z: 0, ufoY: 12, radius: 5, liftSpeed: 6, magnetPull: 0 };
      for (const c of this.cows) c.update(dt, this.elapsed, this.cows, dummyBeam, this.particles, null);
      this.foliage.update(dt, this.elapsed, this.ufo.position, false, 5);
      this.sky.update(dt, this.elapsed, this.camera.position);
      this.particles.update(dt);
      this._updateCamera(dt, true);
      return;
    }

    if (this.state !== GAME_STATES.PLAYING) {
      this.sky.update(dt, this.elapsed, this.camera.position);
      this.particles.update(dt);
      return;
    }

    // Active Gameplay
    const upgrades = this.saveSystem.data.upgrades;

    if (this.ufo.crashed) {
      this.ufo.update(dt, this.elapsed, 0, 0, 1, false, false, this.particles);
      this.particles.update(dt);
      this.sky.update(dt, this.elapsed, this.camera.position);
      this._updateCamera(dt, false);
      this.crashTimer -= dt;
      if (this.crashTimer <= 0) {
        this.saveSystem.save();
        this.setState(GAME_STATES.GAME_OVER);
      }
      return;
    }

    // Level timer & cooldowns
    this.timeLeft -= dt;
    if (this.timeLeft <= 0) {
      this.timeLeft = 0;
      if (this.abducted >= this.levelCfg.quota) {
        this._completeLevel();
      } else {
        this.saveSystem.save();
        this.setState(GAME_STATES.GAME_OVER);
      }
      return;
    }

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (this.bombCooldown > 0) {
      this.bombCooldown = Math.max(0, this.bombCooldown - dt);
    }
    if (this.input.consumeBomb()) {
      this._triggerStunBomb();
    }

    // Update Tractor Beam & UFO
    const beamState = this.beam.update(
      dt,
      this.elapsed,
      this.input.beamHeld,
      this.ufo.position,
      upgrades,
      this.cows,
      this.particles,
      this.audio
    );

    const speedMult = 1 + upgrades.ufoSpeed * 0.12;
    this.ufo.update(
      dt,
      this.elapsed,
      this.input.moveX,
      this.input.moveY,
      speedMult,
      beamState.active,
      beamState.abductingCount > 0,
      this.particles
    );

    // Update Cows & handle captures
    let aliveCows = 0;
    for (let i = this.cows.length - 1; i >= 0; i--) {
      const cow = this.cows[i];
      if (!cow.alive) continue;
      const captured = cow.update(dt, this.elapsed, this.cows, beamState, this.particles, this.audio);
      if (captured) {
        this._onCowAbducted(cow);
      } else {
        aliveCows++;
      }
    }

    // Keep enough cows in the pasture so quota is always achievable
    const needed = Math.max(6, this.levelCfg.quota - this.abducted + 3);
    if (aliveCows < needed) {
      this.spawner.spawnExtraCow(this.levelCfg, this.cows);
    }

    // Update Threats & Projectiles
    for (const e of this.enemies) {
      e.update(dt, this.elapsed, this.ufo.position, this.projectiles);
    }
    for (const h of this.helicopters) {
      h.update(dt, this.elapsed, this.ufo.position, this.projectiles);
    }
    this.projectiles.update(dt, this.ufo.position, UFO_CONFIG.hitRadius, (dmg, hitPos) => {
      if (this.ufo.takeDamage(dmg)) {
        this.particles.burstDamage(hitPos.x, hitPos.y, hitPos.z);
        this.hud.triggerDamageFlash();
        this.shakeAmp = Math.max(this.shakeAmp, 0.85);
        this.aberration = 1.0;
        this._vibrate([70, 40, 70]);

        if (this.ufo.crashed) {
          this.audio.playExplosion();
          this.particles.burstExplosion(this.ufo.position.x, this.ufo.position.y, this.ufo.position.z);
          this.crashTimer = 1.75;
        } else {
          this.audio.playDamage();
        }
      }
    });

    this.foliage.update(dt, this.elapsed, this.ufo.position, beamState.active, beamState.radius);
    this.sky.update(dt, this.elapsed, this.camera.position);
    this.particles.update(dt);
    this._updateCamera(dt, false);

    // Update HUD
    this.hud.update(dt, this.camera, {
      level: this.currentLevel,
      themeName: this.currentTheme.name,
      abducted: this.abducted,
      quota: this.levelCfg.quota,
      timeLeft: this.timeLeft,
      score: this.score,
      hp: this.ufo.hp,
      maxHp: this.ufo.maxHp,
      energy: this.beam.energy,
      maxEnergy: this.beam.maxEnergy,
      overheated: this.beam.overheated,
      combo: this.combo,
      comboTimer: this.comboTimer,
      bombCooldown: this.bombCooldown
    });
  }

  _updateCamera(dt, isTitle) {
    const ufoPos = this.ufo.position;
    const offsetZ = isTitle ? 26 : 19.5;
    const offsetY = isTitle ? 13 : 14.5;

    this._camDesiredPos.set(ufoPos.x, ufoPos.y + offsetY, ufoPos.z + offsetZ);
    this.camPos.lerp(this._camDesiredPos, 1 - Math.exp(-5.5 * dt));

    this._camDesiredLook.set(ufoPos.x, ufoPos.y - 4.5, ufoPos.z - 2.5);
    this.camLook.lerp(this._camDesiredLook, 1 - Math.exp(-7.5 * dt));

    this.camera.position.copy(this.camPos);

    // Screen shake decay
    if (this.shakeAmp > 0.01) {
      this.camera.position.x += (Math.random() - 0.5) * this.shakeAmp;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeAmp;
      this.shakeAmp *= Math.exp(-9 * dt);
    } else {
      this.shakeAmp = 0;
    }

    this.camera.lookAt(this.camLook);

    // Subtle speed FOV + combo punch
    const spd = Math.hypot(this.ufo.velocity.x, this.ufo.velocity.z);
    this.fovPunch = THREE.MathUtils.lerp(this.fovPunch, 0, 8 * dt);
    const targetFov = 53 + (spd / UFO_CONFIG.baseMaxSpeed) * 5.5 + this.fovPunch;
    if (Math.abs(this.camera.fov - targetFov) > 0.05) {
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 6 * dt);
      this.camera.updateProjectionMatrix();
    }

    if (this.gradePass) {
      this.aberration = THREE.MathUtils.lerp(this.aberration, 0, 8 * dt);
      this.gradePass.uniforms.uAberration.value = this.aberration;
    }
  }

  _render() {
    const preset = this.quality.getPreset();
    if (preset.postProcess && this.composer) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
}
