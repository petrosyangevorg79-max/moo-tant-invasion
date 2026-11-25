const SAVE_KEY = 'mootant_invasion_save_v1';

const DEFAULT_SAVE = {
  coins: 0,
  totalAbducted: 0,
  highScore: 0,
  unlockedLevel: 1,
  levelStars: {},
  upgrades: {
    beamRadius: 0,
    beamSpeed: 0,
    energyCap: 0,
    ufoSpeed: 0,
    shield: 0,
    magnet: 0,
    bomb: 0
  },
  settings: {
    quality: 'auto', // 'auto' | 'low' | 'medium' | 'high'
    volume: 0.75,
    muted: false
  }
};

/**
 * localStorage persistence for coins, upgrades, high scores, and user settings.
 */
export class SaveSystem {
  constructor() {
    this.data = this._load();
  }

  _load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return structuredClone(DEFAULT_SAVE);
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SAVE,
        ...parsed,
        upgrades: { ...DEFAULT_SAVE.upgrades, ...(parsed.upgrades || {}) },
        settings: { ...DEFAULT_SAVE.settings, ...(parsed.settings || {}) },
        levelStars: { ...(parsed.levelStars || {}) }
      };
    } catch {
      return structuredClone(DEFAULT_SAVE);
    }
  }

  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(this.data));
    } catch {
      // Ignore storage quota errors in private browsing
    }
  }

  resetProgress() {
    const keepSettings = { ...this.data.settings };
    this.data = structuredClone(DEFAULT_SAVE);
    this.data.settings = keepSettings;
    this.save();
  }
}
