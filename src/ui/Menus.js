import { GAME_STATES, LEVELS } from '../constants.js';

/**
 * Renders Title, How-to-Play, Pause, Level Complete, and Game Over screens.
 * Also handles mobile portrait orientation warning.
 */
export class Menus {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.layer = document.getElementById('menus-layer');
    this.rotateOverlay = document.getElementById('rotate-overlay');
    this.selectedLevel = 1;

    this._checkOrientation();
    window.addEventListener('resize', () => this._checkOrientation());
    window.addEventListener('orientationchange', () => this._checkOrientation());
  }

  _checkOrientation() {
    const isNarrowMobile = Math.min(window.innerWidth, window.innerHeight) < 620;
    const isPortrait = window.innerHeight > window.innerWidth;
    this.rotateOverlay.classList.toggle('hidden', !(isNarrowMobile && isPortrait));
  }

  hide() {
    this.layer.innerHTML = '';
    this.layer.classList.remove('interactive');
  }

  render(state, ctx) {
    if (state === GAME_STATES.PLAYING) {
      this.hide();
      return;
    }

    this.layer.classList.add('interactive');

    if (state === GAME_STATES.TITLE) {
      this._renderTitle(ctx);
    } else if (state === GAME_STATES.HOW_TO_PLAY) {
      this._renderHowToPlay();
    } else if (state === GAME_STATES.PAUSED) {
      this._renderPause(ctx);
    } else if (state === GAME_STATES.LEVEL_COMPLETE) {
      this._renderLevelComplete(ctx);
    } else if (state === GAME_STATES.GAME_OVER) {
      this._renderGameOver(ctx);
    }
  }

  _renderTitle(ctx) {
    const unlocked = ctx.save.unlockedLevel;
    if (this.selectedLevel > unlocked) this.selectedLevel = unlocked;

    const pillsHtml = LEVELS.map((lv) => {
      const locked = lv.level > unlocked;
      const sel = lv.level === this.selectedLevel ? 'selected' : '';
      const stars = ctx.save.levelStars[lv.level] || 0;
      const starTxt = stars > 0 ? ` ${'★'.repeat(stars)}` : '';
      return `<button class="level-pill ${sel} ${locked ? 'locked' : ''}" data-lvl="${lv.level}" ${locked ? 'disabled' : ''}>
        L${lv.level}${starTxt}
      </button>`;
    }).join('');

    this.layer.innerHTML = `
      <div class="menu-card title-overlay-card">
        <h1 class="neon-title">MOO-TANT<br /><span>INVASION</span></h1>
        <p class="menu-sub">Hover. Beam. Abduct! 🛸🐄 Best Score: <strong style="color:#ffd23f">${ctx.save.highScore.toLocaleString()}</strong> | Coins: <strong style="color:#00f5d4">🪙 ${ctx.save.coins}</strong></p>

        <div class="level-pills">${pillsHtml}</div>
        <div class="menu-sub" id="selected-lvl-sub">${LEVELS[this.selectedLevel - 1].subtitle}</div>

        <div class="btn-row">
          <button id="btn-start-game" class="arcade-btn pulse" type="button">TAP TO START</button>
          <button id="btn-open-shop" class="arcade-btn pink" type="button">🛒 SHOP</button>
          <button id="btn-how-to" class="arcade-btn secondary" type="button">❓ HOW TO PLAY</button>
        </div>
      </div>
    `;

    this.layer.querySelectorAll('.level-pill:not(.locked)').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.selectedLevel = Number(btn.dataset.lvl);
        this.callbacks.onClickSound?.();
        this._renderTitle(ctx);
      });
    });

    document.getElementById('btn-start-game').addEventListener('click', () => {
      this.callbacks.onStartLevel(this.selectedLevel);
    });
    document.getElementById('btn-open-shop').addEventListener('click', () => {
      this.callbacks.onOpenShop();
    });
    document.getElementById('btn-how-to').addEventListener('click', () => {
      this.callbacks.onShowHowTo();
    });
  }

  _renderHowToPlay() {
    this.layer.innerHTML = `
      <div class="menu-card">
        <h2 class="neon-title" style="font-size:28px">HOW TO PLAY</h2>
        <ul class="how-list">
          <li><strong>Fly:</strong> Drag the left virtual joystick (or use <code>WASD</code> / Arrow keys / Gamepad).</li>
          <li><strong>Tractor Beam:</strong> Hold the big green <strong>BEAM</strong> button (or <code>Space</code> / Left Mouse) over cows to lift them up! Watch the energy bar so it doesn't overheat.</li>
          <li><strong>EMP Moo-Bomb:</strong> Tap <strong>BOMB</strong> (or press <code>B</code>) to stun pitchfork farmers, cannons, and helicopters!</li>
          <li><strong>Combos & Cows:</strong> Abduct cows quickly in a row for x2, x3, x4+ multipliers! Look out for fast <strong>Golden Cows (100)</strong>, heavy <strong>Giant Bulls (200)</strong>, and sparkly <strong>Space Cows (500)</strong>.</li>
        </ul>
        <div class="btn-row">
          <button id="btn-back-title" class="arcade-btn" type="button">GOT IT!</button>
        </div>
      </div>
    `;
    document.getElementById('btn-back-title').addEventListener('click', () => {
      this.callbacks.onBackToTitle();
    });
  }

  _renderPause(ctx) {
    const qMode = ctx.save.settings.quality || 'auto';
    const vol = Math.round((ctx.save.settings.volume ?? 0.75) * 100);
    const muted = Boolean(ctx.save.settings.muted);

    this.layer.innerHTML = `
      <div class="menu-card">
        <h2 class="neon-title" style="font-size:30px">PAUSED</h2>

        <div class="settings-row">
          <span>Graphics Quality</span>
          <div class="seg-btns">
            ${['auto', 'low', 'medium', 'high'].map((m) =>
              `<button class="seg-btn ${qMode === m ? 'active' : ''}" data-q="${m}">${m.toUpperCase()}</button>`
            ).join('')}
          </div>
        </div>

        <div class="settings-row">
          <span>Audio Volume (${vol}%)</span>
          <div style="display:flex;align-items:center;gap:8px">
            <input id="pause-vol" type="range" min="0" max="100" value="${vol}" />
            <button id="pause-mute" class="seg-btn ${muted ? 'active' : ''}">${muted ? 'MUTED' : 'ON'}</button>
          </div>
        </div>

        <div class="btn-row">
          <button id="btn-resume" class="arcade-btn" type="button">RESUME</button>
          <button id="btn-restart-lvl" class="arcade-btn secondary" type="button">RESTART</button>
          <button id="btn-quit-title" class="arcade-btn pink" type="button">TITLE</button>
        </div>
      </div>
    `;

    this.layer.querySelectorAll('[data-q]').forEach((b) => {
      b.addEventListener('click', () => {
        this.callbacks.onSetQuality(b.dataset.q);
        this._renderPause(ctx);
      });
    });

    document.getElementById('pause-vol').addEventListener('input', (e) => {
      this.callbacks.onSetVolume(Number(e.target.value) / 100);
    });
    document.getElementById('pause-mute').addEventListener('click', () => {
      this.callbacks.onToggleMute();
      this._renderPause(ctx);
    });
    document.getElementById('btn-resume').addEventListener('click', () => this.callbacks.onResume());
    document.getElementById('btn-restart-lvl').addEventListener('click', () => this.callbacks.onRestartLevel());
    document.getElementById('btn-quit-title').addEventListener('click', () => this.callbacks.onBackToTitle());
  }

  _renderLevelComplete(ctx) {
    const starsStr = '⭐'.repeat(ctx.stars) + '☆'.repeat(3 - ctx.stars);
    const hasNext = ctx.level < LEVELS.length;

    this.layer.innerHTML = `
      <div class="menu-card">
        <h2 class="neon-title" style="font-size:30px">LEVEL ${ctx.level} COMPLETE!</h2>
        <div class="stars-row">${starsStr}</div>
        <div class="stats-grid">
          <div class="stat-box"><div class="k">Cows Abducted</div><div class="v">${ctx.abducted}/${ctx.quota}</div></div>
          <div class="stat-box"><div class="k">Level Score</div><div class="v">${ctx.levelScore.toLocaleString()}</div></div>
          <div class="stat-box"><div class="k">Coins Earned</div><div class="v">+${ctx.coinsEarned} 🪙</div></div>
          <div class="stat-box"><div class="k">Bank Balance</div><div class="v">${ctx.save.coins} 🪙</div></div>
        </div>
        <div class="btn-row">
          ${hasNext ? `<button id="btn-next-lvl" class="arcade-btn pulse" type="button">NEXT LEVEL ▶</button>` : `<button id="btn-next-lvl" class="arcade-btn pulse" type="button">REPLAY BONUS ▶</button>`}
          <button id="btn-go-shop" class="arcade-btn pink" type="button">🛒 UPGRADE SHOP</button>
          <button id="btn-lvl-title" class="arcade-btn secondary" type="button">TITLE</button>
        </div>
      </div>
    `;

    document.getElementById('btn-next-lvl').addEventListener('click', () => {
      this.callbacks.onStartLevel(hasNext ? ctx.level + 1 : 1);
    });
    document.getElementById('btn-go-shop').addEventListener('click', () => this.callbacks.onOpenShop());
    document.getElementById('btn-lvl-title').addEventListener('click', () => this.callbacks.onBackToTitle());
  }

  _renderGameOver(ctx) {
    this.layer.innerHTML = `
      <div class="menu-card">
        <h2 class="neon-title" style="font-size:32px">${ctx.crashed ? 'SAUCER CRASHED!' : 'TIME UP!'}</h2>
        <p class="menu-sub">${ctx.crashed ? 'The farmers & choppers got your saucer!' : `Quota missed (${ctx.abducted}/${ctx.quota} cows).`}</p>
        <div class="stats-grid">
          <div class="stat-box"><div class="k">Score</div><div class="v">${ctx.score.toLocaleString()}</div></div>
          <div class="stat-box"><div class="k">Best Score</div><div class="v">${ctx.save.highScore.toLocaleString()}</div></div>
          <div class="stat-box"><div class="k">Coins</div><div class="v">${ctx.save.coins} 🪙</div></div>
        </div>
        <div class="btn-row">
          <button id="btn-retry" class="arcade-btn pulse" type="button">RETRY LEVEL</button>
          <button id="btn-over-shop" class="arcade-btn pink" type="button">🛒 SHOP</button>
          <button id="btn-over-title" class="arcade-btn secondary" type="button">TITLE</button>
        </div>
      </div>
    `;

    document.getElementById('btn-retry').addEventListener('click', () => this.callbacks.onRestartLevel());
    document.getElementById('btn-over-shop').addEventListener('click', () => this.callbacks.onOpenShop());
    document.getElementById('btn-over-title').addEventListener('click', () => this.callbacks.onBackToTitle());
  }
}
