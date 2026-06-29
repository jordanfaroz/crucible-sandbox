// Interaction rules between materials. Kept here so the movement loop stays clean
// and adding a reaction is a localized edit. Most rules are expressed through
// material flags (flammable / igniteChance / dissolvable) so they generalize.
import type { World } from "./World";
import { Mat, MAT } from "./materials";
import { chance } from "./rng";
import { CONFIG } from "../config";
import { explode, isDetonator } from "./explosions";
import { chargeStep, sparkStep, flashGas } from "./electricity";

// 8-neighbourhood offsets.
const NX = [-1, 0, 1, -1, 1, -1, 0, 1];
const NY = [-1, -1, -1, 0, 0, 1, 1, 1];

/** Returns true if the cell was transformed/consumed (skip its movement). */
export function applyReactions(w: World, x: number, y: number, i: number): boolean {
  const mat = w.material[i];

  // A charged wire (water/metal carrying charge in `extra`) spreads the charge and
  // ignites adjacent fuel, then keeps flowing/sitting normally. Cheap: only runs
  // for the handful of cells actually carrying charge (extra>0 on a conductor).
  if (w.extra[i] > 0 && (mat === Mat.Water || mat === Mat.Metal)) chargeStep(w, x, y, i);

  switch (mat) {
    case Mat.Fire: return reactFire(w, x, y, i);
    case Mat.Spark: return sparkStep(w, x, y, i);
    case Mat.Lava: return reactLava(w, x, y);
    case Mat.Acid: return reactAcid(w, x, y);
    case Mat.Steam: return reactSteam(w, x, y, i);
    case Mat.Smoke: return reactDecay(w, x, y, i, Mat.Air, 0);
    case Mat.Ember: return reactDecay(w, x, y, i, Mat.Air, 0);
    case Mat.Plant: return reactPlant(w, x, y);
    case Mat.Gunpowder: return reactGunpowder(w, x, y);
    case Mat.Ice: return reactIce(w, x, y);
    default: {
      const def = MAT(w.material[i]);
      return def.flammable ? tryIgnite(w, x, y, def.igniteChance) : false;
    }
  }
}

function tryIgnite(w: World, x: number, y: number, p: number): boolean {
  for (let n = 0; n < 8; n++) {
    const nm = w.matAt(x + NX[n], y + NY[n]);
    if ((nm === Mat.Fire || nm === Mat.Lava) && chance(p)) {
      w.setMat(x, y, Mat.Fire);
      return true;
    }
  }
  return false;
}

function reactFire(w: World, x: number, y: number, i: number): boolean {
  let hasFuel = false;
  for (let n = 0; n < 8; n++) {
    const nx = x + NX[n], ny = y + NY[n];
    const nm = w.matAt(nx, ny);
    if (nm < 0) continue;
    if (nm === Mat.Water || nm === Mat.Acid) {
      // Doused: fire dies to smoke, the water flashes to steam.
      w.setMat(x, y, chance(0.6) ? Mat.Smoke : Mat.Air);
      if (chance(0.5)) w.setMat(nx, ny, Mat.Steam);
      return true;
    }
    if (nm === Mat.FlammableGas) { hasFuel = true; flashGas(w, nx, ny); continue; }
    if (nm === Mat.Ice) { if (chance(CONFIG.phase.iceMelt)) w.setMat(nx, ny, Mat.Water); continue; }
    const def = MAT(nm);
    if (def.flammable) {
      hasFuel = true;
      if (chance(def.igniteChance)) w.setMat(nx, ny, Mat.Fire);
    }
  }

  // Flames lick upward into the air above burning fuel (spreads + looks alive).
  if (hasFuel && chance(0.25) && w.isAir(x, y - 1)) w.setMat(x, y - 1, Mat.Fire);
  // Embers rising off the flame.
  if (CONFIG.embers && chance(0.02) && w.isAir(x, y - 1)) w.setMat(x, y - 1, Mat.Ember);

  let life = w.extra[i] - (hasFuel ? 1 : 3); // starves fast without fuel
  if (life <= 0) {
    // Burnt-out flame leaves a little ash residue, otherwise smoke, otherwise air.
    w.setMat(x, y, chance(0.15) ? Mat.Ash : chance(0.5) ? Mat.Smoke : Mat.Air);
    return true;
  }
  w.extra[i] = life;
  w.touch(x, y); // keep the flame's chunk awake while it burns
  return false; // still fire — let it flicker/move
}

