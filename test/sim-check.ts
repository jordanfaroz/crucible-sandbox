// Headless verification of the simulation core (no Three.js).
// Proves the Phase 1 correctness rules and the Phase 5 idle-when-settled claim.
import { World } from "../src/sim/World";
import { Mat } from "../src/sim/materials";
import { seed } from "../src/sim/rng";

let failures = 0;
function check(name: string, cond: boolean, detail = ""): void {
  const tag = cond ? "PASS" : "FAIL";
  if (!cond) failures++;
  console.log(`[${tag}] ${name}${detail ? "  — " + detail : ""}`);
}

function count(w: World, mat: Mat): number {
  let n = 0;
  for (let i = 0; i < w.material.length; i++) if (w.material[i] === mat) n++;
  return n;
}
function findOne(w: World, mat: Mat): { x: number; y: number } | null {
  for (let y = 0; y < w.height; y++)
    for (let x = 0; x < w.width; x++)
      if (w.material[w.idx(x, y)] === mat) return { x, y };
  return null;
}

seed(12345);
const w = new World();

// ---------------------------------------------------------------------------
// Phase 1: a single sand grain falls exactly one cell per step (no teleport),
// and mass is conserved the whole way down.
// ---------------------------------------------------------------------------
{
  w.clear();
  w.setMat(50, 0, Mat.Sand);
  w.chunks.commit(); // promote the paint so the first step sees it
  let prevY = 0;
  let maxJump = 0;
  let conserved = true;
  for (let s = 0; s < w.height + 5; s++) {
    w.step();
    if (count(w, Mat.Sand) !== 1) conserved = false;
    const p = findOne(w, Mat.Sand)!;
    maxJump = Math.max(maxJump, p.y - prevY);
    prevY = p.y;
  }
  check("single grain conserved (always exactly 1 sand)", conserved);
  check("single grain never teleports (max fall <=1 cell/step)", maxJump <= 1, `maxJump=${maxJump}`);
  check("single grain reaches the floor", prevY === w.height - 1, `y=${prevY}`);
}

// ---------------------------------------------------------------------------
// Phase 1: a block of sand piles up and conserves mass.
// ---------------------------------------------------------------------------
{
  w.clear();
  let placed = 0;
  const sy = w.height - 20;
  for (let y = sy; y < sy + 20; y++) for (let x = 40; x < 60; x++) { w.setMat(x, y, Mat.Sand); placed++; }
  w.chunks.commit();
  for (let s = 0; s < 800; s++) w.step();
  check("sand pile conserves mass", count(w, Mat.Sand) === placed, `${count(w, Mat.Sand)}/${placed}`);
  // pile should be wider than it was tall originally (angle of repose spreads it)
  let minX = 9999, maxX = -1;
  for (let y = 0; y < w.height; y++) for (let x = 0; x < w.width; x++)
    if (w.material[w.idx(x, y)] === Mat.Sand) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
  check("sand pile spreads into a heap", maxX - minX > 20, `width=${maxX - minX}`);
}

// ---------------------------------------------------------------------------
// Phase 5: once everything settles, ALL chunks go to sleep (zero work/frame).
// This is the whole performance claim.
// ---------------------------------------------------------------------------
{
  w.clear();
  for (let y = 0; y < 30; y++) for (let x = 30; x < 70; x++) w.setMat(x, y, Mat.Sand);
  w.chunks.commit();
  let settledAt = -1;
  for (let s = 0; s < 1000; s++) {
    w.step();
    if (w.chunks.activeCount() === 0) { settledAt = s; break; }
  }
  check("world goes fully idle after settling (0 awake chunks)", settledAt >= 0, `settledAt=${settledAt}`);
  // and stays idle
  w.step();
  check("stays idle once settled", w.chunks.activeCount() === 0);
}

// ---------------------------------------------------------------------------
// Phase 2: density swap — sand sinks through water.
// ---------------------------------------------------------------------------
{
  w.clear();
  const bottom = w.height - 1;
  for (let y = bottom - 9; y <= bottom; y++) for (let x = 45; x < 55; x++) w.setMat(x, y, Mat.Water);
  for (let x = 45; x < 55; x++) w.setMat(x, 0, Mat.Sand);
  w.chunks.commit();
  for (let s = 0; s < 600; s++) w.step();
  // the very bottom row under the column should now be sand (it sank below water)
  let sandBelowWater = 0;
  for (let x = 45; x < 55; x++) if (w.material[w.idx(x, bottom)] === Mat.Sand) sandBelowWater++;
  check("sand sinks below water (density swap)", sandBelowWater >= 5, `${sandBelowWater}/10 bottom cells sand`);
}

// ---------------------------------------------------------------------------
// Phase 2: water levels out sideways instead of piling.
// ---------------------------------------------------------------------------
{
  w.clear();
  for (let y = w.height - 40; y < w.height; y++) w.setMat(50, y, Mat.Water); // tall thin column on the floor
  w.chunks.commit();
  const placed = count(w, Mat.Water);
  for (let s = 0; s < 800; s++) w.step();
  let minX = 9999, maxX = -1;
  for (let y = 0; y < w.height; y++) for (let x = 0; x < w.width; x++)
    if (w.material[w.idx(x, y)] === Mat.Water) { if (x < minX) minX = x; if (x > maxX) maxX = x; }
  check("water conserves mass", count(w, Mat.Water) === placed, `${count(w, Mat.Water)}/${placed}`);
  check("water spreads/levels sideways", maxX - minX > 15, `width=${maxX - minX}`);
}

// ---------------------------------------------------------------------------
// Phase 4: reactions don't crash and produce expected transmutations.
// ---------------------------------------------------------------------------
{
  // lava + water -> stone + steam (placed adjacent near the floor)
  w.clear();
  const lb = w.height - 1;
  for (let x = 40; x < 60; x++) for (let y = lb - 9; y <= lb; y++) w.setMat(x, y, Mat.Lava);
  for (let x = 40; x < 60; x++) for (let y = lb - 19; y <= lb - 10; y++) w.setMat(x, y, Mat.Water);
  w.chunks.commit();
  for (let s = 0; s < 300; s++) w.step();
  check("lava + water produces stone", count(w, Mat.Stone) > 0, `stone=${count(w, Mat.Stone)}`);

  // acid eats stone
  w.clear();
  for (let x = 40; x < 60; x++) for (let y = 60; y < 75; y++) w.setMat(x, y, Mat.Stone);
  for (let x = 40; x < 60; x++) for (let y = 55; y < 60; y++) w.setMat(x, y, Mat.Acid);
  w.chunks.commit();
  const stone0 = count(w, Mat.Stone);
  for (let s = 0; s < 300; s++) w.step();
  check("acid dissolves stone", count(w, Mat.Stone) < stone0, `stone ${stone0} -> ${count(w, Mat.Stone)}`);

  // fire consumes wood and eventually burns out (no infinite fire)
  w.clear();
  for (let x = 40; x < 60; x++) for (let y = 60; y < 70; y++) w.setMat(x, y, Mat.Wood);
  for (let x = 45; x < 55; x++) w.setMat(x, 59, Mat.Fire);
  w.chunks.commit();
  let sawFireSpread = false;
  for (let s = 0; s < 1500; s++) {
    w.step();
    if (count(w, Mat.Fire) > 12) sawFireSpread = true;
  }
  check("fire spreads through wood", sawFireSpread);
  check("fire eventually burns out (no runaway)", count(w, Mat.Fire) < 30, `fire=${count(w, Mat.Fire)}`);
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
