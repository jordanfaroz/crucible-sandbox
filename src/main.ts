import { CONFIG } from "./config";
import { World } from "./sim/World";
import { Renderer } from "./render/Renderer";
import { Brush } from "./input/Brush";
import { Palette, type UIController } from "./ui/Palette";
import { loadPreset, type PresetName } from "./sim/presets";
import { seed } from "./sim/rng";

seed((Date.now() & 0xffffffff) >>> 0);

const app = document.getElementById("app")!;
const world = new World();
const renderer = new Renderer(app);
const brush = new Brush(world, renderer);
brush.attach(renderer.canvas);

let paused = false;
let pendingSteps = 0;

const controller: UIController = {
  isPaused: () => paused,
  togglePause: () => { paused = !paused; },
  step: () => { pendingSteps++; },
  clear: () => world.clear(),
  setBloom: (on) => renderer.setBloom(on),
  loadPreset: (name: PresetName) => loadPreset(world, name),
};

const palette = new Palette(brush, controller);

// Show something rich on first load.
loadPreset(world, "dam");

// ---- Fixed-timestep loop, render decoupled ----
const stepMs = 1000 / CONFIG.simHz;
let acc = 0;
let last = performance.now();

// fps smoothing + HUD throttle
let fps = 60;
let hudTimer = 0;

function frame(now: number): void {
  const dt = now - last;
  last = now;
  fps += ((1000 / Math.max(dt, 1)) - fps) * 0.1;

  if (paused) {
    // honour single-step requests even while paused
    while (pendingSteps > 0) { world.step(); pendingSteps--; }
    acc = 0;
  } else {
    acc += dt;
    let steps = 0;
    while (acc >= stepMs && steps < CONFIG.maxStepsPerFrame) {
      world.step();
      acc -= stepMs;
      steps++;
    }
    if (steps === CONFIG.maxStepsPerFrame) acc = 0; // shed backlog
  }

  renderer.render(world);

  hudTimer += dt;
  if (hudTimer >= 250) {
    hudTimer = 0;
    const active = world.chunks.activeCount();
    const sz = CONFIG.chunkSize;
    palette.setStats(fps, active, world.chunks.count, active * sz * sz);
  }

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
