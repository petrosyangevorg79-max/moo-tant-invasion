/**
 * Procedural WebAudio synthesizer (zero external audio files).
 * Handles iOS Safari audio unlock on first pointer/touch/key interaction.
 */
export class AudioSystem {
  constructor(saveSystem) {
    this.saveSystem = saveSystem;
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;

    this.volume = saveSystem.data.settings.volume ?? 0.75;
    this.muted = Boolean(saveSystem.data.settings.muted);
    this.unlocked = false;

    // Continuous beam hum nodes
    this.beamOsc = null;
    this.beamOsc2 = null;
    this.beamGain = null;

    // Chiptune sequencer state
    this.musicStep = 0;
    this.musicTimer = 0;
    this.musicPlaying = false;
    this.ambientTimer = 0;

    this._bindUnlock();
  }

  _bindUnlock() {
    const unlock = () => {
      if (this.unlocked) return;
      this.ensureContext();
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      this.unlocked = true;
    };
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('mousedown', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });
  }

  ensureContext() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    this.ctx = new AudioCtx();
    this.masterGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain = this.ctx.createGain();

    this.sfxGain.connect(this.masterGain);
    this.musicGain.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    this.sfxGain.gain.value = 0.85;
    this.musicGain.gain.value = 0.24;
    this._applyMasterVolume();
    this._initBeamHum();
    return this.ctx;
  }

  _initBeamHum() {
    if (!this.ctx || this.beamOsc) return;
    this.beamGain = this.ctx.createGain();
    this.beamGain.gain.value = 0;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 620;

    this.beamOsc = this.ctx.createOscillator();
    this.beamOsc.type = 'sawtooth';
    this.beamOsc.frequency.value = 110;

    this.beamOsc2 = this.ctx.createOscillator();
    this.beamOsc2.type = 'triangle';
    this.beamOsc2.frequency.value = 223;

    this.beamOsc.connect(filter);
    this.beamOsc2.connect(filter);
    filter.connect(this.beamGain);
    this.beamGain.connect(this.sfxGain);

    this.beamOsc.start();
    this.beamOsc2.start();
  }

  _applyMasterVolume() {
    if (!this.masterGain) return;
    this.masterGain.gain.setTargetAtTime(
      this.muted ? 0 : this.volume,
      this.ctx.currentTime,
      0.02
    );
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    this.saveSystem.data.settings.volume = this.volume;
    this.saveSystem.save();
    this._applyMasterVolume();
  }

  toggleMute() {
    this.muted = !this.muted;
    this.saveSystem.data.settings.muted = this.muted;
    this.saveSystem.save();
    this._applyMasterVolume();
    return this.muted;
  }

  setBeamState(active, liftProgress = 0) {
    if (!this.ctx || !this.beamGain) return;
    const now = this.ctx.currentTime;
    const targetGain = active ? 0.14 : 0.0;
    this.beamGain.gain.setTargetAtTime(targetGain, now, 0.04);

    if (active) {
      const pitch = 110 + liftProgress * 180;
      this.beamOsc.frequency.setTargetAtTime(pitch, now, 0.05);
      this.beamOsc2.frequency.setTargetAtTime(pitch * 2.02, now, 0.05);
    }
  }

  playClick() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(780, now + 0.06);
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  playMoo(pitchScale = 1.0) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const g = ctx.createGain();

    osc.type = 'sawtooth';
    const base = 135 * pitchScale * (0.9 + Math.random() * 0.2);
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.linearRampToValueAtTime(base * 1.18, now + 0.12);
    osc.frequency.linearRampToValueAtTime(base * 0.82, now + 0.42);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(420 * pitchScale, now);
    filter.Q.value = 3.5;

    g.gain.setValueAtTime(0.001, now);
    g.gain.linearRampToValueAtTime(0.18, now + 0.05);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.46);
  }

  playAbductPop(combo = 1) {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // Suction pop
    const popOsc = ctx.createOscillator();
    const popGain = ctx.createGain();
    popOsc.type = 'sine';
    popOsc.frequency.setValueAtTime(280, now);
    popOsc.frequency.exponentialRampToValueAtTime(920, now + 0.09);
    popGain.gain.setValueAtTime(0.26, now);
    popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    popOsc.connect(popGain);
    popGain.connect(this.sfxGain);
    popOsc.start(now);
    popOsc.stop(now + 0.13);

    // Coin chime + rising combo arpeggio
    const notes = Math.min(4, 1 + Math.floor(combo / 2));
    const root = 523.25 * Math.pow(1.06, Math.min(combo - 1, 8));
    for (let i = 0; i < notes; i++) {
      const t = now + 0.04 + i * 0.055;
      const cOsc = ctx.createOscillator();
      const cGain = ctx.createGain();
      cOsc.type = 'triangle';
      cOsc.frequency.setValueAtTime(root * Math.pow(1.25, i), t);
      cGain.gain.setValueAtTime(0.16, t);
      cGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      cOsc.connect(cGain);
      cGain.connect(this.sfxGain);
      cOsc.start(t);
      cOsc.stop(t + 0.19);
    }
  }

  playDamage() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(190, now);
    osc.frequency.exponentialRampToValueAtTime(52, now + 0.24);
    g.gain.setValueAtTime(0.28, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  playBomb() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(75, now + 0.45);
    g.gain.setValueAtTime(0.32, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  playExplosion() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const bufferSize = ctx.sampleRate * 0.65;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.18));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(580, now);
    filter.frequency.exponentialRampToValueAtTime(90, now + 0.6);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.55, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.64);

    noise.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    noise.start(now);
  }

  playLevelWin() {
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const melody = [523.25, 659.25, 783.99, 1046.5];
    melody.forEach((freq, i) => {
      const t = now + i * 0.11;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.32);
    });
  }

  setMusicActive(active) {
    this.musicPlaying = active;
  }

  update(dt, isNightTheme = false) {
    if (!this.ctx || this.ctx.state !== 'running') return;

    // Gentle chiptune arcade bass + lead loop
    if (this.musicPlaying && !this.muted) {
      this.musicTimer += dt;
      const stepDur = 0.19;
      if (this.musicTimer >= stepDur) {
        this.musicTimer -= stepDur;
        this._playMusicStep(this.musicStep++);
      }
    }

    // Subtle cricket chirps at night / alien levels
    if (isNightTheme && !this.muted) {
      this.ambientTimer -= dt;
      if (this.ambientTimer <= 0) {
        this.ambientTimer = 2.2 + Math.random() * 3.0;
        this._playCricketChirp();
      }
    }
  }

  _playMusicStep(step) {
    const bass = [110, 110, 146.83, 130.81, 98, 98, 130.81, 146.83];
    const lead = [440, 0, 523.25, 659.25, 587.33, 0, 523.25, 392, 440, 523.25, 659.25, 783.99, 659.25, 587.33, 523.25, 0];

    const now = this.ctx.currentTime;
    const bFreq = bass[step % bass.length];
    const bOsc = this.ctx.createOscillator();
    const bGain = this.ctx.createGain();
    bOsc.type = 'triangle';
    bOsc.frequency.setValueAtTime(bFreq, now);
    bGain.gain.setValueAtTime(0.18, now);
    bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    bOsc.connect(bGain);
    bGain.connect(this.musicGain);
    bOsc.start(now);
    bOsc.stop(now + 0.17);

    const lFreq = lead[step % lead.length];
    if (lFreq > 0) {
      const lOsc = this.ctx.createOscillator();
      const lGain = this.ctx.createGain();
      lOsc.type = 'square';
      lOsc.frequency.setValueAtTime(lFreq, now);
      lGain.gain.setValueAtTime(0.07, now);
      lGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      lOsc.connect(lGain);
      lGain.connect(this.musicGain);
      lOsc.start(now);
      lOsc.stop(now + 0.15);
    }
  }

  _playCricketChirp() {
    const now = this.ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.055;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(4200, t);
      g.gain.setValueAtTime(0.025, t);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.035);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(t);
      osc.stop(t + 0.04);
    }
  }
}
