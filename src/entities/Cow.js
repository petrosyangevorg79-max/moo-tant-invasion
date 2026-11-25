import * as THREE from 'three';
import { COW_TYPES, WORLD_CONFIG } from '../constants.js';

let mooTextureCache = null;

function getMooTexture() {
  if (mooTextureCache) return mooTextureCache;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const ctx = c.getContext('2d');

  // Speech bubble (use arc-based rounded rect for iOS 15 Safari compat)
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#181b38';
  ctx.lineWidth = 5;
  const r = 16, x = 6, y = 6, w = 116, h = 44;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ff2a54';
  ctx.font = 'bold 26px Trebuchet MS, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('MOO!', 64, 29);

  mooTextureCache = new THREE.CanvasTexture(c);
  return mooTextureCache;
}

// Shared geometries for low-poly cows to keep draw calls & memory low
const SHARED = {
  bodyGeo: new THREE.BoxGeometry(0.95, 0.85, 1.55),
  headGeo: new THREE.BoxGeometry(0.62, 0.56, 0.62),
  snoutGeo: new THREE.BoxGeometry(0.54, 0.32, 0.28),
  legGeo: new THREE.BoxGeometry(0.2, 0.62, 0.2),
  hornGeo: new THREE.ConeGeometry(0.09, 0.34, 5),
  spotGeo: new THREE.BoxGeometry(0.99, 0.42, 0.52),
  outlineGeo: new THREE.SphereGeometry(1.15, 10, 8)
};

/**
 * Stylized low-poly cow with steering AI (wander, loose flock, graze, panic),
 * "MOO!" panic bubble, and beam abduction animation (glow, spin, wobble, flailing legs).
 */
export class Cow {
  constructor(scene, terrain, typeId, x, z) {
    this.scene = scene;
    this.terrain = terrain;
    this.type = COW_TYPES[typeId] || COW_TYPES.normal;
    this.id = typeId;

    this.group = new THREE.Group();
    this.visual = new THREE.Group();
    this.group.add(this.visual);

    this.alive = true;
    this.beingBeamed = false;
    this.liftProgress = 0; // 0..1
    this.panicTimer = 0;
    this.grazeTimer = 1 + Math.random() * 3;
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.walkPhase = Math.random() * Math.PI * 2;
    this.mooCooldown = 0;

    this.velocity = new THREE.Vector3();
    this._buildMesh();

    const y = terrain.getHeightAt(x, z);
    this.group.position.set(x, y, z);
    this.group.scale.setScalar(this.type.scale);
    this.scene.add(this.group);
  }

  _buildMesh() {
    const bodyMat = new THREE.MeshLambertMaterial({
      color: this.type.bodyColor,
      emissive: this.type.emissive,
      emissiveIntensity: this.type.emissiveIntensity
    });
    const spotMat = new THREE.MeshLambertMaterial({ color: this.type.spotColor });

    // Torso
    const body = new THREE.Mesh(SHARED.bodyGeo, bodyMat);
    body.position.y = 0.85;
    body.castShadow = true;
    this.visual.add(body);

    // Distinct cow spots / saddle
    if (this.id === 'spotted' || this.id === 'space' || this.id === 'normal') {
      const spot = new THREE.Mesh(SHARED.spotGeo, spotMat);
      spot.position.set(0, 0.92, -0.15);
      this.visual.add(spot);
    }

    // Head pivot (nods when grazing)
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.05, 0.85);
    const head = new THREE.Mesh(SHARED.headGeo, bodyMat);
    head.position.z = 0.25;
    head.castShadow = true;
    const snout = new THREE.Mesh(
      SHARED.snoutGeo,
      new THREE.MeshLambertMaterial({ color: this.id === 'bull' ? 0x3b2318 : 0xffb3c1 })
    );
    snout.position.set(0, -0.12, 0.58);
    this.headGroup.add(head, snout);

    // Horns (larger for Giant Bull)
    const hornScale = this.id === 'bull' ? 1.7 : 0.85;
    const hornMat = new THREE.MeshLambertMaterial({ color: 0xf4e8c1 });
    const lHorn = new THREE.Mesh(SHARED.hornGeo, hornMat);
    lHorn.position.set(-0.28, 0.3, 0.22);
    lHorn.rotation.z = 0.55;
    lHorn.scale.setScalar(hornScale);
    const rHorn = new THREE.Mesh(SHARED.hornGeo, hornMat);
    rHorn.position.set(0.28, 0.3, 0.22);
    rHorn.rotation.z = -0.55;
    rHorn.scale.setScalar(hornScale);
    this.headGroup.add(lHorn, rHorn);
    this.visual.add(this.headGroup);

