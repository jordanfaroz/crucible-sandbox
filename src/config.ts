// ALL tunables live here. Touch a number, change the world.

export const CONFIG = {
  // ---- Grid ----
  // Start small for fast iteration; scales to 800x600+ (see Phase 6).
  width: 800,
  height: 600,

  // ---- Chunks (the perf core, Phase 5) ----
  chunkSize: 32, // grid is divided into chunkSize x chunkSize tiles

  // ---- Simulation ----
  simHz: 60, // fixed-timestep simulation rate
  maxStepsPerFrame: 4, // clamp to avoid spiral-of-death after a stall

  // ---- Brush ----
  brushRadius: 4, // in cells
  brushMin: 1,
  brushMax: 40,

  // ---- Render ----
  background: 0x05060a,
  bloom: {
    strength: 0.9,
    radius: 0.5,
    threshold: 0.78, // high enough that only emissive materials glow (A1: was 0.7,
    // which caught bright tan sand). Raising it also shrinks the bright-pixel area
    // the bloom pass has to process (A2).
    resolutionScale: 0.5, // render bloom at half-res — bloom cost scales with
    // bright-pixel area, not cell count, so this is the lever if a real GPU dips.
  },
  embers: true, // fire emits short-lived rising sparks
} as const;

export const GRID_W = CONFIG.width;
export const GRID_H = CONFIG.height;
export const CELL_COUNT = GRID_W * GRID_H;
