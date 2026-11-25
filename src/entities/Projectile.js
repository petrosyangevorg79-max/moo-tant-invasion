import * as THREE from 'three';

/**
 * Pooled projectile manager for farmer pitchforks, hay-bale cannonballs, and helicopter rockets.
 */
export class ProjectileManager {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    this.pool = [];
    this._createPool(36);
  }

  _createPool(size) {
    const forkGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.8, 5);
    const forkMat = new THREE.MeshBasicMaterial({ color: 0xffd23f });

    const hayGeo = new THREE.DodecahedronGeometry(0.55, 0);
    const hayMat = new THREE.MeshLambertMaterial({ color: 0xf4a261, emissive: 0x552200, emissiveIntensity: 0.4 });

    const rocketGeo = new THREE.SphereGeometry(0.36, 8, 6);
    const rocketMat = new THREE.MeshBasicMaterial({ color: 0xff3b9a });

    for (let i = 0; i < size; i++) {
      const kind = i % 3 === 0 ? 'pitchfork' : i % 3 === 1 ? 'hay' : 'missile';
      const geo = kind === 'pitchfork' ? forkGeo : kind === 'hay' ? hayGeo : rocketGeo;
      const mat = kind === 'pitchfork' ? forkMat : kind === 'hay' ? hayMat : rocketMat;
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      this.scene.add(mesh);

      this.pool.push({
        active: false,
        kind,
        mesh,
        vel: new THREE.Vector3(),
        gravity: 0,
        life: 0,
        damage: 15,
        radius: 0.7
      });
    }
  }

  spawn(kind, origin, velocity, damage = 15) {
    let slot = this.pool.find((p) => !p.active && p.kind === kind);
    if (!slot) {
      slot = this.pool.find((p) => !p.active) || this.pool[0];
    }
    slot.active = true;
    slot.life = 4.2;
    slot.damage = damage;
    slot.gravity = kind === 'pitchfork' ? -13 : kind === 'hay' ? -9 : 0;
    slot.radius = kind === 'hay' ? 0.9 : 0.7;
    slot.vel.copy(velocity);
    slot.mesh.position.copy(origin);
    slot.mesh.visible = true;
  }

  clearAll() {
    for (const p of this.pool) {
      p.active = false;
      p.mesh.visible = false;
    }
  }

  update(dt, ufoPos, ufoHitRadius, onHit) {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life -= dt;
      p.vel.y += p.gravity * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.rotation.x += dt * 7;
      p.mesh.rotation.z += dt * 5;

      const groundY = this.terrain.getHeightAt(p.mesh.position.x, p.mesh.position.z);
      if (p.life <= 0 || p.mesh.position.y < groundY - 0.5) {
        p.active = false;
        p.mesh.visible = false;
        continue;
      }

      const dist = p.mesh.position.distanceTo(ufoPos);
      if (dist < ufoHitRadius + p.radius) {
        p.active = false;
        p.mesh.visible = false;
        onHit(p.damage, p.mesh.position);
      }
    }
  }
}
