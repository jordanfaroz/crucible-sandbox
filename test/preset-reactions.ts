// Verifies that each preset actually PRODUCES ITS INTENDED REACTION — not merely
// that it runs without error (which is what let broken scenes slip through before).
// For each preset we load it, simulate, and assert on the material transformation.
import { World } from "../src/sim/World";
import { Mat } from "../src/sim/materials";
import { seed } from "../src/sim/rng";
import { loadPreset, type PresetName } from "../src/sim/presets";

let failures = 0;
function check(name: string, cond: boolean, detail = ""): void {
  console.log(`[${cond ? "PASS" : "FAIL"}] ${name}${detail ? "  — " + detail : ""}`);
  if (!cond) failures++;
}

const w = new World();

interface Sample {
  c0: number[];
  c1: number[];
  peakFire: number;
  peakSteam: number;
  peakGlass: number;
  peakAsh: number;
  peakCharged: number;
}

function tally(): number[] {
  const c = new Array(22).fill(0);
  for (let i = 0; i < w.material.length; i++) c[w.material[i]]++;
  return c;
}
function chargedWater(): number {
  let n = 0;
  for (let i = 0; i < w.material.length; i++) if (w.material[i] === Mat.Water && w.extra[i] > 0) n++;
  return n;
}

function run(name: PresetName, steps: number): Sample {
  seed(20260702); // deterministic
  loadPreset(w, name);
  w.chunks.commit();
  const c0 = tally();
  let peakFire = 0, peakSteam = 0, peakGlass = 0, peakAsh = 0, peakCharged = 0;
  for (let s = 0; s < steps; s++) {
    w.step();
    const c = tally();
    if (c[Mat.Fire] > peakFire) peakFire = c[Mat.Fire];
    if (c[Mat.Steam] > peakSteam) peakSteam = c[Mat.Steam];
    if (c[Mat.Glass] > peakGlass) peakGlass = c[Mat.Glass];
    if (c[Mat.Ash] > peakAsh) peakAsh = c[Mat.Ash];
    const cw = chargedWater();
    if (cw > peakCharged) peakCharged = cw;
  }
  return { c0, c1: tally(), peakFire, peakSteam, peakGlass, peakAsh, peakCharged };
}

const S = 2500;

{
  const r = run("dam", S);
  check("dam: fire burns the wood to ash", r.peakAsh > 50 || r.c1[Mat.Ash] > 50, `ash peak=${r.peakAsh}`);
}
{
  const r = run("oilpit", S);
  check("oilpit: fire ignites and spreads across the oil", r.peakFire > 300, `peakFire=${r.peakFire}`);
}
{
  const r = run("lavacave", S);
  check("lavacave: dripping water makes steam + stone", r.peakSteam > 20 && r.c1[Mat.Stone] > r.c0[Mat.Stone],
    `steam=${r.peakSteam} stone ${r.c0[Mat.Stone]}->${r.c1[Mat.Stone]}`);
}
{
  const r = run("garden", S);
  check("garden: plants grow along the water", r.c1[Mat.Plant] > r.c0[Mat.Plant] + 20,
    `plant ${r.c0[Mat.Plant]}->${r.c1[Mat.Plant]}`);
}
{
  const r = run("powderkeg", S);
  check("powderkeg: gunpowder detonates and sand fuses to glass",
    r.peakGlass > 200 && r.c1[Mat.Gunpowder] < r.c0[Mat.Gunpowder] * 0.3,
    `glass=${r.peakGlass} gunpowder ${r.c0[Mat.Gunpowder]}->${r.c1[Mat.Gunpowder]}`);
}
{
  const r = run("circuit", S);
  check("circuit: spark flashes back the gas chamber", r.peakFire > 2000, `peakFire=${r.peakFire}`);
}
{
  const r = run("frost", S);
  check("frost: ice freezes water (front grows) and lava steams it",
    r.c1[Mat.Ice] > r.c0[Mat.Ice] && r.peakSteam > 10,
    `ice ${r.c0[Mat.Ice]}->${r.c1[Mat.Ice]} steam=${r.peakSteam}`);
}
{
  const r = run("aqueduct", S);
  check("aqueduct: charge conducts through the water", r.peakCharged > 500, `peakCharged=${r.peakCharged}`);
}
{
  const r = run("chainreaction", S);
  check("chainreaction: the chain sweeps most of the gunpowder",
    r.c1[Mat.Gunpowder] < r.c0[Mat.Gunpowder] * 0.4 && r.peakFire > 300,
    `gunpowder ${r.c0[Mat.Gunpowder]}->${r.c1[Mat.Gunpowder]} peakFire=${r.peakFire}`);
}
{
  const r = run("foundry", S);
  check("foundry: metal visibly melts in the lava", r.c1[Mat.Metal] < r.c0[Mat.Metal] * 0.7,
    `metal ${r.c0[Mat.Metal]}->${r.c1[Mat.Metal]}`);
}
{
  const r = run("glassworks", S);
  check("glassworks: sand fuses to a glass crust", r.peakGlass > 500, `glass=${r.peakGlass}`);
}
{
  const r = run("gasleak", S);
  check("gasleak: the fuse charge flashes the gas pocket", r.peakFire > 1000, `peakFire=${r.peakFire}`);
}
{
  const r = run("thaw", S);
  check("thaw: lava melts the ice (ice shrinks, steam rises)",
    r.c1[Mat.Ice] < r.c0[Mat.Ice] - 100 && r.peakSteam > 10,
    `ice ${r.c0[Mat.Ice]}->${r.c1[Mat.Ice]} steam=${r.peakSteam}`);
}
{
  const r = run("refinery", S);
  check("refinery: oil burns off and leaves ash",
    r.c1[Mat.Oil] < r.c0[Mat.Oil] * 0.3 && (r.peakAsh > 200 || r.c1[Mat.Ash] > 200),
    `oil ${r.c0[Mat.Oil]}->${r.c1[Mat.Oil]} ash=${r.peakAsh}`);
}
{
  const r = run("acidworks", S);
  const solid0 = r.c0[Mat.Stone] + r.c0[Mat.Sand];
  const solid1 = r.c1[Mat.Stone] + r.c1[Mat.Sand];
  check("acidworks: acid eats through the stone & sand strata", solid1 < solid0 * 0.5,
    `stone+sand ${solid0}->${solid1}`);
}

console.log(failures === 0 ? "\nALL PRESET REACTIONS FIRE" : `\n${failures} PRESET(S) NOT REACTING`);
process.exit(failures === 0 ? 0 : 1);
