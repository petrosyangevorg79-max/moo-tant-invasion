import * as THREE from 'three';

/**
 * Military helicopter introduced from Level 3+.
 * Patrols/chases the UFO and fires slow glowing projectiles.
 */
export class Helicopter {
  constructor(scene, x, z) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.stunTimer = 0;
    this.fireCooldown = 2.6 + Math.random() * 1.4;
    this.orbitAngle = Math.random() * Math.PI * 2;

    this._buildMesh();
    this.group.position.set(x, 14.5, z);
    this.scene.add(this.group);
  }

  _buildMesh() {
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x3b523b, flatShading: true });
    const glassMat = new THREE.MeshLambertMaterial({ color: 0x90e0ef });

    const hull = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.3, 3.2), bodyMat);
    hull.castShadow = true;
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 1.1), glassMat);
    cockpit.position.set(0, 0.1, 1.5);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 2.8), bodyMat);
    tail.position.set(0, 0.25, -2.6);

    // Main spinning rotor
    this.rotor = new THREE.Mesh(
      new THREE.BoxGeometry(5.2, 0.08, 0.34),
      new THREE.MeshBasicMaterial({ color: 0x1a1e2e })
    );
    this.rotor.position.y = 0.95;

    // Red warning beacon
    this.beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff2a54 })
    );
    this.beacon.position.set(0, 0.9, -0.8);

    this.stunRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.7, 0.1, 6, 16),
      new THREE.MeshBasicMaterial({ color: 0x00f5d4 })
    );
    this.stunRing.rotation.x = Math.PI / 2;
    this.stunRing.position.y = 1.4;
    this.stunRing.visible = false;

    this.group.add(hull, cockpit, tail, this.rotor, this.beacon, this.stunRing);
  }

  stun(duration) {
    this.stunTimer = Math.max(this.stunTimer, duration);
  }

  update(dt, elapsed, ufoPos, projectiles) {
    this.rotor.rotation.y += dt * (this.stunTimer > 0 ? 4 : 26);

    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.stunRing.visible = true;
      this.stunRing.rotation.z = elapsed * 8;
      this.group.rotation.z = Math.sin(elapsed * 15) * 0.22;
      return;
    }
    this.stunRing.visible = false;
    this.group.rotation.z = 0;

    // Circle and pursue UFO at slightly higher altitude
    this.orbitAngle += dt * 0.55;
    const targetX = ufoPos.x + Math.cos(this.orbitAngle) * 16;
    const targetZ = ufoPos.z + Math.sin(this.orbitAngle) * 16;
    const targetY = ufoPos.y + 2.8 + Math.sin(elapsed * 2.2) * 0.7;

    const pos = this.group.position;
    pos.x = THREE.MathUtils.lerp(pos.x, targetX, 1 - Math.exp(-1.8 * dt));
    pos.z = THREE.MathUtils.lerp(pos.z, targetZ, 1 - Math.exp(-1.8 * dt));
    pos.y = THREE.MathUtils.lerp(pos.y, targetY, 1 - Math.exp(-2.4 * dt));

    this.group.lookAt(ufoPos.x, pos.y, ufoPos.z);

    this.fireCooldown -= dt;
    if (this.fireCooldown <= 0) {
      this.fireCooldown = 2.7 + Math.random() * 1.1;
      const dir = new THREE.Vector3().subVectors(ufoPos, pos).normalize();
      projectiles.spawn('missile', pos.clone().addScaledVector(dir, 2.0), dir.multiplyScalar(15.5), 16);
    }
  }

  destroy() {
    this.scene.remove(this.group);
  }
}
