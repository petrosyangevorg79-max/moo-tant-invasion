import { SHOP_UPGRADES } from '../constants.js';

/**
 * Between-level Upgrade Shop UI for buying beam, thruster, shield, magnet, and bomb upgrades.
 */
export class Shop {
  constructor(callbacks) {
    this.callbacks = callbacks;
    this.layer = document.getElementById('menus-layer');
  }

  getCost(item, currentLvl) {
    return Math.round(item.baseCost * Math.pow(item.costScale, currentLvl));
  }

  render(saveData, nextLevel) {
    this.layer.classList.add('interactive');

    const itemsHtml = SHOP_UPGRADES.map((item) => {
      const lvl = saveData.upgrades[item.id] || 0;
      const maxed = lvl >= item.maxLevel;
      const cost = this.getCost(item, lvl);
      const canAfford = !maxed && saveData.coins >= cost;

      const pips = Array.from({ length: item.maxLevel }, (_, idx) =>
        `<span class="shop-pip ${idx < lvl ? 'filled' : ''}"></span>`
      ).join('');

      return `
        <div class="shop-item">
          <div class="shop-head">
            <span>${item.icon} ${item.name}</span>
            <span style="color:#00f5d4">Lv ${lvl}/${item.maxLevel}</span>
          </div>
          <div class="shop-desc">${item.desc}</div>
          <div class="shop-pips">${pips}</div>
          <button class="shop-buy-btn" data-upgrade="${item.id}" ${!canAfford ? 'disabled' : ''}>
            ${maxed ? 'MAXED OUT' : `BUY — 🪙 ${cost}`}
          </button>
        </div>
      `;
    }).join('');

    this.layer.innerHTML = `
      <div class="menu-card">
        <h2 class="neon-title" style="font-size:28px">MOTHERSHIP SHOP</h2>
        <p class="menu-sub">Spend Cow Coins to supercharge your UFO! Balance: <strong style="color:#ffd23f">🪙 ${saveData.coins}</strong></p>
        <div class="shop-grid">${itemsHtml}</div>
        <div class="btn-row">
          <button id="btn-shop-launch" class="arcade-btn pulse" type="button">PLAY LEVEL ${nextLevel} ▶</button>
          <button id="btn-shop-title" class="arcade-btn secondary" type="button">TITLE</button>
        </div>
      </div>
    `;

    this.layer.querySelectorAll('[data-upgrade]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.upgrade;
        const item = SHOP_UPGRADES.find((u) => u.id === id);
        if (!item) return;
        const lvl = saveData.upgrades[id] || 0;
        const cost = this.getCost(item, lvl);
        if (lvl < item.maxLevel && saveData.coins >= cost) {
          saveData.coins -= cost;
          saveData.upgrades[id] = lvl + 1;
          this.callbacks.onBuyUpgrade?.();
          this.render(saveData, nextLevel);
        }
      });
    });

    document.getElementById('btn-shop-launch').addEventListener('click', () => {
      this.callbacks.onPlayLevel(nextLevel);
    });
    document.getElementById('btn-shop-title').addEventListener('click', () => {
      this.callbacks.onBackToTitle();
    });
  }
}
