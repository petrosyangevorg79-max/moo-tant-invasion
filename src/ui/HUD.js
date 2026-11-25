import * as THREE from 'three';

/**
 * In-game HUD, combo banner, pooled floating score popups, damage flash, and bomb cooldown UI.
 */
export class HUD {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.root = document.getElementById('hud');
    this.popupsLayer = document.getElementById('popups-layer');
    this.flashEl = document.getElementById('damage-flash');
    this.bombBtnEl = document.getElementById('btn-bomb');
    this.bombCdEl = document.getElementById('bomb-cd-ring');

    this._renderShell();
    this._initPopupPool();
    this._projVec = new THREE.Vector3();
    this.toastTimer = 0;
  }

  _renderShell() {
    this.root.innerHTML = `
      <div class="hud-top">
        <div class="hud-group">
          <div class="hud-pill">
            <div class="hud-label" id="hud-level-name">LVL 1</div>
            <div class="hud-val green" id="hud-quota">🐄 0/10</div>
          </div>
          <div class="hud-pill">
            <div class="hud-label">TIME</div>
            <div class="hud-val cyan" id="hud-timer">60s</div>
          </div>
          <div class="hud-pill">
            <div class="hud-label">SCORE</div>
            <div class="hud-val gold" id="hud-score">0</div>
          </div>
        </div>

        <div class="hud-group">
          <div class="hud-pill hud-bars">
            <div class="bar-row">
              <span class="bar-icon">❤️</span>
              <div class="bar-track"><div id="bar-hp" class="bar-fill hp" style="width:100%"></div></div>
            </div>
            <div class="bar-row">
              <span class="bar-icon">⚡</span>
              <div class="bar-track"><div id="bar-energy" class="bar-fill energy" style="width:100%"></div></div>
            </div>
          </div>
          <button id="hud-quality-btn" class="quality-badge" type="button" title="Graphics Quality">HIGH</button>
          <button id="hud-mute-btn" class="hud-icon-btn" type="button" aria-label="Toggle Mute">🔊</button>
          <button id="hud-pause-btn" class="hud-icon-btn" type="button" aria-label="Pause">⏸️</button>
        </div>
      </div>

      <div id="hud-combo" class="combo-banner hidden">COMBO x2!</div>
      <div id="hud-toast" class="hud-toast hidden"></div>
    `;

    this.elLevelName = document.getElementById('hud-level-name');
    this.elQuota = document.getElementById('hud-quota');
    this.elTimer = document.getElementById('hud-timer');
    this.elScore = document.getElementById('hud-score');
    this.elHp = document.getElementById('bar-hp');
    this.elEnergy = document.getElementById('bar-energy');
    this.elCombo = document.getElementById('hud-combo');
    this.elToast = document.getElementById('hud-toast');
    this.elQualityBtn = document.getElementById('hud-quality-btn');
    this.elMuteBtn = document.getElementById('hud-mute-btn');
    this.elPauseBtn = document.getElementById('hud-pause-btn');

    this.elQualityBtn.addEventListener('click', () => this.callbacks.onCycleQuality?.());
    this.elMuteBtn.addEventListener('click', () => this.callbacks.onToggleMute?.());
    this.elPauseBtn.addEventListener('click', () => this.callbacks.onPause?.());
  }

  _initPopupPool() {
    this.popupPool = [];
    for (let i = 0; i < 16; i++) {
      const el = document.createElement('div');
      el.className = 'score-popup hidden';
      this.popupsLayer.appendChild(el);
      this.popupPool.push({
        el,
        active: false,
        life: 0,
        maxLife: 0.9,
        worldPos: new THREE.Vector3(),
        rise: 0
      });
    }
  }

  setVisible(visible) {
    this.root.classList.toggle('hidden', !visible);
    if (!visible) {
      for (const p of this.popupPool) {
        p.active = false;
        p.el.classList.add('hidden');
      }
    }
  }

  syncAudioIcon(muted) {
    this.elMuteBtn.textContent = muted ? '🔇' : '🔊';
  }

  syncQuality(label, fps) {
    this.elQualityBtn.textContent = `${label.toUpperCase()} ${fps || ''}`.trim();
  }

  bumpScore() {
    this.elScore.classList.remove('score-bounce');
    void this.elScore.offsetWidth;
    this.elScore.classList.add('score-bounce');
  }

  triggerDamageFlash() {
    this.flashEl.style.opacity = '1';
    setTimeout(() => {
      this.flashEl.style.opacity = '0';
    }, 120);
  }

  showToast(text, duration = 2.2) {
    this.elToast.textContent = text;
    this.elToast.classList.remove('hidden');
    this.toastTimer = duration;
  }

  spawnPopup(worldPos, text, color = '#70ff4d') {
    const slot = this.popupPool.find((p) => !p.active) || this.popupPool[0];
    slot.active = true;
    slot.life = 0.95;
    slot.maxLife = 0.95;
    slot.rise = 0;
    slot.worldPos.copy(worldPos);
    slot.el.textContent = text;
    slot.el.style.color = color;
    slot.el.style.opacity = '1';
    slot.el.classList.remove('hidden');
  }

  update(dt, camera, state) {
    this.elLevelName.textContent = `LVL ${state.level}: ${state.themeName}`;
    this.elQuota.textContent = `🐄 ${state.abducted}/${state.quota}`;
    this.elQuota.className = `hud-val ${state.abducted >= state.quota ? 'gold' : 'green'}`;

    const secs = Math.max(0, Math.ceil(state.timeLeft));
    this.elTimer.textContent = `${secs}s`;
    this.elTimer.className = `hud-val ${secs <= 12 ? 'danger' : 'cyan'}`;

    this.elScore.textContent = state.score.toLocaleString();

    const hpPct = Math.max(0, Math.min(100, (state.hp / state.maxHp) * 100));
    this.elHp.style.width = `${hpPct}%`;

    const enPct = Math.max(0, Math.min(100, (state.energy / state.maxEnergy) * 100));
    this.elEnergy.style.width = `${enPct}%`;
    this.elEnergy.classList.toggle('overheat', state.overheated);

    // Combo banner
    if (state.combo >= 2 && state.comboTimer > 0) {
      this.elCombo.classList.remove('hidden');
      this.elCombo.textContent = `COMBO x${state.combo}!`;
    } else {
      this.elCombo.classList.add('hidden');
    }

    // Bomb button cooldown
    if (state.bombCooldown > 0) {
      this.bombBtnEl.classList.add('cooldown');
      this.bombCdEl.textContent = `${Math.ceil(state.bombCooldown)}`;
    } else {
      this.bombBtnEl.classList.remove('cooldown');
      this.bombCdEl.textContent = '';
    }

    // Toast timeout
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) {
        this.elToast.classList.add('hidden');
      }
    }

    // Project floating 3D world popups onto 2D screen
    const w = window.innerWidth;
    const h = window.innerHeight;
    for (let i = 0; i < this.popupPool.length; i++) {
      const p = this.popupPool[i];
      if (!p.active) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        p.el.classList.add('hidden');
        continue;
      }
      p.rise += dt * 44;
      this._projVec.copy(p.worldPos).project(camera);
      const sx = (this._projVec.x * 0.5 + 0.5) * w;
      const sy = (-this._projVec.y * 0.5 + 0.5) * h - p.rise;
      const alpha = Math.min(1, (p.life / p.maxLife) * 1.6);
      p.el.style.left = `${sx.toFixed(1)}px`;
      p.el.style.top = `${sy.toFixed(1)}px`;
      p.el.style.opacity = alpha.toFixed(2);
    }
  }
}
