import * as THREE from 'three';
import { UFO_CONFIG, WORLD_CONFIG } from '../constants.js';
import { ufoGlassVertexShader, ufoGlassFragmentShader } from '../shaders/ufoGlass.glsl.js';

/**
 * Player-controlled UFO with metallic hull, glass shader dome, animated alien pilot,
 * blinking light ring, engine glow, heat-haze pulse, blob ground shadow, and crash state.
 */
export class Ufo {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;

    this.group = new THREE.Group();
    this.bodyGroup = new THREE.Group();
    this.group.add(this.bodyGroup);

    this.position = this.group.position;
    this.velocity = new THREE.Vector3();
    this.hp = UFO_CONFIG.baseMaxHp;
    this.maxHp = UFO_CONFIG.baseMaxHp;
    this.invulnTimer = 0;
    this.crashed = false;
    this.crashVelY = 0;
    this.smokeTimer = 0;

    this._buildSaucer();
    this._buildBlobShadow();
    this._buildMothership();

    this.scene.add(this.group);
    this.reset();
  }

  _buildSaucer() {
    // Main metallic saucer disc
    const discGeo = new THREE.CylinderGeometry(1.7, 2.75, 0.72, 20);
    const discMat = new THREE.MeshStandardMaterial({
      color: 0xb8c4d9,
      metalness: 0.75,
      roughness: 0.25
    });
    const disc = new THREE.Mesh(discGeo, discMat);
    disc.castShadow = true;
    this.bodyGroup.add(disc);

    // Lower belly rim
    const bellyGeo = new THREE.CylinderGeometry(2.75, 1.35, 0.45, 20);
    const bellyMat = new THREE.MeshStandardMaterial({
      color: 0x566480,
      metalness: 0.65,
      roughness: 0.35
    });
    const belly = new THREE.Mesh(bellyGeo, bellyMat);
    belly.position.y = -0.55;
    this.bodyGroup.add(belly);

    // Glowing engine / emitter ring under belly
    const emitterGeo = new THREE.TorusGeometry(0.95, 0.16, 8, 20);
    emitterGeo.rotateX(Math.PI / 2);
    this.emitterMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
    this.emitterRing = new THREE.Mesh(emitterGeo, this.emitterMat);
    this.emitterRing.position.y = -0.78;
    this.bodyGroup.add(this.emitterRing);

    // Heat-haze pulse halo (visible when beam fires)
    const hazeGeo = new THREE.SphereGeometry(1.35, 12, 10);
    this.hazeMat = new THREE.MeshBasicMaterial({
      color: 0x70ff4d,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.heatHaze = new THREE.Mesh(hazeGeo, this.hazeMat);
    this.heatHaze.position.y = -0.9;
    this.heatHaze.scale.set(1, 0.35, 1);
    this.bodyGroup.add(this.heatHaze);

    // Alien pilot inside cockpit
    this.alienGroup = new THREE.Group();
    this.alienGroup.position.set(0, 0.42, 0);

    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.46, 12, 10),
      new THREE.MeshLambertMaterial({ color: 0x6bff4f })
    );
    head.scale.set(1, 1.15, 0.95);
    head.position.y = 0.25;
    this.alienGroup.add(head);

    // Big expressive alien eyes
    const eyeGeo = new THREE.SphereGeometry(0.14, 8, 8);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x090b16 });
    this.leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    this.leftEye.position.set(-0.18, 0.3, 0.38);
    this.leftEye.scale.set(1, 1.35, 0.6);
    this.rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    this.rightEye.position.set(0.18, 0.3, 0.38);
    this.rightEye.scale.set(1, 1.35, 0.6);
    this.alienGroup.add(this.leftEye, this.rightEye);

    // Wiggling antenna
    this.antennaPivot = new THREE.Group();
    this.antennaPivot.position.set(0, 0.72, 0);
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.04, 0.35, 5),
      new THREE.MeshLambertMaterial({ color: 0x5ce63e })
    );
    stem.position.y = 0.16;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd23f })
    );
    bulb.position.y = 0.36;
    this.antennaPivot.add(stem, bulb);
    this.alienGroup.add(this.antennaPivot);

    this.bodyGroup.add(this.alienGroup);

    // Glass dome shader
    this.glassUniforms = {
      uTime: { value: 0 },
      uBeamActive: { value: 0 },
      uTint: { value: new THREE.Color(0x00f5d4) }
    };
    const domeGeo = new THREE.SphereGeometry(1.18, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.ShaderMaterial({
      vertexShader: ufoGlassVertexShader,
      fragmentShader: ufoGlassFragmentShader,
      uniforms: this.glassUniforms,
      transparent: true,
      depthWrite: false
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = 0.25;
    this.bodyGroup.add(dome);

    // Rotating ring of blinking emissive rim lights
    this.lightsRing = new THREE.Group();
    this.rimLights = [];
    const bulbGeo = new THREE.SphereGeometry(0.16, 8, 6);
    const count = 10;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const mat = new THREE.MeshBasicMaterial({ color: i % 2 === 0 ? 0x00f5d4 : 0xff3b9a });
      const b = new THREE.Mesh(bulbGeo, mat);
      b.position.set(Math.cos(a) * 2.55, -0.1, Math.sin(a) * 2.55);
      this.lightsRing.add(b);
      this.rimLights.push({ mesh: b, mat, phase: i });
    }
    this.bodyGroup.add(this.lightsRing);
  }

  _buildBlobShadow() {
    // Soft radial blob texture generated on tiny canvas (zero external files)
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    grad.addColorStop(0, 'rgba(5, 8, 18, 0.58)');
    grad.addColorStop(0.65, 'rgba(5, 8, 18, 0.25)');
    grad.addColorStop(1, 'rgba(5, 8, 18, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);

    const tex = new THREE.CanvasTexture(c);
    const geo = new THREE.PlaneGeometry(6.5, 6.5);
    geo.rotateX(-Math.PI / 2);
    this.shadowMat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false
    });
    this.blobShadow = new THREE.Mesh(geo, this.shadowMat);
    this.scene.add(this.blobShadow);
  }

  _buildMothership() {
    // High-altitude orbiting mothership silhouette that cows are beamed toward in spirit
    const ms = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 15, 3.2, 16),
      new THREE.MeshStandardMaterial({ color: 0x3b426b, metalness: 0.7, roughness: 0.3 })
    );
    const core = new THREE.Mesh(
      new THREE.TorusGeometry(6.5, 0.7, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xff3b9a })
    );
    core.rotation.x = Math.PI / 2;
    core.position.y = -1.6;
    ms.add(hull, core);
    ms.position.set(0, 48, -28);
    this.mothership = ms;
    this.scene.add(ms);
  }

  reset(maxHp = UFO_CONFIG.baseMaxHp) {
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.crashed = false;
    this.crashVelY = 0;
    this.invulnTimer = 0;
    this.velocity.set(0, 0, 0);
    this.position.set(0, UFO_CONFIG.baseHoverHeight, 0);
    this.bodyGroup.rotation.set(0, 0, 0);
    this.bodyGroup.visible = true;
    this.blobShadow.visible = true;
  }

  takeDamage(amount) {
    if (this.invulnTimer > 0 || this.crashed) return false;
    this.hp = Math.max(0, this.hp - amount);
    this.invulnTimer = UFO_CONFIG.invulnDuration;
    if (this.hp <= 0) {
      this.crashed = true;
      this.crashVelY = 3.5;
    }
    return true;
  }

  update(dt, elapsed, inputX, inputY, speedMult, beamActive, isAbducting, particles) {
    this.glassUniforms.uTime.value = elapsed;
    this.glassUniforms.uBeamActive.value = beamActive ? 1.0 : 0.0;

    // Mothership gentle orbit
    this.mothership.rotation.y += dt * 0.22;
    this.mothership.position.x = Math.sin(elapsed * 0.12) * 26;

    if (this.crashed) {
      // Dramatic spin & fall to ground
      this.crashVelY -= 22 * dt;
      this.position.y += this.crashVelY * dt;
      this.bodyGroup.rotation.y += dt * 9;
      this.bodyGroup.rotation.z += dt * 3.5;
      const groundY = this.terrain.getHeightAt(this.position.x, this.position.z);
      if (this.position.y <= groundY + 0.8) {
        this.position.y = groundY + 0.8;
        this.crashVelY = 0;
      }
      this._updateBlobShadow(groundY);
      return;
    }

    if (this.invulnTimer > 0) {
      this.invulnTimer -= dt;
      this.bodyGroup.visible = Math.floor(this.invulnTimer * 22) % 2 === 0;
    } else {
      this.bodyGroup.visible = true;
    }

    // Floaty acceleration & drag
    const maxSpd = UFO_CONFIG.baseMaxSpeed * speedMult;
    const accel = UFO_CONFIG.baseAccel * speedMult;
    this.velocity.x += inputX * accel * dt;
    this.velocity.z += inputY * accel * dt;

    const damp = Math.exp(-UFO_CONFIG.drag * dt);
    this.velocity.x *= damp;
    this.velocity.z *= damp;

    const spd = Math.hypot(this.velocity.x, this.velocity.z);
    if (spd > maxSpd) {
      this.velocity.x = (this.velocity.x / spd) * maxSpd;
      this.velocity.z = (this.velocity.z / spd) * maxSpd;
    }

    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // Soft arena boundary clamp
    const bound = WORLD_CONFIG.playableRadius;
    if (Math.abs(this.position.x) > bound) {
      this.position.x = Math.sign(this.position.x) * bound;
      this.velocity.x *= -0.3;
    }
    if (Math.abs(this.position.z) > bound) {
      this.position.z = Math.sign(this.position.z) * bound;
      this.velocity.z *= -0.3;
    }

    // Hover height over terrain + subtle bobbing
    const groundY = this.terrain.getHeightAt(this.position.x, this.position.z);
    const targetY =
      groundY +
      UFO_CONFIG.baseHoverHeight +
      Math.sin(elapsed * UFO_CONFIG.bobSpeed) * UFO_CONFIG.bobAmplitude;
    this.position.y = THREE.MathUtils.lerp(this.position.y, targetY, 1 - Math.exp(-6 * dt));

    // Tilt/bank in direction of velocity
    const targetRoll = -(this.velocity.x / maxSpd) * UFO_CONFIG.maxTilt;
    const targetPitch = (this.velocity.z / maxSpd) * UFO_CONFIG.maxTilt;
    this.bodyGroup.rotation.z = THREE.MathUtils.lerp(
      this.bodyGroup.rotation.z,
      targetRoll,
      1 - Math.exp(-UFO_CONFIG.tiltLerp * dt)
    );
    this.bodyGroup.rotation.x = THREE.MathUtils.lerp(
      this.bodyGroup.rotation.x,
      targetPitch,
      1 - Math.exp(-UFO_CONFIG.tiltLerp * dt)
    );

    // Blinking rotating rim lights
    this.lightsRing.rotation.y += dt * (beamActive ? 3.8 : 1.7);
    const step = Math.floor(elapsed * (beamActive ? 10 : 5));
    for (let i = 0; i < this.rimLights.length; i++) {
      const lit = (i + step) % 3 === 0;
      const baseHex = i % 2 === 0 ? (lit ? 0x00f5d4 : 0x0a3b42) : lit ? 0xff3b9a : 0x420a2c;
      this.rimLights[i].mat.color.setHex(baseHex);
    }

    // Engine & heat haze pulse
    if (beamActive) {
      this.emitterMat.color.setHex(0x70ff4d);
      const pulse = 0.25 + 0.15 * Math.sin(elapsed * 22);
      this.hazeMat.opacity = pulse;
      const hs = 1.0 + 0.16 * Math.sin(elapsed * 18);
      this.heatHaze.scale.set(hs, 0.35, hs);
    } else {
      this.emitterMat.color.setHex(0x00bbf9);
      this.hazeMat.opacity = THREE.MathUtils.lerp(this.hazeMat.opacity, 0, 10 * dt);
    }

    // Alien pilot reacts when abducting (eyes widen, antenna wiggles!)
    const eyeScale = isAbducting ? 1.45 + 0.15 * Math.sin(elapsed * 16) : 1.0;
    this.leftEye.scale.set(eyeScale, 1.35 * eyeScale, 0.6);
    this.rightEye.scale.set(eyeScale, 1.35 * eyeScale, 0.6);
    this.antennaPivot.rotation.z = Math.sin(elapsed * (isAbducting ? 18 : 4)) * (isAbducting ? 0.45 : 0.15);

    // Smoke & sparks trail when UFO HP < 55%
    if (this.hp < this.maxHp * 0.55 && particles) {
      this.smokeTimer -= dt;
      if (this.smokeTimer <= 0) {
        this.smokeTimer = this.hp < this.maxHp * 0.3 ? 0.06 : 0.14;
        particles.spawn(
          this.position.x + (Math.random() - 0.5) * 1.4,
          this.position.y + 0.2,
          this.position.z + (Math.random() - 0.5) * 1.4,
          (Math.random() - 0.5) * 2,
          2.5 + Math.random() * 2,
          (Math.random() - 0.5) * 2,
          Math.random() > 0.35 ? 0x4b5267 : 0xff7b00,
          0.95, 0.65, 2
        );
      }
    }

    this._updateBlobShadow(groundY);
  }

  _updateBlobShadow(groundY) {
    const altitude = Math.max(0, this.position.y - groundY);
    const scale = THREE.MathUtils.clamp(1.25 - altitude * 0.032, 0.35, 1.25);
    this.blobShadow.position.set(this.position.x, groundY + 0.06, this.position.z);
    this.blobShadow.scale.set(scale, 1, scale);
    this.shadowMat.opacity = THREE.MathUtils.clamp(0.75 - altitude * 0.028, 0.18, 0.75);
  }
}
