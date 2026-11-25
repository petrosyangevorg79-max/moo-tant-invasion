import * as THREE from 'three';
import { WORLD_CONFIG, LEVEL_THEMES } from '../constants.js';
import { grassVertexShader, grassFragmentShader } from '../shaders/grass.glsl.js';
import { waterVertexShader, waterFragmentShader } from '../shaders/water.glsl.js';

/**
 * Stylized low-poly environment props: instanced swaying grass, instanced trees & fences,
 * barns, spinning windmills, hay bales, animated pond water, fireflies, and snow.
 */
export class Foliage {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;
    this.windmillBlades = [];
    this.neonCrystals = [];
    this.grassMesh = null;
    this.treeTrunks = null;
    this.treeCrowns = null;
    this.ambientPoints = null;

    this._buildGrass(2600);
    this._buildTrees(44);
    this._buildFences();
    this._buildBarnsAndWindmills();
    this._buildHayBales();
    this._buildPond();
    this._buildAmbientParticles();

    this.applyTheme(LEVEL_THEMES.sunny);
  }

  _buildGrass(count) {
    if (this.grassMesh) {
      this.scene.remove(this.grassMesh);
      this.grassMesh.geometry.dispose();
    }

    // Tapered 3-vertex grass blade (single triangle for minimal vertex cost)
    const bladeGeo = new THREE.BufferGeometry();
    const verts = new Float32Array([
      -0.11, 0, 0,
       0.11, 0, 0,
       0.0, 0.9, 0.05
    ]);
    bladeGeo.setAttribute('position', new THREE.BufferAttribute(verts, 3));

    this.grassUniforms = {
      uTime: { value: 0 },
      uBeamPos: { value: new THREE.Vector3() },
      uBeamActive: { value: 0 },
      uBeamRadius: { value: 5.2 },
      uBaseColor: { value: new THREE.Color(LEVEL_THEMES.sunny.grassBase) },
      uTipColor: { value: new THREE.Color(LEVEL_THEMES.sunny.grassTip) },
      uFogColor: { value: new THREE.Color(LEVEL_THEMES.sunny.fogColor) },
      uFogDensity: { value: LEVEL_THEMES.sunny.fogDensity }
    };

    const grassMat = new THREE.ShaderMaterial({
      vertexShader: grassVertexShader,
      fragmentShader: grassFragmentShader,
      uniforms: this.grassUniforms,
      side: THREE.DoubleSide
    });

    this.grassMesh = new THREE.InstancedMesh(bladeGeo, grassMat, count);
    this.grassMesh.frustumCulled = false;

    const dummy = new THREE.Object3D();
    const pond = WORLD_CONFIG.pondPosition;
    const range = WORLD_CONFIG.playableRadius + 4;

    let placed = 0;
    let attempts = 0;
    while (placed < count && attempts < count * 3) {
      attempts++;
      const x = (Math.random() - 0.5) * 2 * range;
      const z = (Math.random() - 0.5) * 2 * range;
      if (Math.hypot(x - pond.x, z - pond.z) < pond.radius + 1.4) continue;

      const y = this.terrain.getHeightAt(x, z);
      dummy.position.set(x, y - 0.04, z);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      const s = 0.75 + Math.random() * 0.75;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      this.grassMesh.setMatrixAt(placed, dummy.matrix);
      placed++;
    }
    this.grassMesh.count = placed;
    this.grassMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(this.grassMesh);
  }

  _buildTrees(count) {
    if (this.treeTrunks) {
      this.scene.remove(this.treeTrunks);
      this.scene.remove(this.treeCrowns);
    }

    const trunkGeo = new THREE.CylinderGeometry(0.28, 0.44, 2.2, 6);
    trunkGeo.translate(0, 1.1, 0);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4423, flatShading: true });

    const crownGeo = new THREE.ConeGeometry(1.9, 3.8, 7);
    crownGeo.translate(0, 3.6, 0);
    this.treeCrownMat = new THREE.MeshLambertMaterial({ color: 0x3b8c3b, flatShading: true });

    this.treeTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    this.treeCrowns = new THREE.InstancedMesh(crownGeo, this.treeCrownMat, count);
    this.treeTrunks.castShadow = true;
    this.treeCrowns.castShadow = true;
    this.treeCrowns.receiveShadow = true;

    const dummy = new THREE.Object3D();
    const pond = WORLD_CONFIG.pondPosition;
    let placed = 0;
    let tries = 0;
    while (placed < count && tries < count * 5) {
      tries++;
      // Ring trees mostly near outer pastures so center stays open for UFO action
      const angle = Math.random() * Math.PI * 2;
      const dist = 26 + Math.random() * (WORLD_CONFIG.playableRadius - 20);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      if (Math.hypot(x - pond.x, z - pond.z) < pond.radius + 4) continue;
      if (Math.hypot(x - 20, z + 18) < 10) continue; // clear barn area

      const y = this.terrain.getHeightAt(x, z);
      const s = 0.85 + Math.random() * 0.7;
      dummy.position.set(x, y - 0.1, z);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      this.treeTrunks.setMatrixAt(placed, dummy.matrix);
      this.treeCrowns.setMatrixAt(placed, dummy.matrix);
      placed++;
    }
    this.treeTrunks.count = placed;
    this.treeCrowns.count = placed;
    this.treeTrunks.instanceMatrix.needsUpdate = true;
    this.treeCrowns.instanceMatrix.needsUpdate = true;
    this.scene.add(this.treeTrunks);
    this.scene.add(this.treeCrowns);
  }

  _buildFences() {
    // Instanced wooden fence posts & rails framing two farm paddocks
    const postGeo = new THREE.BoxGeometry(0.24, 1.35, 0.24);
    postGeo.translate(0, 0.67, 0);
    const railGeo = new THREE.BoxGeometry(3.2, 0.16, 0.12);
    railGeo.translate(1.6, 0.9, 0);
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x8f5d38, flatShading: true });

    const segments = [];
    const addLine = (x1, z1, x2, z2, steps) => {
      for (let i = 0; i < steps; i++) {
        const t1 = i / steps;
        const t2 = (i + 1) / steps;
        segments.push({
          x: THREE.MathUtils.lerp(x1, x2, t1),
          z: THREE.MathUtils.lerp(z1, z2, t1),
          nx: THREE.MathUtils.lerp(x1, x2, t2),
          nz: THREE.MathUtils.lerp(z1, z2, t2)
        });
      }
    };

    addLine(-12, -26, 12, -26, 7);
    addLine(-12, -26, -12, -10, 5);
    addLine(14, 14, 34, 14, 6);
    addLine(34, 14, 34, 30, 5);

    const posts = new THREE.InstancedMesh(postGeo, woodMat, segments.length);
    const rails = new THREE.InstancedMesh(railGeo, woodMat, segments.length);
    posts.castShadow = true;

    const dummy = new THREE.Object3D();
    segments.forEach((s, i) => {
      const y = this.terrain.getHeightAt(s.x, s.z);
      dummy.position.set(s.x, y - 0.05, s.z);
      dummy.rotation.y = -Math.atan2(s.nz - s.z, s.nx - s.x);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      posts.setMatrixAt(i, dummy.matrix);
      rails.setMatrixAt(i, dummy.matrix);
    });
    this.scene.add(posts);
    this.scene.add(rails);
  }

  _buildBarnsAndWindmills() {
    const createBarn = (x, z, rotY) => {
      const barn = new THREE.Group();
      const y = this.terrain.getHeightAt(x, z);
      barn.position.set(x, y - 0.1, z);
      barn.rotation.y = rotY;

      const body = new THREE.Mesh(
        new THREE.BoxGeometry(7.2, 4.4, 9.5),
        new THREE.MeshLambertMaterial({ color: 0xc93b3b, flatShading: true })
      );
      body.position.y = 2.2;
      body.castShadow = true;
      body.receiveShadow = true;
      barn.add(body);

      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(5.6, 3.2, 4),
        new THREE.MeshLambertMaterial({ color: 0x473835, flatShading: true })
      );
      roof.position.y = 5.9;
      roof.rotation.y = Math.PI / 4;
      roof.scale.set(1, 1, 1.32);
      roof.castShadow = true;
      barn.add(roof);

      const door = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 2.8, 0.25),
        new THREE.MeshLambertMaterial({ color: 0xf4efe6 })
      );
      door.position.set(0, 1.4, 4.78);
      barn.add(door);

      // Silo beside barn
      const silo = new THREE.Mesh(
        new THREE.CylinderGeometry(1.4, 1.4, 7.2, 10),
        new THREE.MeshLambertMaterial({ color: 0xd8dee9, flatShading: true })
      );
      silo.position.set(5.2, 3.6, -1.5);
      silo.castShadow = true;
      barn.add(silo);

      const siloDome = new THREE.Mesh(
        new THREE.SphereGeometry(1.4, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshLambertMaterial({ color: 0x9aa5b8, flatShading: true })
      );
      siloDome.position.set(5.2, 7.2, -1.5);
      barn.add(siloDome);

      this.scene.add(barn);
    };

    const createWindmill = (x, z) => {
      const wm = new THREE.Group();
      const y = this.terrain.getHeightAt(x, z);
      wm.position.set(x, y - 0.1, z);

      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(0.7, 1.5, 9.5, 6),
        new THREE.MeshLambertMaterial({ color: 0xe8dfd1, flatShading: true })
      );
      tower.position.y = 4.75;
      tower.castShadow = true;
      wm.add(tower);

      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(1.0, 1.5, 6),
        new THREE.MeshLambertMaterial({ color: 0xb53434, flatShading: true })
      );
      cap.position.y = 10.2;
      wm.add(cap);

      const hub = new THREE.Group();
      hub.position.set(0, 8.8, 0.95);
      const bladeGeo = new THREE.BoxGeometry(0.45, 3.8, 0.08);
      const bladeMat = new THREE.MeshLambertMaterial({ color: 0xfaf6ee });
      for (let i = 0; i < 4; i++) {
        const b = new THREE.Mesh(bladeGeo, bladeMat);
        b.rotation.z = (i * Math.PI) / 2;
        b.position.set(
          Math.cos((i * Math.PI) / 2 + Math.PI / 2) * 1.9,
          Math.sin((i * Math.PI) / 2 + Math.PI / 2) * 1.9,
          0
        );
        hub.add(b);
      }
      wm.add(hub);
      this.windmillBlades.push(hub);
      this.scene.add(wm);
    };

    createBarn(22, -18, -0.4);
    createBarn(-36, -24, 0.65);
    createWindmill(16, -28);
    createWindmill(-28, 34);
  }

  _buildHayBales() {
    const baleGeo = new THREE.CylinderGeometry(0.85, 0.85, 1.35, 10);
    baleGeo.rotateZ(Math.PI / 2);
    const baleMat = new THREE.MeshLambertMaterial({ color: 0xe6b83c, flatShading: true });
    const positions = [
      [14, -10], [15.8, -10.5], [14.9, -9.2],
      [-8, -18], [-6.5, -17.3],
      [25, 22], [26.8, 21.6],
      [-32, -8], [-30.4, -7.2]
    ];
    const bales = new THREE.InstancedMesh(baleGeo, baleMat, positions.length);
    bales.castShadow = true;
    bales.receiveShadow = true;
    const dummy = new THREE.Object3D();
    positions.forEach(([x, z], i) => {
      const y = this.terrain.getHeightAt(x, z);
      dummy.position.set(x, y + 0.72, z);
      dummy.rotation.y = i * 0.7;
      dummy.updateMatrix();
      bales.setMatrixAt(i, dummy.matrix);
    });
    this.scene.add(bales);
  }

  _buildPond() {
    const pond = WORLD_CONFIG.pondPosition;
    const waterGeo = new THREE.CircleGeometry(pond.radius + 1.1, 24);
    this.waterUniforms = {
      uTime: { value: 0 },
      uDeepColor: { value: new THREE.Color('#1d70a2') },
      uFoamColor: { value: new THREE.Color('#7ee8fa') }
    };
    const waterMat = new THREE.ShaderMaterial({
      vertexShader: waterVertexShader,
      fragmentShader: waterFragmentShader,
      uniforms: this.waterUniforms,
      transparent: true
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.set(pond.x, -0.55, pond.z);
    this.scene.add(water);
  }

  _buildAmbientParticles() {
    const count = 180;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 120;
      positions[i * 3 + 1] = 1 + Math.random() * 18;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.ambientMat = new THREE.PointsMaterial({
      color: 0xd9ff66,
      size: 0.45,
      transparent: true,
      opacity: 0.85
    });
    this.ambientPoints = new THREE.Points(geo, this.ambientMat);
    this.ambientPoints.visible = false;
    this.ambientMode = 'none';
    this.scene.add(this.ambientPoints);
  }

  setQuality(preset) {
    if (this.grassMesh.count !== preset.grassCount) {
      this._buildGrass(preset.grassCount);
    }
    const shadows = preset.shadows;
    this.treeTrunks.castShadow = shadows;
    this.treeCrowns.castShadow = shadows;
  }

  applyTheme(theme) {
    this.grassUniforms.uBaseColor.value.set(theme.grassBase);
    this.grassUniforms.uTipColor.value.set(theme.grassTip);
    this.grassUniforms.uFogColor.value.set(theme.fogColor);
    this.grassUniforms.uFogDensity.value = theme.fogDensity;

    if (theme.id === 'desert') {
      this.treeCrownMat.color.set('#5e8c3a');
    } else if (theme.id === 'snow') {
      this.treeCrownMat.color.set('#cfe8f7');
    } else if (theme.neon) {
      this.treeCrownMat.color.set('#9d4edd');
    } else if (theme.id === 'night') {
      this.treeCrownMat.color.set('#1f513c');
    } else {
      this.treeCrownMat.color.set('#3d9140');
    }

    if (theme.neon) {
      this.waterUniforms.uDeepColor.value.set('#560bad');
      this.waterUniforms.uFoamColor.value.set('#00f5d4');
    } else {
      this.waterUniforms.uDeepColor.value.set('#1d70a2');
      this.waterUniforms.uFoamColor.value.set('#80edff');
    }

    if (theme.snow) {
      this.ambientMode = 'snow';
      this.ambientPoints.visible = true;
      this.ambientMat.color.set(0xffffff);
      this.ambientMat.size = 0.42;
    } else if (theme.fireflies) {
      this.ambientMode = 'fireflies';
      this.ambientPoints.visible = true;
      this.ambientMat.color.set(theme.neon ? 0x00f5d4 : 0xd9ff66);
      this.ambientMat.size = 0.52;
    } else {
      this.ambientMode = 'none';
      this.ambientPoints.visible = false;
    }
  }

  update(dt, elapsed, beamPos, beamActive, beamRadius) {
    this.grassUniforms.uTime.value = elapsed;
    this.grassUniforms.uBeamPos.value.copy(beamPos);
    this.grassUniforms.uBeamActive.value = beamActive ? 1.0 : 0.0;
    this.grassUniforms.uBeamRadius.value = beamRadius;

    this.waterUniforms.uTime.value = elapsed;

    for (let i = 0; i < this.windmillBlades.length; i++) {
      this.windmillBlades[i].rotation.z -= dt * 1.15;
    }

    if (this.ambientPoints.visible) {
      const pos = this.ambientPoints.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);
        if (this.ambientMode === 'snow') {
          y -= dt * 4.2;
          x += Math.sin(elapsed * 1.5 + i) * dt * 0.8;
          if (y < 0) y = 20;
        } else {
          y += Math.sin(elapsed * 2.2 + i * 1.7) * dt * 0.7;
          x += Math.cos(elapsed * 1.1 + i) * dt * 0.6;
          z += Math.sin(elapsed * 1.3 + i) * dt * 0.6;
        }
        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true;
    }
  }
}
