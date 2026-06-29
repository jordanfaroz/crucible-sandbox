// Data-driven material definitions. Adding a material = one entry here
// (+ maybe one row in reactions.ts). Nothing else should hard-code a material.

export const enum Class {
  Air = 0,
  Powder = 1,
  Liquid = 2,
  Gas = 3,
  Solid = 4,
  Energy = 5,
}

// Stable numeric IDs (stored in the Uint8Array grid). 0 must be Air.
export const enum Mat {
  Air = 0,
  Sand = 1,
  Water = 2,
  Stone = 3,
  Wood = 4,
  Oil = 5,
  Fire = 6,
  Smoke = 7,
  Steam = 8,
  Lava = 9,
  Acid = 10,
  Plant = 11,
  Salt = 12,
  Gunpowder = 13,
  Ember = 14, // a brightly glowing spark, short life, rises
}

export interface Material {
  id: Mat;
  name: string;
  cls: Class;
  density: number; // for stacking/swap; higher sinks
  color: [number, number, number]; // base RGB 0-255
  jitter: number; // 0..1 per-cell brightness variation
  emissive: boolean; // participates in bloom (rendered bright)
  flammable: boolean;
  igniteChance: number; // chance/frame to catch when next to fire/lava
  dissolvable: boolean; // acid can eat it
  // lifetime range (frames) for transient materials (fire/smoke/steam/ember)
  lifeMin: number;
  lifeMax: number;
  // optional UI hint
  hidden?: boolean;
}

function m(p: Partial<Material> & { id: Mat; name: string; cls: Class }): Material {
  return {
    density: 0,
    color: [0, 0, 0],
    jitter: 0,
    emissive: false,
    flammable: false,
    igniteChance: 0,
    dissolvable: false,
    lifeMin: 0,
    lifeMax: 0,
    ...p,
  };
}

export const MATERIALS: Material[] = [];
function reg(mat: Material) {
  MATERIALS[mat.id] = mat;
}

reg(m({ id: Mat.Air, name: "Air", cls: Class.Air, density: 0, color: [8, 9, 14] }));

reg(m({
  id: Mat.Sand, name: "Sand", cls: Class.Powder, density: 200,
  // A1: dropped a notch (was [194,164,96]) so bright sand no longer crosses the
  // bloom threshold — glow stays exclusive to emissive materials.
  color: [168, 140, 80], jitter: 0.18, dissolvable: true,
}));

reg(m({
  id: Mat.Water, name: "Water", cls: Class.Liquid, density: 100,
  color: [42, 92, 168], jitter: 0.12,
}));

reg(m({
  id: Mat.Stone, name: "Stone", cls: Class.Solid, density: 255,
  color: [104, 108, 118], jitter: 0.14, dissolvable: true,
}));

reg(m({
  id: Mat.Wood, name: "Wood", cls: Class.Solid, density: 255,
  color: [104, 72, 38], jitter: 0.12, flammable: true, igniteChance: 0.02,
  dissolvable: true,
}));

reg(m({
  id: Mat.Oil, name: "Oil", cls: Class.Liquid, density: 60,
  color: [70, 58, 40], jitter: 0.1, flammable: true, igniteChance: 0.18,
}));

reg(m({
  id: Mat.Fire, name: "Fire", cls: Class.Energy, density: 2,
  color: [255, 150, 40], jitter: 0.2, emissive: true,
  lifeMin: 40, lifeMax: 110,
}));

reg(m({
  id: Mat.Smoke, name: "Smoke", cls: Class.Gas, density: 1,
  color: [40, 40, 46], jitter: 0.25, lifeMin: 90, lifeMax: 220,
}));

reg(m({
  id: Mat.Steam, name: "Steam", cls: Class.Gas, density: 1,
  color: [180, 195, 210], jitter: 0.18, lifeMin: 120, lifeMax: 280,
}));

reg(m({
  id: Mat.Lava, name: "Lava", cls: Class.Liquid, density: 130,
  color: [255, 90, 20], jitter: 0.18, emissive: true,
  igniteChance: 0.06,
}));

reg(m({
  id: Mat.Acid, name: "Acid", cls: Class.Liquid, density: 110,
  color: [120, 220, 60], jitter: 0.16, emissive: true,
}));

reg(m({
  id: Mat.Plant, name: "Plant", cls: Class.Solid, density: 255,
  color: [54, 140, 56], jitter: 0.2, flammable: true, igniteChance: 0.06,
  dissolvable: true,
}));

reg(m({
  id: Mat.Salt, name: "Salt", cls: Class.Powder, density: 180,
  color: [224, 224, 230], jitter: 0.1, dissolvable: true,
}));

reg(m({
  id: Mat.Gunpowder, name: "Gunpowder", cls: Class.Powder, density: 170,
  color: [58, 58, 64], jitter: 0.14, flammable: true, igniteChance: 0.5,
  dissolvable: true,
}));

reg(m({
  id: Mat.Ember, name: "Ember", cls: Class.Energy, density: 1,
  color: [255, 220, 150], jitter: 0.15, emissive: true,
  lifeMin: 16, lifeMax: 40, hidden: true,
}));

export const MAT = (id: Mat): Material => MATERIALS[id];

// Materials shown in the palette, in order.
export const PALETTE_ORDER: Mat[] = [
  Mat.Sand, Mat.Water, Mat.Stone, Mat.Wood, Mat.Oil, Mat.Fire,
  Mat.Lava, Mat.Acid, Mat.Plant, Mat.Smoke, Mat.Steam, Mat.Salt, Mat.Gunpowder,
];
