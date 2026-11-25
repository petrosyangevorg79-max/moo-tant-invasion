import { WORLD_CONFIG } from '../constants.js';
import { Cow } from '../entities/Cow.js';
import { Farmer, HayTurret } from '../entities/Farmer.js';
import { Helicopter } from '../entities/Helicopter.js';

/**
 * Spawns cows, farmers, hay-bale turrets, and military helicopters for a level.
 * Also replenishes cows if the remaining herd ever falls below remaining quota.
 */
export class Spawner {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;
  }

  _pickCowType(weights) {
    const r = Math.random();
    let acc = 0;
    for (const [typeId, w] of Object.entries(weights)) {
      acc += w;
      if (r <= acc) return typeId;
    }
    return 'normal';
  }

  _randomPastureSpot(minRadius = 8, maxRadius = WORLD_CONFIG.playableRadius - 8) {
    const pond = WORLD_CONFIG.pondPosition;
    for (let t = 0; t < 20; t++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = minRadius + Math.random() * (maxRadius - minRadius);
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      if (Math.hypot(x - pond.x, z - pond.z) > pond.radius + 3.2) {
        return { x, z };
      }
    }
    return { x: 12, z: 12 };
  }

  spawnLevel(levelCfg) {
    const cows = [];
    const enemies = [];
    const helicopters = [];

    // Spawn cows in loose clusters
    for (let i = 0; i < levelCfg.cowCount; i++) {
      const spot = this._randomPastureSpot(6, WORLD_CONFIG.playableRadius - 10);
      const typeId = this._pickCowType(levelCfg.cowWeights);
      cows.push(new Cow(this.scene, this.terrain, typeId, spot.x, spot.z));
    }

    // Spawn pitchfork farmers
    for (let i = 0; i < levelCfg.farmers; i++) {
      const spot = this._randomPastureSpot(18, WORLD_CONFIG.playableRadius - 12);
      enemies.push(new Farmer(this.scene, this.terrain, spot.x, spot.z));
    }

    // Spawn hay-bale cannon turrets
    for (let i = 0; i < levelCfg.turrets; i++) {
      const spot = this._randomPastureSpot(20, WORLD_CONFIG.playableRadius - 14);
      enemies.push(new HayTurret(this.scene, this.terrain, spot.x, spot.z));
    }

    // Spawn military helicopters
    for (let i = 0; i < levelCfg.helicopters; i++) {
      const angle = (i / Math.max(1, levelCfg.helicopters)) * Math.PI * 2;
      const x = Math.cos(angle) * 34;
      const z = Math.sin(angle) * 34;
      helicopters.push(new Helicopter(this.scene, x, z));
    }

    return { cows, enemies, helicopters };
  }

  spawnExtraCow(levelCfg, cows) {
    const spot = this._randomPastureSpot(14, WORLD_CONFIG.playableRadius - 12);
    const typeId = this._pickCowType(levelCfg.cowWeights);
    const cow = new Cow(this.scene, this.terrain, typeId, spot.x, spot.z);
    cows.push(cow);
    return cow;
  }
}
