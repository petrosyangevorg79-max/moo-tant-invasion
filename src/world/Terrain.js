import * as THREE from 'three';
import { WORLD_CONFIG, LEVEL_THEMES } from '../constants.js';

/**
 * Procedural low-poly countryside terrain with gentle hills and a pond basin.
 * Exposes getHeightAt(x, z) so entities, grass, and shadows stay grounded.
 */
export class Terrain {
  constructor(scene) {
    this.scene = scene;
    this.size = WORLD_CONFIG.size;
    this.segments = WORLD_CONFIG.terrainSegments;
    this.pond = WORLD_CONFIG.pondPosition;

    const geo = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    this.heights = new Float32Array(pos.count);

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.computeHeight(x, z);
      pos.setY(i, y);
      this.heights[i] = y;
    }

    geo.computeVertexNormals();
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    this.geometry = geo;
    this.material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: true
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.receiveShadow = true;
    this.scene.add(this.mesh);

    this.applyTheme(LEVEL_THEMES.sunny);
  }

  /**
   * Analytic height function so both vertex generation and runtime O(1) queries match.
   */
  computeHeight(x, z) {
    // Gentle rolling hills
    let h =
      Math.sin(x * 0.045) * Math.cos(z * 0.042) * 1.9 +
      Math.sin(x * 0.09 + 1.2) * Math.sin(z * 0.08) * 0.65 +
      Math.cos((x + z) * 0.028) * 1.1;

    // Flatten slightly near the center farmyard
    const centerDist = Math.hypot(x, z);
    const centerFlatten = Math.min(1, Math.max(0.25, centerDist / 26));
    h *= centerFlatten;

    // Gentle outer rim hills beyond playable area
    const edgeDist = Math.max(Math.abs(x), Math.abs(z));
    if (edgeDist > WORLD_CONFIG.playableRadius - 4) {
      const t = (edgeDist - (WORLD_CONFIG.playableRadius - 4)) / 14;
      h += t * t * 6.5;
    }

    // Carve pond basin
    const pd = Math.hypot(x - this.pond.x, z - this.pond.z);
    if (pd < this.pond.radius + 3.5) {
      const t = Math.max(0, 1 - pd / (this.pond.radius + 3.5));
      h -= t * t * 2.4;
    }

    return h;
  }

  getHeightAt(x, z) {
    return this.computeHeight(x, z);
  }

  applyTheme(theme) {
    const pos = this.geometry.attributes.position;
    const colAttr = this.geometry.attributes.color;
    const lowCol = new THREE.Color(theme.groundLow);
    const highCol = new THREE.Color(theme.groundHigh);
    const shoreCol = new THREE.Color(theme.neon ? '#2b1859' : '#8b7355');
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const pd = Math.hypot(x - this.pond.x, z - this.pond.z);

      const hNorm = THREE.MathUtils.clamp((y + 1.5) / 5.5, 0, 1);
      tmp.copy(lowCol).lerp(highCol, hNorm);

      // Blend sandy shore near pond
      if (pd < this.pond.radius + 2.5) {
        const shoreT = THREE.MathUtils.clamp(1 - (pd - (this.pond.radius - 1)) / 3.5, 0, 1);
        tmp.lerp(shoreCol, shoreT * 0.75);
      }

      colAttr.setXYZ(i, tmp.r, tmp.g, tmp.b);
    }

    colAttr.needsUpdate = true;
  }
}