function reactLava(w: World, x: number, y: number): boolean {
  const P = CONFIG.phase;
  for (let n = 0; n < 8; n++) {
    const nx = x + NX[n], ny = y + NY[n];
    const nm = w.matAt(nx, ny);
    if (nm < 0) continue;
    if (nm === Mat.Water) {
      // Lava + water -> stone + steam.
      w.setMat(x, y, Mat.Stone);
      w.setMat(nx, ny, Mat.Steam);
      return true;
    }
    // Heat-driven phase changes pushed from the lava (no per-cell temp field).
    if (nm === Mat.Sand) { if (chance(P.sandToGlass)) w.setMat(nx, ny, Mat.Glass); continue; }
    if (nm === Mat.Metal) { if (chance(P.metalMelt)) w.setMat(nx, ny, Mat.Lava); continue; }
    if (nm === Mat.Ice) { if (chance(P.iceMelt)) w.setMat(nx, ny, Mat.Water); continue; }
    if (nm === Mat.FlammableGas) { flashGas(w, nx, ny); continue; }
    const def = MAT(nm);
    if (def.flammable && chance(def.igniteChance)) w.setMat(nx, ny, Mat.Fire);
  }
  return false; // lava keeps flowing (liquid movement)
}

function reactAcid(w: World, x: number, y: number): boolean {
  for (let n = 0; n < 8; n++) {
    const nx = x + NX[n], ny = y + NY[n];
    const nm = w.matAt(nx, ny);
    if (nm <= 0) continue;
    if (MAT(nm).dissolvable && chance(0.25)) {
      w.setMat(nx, ny, Mat.Air); // eat the neighbour
      if (chance(0.4)) { w.setMat(x, y, Mat.Air); return true; } // acid spent
      w.touch(x, y);
      return false;
    }
  }
  return false; // no reaction — acid flows like a liquid
}

function reactSteam(w: World, x: number, y: number, i: number): boolean {
  const life = w.extra[i] - 1;
  if (life <= 0) {
    w.setMat(x, y, chance(0.5) ? Mat.Water : Mat.Air); // condense
    return true;
  }
  w.extra[i] = life;
  w.touch(x, y);
  return false;
}

function reactDecay(w: World, x: number, y: number, i: number, into: Mat, _p: number): boolean {
  const life = w.extra[i] - 1;
  if (life <= 0) {
    w.setMat(x, y, into);
    return true;
  }
  w.extra[i] = life;
  w.touch(x, y);
  return false;
}

function reactIce(w: World, x: number, y: number): boolean {
  // Ice is a cold sink: it freezes adjacent water into ice, advancing a slow front
  // (probabilistic, so it creeps). MELTING is pushed by the heat sources
  // (fire/lava), so freeze (needs cold contact) and melt (needs hot contact) can
  // never fight over the same boundary — that's the hysteresis, for free, and it
  // means the front terminates and the chunk sleeps once the water is gone.
  let hasWater = false;
  for (let n = 0; n < 8; n++) {
    const nx = x + NX[n], ny = y + NY[n];
    if (w.matAt(nx, ny) === Mat.Water) {
      hasWater = true;
      if (chance(CONFIG.phase.waterFreeze)) w.setMat(nx, ny, Mat.Ice);
    }
  }
  if (hasWater) w.touch(x, y); // keep rolling while there's still water to freeze
  return false; // ice doesn't move
}

function reactGunpowder(w: World, x: number, y: number): boolean {
  // Detonate on contact with any detonator (fire/lava/ember/spark). The blast
  // spawns more fire, so neighbouring gunpowder goes off next frame -> cascade.
  for (let n = 0; n < 8; n++) {
    if (isDetonator(w.matAt(x + NX[n], y + NY[n]))) {
      explode(w, x, y);
      return true;
    }
  }
  return false; // otherwise it's just a powder — falls and piles
}

function reactPlant(w: World, x: number, y: number): boolean {
  // Plant is flammable.
  if (tryIgnite(w, x, y, MAT(Mat.Plant).igniteChance)) return true;

  // Grow along water into an adjacent empty cell.
  let hasWater = false;
  let airN = -1, airCount = 0;
  for (let n = 0; n < 8; n++) {
    const nx = x + NX[n], ny = y + NY[n];
    const nm = w.matAt(nx, ny);
    if (nm === Mat.Water) hasWater = true;
    else if (nm === Mat.Air) {
      airCount++;
      if ((Math.random() * airCount) < 1) airN = n; // reservoir-sample one air cell
    }
  }
  if (hasWater && airCount > 0) {
    if (chance(0.06)) w.setMat(x + NX[airN], y + NY[airN], Mat.Plant);
    else w.touch(x, y); // stay awake while it still has room/water to grow
  }
  return false; // plant doesn't move
}
