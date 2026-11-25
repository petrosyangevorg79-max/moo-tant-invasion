import * as THREE from 'three';
import { LEVEL_THEMES } from '../constants.js';
import { skyVertexShader, skyFragmentShader } from '../shaders/sky.glsl.js';

/**
 * Dynamic gradient sky dome, stars, big moon, shooting stars, drifting clouds, and lighting.
 */
export class Sky {
  constructor(scene) {
    this.scene = scene;

    // Sky dome
    this.uniforms = {
      uTopColor: { value: new THREE.Color(LEVEL_THEMES.sunny.skyTop) },
      uMidColor: { value: new THREE.Color(LEVEL_THEMES.sunny.skyMid) },
      uHorizonColor: { value: new THREE.Color(LEVEL_THEMES.sunny.skyHorizon) },
      uStarsOpacity: { value: 0.4 },
      uTime: { value: 0 }
    };

    const skyGeo = new THREE.SphereGeometry(260, 24, 16);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader: skyVertexShader,
      fragmentShader: skyFragmentShader,
      uniforms: this.uniforms,
      side: THREE.BackSide,
      depthWrite: false
    });
    this.skyDome = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.skyDome);

    // Big stylized moon
    const moonGeo = new THREE.SphereGeometry(9.5, 16, 12);
    this.moonMat = new THREE.MeshBasicMaterial({
      color: 0xfff3c4,
      fog: false
    });
    this.moon = new THREE.Mesh(moonGeo, this.moonMat);
    this.moon.position.set(-75, 82, -135);
    this.scene.add(this.moon);

    // Lighting
    this.hemiLight = new THREE.HemisphereLight(0x9ec5ff, 0x4e3b2d, 0.95);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffb56b, 1.8);
    this.dirLight.position.set(45, 68, 35);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.set(1024, 1024);
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 190;
    const d = 75;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.bias = -0.0008;
    this.scene.add(this.dirLight);

    // Fog
    this.fog = new THREE.FogExp2(LEVEL_THEMES.sunny.fogColor, LEVEL_THEMES.sunny.fogDensity);
    this.scene.fog = this.fog;

    // Drifting low-poly clouds
    this.clouds = [];
    this._createClouds();

    // Shooting star streak
    this._createShootingStar();

    this.applyTheme(LEVEL_THEMES.sunny);
  }

  _createClouds() {
    const cloudMat = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.72,
      flatShading: true
    });
    this.cloudMat = cloudMat;

    const puffGeo = new THREE.DodecahedronGeometry(1, 0);
    for (let i = 0; i < 12; i++) {
      const group = new THREE.Group();
      const puffs = 3 + (i % 3);
      for (let p = 0; p < puffs; p++) {
        const mesh = new THREE.Mesh(puffGeo, cloudMat);
        const s = 2.6 + ((i + p) % 3) * 1.1;
        mesh.scale.set(s * 1.4, s * 0.75, s);
        mesh.position.set((p - 1) * 3.1, (p % 2) * 0.8, ((p * 7) % 3 - 1) * 1.1);
        group.add(mesh);
      }
      group.position.set(
        (Math.random() - 0.5) * 180,
        36 + Math.random() * 18,
        (Math.random() - 0.5) * 180
      );
      group.userData.speed = 1.2 + Math.random() * 1.5;
      this.clouds.push(group);
      this.scene.add(group);
    }
  }

  _createShootingStar() {
    const geo = new THREE.BoxGeometry(0.25, 0.25, 7);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xb8f2ff,
      transparent: true,
      opacity: 0.9,
      fog: false
    });
    this.shootingStar = new THREE.Mesh(geo, mat);
    this.shootingStar.visible = false;
    this.scene.add(this.shootingStar);
    this.starTimer = 3.5;
    this.starActive = 0;
  }

  applyTheme(theme) {
    this.uniforms.uTopColor.value.set(theme.skyTop);
    this.uniforms.uMidColor.value.set(theme.skyMid);
    this.uniforms.uHorizonColor.value.set(theme.skyHorizon);
    this.uniforms.uStarsOpacity.value = theme.starsOpacity;

    this.fog.color.set(theme.fogColor);
    this.fog.density = theme.fogDensity;

    this.dirLight.color.set(theme.sunColor);
    this.dirLight.intensity = theme.sunIntensity;
    this.hemiLight.color.set(theme.hemiSky);
    this.hemiLight.groundColor.set(theme.hemiGround);

    this.moon.visible = theme.moonVisible;
    this.moonMat.color.set(theme.neon ? 0xff48b0 : 0xfff3c4);
    this.cloudMat.color.set(theme.neon ? 0x6f2dbd : theme.id === 'night' ? 0x3b4d7a : 0xffe8d6);
  }

  setShadowQuality(enabled, mapSize) {
    this.dirLight.castShadow = enabled;
    if (enabled && this.dirLight.shadow.mapSize.x !== mapSize) {
      this.dirLight.shadow.mapSize.set(mapSize, mapSize);
      if (this.dirLight.shadow.map) {
        this.dirLight.shadow.map.dispose();
        this.dirLight.shadow.map = null;
      }
    }
  }

  update(dt, elapsed, cameraPos) {
    this.uniforms.uTime.value = elapsed;
    this.skyDome.position.copy(cameraPos);

    // Drift clouds across sky
    for (let i = 0; i < this.clouds.length; i++) {
      const c = this.clouds[i];
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 105) c.position.x = -105;
    }

    // Periodic shooting stars
    if (this.starActive > 0) {
      this.starActive -= dt;
      this.shootingStar.position.x += 65 * dt;
      this.shootingStar.position.y -= 26 * dt;
      this.shootingStar.position.z += 22 * dt;
      if (this.starActive <= 0) {
        this.shootingStar.visible = false;
        this.starTimer = 5 + Math.random() * 8;
      }
    } else {
      this.starTimer -= dt;
      if (this.starTimer <= 0) {
        this.starActive = 1.1;
        this.shootingStar.visible = true;
        this.shootingStar.position.set(-80 + Math.random() * 50, 75 + Math.random() * 25, -120);
        this.shootingStar.lookAt(
          this.shootingStar.position.x + 65,
          this.shootingStar.position.y - 26,
          this.shootingStar.position.z + 22
        );
      }
    }
  }
}
