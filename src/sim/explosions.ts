// Explosions (gunpowder). Deliberately looks-over-physics: a bounded radius that
// clears/scatters weak materials, spawns a fireball + a few rising embers, and
// leaves strong walls (stone/metal/glass) intact. No pressure solver.
//
// Chaining is emergent and bounded: an explosion doesn't recursively detonate
// other gunpowder (that risks unbounded recursion) — it just spawns fire, and any
// gunpowder the fire reaches detonates on the NEXT frame via reactGunpowder. So a
// trail cascades one blast/frame and always terminates. Every touched cell goes
// through setMat -> markDirty, so affected chunks wake; once the fire burns out and
// smoke clears, they sleep again (settle-to-zero preserved).
import type { World } from "./World";
import { Mat } from "./materials";
import { CONFIG } from "../config";
import { chance } from "./rng";

/** Materials that shrug off a blast (structural walls). */
function resistsBlast(m: number): boolean {
  return m === Mat.Stone || m === Mat.Metal || m === Mat.Glass;
}

export function explode(w: World, cx: number, cy: number): void {
  const R = CONFIG.explosionRadius;
  const R2 = R * R;
  const coreR2 = R2 * 0.55;

  for (let dy = -R; dy <= R; dy++) {
    const y = cy + dy;
    if (y < 0 || y >= w.height) continue;
    for (let dx = -R; dx <= R; dx++) {
      const d2 = dx * dx + dy * dy;
      if (d2 > R2) continue;
      const x = cx + dx;
      if (x < 0 || x >= w.width) continue;

      const m = w.material[y * w.width + x];
      if (resistsBlast(m)) continue; // walls hold

      if (m === Mat.Air) {
        // fill the fireball core with flame; leave the fringe as-is
        if (d2 < coreR2 && chance(0.7)) w.setMat(x, y, Mat.Fire);
        continue;
      }

      // Everything else (powders, liquids, plant, wood, gunpowder, gas...) is
      // blown apart: the core becomes fire, the fringe is scattered to air.
      if (d2 < coreR2) {
        w.setMat(x, y, chance(0.55) ? Mat.Fire : Mat.Air);
      } else {
        w.setMat(x, y, chance(0.22) ? Mat.Fire : Mat.Air);
      }
    }
  }

  // A handful of bright rising embers off the top of the blast for flair.
  if (CONFIG.embers) {
    for (let k = 0; k < 5; k++) {
      const ex = cx + (((k * 73) % (2 * R + 1)) - R);
      const ey = cy - 1 - (k % 3);
      if (w.inBounds(ex, ey) && w.matAt(ex, ey) === Mat.Air) w.setMat(ex, ey, Mat.Ember);
    }
  }
}

/** Will material `m` set off gunpowder on contact? Fire, lava, embers, sparks. */
export function isDetonator(m: number): boolean {
  return m === Mat.Fire || m === Mat.Lava || m === Mat.Ember || m === Mat.Spark;
}
