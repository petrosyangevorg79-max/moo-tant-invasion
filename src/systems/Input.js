/**
 * Unified multi-touch virtual joystick + action buttons, keyboard, mouse, and Gamepad input.
 * Prevents accidental scrolling, pinch-zooming, and double-tap zoom on mobile Safari/Chrome.
 */
export class InputSystem {
  constructor() {
    this.moveX = 0;
    this.moveY = 0;
    this.beamHeld = false;
    this.bombPressed = false;
    this.pausePressed = false;

    this.keys = new Set();
    this.mouseBeam = false;

    // Multi-touch tracking by Touch.identifier
    this.joyTouchId = null;
    this.joyCenter = { x: 0, y: 0 };
    this.joyVec = { x: 0, y: 0 };
    this.beamTouchIds = new Set();

    this.touchControlsEl = document.getElementById('touch-controls');
    this.joyZoneEl = document.getElementById('joystick-zone');
    this.joyBaseEl = document.getElementById('joystick-base');
    this.joyKnobEl = document.getElementById('joystick-knob');
    this.beamBtnEl = document.getElementById('btn-beam');
    this.bombBtnEl = document.getElementById('btn-bomb');

    this.isTouchDevice =
      'ontouchstart' in window || navigator.maxTouchPoints > 0;

    this._bindEvents();
  }

  setControlsVisible(visible) {
    // Show touch controls on touch screens or narrow viewports while playing
    const shouldShow = visible && (this.isTouchDevice || window.innerWidth <= 1024);
    this.touchControlsEl.classList.toggle('hidden', !shouldShow);
    if (!visible) {
      this._resetTouchState();
    }
  }

  _resetTouchState() {
    this.joyTouchId = null;
    this.joyVec.x = 0;
    this.joyVec.y = 0;
    this.beamTouchIds.clear();
    this.mouseBeam = false;
    this.beamHeld = false;
    this.joyKnobEl.style.transform = 'translate(0px, 0px)';
    this.beamBtnEl.classList.remove('active');
  }

  _bindEvents() {
    // Prevent iOS Safari pinch/gesture zoom
    document.addEventListener('gesturestart', (e) => e.preventDefault(), { passive: false });
    document.addEventListener('gesturechange', (e) => e.preventDefault(), { passive: false });

    // Keyboard
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
      if (e.code === 'Space' || e.code.startsWith('Arrow')) {
        if (document.activeElement === document.body) e.preventDefault();
      }
      if (e.code === 'KeyB' && !e.repeat) {
        this.bombPressed = true;
      }
      if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) {
        this.pausePressed = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    window.addEventListener('blur', () => {
      this.keys.clear();
      this._resetTouchState();
    });

    // Desktop mouse hold on canvas for beam
    const canvas = document.getElementById('game-canvas');
    canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.mouseBeam = true;
    });
    window.addEventListener('mouseup', () => {
      this.mouseBeam = false;
    });

    // Multi-touch Joystick
    this.joyZoneEl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        if (this.joyTouchId === null) {
          this.joyTouchId = t.identifier;
          const rect = this.joyBaseEl.getBoundingClientRect();
          this.joyCenter.x = rect.left + rect.width / 2;
          this.joyCenter.y = rect.top + rect.height / 2;
          this._updateJoystick(t.clientX, t.clientY);
          break;
        }
      }
    }, { passive: false });

    window.addEventListener('touchmove', (e) => {
      if (this.joyTouchId === null) return;
      for (const t of e.changedTouches) {
        if (t.identifier === this.joyTouchId) {
          e.preventDefault();
          this._updateJoystick(t.clientX, t.clientY);
        }
      }
    }, { passive: false });

    const endJoy = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.joyTouchId) {
          this.joyTouchId = null;
          this.joyVec.x = 0;
          this.joyVec.y = 0;
          this.joyKnobEl.style.transform = 'translate(0px, 0px)';
        }
        if (this.beamTouchIds.has(t.identifier)) {
          this.beamTouchIds.delete(t.identifier);
          if (this.beamTouchIds.size === 0) {
            this.beamBtnEl.classList.remove('active');
          }
        }
      }
    };
    window.addEventListener('touchend', endJoy, { passive: false });
    window.addEventListener('touchcancel', endJoy, { passive: false });

    // Multi-touch Beam button
    this.beamBtnEl.addEventListener('touchstart', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) {
        this.beamTouchIds.add(t.identifier);
      }
      this.beamBtnEl.classList.add('active');
    }, { passive: false });

    // Also allow pointer/mouse testing on the virtual beam button in dev/desktop responsive mode
    this.beamBtnEl.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.mouseBeam = true;
      this.beamBtnEl.classList.add('active');
    });
    window.addEventListener('mouseup', () => {
      this.beamBtnEl.classList.remove('active');
    });

    // Bomb button
    const triggerBomb = (e) => {
      e.preventDefault();
      this.bombPressed = true;
    };
    this.bombBtnEl.addEventListener('touchstart', triggerBomb, { passive: false });
    this.bombBtnEl.addEventListener('mousedown', triggerBomb);
  }

  _updateJoystick(clientX, clientY) {
    const maxDist = 42;
    const dx = clientX - this.joyCenter.x;
    const dy = clientY - this.joyCenter.y;
    const dist = Math.hypot(dx, dy);
    const clamped = Math.min(dist, maxDist);
    const angle = Math.atan2(dy, dx);

    const nx = dist > 2 ? (Math.cos(angle) * clamped) / maxDist : 0;
    const ny = dist > 2 ? (Math.sin(angle) * clamped) / maxDist : 0;

    this.joyVec.x = nx;
    this.joyVec.y = ny;

    const px = Math.cos(angle) * clamped;
    const py = Math.sin(angle) * clamped;
    this.joyKnobEl.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px)`;
  }

  /**
   * Samples keyboard, virtual joystick, and connected Gamepad into normalized input state.
   */
  update() {
    let kx = 0;
    let ky = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) kx -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) kx += 1;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) ky -= 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) ky += 1;

    if (kx !== 0 && ky !== 0) {
      const inv = 1 / Math.SQRT2;
      kx *= inv;
      ky *= inv;
    }

    let gx = 0;
    let gy = 0;
    let padBeam = false;
    let padBomb = false;

    const pads = navigator.getGamepads ? navigator.getGamepads() : null;
    if (pads && pads[0]) {
      const p = pads[0];
      if (Math.abs(p.axes[0]) > 0.16) gx = p.axes[0];
      if (Math.abs(p.axes[1]) > 0.16) gy = p.axes[1];
      padBeam = Boolean(p.buttons[0]?.pressed || p.buttons[7]?.pressed);
      padBomb = Boolean(p.buttons[1]?.pressed || p.buttons[2]?.pressed);
      if (padBomb && !this._prevPadBomb) {
        this.bombPressed = true;
      }
      this._prevPadBomb = padBomb;
    }

    this.moveX = THREE_CLAMP(kx + this.joyVec.x + gx, -1, 1);
    this.moveY = THREE_CLAMP(ky + this.joyVec.y + gy, -1, 1);

    this.beamHeld =
      this.keys.has('Space') ||
      this.mouseBeam ||
      this.beamTouchIds.size > 0 ||
      padBeam;
  }

  consumeBomb() {
    const v = this.bombPressed;
    this.bombPressed = false;
    return v;
  }

  consumePause() {
    const v = this.pausePressed;
    this.pausePressed = false;
    return v;
  }
}

function THREE_CLAMP(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
