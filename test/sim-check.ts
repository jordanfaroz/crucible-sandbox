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

// ---------------------------------------------------------------------------
// Part B — Gunpowder explosions. A spark of fire on a gunpowder pile should
// detonate (clear a crater + spawn fire), chain through the pile, and the world
// must return to fully idle once the fire burns out and smoke clears.
// ---------------------------------------------------------------------------
{
  w.clear();
  const gy = w.height - 30;
  for (let y = gy; y < gy + 16; y++) for (let x = 40; x < 90; x++) w.setMat(x, y, Mat.Gunpowder);
  const before = count(w, Mat.Gunpowder);
  w.setMat(64, gy - 1, Mat.Fire); // light the top
  w.chunks.commit();
  let sawFire = false;
  for (let s = 0; s < 400; s++) { w.step(); if (count(w, Mat.Fire) > 30) sawFire = true; }
  const after = count(w, Mat.Gunpowder);
  check("gunpowder detonates and is consumed by the blast", after < before * 0.5, `${before} -> ${after}`);
  check("explosion produces a fireball (chain)", sawFire);
  // run out the fire + smoke and confirm the world goes idle again
  let settledAt = -1;
  for (let s = 0; s < 3000; s++) { w.step(); if (w.chunks.activeCount() === 0) { settledAt = s; break; } }
  check("world goes idle again after an explosion", settledAt >= 0, `settledAt=${settledAt}`);
}

// ---------------------------------------------------------------------------
// Part B — Electricity. A spark injected at one end of a water wire sends a
// charge sweeping along it; the charge MUST fully dissipate (no infinite
// propagation / loops) and the wire must return to idle.
// ---------------------------------------------------------------------------
{
  w.clear();
  const wy = 50;
  // A contained trough so the water wire is stable (open ends would drain forever —
  // a property of liquids, not the charge code).
  for (let x = 19; x <= 130; x++) w.setMat(x, wy + 1, Mat.Stone); // floor
  w.setMat(19, wy, Mat.Stone); w.setMat(130, wy, Mat.Stone);      // end walls
  for (let x = 20; x < 130; x++) w.setMat(x, wy, Mat.Water);      // the wire
  w.setMat(21, wy - 1, Mat.Spark); // inject at the left end
  w.chunks.commit();
  let maxCharged = 0;
  for (let s = 0; s < 120; s++) {
    w.step();
    let charged = 0;
    for (let x = 20; x < 130; x++) if (w.extra[w.idx(x, wy)] > 0) charged++;
    if (charged > maxCharged) maxCharged = charged;
  }
  check("charge propagates along a water wire", maxCharged > 5, `peak charged cells=${maxCharged}`);
  let stillCharged = 0;
  for (let x = 20; x < 130; x++) if (w.extra[w.idx(x, wy)] > 0) stillCharged++;
  check("charge fully dissipates (no infinite propagation)", stillCharged === 0, `stillCharged=${stillCharged}`);
  let settledAt = -1;
  for (let s = 0; s < 800; s++) { w.step(); if (w.chunks.activeCount() === 0) { settledAt = s; break; } }
  check("wire goes idle after the charge passes", settledAt >= 0, `settledAt=${settledAt}`);
}

// ---------------------------------------------------------------------------
// Part B — Metal melts to lava on lava contact; spark conducts through metal.
// ---------------------------------------------------------------------------
{
  w.clear();
  for (let x = 40; x < 60; x++) for (let y = 60; y < 70; y++) w.setMat(x, y, Mat.Metal);
  for (let x = 40; x < 60; x++) w.setMat(x, 59, Mat.Lava); // lava sitting on the metal
  w.chunks.commit();
  const metal0 = count(w, Mat.Metal);
  for (let s = 0; s < 600; s++) w.step();
  check("metal melts to lava under extreme heat", count(w, Mat.Metal) < metal0, `metal ${metal0} -> ${count(w, Mat.Metal)}`);
}

