import * as THREE from 'three';

/**
 * Pooled instanced-mesh particle & expanding shockwave system.
 * Avoids per-frame allocations to keep mobile GC pauses near zero.
 */
export class ParticleSystem {
  constructor(scene, maxParticles = 260) {
    this.scene = scene;
    this.max = maxParticles;

    const geo = new THREE.OctahedronGeometry(0.24, 0);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.92
    });

    this.mesh = new THREE.InstancedMesh(geo, mat, this.max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);

    this.pool = new Array(this.max);
    const zeroMat = new THREE.Matrix4().makeScale(0, 0, 0);
    const white = new THREE.Color(0xffffff);
    for (let i = 0; i < this.max; i++) {
      this.pool[i] = {
        active: false,
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        gravity: 0,
        life: 0,
        maxLife: 1,
        scale: 1,
        spin: 0,
        spiral: false,
        spiralCenter: new THREE.Vector3(),
        spiralRadius: 1,
        spiralAngle: 0
      };
      this.mesh.setMatrixAt(i, zeroMat);
      this.mesh.setColorAt(i, white);
    }
    this.cursor = 0;
    this._dummy = new THREE.Object3D();
    this._color = new THREE.Color();

    // Expanding pop/shockwave rings
    this.rings = [];
    const ringGeo = new THREE.RingGeometry(0.7, 1.0, 24);
    ringGeo.rotateX(-Math.PI / 2);
    for (let i = 0; i < 10; i++) {
      const rMat = new THREE.MeshBasicMaterial({
        color: 0x00f5d4,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const rMesh = new THREE.Mesh(ringGeo, rMat);
      rMesh.visible = false;
      this.scene.add(rMesh);
      this.rings.push({ mesh: rMesh, mat: rMat, active: false, life: 0, maxLife: 0.45, maxScale: 4 });
    }
  }

  _alloc() {
    for (let n = 0; n < this.max; n++) {
      const idx = (this.cursor + n) % this.max;
      if (!this.pool[idx].active) {
        this.cursor = (idx + 1) % this.max;
        return { p: this.pool[idx], idx };
      }
    }
    const idx = this.cursor;
    this.cursor = (idx + 1) % this.max;
    return { p: this.pool[idx], idx };
  }

  spawn(x, y, z, vx, vy, vz, colorHex, scale = 1, life = 0.6, gravity = -12) {
    const { p, idx } = this._alloc();
    p.active = true;
    p.x = x; p.y = y; p.z = z;
    p.vx = vx; p.vy = vy; p.vz = vz;
    p.gravity = gravity;
    p.life = life;
    p.maxLife = life;
    p.scale = scale;
    p.spin = (Math.random() - 0.5) * 8;
    p.spiral = false;
    this._color.setHex(colorHex);
    this.mesh.setColorAt(idx, this._color);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  spawnBeamSpiral(cx, groundY, cz, radius, ufoY) {
    const { p, idx } = this._alloc();
    p.active = true;
    p.spiral = true;
    p.spiralCenter.set(cx, groundY, cz);
    p.spiralRadius = radius * (0.3 + Math.random() * 0.65);
    p.spiralAngle = Math.random() * Math.PI * 2;
    p.x = cx + Math.cos(p.spiralAngle) * p.spiralRadius;
    p.y = groundY + 0.3;
    p.z = cz + Math.sin(p.spiralAngle) * p.spiralRadius;
    p.vy = (ufoY - groundY) * 1.15;
    p.vx = 0;
    p.vz = 0;
    p.gravity = 0;
    p.life = 0.75;
    p.maxLife = 0.75;
    p.scale = 0.7 + Math.random() * 0.6;
    p.spin = 6;
    this._color.setHex(Math.random() > 0.4 ? 0x00f5d4 : 0x70ff4d);
    this.mesh.setColorAt(idx, this._color);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  spawnRing(x, y, z, colorHex = 0x00f5d4, maxScale = 4.5, maxLife = 0.42, vertical = false) {
    const slot = this.rings.find((r) => !r.active) || this.rings[0];
    slot.active = true;
    slot.life = maxLife;
    slot.maxLife = maxLife;
    slot.maxScale = maxScale;
    slot.mat.color.setHex(colorHex);
    slot.mat.opacity = 0.95;
    slot.mesh.position.set(x, y, z);
    slot.mesh.rotation.set(vertical ? Math.PI / 2 : 0, 0, 0);
    slot.mesh.scale.set(0.3, 0.3, 0.3);
    slot.mesh.visible = true;
  }

  burstAbduction(x, y, z, isGolden = false) {
    this.spawnRing(x, y, z, isGolden ? 0xffd23f : 0x00f5d4, 4.2, 0.38, true);
    const count = 16;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const spd = 4 + Math.random() * 6;
      const col = i % 2 === 0 ? 0xffd23f : 0x00f5d4;
      this.spawn(
        x, y, z,
        Math.cos(a) * spd, 2 + Math.random() * 5, Math.sin(a) * spd,
        col, 0.85, 0.55, -14
      );
    }
  }

  burstDamage(x, y, z) {
    for (let i = 0; i < 12; i++) {
      this.spawn(
        x, y, z,
        (Math.random() - 0.5) * 12,
        2 + Math.random() * 6,
        (Math.random() - 0.5) * 12,
        i % 2 === 0 ? 0xff5400 : 0xffd23f,
        0.9, 0.45, -18
      );
    }
  }

  burstExplosion(x, y, z) {
    this.spawnRing(x, y + 0.5, z, 0xff5400, 14, 0.75, false);
    for (let i = 0; i < 48; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 5 + Math.random() * 16;
      const col = [0xff4455, 0xff9f1c, 0xffd23f, 0x33384d][i % 4];
      this.spawn(
        x, y, z,
        Math.cos(a) * spd,
        4 + Math.random() * 14,
        Math.sin(a) * spd,
        col, 1.3 + Math.random(), 1.1, -20
      );
    }
  }

  burstConfetti(x, y, z) {
    const cols = [0x00f5d4, 0xff3b9a, 0xffd23f, 0x70ff4d, 0x9b5de5];
    for (let i = 0; i < 42; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 3 + Math.random() * 11;
      this.spawn(
        x, y, z,
        Math.cos(a) * spd,
        6 + Math.random() * 10,
        Math.sin(a) * spd,
        cols[i % cols.length],
        0.95, 1.4, -10
      );
    }
  }

  update(dt) {
    let dirty = false;
    for (let i = 0; i < this.max; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      dirty = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this._dummy.scale.set(0, 0, 0);
        this._dummy.updateMatrix();
        this.mesh.setMatrixAt(i, this._dummy.matrix);
        continue;
      }

      const t = p.life / p.maxLife;
      if (p.spiral) {
        p.spiralAngle += dt * 7.5;
        const r = p.spiralRadius * (0.25 + 0.75 * t);
        p.x = p.spiralCenter.x + Math.cos(p.spiralAngle) * r;
        p.z = p.spiralCenter.z + Math.sin(p.spiralAngle) * r;
        p.y += p.vy * dt;
      } else {
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z += p.vz * dt;
      }

      const s = p.scale * t;
      this._dummy.position.set(p.x, p.y, p.z);
      this._dummy.rotation.x += p.spin * dt;
      this._dummy.rotation.y += p.spin * dt;
      this._dummy.scale.set(s, s, s);
      this._dummy.updateMatrix();
      this.mesh.setMatrixAt(i, this._dummy.matrix);
    }
    if (dirty) {
      this.mesh.instanceMatrix.needsUpdate = true;
    }

    for (let i = 0; i < this.rings.length; i++) {
      const r = this.rings[i];
      if (!r.active) continue;
      r.life -= dt;
      if (r.life <= 0) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      const prog = 1 - r.life / r.maxLife;
      const s = 0.4 + prog * r.maxScale;
      r.mesh.scale.set(s, s, s);
      r.mat.opacity = (1 - prog) * 0.9;
    }
  }
}
