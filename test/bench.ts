// Perf benchmark: measures simulation step cost under load and when settled.
import { World } from "../src/sim/World";
import { Mat } from "../src/sim/materials";
import { seed } from "../src/sim/rng";

seed(7);
const w = new World();
console.log(`grid ${w.width}x${w.height} = ${(w.width * w.height).toLocaleString()} cells`);

function time(label: string, steps: number, fn: () => void): void {
  fn();
  // warm
  for (let i = 0; i < 10; i++) w.step();
  const t0 = performance.now();
  for (let i = 0; i < steps; i++) w.step();
  const t1 = performance.now();
  const per = (t1 - t0) / steps;
  console.log(`${label}: ${per.toFixed(2)} ms/step  (${(1000 / per).toFixed(0)} steps/s budget, ${w.chunks.activeCount()} chunks awake)`);
}

// Worst case: a huge falling/churning mass of sand + water (lots of active chunks).
time("heavy churn (sand+water, lots moving)", 120, () => {
  w.clear();
  for (let y = 0; y < (w.height >> 1); y++)
    for (let x = 0; x < w.width; x++)
      w.setMat(x, y, (x + y) & 1 ? Mat.Sand : Mat.Water);
  w.chunks.commit();
});

// Let it settle, then measure idle cost (the whole point of chunking).
for (let i = 0; i < 4000; i++) { w.step(); if (w.chunks.activeCount() === 0) break; }
time("settled / idle", 240, () => {});

console.log(`idle awake chunks = ${w.chunks.activeCount()} (should be 0)`);