// ---------------------------------------------------------------------------
// Part B — Flammable gas flashback. A spark/flame in a gas-filled chamber should
// ignite the WHOLE connected pocket near-instantly (one flood-fill), then burn
// out and settle.
// ---------------------------------------------------------------------------
{
  w.clear();
  // sealed stone chamber filled with flammable gas
  for (let x = 40; x <= 80; x++) { w.setMat(x, 40, Mat.Stone); w.setMat(x, 60, Mat.Stone); }
  for (let y = 40; y <= 60; y++) { w.setMat(40, y, Mat.Stone); w.setMat(80, y, Mat.Stone); }
  for (let y = 41; y < 60; y++) for (let x = 41; x < 80; x++) w.setMat(x, y, Mat.FlammableGas);
  const gas0 = count(w, Mat.FlammableGas);
  w.setMat(60, 50, Mat.Fire); // ignition source in the middle
  w.chunks.commit();
  let flashed = false;
  for (let s = 0; s < 5; s++) { w.step(); if (count(w, Mat.FlammableGas) < gas0 * 0.2) flashed = true; }
  check("gas flashes back across the whole pocket near-instantly", flashed,
    `gas ${gas0} -> ${count(w, Mat.FlammableGas)} within 5 steps`);
  let settledAt = -1;
  for (let s = 0; s < 2500; s++) { w.step(); if (w.chunks.activeCount() === 0) { settledAt = s; break; } }
  check("gas flash burns out and the chamber goes idle", settledAt >= 0, `settledAt=${settledAt}`);
}

// ---------------------------------------------------------------------------
// Part B — Ice freezes adjacent water (a spreading front) and the pool MUST
// settle to idle afterwards (no freeze<->melt buzzing keeping chunks awake).
// ---------------------------------------------------------------------------
{
  w.clear();
  const fy = w.height - 1;
  // a stone basin so the water is contained and can actually settle
  for (let x = 48; x <= 71; x++) w.setMat(x, fy, Mat.Stone);
  for (let y = fy - 12; y <= fy; y++) { w.setMat(48, y, Mat.Stone); w.setMat(71, y, Mat.Stone); }
  for (let y = fy - 11; y < fy; y++) for (let x = 49; x < 71; x++) w.setMat(x, y, Mat.Water);
  for (let x = 58; x < 63; x++) for (let y = fy - 7; y < fy - 4; y++) w.setMat(x, y, Mat.Ice);
  w.chunks.commit();
  const ice0 = count(w, Mat.Ice);
  for (let s = 0; s < 600; s++) w.step();
  check("ice freezes adjacent water (front grows)", count(w, Mat.Ice) > ice0, `ice ${ice0} -> ${count(w, Mat.Ice)}`);
  let settledAt = -1;
  for (let s = 0; s < 4000; s++) { w.step(); if (w.chunks.activeCount() === 0) { settledAt = s; break; } }
  check("frozen pool settles to idle (no buzzing)", settledAt >= 0, `settledAt=${settledAt}`);
}

// ---------------------------------------------------------------------------
// Part B — Sand fuses to glass on lava contact (the "glass crust" payoff).
// ---------------------------------------------------------------------------
{
  w.clear();
  const gfy = w.height - 1;
  for (let x = 38; x < 62; x++) w.setMat(x, gfy, Mat.Stone);            // floor
  for (let x = 40; x < 60; x++) for (let y = gfy - 8; y < gfy; y++) w.setMat(x, y, Mat.Lava); // resting pool
  for (let x = 46; x < 54; x++) for (let y = gfy - 22; y < gfy - 19; y++) w.setMat(x, y, Mat.Sand); // dropped from above
  w.chunks.commit();
  for (let s = 0; s < 500; s++) w.step();
  check("sand fuses to glass on lava contact", count(w, Mat.Glass) > 0, `glass=${count(w, Mat.Glass)}`);
}

// ---------------------------------------------------------------------------
// Part B — Burnt fuel leaves ash residue.
// ---------------------------------------------------------------------------
{
  w.clear();
  for (let x = 40; x < 60; x++) for (let y = 60; y < 70; y++) w.setMat(x, y, Mat.Wood);
  for (let x = 45; x < 55; x++) w.setMat(x, 59, Mat.Fire);
  w.chunks.commit();
  for (let s = 0; s < 1500; s++) w.step();
  check("burnt fuel leaves some ash", count(w, Mat.Ash) > 0, `ash=${count(w, Mat.Ash)}`);
}

console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
