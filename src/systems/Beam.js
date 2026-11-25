import * as THREE from 'three';
import { BEAM_CONFIG } from '../constants.js';
import { beamVertexShader, beamFragmentShader } from '../shaders/beam.glsl.js';

/**
 * Tractor beam cone shader, ground-impact ripple ring, scorch decal, and energy/overheat system.
 */
export class BeamSystem {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;

    this.energy = BEAM_CONFIG.baseEnergyMax;
    this.maxEnergy = BEAM_CONFIG.baseEnergyMax;
    this.overheated = false;
    this.overheatTimer = 0;
    this.active = false;
    this.spiralSpawnTimer = 0;
    this.dustSpawnTimer = 0;

    this._buildCone();
    this._buildGroundRing();
  }

  _buildCone() {
    // Unit-height open-ended cylinder scaled dynamically from UFO belly to ground
    const geo = new THREE.CylinderGeometry(
      BEAM_CONFIG.coneTopRadius,
      1.0, // bottom radius scaled by radius upgrade
      1.0,
      24,
      1,
      true
    );
    // Shift origin to top edge so scaling Y extends straight downward
    geo.translate(0, -0.5, 0);

    this.uniforms = {
      uTime: { value: 0 },
      uIntensity: { value: 0 },
      uColorA: { value: new THREE.Color(0x00f5d4) },
      uColorB: { value: new THREE.Color(0x70ff4d) }
    };

    const mat = new THREE.ShaderMaterial({
      vertexShader: beamVertexShader,
      fragmentShader: beamFragmentShader,
      uniforms: this.uniforms,
      transparent: true,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.coneMesh = new THREE.Mesh(geo, mat);
    this.coneMesh.visible = false;
    this.scene.add(this.coneMesh);
  }

  _buildGroundRing() {
    // Glowing ground impact ring + scorch disc
    const ringGeo = new THREE.RingGeometry(0.76, 1.0, 28);
    ringGeo.rotateX(-Math.PI / 2);
    this.ringMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.groundRing = new THREE.Mesh(ringGeo, this.ringMat);
    this.groundRing.visible = false;
    this.scene.add(this.groundRing);

    const scorchGeo = new THREE.CircleGeometry(0.95, 24);
    scorchGeo.rotateX(-Math.PI / 2);
    this.scorchMat = new THREE.MeshBasicMaterial({
      color: 0x102818,
      transparent: true,
      opacity: 0.35,
      depthWrite: false
    });
    this.scorchDisc = new THREE.Mesh(scorchGeo, this.scorchMat);
    this.scorchDisc.visible = false;
    this.scene.add(this.scorchDisc);
  }

  reset(upgrades) {
    this.maxEnergy = BEAM_CONFIG.baseEnergyMax * (1 + upgrades.energyCap * 0.2);
    this.energy = this.maxEnergy;
    this.overheated = false;
    this.overheatTimer = 0;
    this.active = false;
    this.coneMesh.visible = false;
    this.groundRing.visible = false;
    this.scorchDisc.visible = false;
  }

  update(dt, elapsed, wantsBeam, ufoPos, upgrades, cows, particles, audio) {
    this.uniforms.uTime.value = elapsed;

    const radius = BEAM_CONFIG.baseRadius * (1 + upgrades.beamRadius * 0.14);
    const liftSpeed = BEAM_CONFIG.baseLiftSpeed * (1 + upgrades.beamSpeed * 0.18);
    const rechargeRate = BEAM_CONFIG.energyRechargePerSec * (1 + upgrades.energyCap * 0.16);
    const magnetPull = upgrades.magnet;

    // Overheat & energy accounting
    if (this.overheated) {
      this.overheatTimer -= dt;
      this.energy = Math.min(this.maxEnergy, this.energy + rechargeRate * 0.65 * dt);
      if (this.overheatTimer <= 0) {
        this.overheated = false;
      }
      this.active = false;
    } else if (wantsBeam && this.energy > 0) {
      this.active = true;
      this.energy = Math.max(0, this.energy - BEAM_CONFIG.energyDrainPerSec * dt);
      if (this.energy <= 0) {
        this.overheated = true;
        this.overheatTimer = BEAM_CONFIG.overheatCooldown;
        this.active = false;
      }
    } else {
      this.active = false;
      this.energy = Math.min(this.maxEnergy, this.energy + rechargeRate * dt);
    }

    const groundY = this.terrain.getHeightAt(ufoPos.x, ufoPos.z);
    const height = Math.max(2, ufoPos.y - 0.7 - groundY);

    if (this.active) {
      this.coneMesh.visible = true;
      this.groundRing.visible = true;
      this.scorchDisc.visible = true;

      this.coneMesh.position.set(ufoPos.x, ufoPos.y - 0.7, ufoPos.z);
      this.coneMesh.scale.set(radius, height, radius);
      this.uniforms.uIntensity.value = THREE.MathUtils.lerp(
        this.uniforms.uIntensity.value,
        1.0,
        14 * dt
      );

      // Pulsing ground impact ring
      const pulse = 1.0 + 0.08 * Math.sin(elapsed * 14);
      this.groundRing.position.set(ufoPos.x, groundY + 0.14, ufoPos.z);
      this.groundRing.scale.setScalar(radius * pulse);
      this.ringMat.opacity = 0.6 + 0.25 * Math.sin(elapsed * 10);

      this.scorchDisc.position.set(ufoPos.x, groundY + 0.08, ufoPos.z);
      this.scorchDisc.scale.setScalar(radius * 0.92);

      // Spiraling light particles rising along the beam
      this.spiralSpawnTimer -= dt;
      if (this.spiralSpawnTimer <= 0 && particles) {
        this.spiralSpawnTimer = 0.055;
        particles.spawnBeamSpiral(ufoPos.x, groundY, ufoPos.z, radius * 0.9, ufoPos.y - 0.8);
      }

      // Grass/dust blowing outward from beam base
      this.dustSpawnTimer -= dt;
      if (this.dustSpawnTimer <= 0 && particles) {
        this.dustSpawnTimer = 0.09;
        const a = Math.random() * Math.PI * 2;
        particles.spawn(
          ufoPos.x + Math.cos(a) * radius * 0.75,
          groundY + 0.2,
          ufoPos.z + Math.sin(a) * radius * 0.75,
          Math.cos(a) * 6.5,
          1.6 + Math.random() * 1.4,
          Math.sin(a) * 6.5,
          0xb7e4c7, 0.75, 0.36, -6
        );
      }
    } else {
      this.uniforms.uIntensity.value = THREE.MathUtils.lerp(
        this.uniforms.uIntensity.value,
        0,
        16 * dt
      );
      if (this.uniforms.uIntensity.value < 0.03) {
        this.coneMesh.visible = false;
        this.groundRing.visible = false;
        this.scorchDisc.visible = false;
      }
    }

    // Check which cows are inside the beam footprint
    let abductingCount = 0;
    let maxLiftProgress = 0;

    for (let i = 0; i < cows.length; i++) {
      const cow = cows[i];
      if (!cow.alive) continue;
      if (this.active) {
        const dist = Math.hypot(cow.group.position.x - ufoPos.x, cow.group.position.z - ufoPos.z);
        if (dist <= radius * 0.95) {
          if (!cow.beingBeamed) {
            cow.beingBeamed = true;
            cow.triggerPanic(ufoPos.x, ufoPos.z, audio);
          }
          abductingCount++;
          maxLiftProgress = Math.max(maxLiftProgress, cow.liftProgress);
        } else {
          cow.beingBeamed = false;
        }
      } else {
        cow.beingBeamed = false;
      }
    }

    audio?.setBeamState(this.active, abductingCount > 0 ? 0.25 + maxLiftProgress * 0.75 : 0);

    return {
      active: this.active,
      x: ufoPos.x,
      z: ufoPos.z,
      ufoY: ufoPos.y,
      radius,
      liftSpeed,
      magnetPull,
      abductingCount,
      maxLiftProgress
    };
  }
}
