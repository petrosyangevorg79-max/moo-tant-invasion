import * as THREE from 'three';
import { WORLD_CONFIG } from '../constants.js';

/**
 * Angry pitchfork-throwing Farmer and stationary Hay-Bale Cannon Turret.
 */
export class Farmer {
  constructor(scene, terrain, x, z) {
    this.scene = scene;
    this.terrain = terrain;
    this.group = new THREE.Group();
    this.stunTimer = 0;
    this.throwCooldown = 1.6 + Math.random() * 1.8;
    this.wanderAngle = Math.random() * Math.PI * 2;
    this.walkPhase = Math.random() * Math.PI * 2;

    this._buildMesh();
    const y = terrain.getHeightAt(x, z);
    this.group.position.set(x, y, z);
    this.scene.add(this.group);
  }

  _buildMesh() {
    const overalls = new THREE.MeshLambertMaterial({ color: 0x2b59c3 });
    const shirt = new THREE.MeshLambertMaterial({ color: 0xd93838 });
    const skin = new THREE.MeshLambertMaterial({ color: 0xffcba4 });
    const hatMat = new THREE.MeshLambertMaterial({ color: 0xe6b83c });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.95, 0.45), overalls);
    body.position.y = 0.9;
    body.castShadow = true;

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.45, 0.47), shirt);
    torso.position.y = 1.2;

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), skin);
    head.position.y = 1.68;

    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.08, 8), hatMat);
    brim.position.y = 1.94;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.28, 8), hatMat);
    crown.position.y = 2.1;

    // Pitchfork in hand
    const fork = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.8, 5),
      new THREE.MeshLambertMaterial({ color: 0x8f5d38 })
    );
    fork.position.set(0.45, 1.35, 0.2);
    fork.rotation.x = 0.25;

    // Stun stars indicator
    this.stunRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.06, 6, 12),
      new THREE.MeshBasicMaterial({ color: 0x00f5d4 })
    );
    this.stunRing.rotation.x = Math.PI / 2;
    this.stunRing.position.y = 2.45;
    this.stunRing.visible = false;

    this.group.add(body, torso, head, brim, crown, fork, this.stunRing);
  }

  stun(duration) {
    this.stunTimer = Math.max(this.stunTimer, duration);
  }

  update(dt, elapsed, ufoPos, projectiles) {
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.stunRing.visible = true;
      this.stunRing.rotation.z = elapsed * 8;
      this.group.rotation.z = Math.sin(elapsed * 20) * 0.14;
      return;
    }
    this.stunRing.visible = false;
    this.group.rotation.z = 0;

    const pos = this.group.position;
    const dx = ufoPos.x - pos.x;
    const dz = ufoPos.z - pos.z;
    const dist = Math.hypot(dx, dz);

    // Chase loosely toward UFO if within 36m, else patrol
    if (dist < 38) {
      this.wanderAngle = Math.atan2(dx, dz);
    } else if (Math.random() < 0.015) {
      this.wanderAngle += (Math.random() - 0.5) * 1.8;
    }

    const spd = dist < 38 ? 4.4 : 2.5;
    if (dist > 7) {
      pos.x += Math.sin(this.wanderAngle) * spd * dt;
      pos.z += Math.cos(this.wanderAngle) * spd * dt;
    }
    const maxR = WORLD_CONFIG.playableRadius - 6;
    if (Math.hypot(pos.x, pos.z) > maxR) {
      this.wanderAngle = Math.atan2(-pos.x, -pos.z);
    }
    pos.y = this.terrain.getHeightAt(pos.x, pos.z);
    this.group.rotation.y = this.wanderAngle;

    // Throw pitchfork upward in an arc toward UFO
    this.throwCooldown -= dt;
    if (this.throwCooldown <= 0 && dist < 28) {
      this.throwCooldown = 2.4 + Math.random() * 1.4;
      const origin = new THREE.Vector3(pos.x, pos.y + 2.0, pos.z);
      const flightTime = 1.25;
      const vx = (ufoPos.x - origin.x) / flightTime;
      const vz = (ufoPos.z - origin.z) / flightTime;
      const vy = (ufoPos.y - origin.y + 0.5 * 13 * flightTime * flightTime) / flightTime;
      projectiles.spawn('pitchfork', origin, new THREE.Vector3(vx, vy, vz), 14);
    }
  }

  destroy() {
    this.scene.remove(this.group);
  }
}

export class HayTurret {
  constructor(scene, terrain, x, z) {
    this.scene = scene;
    this.terrain = terrain;
    this.group = new THREE.Group();
    this.stunTimer = 0;
    this.fireCooldown = 2.5 + Math.random() * 1.5;

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(1.1, 1.35, 1.1, 8),
      new THREE.MeshLambertMaterial({ color: 0x566480, flatShading: true })
    );
    base.position.y = 0.55;
    base.castShadow = true;

    this.barrelGroup = new THREE.Group();
    this.barrelGroup.position.y = 1.2;
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.52, 2.2, 8),
      new THREE.MeshLambertMaterial({ color: 0x2c3245, flatShading: true })
    );
    barrel.rotation.x = -Math.PI / 3;
    barrel.position.set(0, 0.65, 0.45);
    this.barrelGroup.add(barrel);

    this.stunRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.0, 0.09, 6, 16),
      new THREE.MeshBasicMaterial({ color: 0x00f5d4 })
    );
    this.stunRing.rotation.x = Math.PI / 2;
    this.stunRing.position.y = 2.4;
    this.stunRing.visible = false;

    this.group.add(base, this.barrelGroup, this.stunRing);
    this.group.position.set(x, terrain.getHeightAt(x, z), z);
    this.scene.add(this.group);
  }

  stun(duration) {
    this.stunTimer = Math.max(this.stunTimer, duration);
  }

  update(dt, elapsed, ufoPos, projectiles) {
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.stunRing.visible = true;
      this.stunRing.rotation.z = elapsed * 8;
      return;
    }
    this.stunRing.visible = false;

    const pos = this.group.position;
    const dx = ufoPos.x - pos.x;
    const dz = ufoPos.z - pos.z;
    const dist = Math.hypot(dx, dz);
    this.barrelGroup.rotation.y = Math.atan2(dx, dz);

    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0 && dist < 38) {
      this.fireCooldown = 3.2 + Math.random() * 1.3;
      const origin = new THREE.Vector3(pos.x, pos.y + 2.1, pos.z);
      const flightTime = 1.45;
      const vx = (ufoPos.x - origin.x) / flightTime;
      const vz = (ufoPos.z - origin.z) / flightTime;
      const vy = (ufoPos.y - origin.y + 0.5 * 9 * flightTime * flightTime) / flightTime;
      projectiles.spawn('hay', origin, new THREE.Vector3(vx, vy, vz), 18);
    }
  }

  destroy() {
    this.scene.remove(this.group);
  }
}
