import './style.css';
import { Game } from './game/Game.js';

const loadingScreen = document.getElementById('loading-screen');
const loadingBar = document.getElementById('loading-bar');
const loadingPct = document.getElementById('loading-pct');
const canvas = document.getElementById('game-canvas');

function setProgress(pct) {
  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  loadingBar.style.width = `${clamped}%`;
  loadingPct.textContent = `${clamped}%`;
}

// Register PWA service worker for offline play (safe under subpath deploy)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// Initialize game on next frame so loading screen renders cleanly first
requestAnimationFrame(() => {
  setProgress(10);
  const game = new Game(canvas, setProgress);
  game.start();

  setTimeout(() => {
    loadingScreen.style.opacity = '0';
    loadingScreen.style.transition = 'opacity 0.35s ease';
    setTimeout(() => {
      loadingScreen.classList.add('hidden');
    }, 360);
  }, 220);
});
