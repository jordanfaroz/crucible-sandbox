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

  // ---- Heat-driven phase changes (Part B) ----
  // We deliberately do NOT keep a per-cell temperature field. A pull-based field
  // forces an 8-neighbour scan on EVERY active cell every frame — it ~doubled the
  // worst-case step cost in the bench (15->26ms) for no behavioural gain, since
  // every mechanic here is contact-driven. Instead the heat SOURCES (fire/lava/ice)
  // push phase changes onto neighbours they already scan, so bulk sand/water pay
  // nothing and a settled/asleep source pushes nothing (settle-to-zero preserved).
  phase: {
    sandToGlass: 0.06, // chance/frame a sand cell touching lava fuses to glass
    metalMelt: 0.12, // chance/frame a metal cell touching lava melts to lava
    iceMelt: 0.12, // chance/frame an ice cell touching fire/lava melts to water
    waterFreeze: 0.10, // chance/frame a water cell touching ice freezes (slow front)
  },

  // ---- Explosions (Part B: gunpowder) ----
  explosionRadius: 7, // cells

  // ---- Electricity (Part B: spark) ----
  sparkCharge: 40, // charge TTL: a charge wave travels ~this many cells then dies
  sparkEmitPeriod: 55, // frames between pulses from a periodic spark-emitter node
} as const;

export const GRID_W = CONFIG.width;
export const GRID_H = CONFIG.height;
export const CELL_COUNT = GRID_W * GRID_H;
