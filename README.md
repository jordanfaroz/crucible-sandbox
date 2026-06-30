# Crucible — a falling-sand physics world

A Noita-style cellular-automaton sandbox. Every pixel is a simulated particle:
sand piles, water flows and levels, oil floats and ignites, fire races through
fuel, lava hardens water to stone, acid eats through walls, plants grow along
water. Gunpowder chain-explodes, flammable gas flashes back when sparked,
electricity conducts through water and metal (and sets off gas/powder), metal
melts in lava, ice freezes water and melts near heat, and sand fuses to glass on
lava. Built to run at a **locked 60fps with hundreds of thousands of active
cells** and drop to **near-zero cost the instant the world settles**.

## Run it

```bash
npm install
npm run dev        # open http://localhost:5173
```

Build / preview:

```bash
npm run build
npm run preview
```

## Controls

- **Drag** — paint the selected material
- **Right-drag** — erase
- **Alt-click** — eyedropper (pick the material under the cursor)
- **Mouse wheel** — brush size
- Palette to pick materials; **Pause / Step / Clear**, a **Bloom** toggle, and
  preset scenes (**Dam**, **Oil Pit**, **Lava Cave**, **Garden**, **Powder Keg**,
  **Circuit**, **Frost**).

The HUD (bottom-left) shows fps and how many chunks are awake — paint a pile,
let it settle, and watch the awake-chunk count fall to **0**.

## How it works

- **Simulation on the CPU**, rendering on the GPU. Each frame the world's colours
  are written into a flat RGBA `Uint8Array`, uploaded as a `THREE.DataTexture`,
  and drawn on a fullscreen quad with `NearestFilter` (crisp integer upscale).
  An `UnrealBloomPass` with a high threshold makes only emissive materials
  (fire, lava, embers, acid) glow.
- **Typed arrays only** — the grid is parallel flat arrays (`material`, `tint`,
  `extra`, `updatedAt`), never per-cell objects.
- **Correct update step** — bottom-to-top scan, a per-frame stamp guard so no
  cell moves twice, and randomized left/right checks so piles and liquids don't
  drift. (Verified in `test/sim-check.ts`: a single grain never falls more than
  one cell per step, and mass is always conserved.)
- **Chunked dirty-rect / sleeping chunks** (`src/sim/chunks.ts`) — the grid is
  divided into 32×32 tiles. Only awake chunks, and only their dirty rect, are
  processed; a settled chunk sleeps and costs nothing. Activity within one cell
  of a chunk edge wakes the neighbour, so nothing freezes at seams.
- **Materials are data** (`src/sim/materials.ts`) and **interactions are rules**
  (`src/sim/reactions.ts`). Adding a material is a single table entry plus maybe
  one reaction.
- **Heat is contact-based, pushed from the source** — there is deliberately no
  per-cell temperature field. A pull-based field forces an 8-neighbour scan on
  *every* active cell every frame (it ~doubled the worst-case step cost in the
  bench) for no behavioural gain, since every mechanic here is contact-driven.
  Instead the heat sources (fire/lava/ice) push phase changes onto neighbours they
  already scan — so bulk sand/water pay nothing and a settled source pushes
  nothing, keeping the settle-to-zero invariant intact. (`src/sim/explosions.ts`
  and `src/sim/electricity.ts` hold the explosion and charge-propagation logic;
  the charge is a strictly-decreasing TTL carried in a conductor's `extra` byte,
  so a charge wave is guaranteed to sweep once and dissipate.)

## Project layout

```
src/
  config.ts            all tunables (grid size, chunk size, brush, bloom)
  sim/
    World.ts           owns the grid arrays, runs the update step
    chunks.ts          chunked dirty-rect / sleeping-chunk system (perf core)
    behaviors.ts       movement rules per class (powder/liquid/gas/energy)
    reactions.ts       material interaction rules
    materials.ts       data-driven material definitions
    presets.ts         starter scenes
    rng.ts / grid.ts   fast PRNG + index helpers
  render/
    Renderer.ts        Three.js quad, DataTexture upload, bloom
    colors.ts          material -> colour, per-cell jitter, heat gradients
  input/Brush.ts       painting, erase, eyedropper, brush size
  ui/Palette.ts        material picker + controls + HUD
test/
  sim-check.ts         headless correctness checks (no Three.js)
  bench.ts             step-cost benchmark (load vs. idle)
```

## Tests / benchmark

```bash
npx tsx test/sim-check.ts   # 34 correctness checks (teleport, conservation, idle,
                            # reactions, explosions, conduction, freezing, glass)
npx tsx test/bench.ts       # ms/step under heavy churn vs. settled
```

At 800×600 (480k cells): an extreme worst case — the entire top half churning
sand+water at once — runs ~16ms/step; a settled world is 0.00ms/step (0 chunks
awake). Typical localized scenes lock 60fps with large headroom.

## Tuning

Everything lives in `src/config.ts`. Drop `width`/`height` to `400`/`300` for
maximum headroom, or raise them for bigger worlds. `chunkSize`, `simHz`, brush
limits, and the bloom strength/threshold are all there.