    // 4 articulated legs
    this.legs = [];
    const legOffsets = [
      [-0.3, 0.31, 0.5],
      [0.3, 0.31, 0.5],
      [-0.3, 0.31, -0.5],
      [0.3, 0.31, -0.5]
    ];
    for (const [lx, ly, lz] of legOffsets) {
      const leg = new THREE.Mesh(SHARED.legGeo, spotMat);
      leg.position.set(lx, ly, lz);
      leg.castShadow = true;
      this.visual.add(leg);
      this.legs.push(leg);
    }

    // Abduction glow aura / outline shell
    this.auraMat = new THREE.MeshBasicMaterial({
      color: this.id === 'golden' ? 0xffd23f : 0x00f5d4,
      transparent: true,
      opacity: 0,
      wireframe: true
    });
    this.auraMesh = new THREE.Mesh(SHARED.outlineGeo, this.auraMat);
    this.auraMesh.position.y = 0.9;
    this.auraMesh.visible = false;
    this.visual.add(this.auraMesh);

    // "MOO!" panic speech bubble sprite
    const spriteMat = new THREE.SpriteMaterial({
      map: getMooTexture(),
      transparent: true,
      depthTest: false
    });
    this.mooSprite = new THREE.Sprite(spriteMat);
    this.mooSprite.position.set(0, 2.35, 0);
    this.mooSprite.scale.set(1.9, 0.95, 1);
    this.mooSprite.visible = false;
    this.group.add(this.mooSprite);
  }

  triggerPanic(beamX, beamZ, audio) {
    const wasPanicking = this.panicTimer > 0.2;
    this.panicTimer = 1.6;
    // Flee away from tractor beam center
    const dx = this.group.position.x - beamX;
    const dz = this.group.position.z - beamZ;
    this.wanderAngle = Math.atan2(dx, dz) + (Math.random() - 0.5) * 0.45;

    if (!wasPanicking && this.mooCooldown <= 0) {
      this.mooCooldown = 2.8 + Math.random() * 2.0;
      if (audio && Math.random() < 0.48) {
        audio.playMoo(this.id === 'bull' ? 0.72 : this.id === 'space' ? 1.35 : 1.0);
      }
    }
  }

  update(dt, elapsed, allCows, beamState, particles, audio) {
    if (!this.alive) return false;
    if (this.mooCooldown > 0) this.mooCooldown -= dt;

    const pos = this.group.position;
    const groundY = this.terrain.getHeightAt(pos.x, pos.z);

    if (this.beingBeamed) {
      // Abduction lift, spin, wobble, and flailing legs
      this.auraMesh.visible = true;
      this.auraMat.opacity = 0.45 + 0.25 * Math.sin(elapsed * 16);
      this.mooSprite.visible = true;

      const liftRate = (beamState.liftSpeed / this.type.weight) * dt;
      const targetY = beamState.ufoY - 1.2;
      const totalDist = Math.max(1, targetY - groundY);

      // Pull gently toward beam center axis
      pos.x = THREE.MathUtils.lerp(pos.x, beamState.x, 1 - Math.exp(-5.5 * dt));
      pos.z = THREE.MathUtils.lerp(pos.z, beamState.z, 1 - Math.exp(-5.5 * dt));
      pos.y += liftRate;

      this.liftProgress = THREE.MathUtils.clamp((pos.y - groundY) / totalDist, 0, 1);

      // Spin & wobble comically
      this.visual.rotation.y += dt * (5.5 + this.liftProgress * 7.0);
      this.visual.rotation.z = Math.sin(elapsed * 14) * 0.28;
      this.visual.rotation.x = Math.cos(elapsed * 11) * 0.22;

      // Shrink smoothly near saucer entrance
      const shrink = this.liftProgress > 0.7 ? 1 - (this.liftProgress - 0.7) / 0.3 * 0.65 : 1;
      this.group.scale.setScalar(this.type.scale * shrink);

      // Flail legs rapidly
      for (let i = 0; i < 4; i++) {
        this.legs[i].rotation.x = Math.sin(elapsed * 28 + i * 1.6) * 0.85;
      }

      if (particles && Math.random() < 0.35) {
        particles.spawn(
          pos.x + (Math.random() - 0.5) * 1.1,
          pos.y + 0.5,
          pos.z + (Math.random() - 0.5) * 1.1,
          0, 1.5, 0,
          this.id === 'golden' ? 0xffd23f : this.id === 'space' ? 0x72efdd : 0x00f5d4,
          0.6, 0.38, 0
        );
      }

      if (pos.y >= targetY) {
        return true; // Captured!
      }
      return false;
    }

    // Released from beam mid-air: fall gracefully back to ground
    const floatOffset = this.id === 'space' ? 1.1 + Math.sin(elapsed * 3.4 + pos.x) * 0.35 : 0;
    const desiredGroundY = groundY + floatOffset;
    if (pos.y > desiredGroundY + 0.15) {
      pos.y = Math.max(desiredGroundY, pos.y - 14 * dt);
      this.visual.rotation.z = THREE.MathUtils.lerp(this.visual.rotation.z, 0, 8 * dt);
      this.visual.rotation.x = THREE.MathUtils.lerp(this.visual.rotation.x, 0, 8 * dt);
      this.auraMesh.visible = false;
      this.mooSprite.visible = false;
      this.group.scale.setScalar(this.type.scale);
      return false;
    }

    // Reset abduction visual offsets on ground
    this.auraMesh.visible = false;
    this.visual.rotation.z = THREE.MathUtils.lerp(this.visual.rotation.z, 0, 10 * dt);
    this.visual.rotation.x = THREE.MathUtils.lerp(this.visual.rotation.x, 0, 10 * dt);
    this.group.scale.setScalar(this.type.scale);

    // Space cow sparkles
    if (this.id === 'space' && particles && Math.random() < 0.14) {
      particles.spawn(
        pos.x + (Math.random() - 0.5) * 1.2,
        pos.y + 0.7,
        pos.z + (Math.random() - 0.5) * 1.2,
        0, 1.1, 0, 0x72efdd, 0.55, 0.45, 0
      );
    }

    // Steering AI: Panic -> Grazing -> Wandering + Loose Flocking
    let speed = this.type.speed;
    if (this.panicTimer > 0) {
      this.panicTimer -= dt;
      speed = this.type.panicSpeed;
      this.mooSprite.visible = true;
    } else {
      this.mooSprite.visible = false;
      this.grazeTimer -= dt;
      if (this.grazeTimer <= 0) {
        // Alternate grazing & wandering
        if (this.grazeTimer < -2.2) {
          this.grazeTimer = 2.0 + Math.random() * 3.2;
          this.wanderAngle += (Math.random() - 0.5) * 2.2;
        } else {
          speed = 0; // Grazing in place
        }
      }
    }

    // React if tractor beam lands nearby
    if (beamState.active) {
      const distToBeam = Math.hypot(pos.x - beamState.x, pos.z - beamState.z);
      if (distToBeam < beamState.radius * 2.3 && distToBeam > beamState.radius * 0.95) {
        this.triggerPanic(beamState.x, beamState.z, audio);
      }
    }

    // Magnet pull upgrade gently nudges nearby cows toward active beam
    if (beamState.active && beamState.magnetPull > 0) {
      const dx = beamState.x - pos.x;
      const dz = beamState.z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.4 && d < beamState.radius + beamState.magnetPull * 3.2) {
        const pull = beamState.magnetPull * 2.1 * dt;
        pos.x += (dx / d) * pull;
        pos.z += (dz / d) * pull;
      }
    }

    // Loose flocking toward nearest neighbor (cheap O(N) sample of a few cows)
    if (speed > 0 && this.panicTimer <= 0 && allCows.length > 1) {
      let sepX = 0;
      let sepZ = 0;
      for (let i = 0; i < Math.min(8, allCows.length); i++) {
        const other = allCows[(i * 7 + Math.floor(elapsed)) % allCows.length];
        if (!other || other === this || !other.alive) continue;
        const dx = pos.x - other.group.position.x;
        const dz = pos.z - other.group.position.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > 0.01 && d2 < 7.5) {
          sepX += dx / d2;
          sepZ += dz / d2;
        }
      }
      if (sepX !== 0 || sepZ !== 0) {
        this.wanderAngle += Math.atan2(sepX, sepZ) * 0.02;
      }
    }

    // Turn away from arena borders & pond
    const maxR = WORLD_CONFIG.playableRadius - 6;
    if (Math.hypot(pos.x, pos.z) > maxR) {
      this.wanderAngle = Math.atan2(-pos.x, -pos.z);
    }
    const pond = WORLD_CONFIG.pondPosition;
    if (Math.hypot(pos.x - pond.x, pos.z - pond.z) < pond.radius + 2.2) {
      this.wanderAngle = Math.atan2(pos.x - pond.x, pos.z - pond.z);
    }

    if (speed > 0) {
      pos.x += Math.sin(this.wanderAngle) * speed * dt;
      pos.z += Math.cos(this.wanderAngle) * speed * dt;
      this.visual.rotation.y = THREE.MathUtils.lerp(this.visual.rotation.y, this.wanderAngle, 8 * dt);

      this.walkPhase += dt * speed * 2.5;
      for (let i = 0; i < 4; i++) {
        const sign = i === 0 || i === 3 ? 1 : -1;
        this.legs[i].rotation.x = Math.sin(this.walkPhase) * 0.55 * sign;
      }
      this.headGroup.rotation.x = Math.sin(this.walkPhase * 0.5) * 0.08;
    } else {
      // Grazing head bob
      for (let i = 0; i < 4; i++) this.legs[i].rotation.x = 0;
      this.headGroup.rotation.x = 0.45 + Math.sin(elapsed * 3.5 + pos.x) * 0.14;
    }

    pos.y = this.terrain.getHeightAt(pos.x, pos.z) + floatOffset;
    return false;
  }

  destroy() {
    this.alive = false;
    this.scene.remove(this.group);
  }
}
