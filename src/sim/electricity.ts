// Electricity + gas flashback.
//
// A charge is NOT a separate moving cell — it's a transient value carried in the
// `extra` byte of a conductor (water/metal), which is otherwise 0 for those
// materials. The value is a strictly-decreasing TTL: a charged cell pushes TTL-1
// into adjacent uncharged conductors, so the charge advances one cell per frame
// and, because the TTL only ever decreases, the whole wave is guaranteed to
// dissipate within `sparkCharge` frames — no infinite propagation, no loops.
//
// The "charged this frame" guard is the existing frame-stamp (updatedAt): when we
// charge a neighbour we stamp it, so it can't be re-charged or re-processed in the
// same tick (charge spreads exactly one ring per frame, not a same-frame flood).
//
// Reaching fuel (flammable gas / oil / gunpowder) ignites it instead of charging:
// gas flashes back across its whole connected pocket, oil catches, gunpowder
// detonates. All of it wakes chunks via setMat/markDirty and ends (TTL/lifetime/
// burnout), so the world still settles to zero.
import type { World } from "./World";
import { Mat } from "./materials";
import { CONFIG, CELL_COUNT, GRID_W } from "../config";
import { chance } from "./rng";
import { explode } from "./explosions";

const NX = [-1, 0, 1, -1, 1, -1, 0, 1];
const NY = [-1, -1, -1, 0, 0, 1, 1, 1];

/** A wire carries charge (water, metal). Distinct from fuel, which ignites. */
function isWire(m: number): boolean {
  return m === Mat.Water || m === Mat.Metal;
}

/** Push charge into wires and ignite any fuel in the 8-neighbourhood. `q` is the
 *  TTL to deposit (already decremented for the next hop). Exported so a periodic
 *  emitter node (see reactEmitter) can fire the same discharge on a timer. */
export function energize(w: World, x: number, y: number, q: number): void {
  const frame = w.frame;
  for (let n = 0; n < 8; n++) {
    const nx = x + NX[n], ny = y + NY[n];
    const nm = w.matAt(nx, ny);
    if (nm <= 0) continue;
    if (nm === Mat.FlammableGas) { flashGas(w, nx, ny); continue; }
    if (nm === Mat.Oil) { if (chance(0.6)) w.setMat(nx, ny, Mat.Fire); continue; }
    if (nm === Mat.Gunpowder) { explode(w, nx, ny); continue; }
    if (q > 0 && isWire(nm)) {
      const j = ny * GRID_W + nx;
      if (w.extra[j] === 0 && w.updatedAt[j] !== frame) {
        w.extra[j] = q;            // charge it
        w.updatedAt[j] = frame;    // charged-this-frame guard
        w.chunks.markDirty(nx, ny);
      }
    }
  }
}

/** A charged wire cell (material is water/metal, extra>0). Spreads the charge one
 *  ring outward (TTL-1), then fades by one. Returns nothing — the cell keeps its
 *  material and may still move (water flows while charged). */
export function chargeStep(w: World, x: number, y: number, i: number): void {
  const q = w.extra[i];
  energize(w, x, y, q - 1);
  w.extra[i] = q - 1;          // fade (strictly decreasing -> guaranteed to end)
  w.chunks.markDirty(x, y);    // stay awake while it glows
}

/** The Spark material: injects charge into adjacent wires, ignites adjacent fuel,
 *  and burns out fast. It does not move. Returns true (handled — skip movement). */
export function sparkStep(w: World, x: number, y: number, i: number): boolean {
  energize(w, x, y, CONFIG.sparkCharge);
  const life = w.extra[i] - 1;
  if (life <= 0) { w.setMat(x, y, Mat.Air); return true; }
  w.extra[i] = life;
  w.touch(x, y);
  return true;
}

// Flood-fill ignition stack (reused; never allocated in the hot path).
const stack = new Int32Array(CELL_COUNT);

/** Flashback: ignite an entire connected pocket of flammable gas in one frame.
 *  Mark-on-push (convert to fire as we enqueue) so each cell is visited once and
 *  the stack is bounded by the pocket size. */
export function flashGas(w: World, sx: number, sy: number): void {
  if (w.matAt(sx, sy) !== Mat.FlammableGas) return;
  let sp = 0;
  w.setMat(sx, sy, Mat.Fire);
  stack[sp++] = sy * GRID_W + sx;
  while (sp > 0) {
    const idx = stack[--sp];
    const x = idx % GRID_W;
    const y = (idx / GRID_W) | 0;
    for (let n = 0; n < 8; n++) {
      const nx = x + NX[n], ny = y + NY[n];
      if (w.matAt(nx, ny) === Mat.FlammableGas) {
        w.setMat(nx, ny, Mat.Fire);
        stack[sp++] = ny * GRID_W + nx;
      }
    }
  }
}
