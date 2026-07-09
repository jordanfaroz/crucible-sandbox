// A few starter scenes so the rich interactions are visible instantly.
import type { World } from "./World";
import { Mat } from "./materials";
import { GRID_W, GRID_H } from "../config";

function fillRect(w: World, x0: number, y0: number, x1: number, y1: number, mat: Mat): void {
  for (let y = Math.max(0, y0); y <= Math.min(GRID_H - 1, y1); y++)
    for (let x = Math.max(0, x0); x <= Math.min(GRID_W - 1, x1); x++)
      w.setMat(x, y, mat);
}

export type PresetName =
  | "dam" | "oilpit" | "lavacave" | "garden"
  | "powderkeg" | "circuit" | "frost"
  | "aqueduct" | "chainreaction" | "foundry" | "glassworks"
  | "gasleak" | "thaw" | "refinery" | "acidworks";

export function loadPreset(w: World, name: PresetName): void {
  w.clear();
  const W = GRID_W, H = GRID_H;

  switch (name) {
    case "dam": {
      // A reservoir of water held above a wood floor, with fire underneath.
      fillRect(w, 0, H - 12, W - 1, H - 1, Mat.Stone);
      fillRect(w, W >> 1, H - 60, (W >> 1) + 3, H - 12, Mat.Stone); // dam wall
      fillRect(w, 4, H - 58, (W >> 1) - 1, H - 14, Mat.Water);
      fillRect(w, (W >> 1) + 8, H - 16, W - 8, H - 13, Mat.Wood);
      fillRect(w, (W >> 1) + 20, H - 20, (W >> 1) + 26, H - 17, Mat.Fire);
      break;
    }
    case "oilpit": {
      fillRect(w, 0, H - 10, W - 1, H - 1, Mat.Stone);
      fillRect(w, 20, H - 30, W - 20, H - 10, Mat.Water); // water at the bottom
      fillRect(w, 20, H - 54, W - 20, H - 31, Mat.Oil);   // oil floats on top
      // a flame sitting right on the oil surface, so it actually catches and spreads
      fillRect(w, (W >> 1) - 3, H - 57, (W >> 1) + 3, H - 54, Mat.Fire);
      break;
    }
    case "lavacave": {
      fillRect(w, 0, H - 14, W - 1, H - 1, Mat.Stone);
      fillRect(w, 10, H - 40, W - 10, H - 14, Mat.Lava);
      fillRect(w, 0, 0, W - 1, 4, Mat.Stone); // ceiling
      // several water pockets in the ceiling that drip onto the lava -> steam + stone
      for (let x = 60; x < W - 60; x += 150) fillRect(w, x, 5, x + 12, 18, Mat.Water);
      break;
    }
    case "garden": {
      fillRect(w, 0, H - 10, W - 1, H - 1, Mat.Stone);
      fillRect(w, 20, H - 26, W - 20, H - 11, Mat.Water); // pool resting ON the floor (stays put)
      // seedlings along the waterline; they creep along the water into open space
      for (let x = 50; x < W - 50; x += 40) w.setMat(x, H - 27, Mat.Plant);
      break;
    }
    case "powderkeg": {
      // A lit gunpowder fuse races across the floor into a lava-fed sand mound:
      // chain explosion, and the collapsing sand fuses to glass on the lava.
      fillRect(w, 0, H - 10, W - 1, H - 1, Mat.Stone);
      // lava basin on the right
      fillRect(w, W - 220, H - 44, W - 40, H - 11, Mat.Lava);
      fillRect(w, W - 36, H - 60, W - 33, H - 11, Mat.Stone); // right wall
      // sand mound piled over the lava
      fillRect(w, W - 200, H - 78, W - 70, H - 45, Mat.Sand);
      // gunpowder trail along the floor leading to it
      fillRect(w, 24, H - 12, W - 232, H - 11, Mat.Gunpowder);
      // fire fuse at the far-left end
      fillRect(w, 24, H - 13, 28, H - 12, Mat.Fire);
      break;
    }
    case "circuit": {
      // A spark runs down a metal wire and flashes back a sealed gas chamber.
      fillRect(w, 0, H - 10, W - 1, H - 1, Mat.Stone);
      const gx0 = W - 250, gx1 = W - 70, gy0 = H - 170, gy1 = H - 40;
      // stone shell around the gas chamber (leave a small port on the left wall)
      fillRect(w, gx0, gy0, gx1, gy0 + 3, Mat.Stone);      // ceiling
      fillRect(w, gx0, gy1, gx1, gy1 + 3, Mat.Stone);      // floor
      fillRect(w, gx1, gy0, gx1 + 3, gy1, Mat.Stone);      // right wall
      fillRect(w, gx0, gy0, gx0 + 3, gy1 - 24, Mat.Stone); // left wall (gap near bottom)
      fillRect(w, gx0 + 4, gy0 + 4, gx1 - 1, gy1 - 1, Mat.FlammableGas);
      // a short metal wire from the port to a spark (charge reaches within its TTL)
      const wy = gy1 - 12;
      fillRect(w, gx0 - 30, wy, gx0 + 2, wy + 1, Mat.Metal);
      fillRect(w, gx0 - 32, wy, gx0 - 31, wy + 1, Mat.Spark);
      break;
    }
    case "frost": {
      // A pool with an ice shelf dipped into the left and lava into the right: ice
      // freezes the water (a spreading front) while lava flashes it to stone+steam.
      fillRect(w, 0, H - 10, W - 1, H - 1, Mat.Stone);
      const x0 = 60, x1 = W - 60, surf = H - 60;
      fillRect(w, x0 - 4, surf - 20, x0 - 1, H - 11, Mat.Stone); // walls
      fillRect(w, x1 + 1, surf - 20, x1 + 4, H - 11, Mat.Stone);
      fillRect(w, x0, surf, x1, H - 11, Mat.Water);              // the pool
      fillRect(w, x0, surf - 16, x0 + 60, surf + 10, Mat.Ice);   // ice dipping IN the water (left)
      fillRect(w, x1 - 50, surf - 12, x1, surf + 8, Mat.Lava);   // lava dipping IN the water (right)
      break;
    }
    case "aqueduct": {
      // A long stone channel of water; sparks seeded along it send charges racing
      // down the liquid. Demonstrates electricity conducting through water.
      const cy = H >> 1, top = cy - 8, bot = cy + 8;
      fillRect(w, 10, bot, W - 10, bot + 3, Mat.Stone);      // floor
      fillRect(w, 10, top, 13, bot, Mat.Stone);              // left wall
      fillRect(w, W - 13, top, W - 10, bot, Mat.Stone);      // right wall
      fillRect(w, 14, top + 2, W - 14, bot - 1, Mat.Water);  // water channel
      // periodic spark-emitter nodes spaced so pulses race along the whole channel
      for (let x = 40; x < W - 30; x += 42) w.setMat(x, top + 2, Mat.SparkNode);
      break;
    }
    case "chainreaction": {
      // Gunpowder caches linked by a THICK continuous trail; one flame at the left
      // sweeps a cascade of blasts across. (A thin trail gets severed by the first
      // crater — the thick trail always leaves powder at the crater edge to catch.)
      fillRect(w, 0, H - 10, W - 1, H - 1, Mat.Stone);
      const fy = H - 11;
      fillRect(w, 45, fy - 5, W - 50, fy, Mat.Gunpowder);    // thick connecting trail
      for (let cx = 90; cx < W - 60; cx += 120) fillRect(w, cx - 14, fy - 24, cx + 14, fy, Mat.Gunpowder);
      fillRect(w, 45, fy - 6, 50, fy - 1, Mat.Fire);         // ignite the left end
      break;
    }
    case "foundry": {
      // Slim metal ingots suspended in a lava basin melt to molten (the melt front
      // keeps waking the region, so it eats visibly through the thin bars).
      fillRect(w, 0, H - 10, W - 1, H - 1, Mat.Stone);
      const bx0 = 120, bx1 = W - 120;
      fillRect(w, bx0 - 6, H - 62, bx0 - 1, H - 11, Mat.Stone); // basin walls
      fillRect(w, bx1 + 1, H - 62, bx1 + 6, H - 11, Mat.Stone);
      fillRect(w, bx0, H - 46, bx1, H - 11, Mat.Lava);          // lava pool
      for (let mx = bx0 + 40; mx < bx1 - 30; mx += 85) fillRect(w, mx, H - 60, mx + 10, H - 28, Mat.Metal);
      break;
    }
    case "glassworks": {
      // Suspended sand dunes pour down onto a lava floor, forming a glass crust.
      fillRect(w, 0, H - 10, W - 1, H - 1, Mat.Stone);
      fillRect(w, 40, H - 30, W - 40, H - 11, Mat.Lava);       // lava floor
      for (let dx = 90; dx < W - 90; dx += 150) fillRect(w, dx, H - 130, dx + 64, H - 96, Mat.Sand);
      break;
    }
    case "gasleak": {
      // A sealed chamber pooled with gas; a spark fuse crawls in along a wire and,
      // a beat later, flashes the whole pocket. Gas pooling + spark ignition + timing.
      fillRect(w, 0, H - 10, W - 1, H - 1, Mat.Stone);
      const gx0 = W - 260, gx1 = W - 70, gy0 = H - 200, gy1 = H - 24;
      fillRect(w, gx0, gy0, gx1 + 3, gy0 + 3, Mat.Stone);     // ceiling
      fillRect(w, gx0, gy1, gx1 + 3, gy1 + 3, Mat.Stone);     // floor
      fillRect(w, gx1, gy0, gx1 + 3, gy1, Mat.Stone);         // right wall
      fillRect(w, gx0, gy0 + 22, gx0 + 3, gy1, Mat.Stone);    // left wall (gap up top)
      // gas pools filling the upper part of the chamber
      fillRect(w, gx0 + 4, gy0 + 4, gx1 - 1, gy0 + 120, Mat.FlammableGas);
      // short fuse wire whose tip reaches into the gas (within the charge's ~40-cell
      // range); the spark sits ON the wire's outer cell so it actually energises it.
      const wy = gy0 + 12;
      fillRect(w, gx0 - 16, wy, gx0 + 8, wy + 1, Mat.Metal);
      w.setMat(gx0 - 16, wy, Mat.Spark);
      break;
    }
    case "thaw": {
      // A wide ice sheet sitting on a full-width lava bath: the whole underside
      // melts to water and hisses off steam as it chills the lava to stone. (The
      // contact must be wide — a narrow vent just crusts over and stalls.)
      fillRect(w, 0, H - 8, W - 1, H - 1, Mat.Stone);
      const x0 = 130, x1 = W - 130;
      fillRect(w, x0 - 8, H - 130, x0 - 1, H - 9, Mat.Stone); // walls
      fillRect(w, x1 + 1, H - 130, x1 + 8, H - 9, Mat.Stone);
      fillRect(w, x0, H - 44, x1, H - 9, Mat.Lava);           // lava bath (top H-44)
      fillRect(w, x0, H - 120, x1, H - 45, Mat.Ice);          // ice sheet on it (bottom H-45)
      break;
    }
    case "refinery": {
      // Oil floating on water under a wooden deck, lit at one end: fire runs across
      // the oil, climbs into the wood, and leaves ash. Oil float + spread + ash.
      fillRect(w, 0, H - 8, W - 1, H - 1, Mat.Stone);
      const x0 = 120, x1 = W - 120;
      fillRect(w, x0 - 6, H - 96, x0 - 1, H - 9, Mat.Stone);  // basin walls
      fillRect(w, x1 + 1, H - 96, x1 + 6, H - 9, Mat.Stone);
      fillRect(w, x0, H - 40, x1, H - 9, Mat.Water);          // water
      fillRect(w, x0, H - 58, x1, H - 41, Mat.Oil);           // oil on top
      fillRect(w, x0, H - 64, x1, H - 59, Mat.Wood);          // wooden deck on the oil
      fillRect(w, x0 + 8, H - 57, x0 + 16, H - 55, Mat.Fire); // ignite one end
      break;
    }
    case "acidworks": {
      // An acid reservoir eats down through layered stone and sand; the metal floor
      // resists and catches the pool. Acid dissolution across materials.
      fillRect(w, 0, H - 8, W - 1, H - 1, Mat.Stone);
      const x0 = 210, x1 = W - 210;
      fillRect(w, x0, H - 118, x1, H - 100, Mat.Stone);       // stone stratum
      fillRect(w, x0, H - 100, x1, H - 82, Mat.Sand);         // sand stratum
      fillRect(w, x0, H - 82, x1, H - 66, Mat.Stone);         // stone stratum
      fillRect(w, x0, H - 66, x1, H - 50, Mat.Metal);         // metal floor (resists)
      fillRect(w, x0 - 6, H - 172, x0 - 1, H - 118, Mat.Stone); // reservoir walls
      fillRect(w, x1 + 1, H - 172, x1 + 6, H - 118, Mat.Stone);
      fillRect(w, x0, H - 168, x1, H - 119, Mat.Acid);        // acid reservoir
      break;
    }
  }
}
