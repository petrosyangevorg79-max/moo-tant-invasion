import { QUALITY_PRESETS } from '../constants.js';

/**
 * Detects initial mobile/desktop graphics quality and monitors FPS to auto-downgrade
 * if frame rate stays below 40 FPS.
 */
export class QualitySystem {
  constructor(saveSystem, onChange) {
    this.saveSystem = saveSystem;
    this.onChange = onChange;

    this.mode = saveSystem.data.settings.quality || 'auto';
    this.currentPresetId = this._detectInitialPreset(this.mode);
    this.manualOverride = this.mode !== 'auto';

    // FPS tracking window
    this.frames = 0;
    this.accum = 0;
    this.fps = 60;
    this.lowFpsStreak = 0;
  }

  _detectInitialPreset(mode) {
    if (mode !== 'auto' && QUALITY_PRESETS[mode]) {
      return mode;
    }
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 900;
    const cores = navigator.hardwareConcurrency || 4;
    const mem = navigator.deviceMemory || 4;
    if (isMobile && (cores <= 4 || mem <= 3)) return 'low';
    if (isMobile) return 'medium';
    return 'high';
  }

  getPreset() {
    return QUALITY_PRESETS[this.currentPresetId];
  }

  setMode(mode) {
    this.mode = mode;
    this.saveSystem.data.settings.quality = mode;
    this.saveSystem.save();
    this.manualOverride = mode !== 'auto';
    this.currentPresetId = this._detectInitialPreset(mode);
    this.lowFpsStreak = 0;
    this.onChange?.(this.getPreset());
  }

  cyclePreset() {
    const order = ['low', 'medium', 'high'];
    const nextIdx = (order.indexOf(this.currentPresetId) + 1) % order.length;
    this.setMode(order[nextIdx]);
    return this.getPreset();
  }

  update(dt, isPlaying) {
    this.frames++;
    this.accum += dt;
    if (this.accum < 1.0) return null;

    this.fps = Math.round(this.frames / this.accum);
    this.frames = 0;
    this.accum = 0;

    // Auto-downgrade only while actively playing and in 'auto' mode
    if (isPlaying && !this.manualOverride && this.fps < 40) {
      this.lowFpsStreak++;
      if (this.lowFpsStreak >= 3) {
        this.lowFpsStreak = 0;
        if (this.currentPresetId === 'high') {
          this.currentPresetId = 'medium';
          this.onChange?.(this.getPreset());
          return 'medium';
        } else if (this.currentPresetId === 'medium') {
          this.currentPresetId = 'low';
          this.onChange?.(this.getPreset());
          return 'low';
        }
      }
    } else {
      this.lowFpsStreak = 0;
    }

    return null;
  }
}
