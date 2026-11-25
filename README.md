# 🛸 MOO-TANT INVASION 🐄

A stylized 3D arcade UFO cow-abduction game built with **Three.js + Vite + vanilla ES Modules**. Designed mobile-first for iPhone Safari (iOS 15+), Android Chrome, and Desktop, with procedural 3D models, custom GLSL shaders, procedural WebAudio sound/music, and offline PWA support.

---

## 🚀 Local Development

```bash
npm install
npm run dev
```

Open the local URL printed by Vite (e.g. `http://localhost:5173`). To test on your phone over local Wi-Fi, open the **Network** URL printed by Vite (`http://<your-lan-ip>:5173`).

### Production Build & Subpath Preview

```bash
npm run build
npm run preview
```

Because `vite.config.js` sets `base: './'`, the compiled `/dist` bundle works cleanly at both root domains and GitHub Pages subpaths (`/<repo-name>/`).

---

## 🌐 Deploying to GitHub Pages

1. Create a new GitHub repository (for example, `moo-tant-invasion`) and push your code to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Moo-tant Invasion"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
2. In your GitHub repository, open **Settings → Pages**.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. The workflow at `.github/workflows/deploy.yml` will automatically build `/dist` and deploy on every push to `main`.

### Live URL Pattern
Once deployed, your game will be live at:
```
https://<your-username>.github.io/<repo-name>/
```

---

## 📱 Installing as a Fullscreen Mobile App (PWA)

### iPhone / iPad (Safari, iOS 15+)
1. Open the live GitHub Pages URL in **Safari**.
2. Tap the **Share** button (square with upward arrow) at the bottom/top bar.
3. Scroll down and tap **Add to Home Screen**.
4. Tap **Add**, then launch **Moo-tant** from your Home Screen for fullscreen landscape play with offline caching!

### Android (Chrome)
1. Open the live GitHub Pages URL in **Chrome**.
2. Tap the **⋮ Menu** in the top-right corner and select **Install app** (or **Add to Home screen**).
3. Launch **Moo-tant** from your app drawer or home screen.

---

## 🎮 Controls

- **Mobile (Multi-Touch):** Left virtual joystick to fly + right **BEAM** button (hold) + **BOMB** button (EMP stun).
- **Desktop:** `WASD` or Arrow keys to fly, `Space` or Left Mouse hold for Tractor Beam, `B` for EMP Moo-Bomb, `Esc` / `P` to Pause.
- **Gamepad:** Left stick to fly, `A` / `RT` for Beam, `B` / `X` for EMP Bomb.
