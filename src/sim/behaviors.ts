// Movement rules per cell-class. Pure functions over the World; no allocations.
import type { World } from "./World";
import { Class, Mat, MAT } from "./materials";
import { randSign, chance, randInt } from "./rng";

const LIQUID_DISPERSE = 5; // how far a liquid can slide sideways per step (leveling)
const GAS_DISPERSE = 3;

export function behave(w: World, x: number, y: number, cls: Class): void {
  switch (cls) {
    case Class.Powder: powder(w, x, y); break;
    case Class.Liquid: liquid(w, x, y); break;
    case Class.Gas: gas(w, x, y); break;
    case Class.Energy: energy(w, x, y); break;
    // Solid / Air: no self-motion.
  }
}

function powder(w: World, x: number, y: number): void {
  const i = y * w.width + x;
  const dens = MAT(w.material[i]).density;

  if (w.canFallInto(dens, x, y + 1)) { w.moveOrSwap(x, y, x, y + 1); return; }
  const d = randSign();
  if (w.canFallInto(dens, x + d, y + 1)) { w.moveOrSwap(x, y, x + d, y + 1); return; }
  if (w.canFallInto(dens, x - d, y + 1)) { w.moveOrSwap(x, y, x - d, y + 1); return; }
}

function liquid(w: World, x: number, y: number): void {
  const i = y * w.width + x;
  const dens = MAT(w.material[i]).density;

  if (w.canFallInto(dens, x, y + 1)) { w.moveOrSwap(x, y, x, y + 1); return; }
  const d = randSign();
  if (w.canFallInto(dens, x + d, y + 1)) { w.moveOrSwap(x, y, x + d, y + 1); return; }
  if (w.canFallInto(dens, x - d, y + 1)) { w.moveOrSwap(x, y, x - d, y + 1); return; }

  // Sideways dispersion into open air — slide to the farthest reachable cell so
  // liquids level out instead of piling like sand.
  if (disperse(w, x, y, d, LIQUID_DISPERSE)) return;
  disperse(w, x, y, -d, LIQUID_DISPERSE);
}

function disperse(w: World, x: number, y: number, dir: number, dist: number): boolean {
  let tx = x;
  for (let n = 0; n < dist; n++) {
    const nx = tx + dir;
    if (!w.isAir(nx, y)) break;
    tx = nx;
    // If the floor drops away mid-slide, fall there instead (helps draining).
    if (w.isAir(tx, y + 1)) break;
  }
  if (tx !== x) { w.moveOrSwap(x, y, tx, y); return true; }
  return false;
}

function gas(w: World, x: number, y: number): void {
  // Rising: like a liquid but inverted, with random wobble so it billows.
  if (w.isAir(x, y - 1) && chance(0.9)) { w.moveOrSwap(x, y, x, y - 1); return; }
  const d = randSign();
  if (w.isAir(x + d, y - 1)) { w.moveOrSwap(x, y, x + d, y - 1); return; }
  if (w.isAir(x - d, y - 1)) { w.moveOrSwap(x, y, x - d, y - 1); return; }

  // Blocked above — spread sideways and thin out.
  let tx = x;
  const reach = 1 + randInt(GAS_DISPERSE);
  for (let n = 0; n < reach; n++) {
    const nx = tx + d;
    if (!w.isAir(nx, y)) break;
    tx = nx;
  }
  if (tx !== x) { w.moveOrSwap(x, y, tx, y); return; }
  if (w.isAir(x - d, y)) w.moveOrSwap(x, y, x - d, y);
}

function energy(w: World, x: number, y: number): void {
  const i = y * w.width + x;
  const mat = w.material[i];
  // Embers rise quickly; fire stays close to its fuel and only flickers.
  const rise = mat === Mat.Ember ? 0.85 : 0.1;
  if (chance(rise) && w.isAir(x, y - 1)) { w.moveOrSwap(x, y, x, y - 1); return; }
  const d = randSign();
  if (mat === Mat.Ember && w.isAir(x + d, y - 1)) { w.moveOrSwap(x, y, x + d, y - 1); return; }
  // Fire also creeps sideways a touch to spread along fuel surfaces.
  if (chance(0.15) && w.isAir(x + d, y)) w.moveOrSwap(x, y, x + d, y);
}
