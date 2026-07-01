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
      fillRect(w, 20, H - 45, W - 20, H - 10, Mat.Oil);
      fillRect(w, 20, H - 55, W - 20, H - 46, Mat.Water);
      fillRect(w, W >> 1, 6, (W >> 1) + 2, 12, Mat.Fire);
      break;
    }
    case "lavacave": {
      fillRect(w, 0, H - 14, W - 1, H - 1, Mat.Stone);
      fillRect(w, 10, H - 40, W - 10, H - 14, Mat.Lava);
      // dripping water from the ceiling
      fillRect(w, 30, 6, 34, 10, Mat.Water);
      fillRect(w, W - 50, 6, W - 46, 10, Mat.Water);
      fillRect(w, 0, 0, W - 1, 3, Mat.Stone);
      break;
    }
    case "garden": {
      fillRect(w, 0, H - 10, W - 1, H - 1, Mat.Stone);
      fillRect(w, 30, H - 30, W - 30, H - 24, Mat.Water);
      for (let x = 40; x < W - 40; x += 18) fillRect(w, x, H - 31, x, H - 31, Mat.Plant);
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
      // Ice freezes a contained pool from one side while lava melts it from the
      // other (ice -> water -> steam): the temperature mechanics, both directions.
      fillRect(w, 0, H - 10, W - 1, H - 1, Mat.Stone);
      const x0 = 60, x1 = W - 60, top = H - 90;
      fillRect(w, x0 - 4, top, x0 - 1, H - 11, Mat.Stone); // left wall
      fillRect(w, x1 + 1, top, x1 + 4, H - 11, Mat.Stone); // right wall
      fillRect(w, x0, top + 30, x1, H - 11, Mat.Water);    // the pool
      fillRect(w, x0, top, x0 + 40, top + 24, Mat.Ice);    // ice shelf on the left
      fillRect(w, x1 - 30, top + 6, x1, top + 20, Mat.Lava); // lava on the right
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
      // spark emitters just above the surface (each charge sweeps ~40 cells)
      for (let x = 45; x < W - 40; x += 55) w.setMat(x, top + 1, Mat.Spark);
      break;
    }
    case "chainreaction": {
      // Gunpowder caches linked by a thin trail; one flame at the left end sends a
      // cascade of blasts sweeping across. Demonstrates gunpowder chaining.
      fillRect(w, 0, H - 10, W - 1, H - 1, Mat.Stone);
      const fy = H - 11;
      for (let cx = 70; cx < W - 50; cx += 120) fillRect(w, cx - 12, fy - 18, cx + 12, fy, Mat.Gunpowder);
      fillRect(w, 45, fy, W - 50, fy, Mat.Gunpowder);        // connecting trail
      fillRect(w, 45, fy - 1, 49, fy, Mat.Fire);             // ignite the left end
      break;
    }
    case "foundry": {
      // Metal ingots resting in a lava basin slowly melt to molten.
      fillRect(w, 0, H - 10, W - 1, H - 1, Mat.Stone);
      const bx0 = 120, bx1 = W - 120;
      fillRect(w, bx0 - 6, H - 62, bx0 - 1, H - 11, Mat.Stone); // basin walls
      fillRect(w, bx1 + 1, H - 62, bx1 + 6, H - 11, Mat.Stone);
      fillRect(w, bx0, H - 46, bx1, H - 11, Mat.Lava);          // lava pool
      for (let mx = bx0 + 30; mx < bx1 - 26; mx += 95) fillRect(w, mx, H - 58, mx + 26, H - 30, Mat.Metal);
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
      // A sealed chamber pooled with gas; a spark fuse crawls in and — a beat
      // later — flashes the whole pocket. Gas pooling + spark ignition + timing.
      fillRect(w, 0, H - 10, W - 1, H - 1, Mat.Stone);
      const gx0 = W - 240, gx1 = W - 70, gy0 = H - 190, gy1 = H - 20;
      fillRect(w, gx0, gy0, gx1 + 3, gy0 + 3, Mat.Stone);     // ceiling
      fillRect(w, gx0, gy1, gx1 + 3, gy1 + 3, Mat.Stone);     // floor
      fillRect(w, gx1, gy0, gx1 + 3, gy1, Mat.Stone);         // right wall
      fillRect(w, gx0, gy0 + 24, gx0 + 3, gy1, Mat.Stone);    // left wall (gap up top)
      // gas pools in the upper half of the chamber
      fillRect(w, gx0 + 4, gy0 + 4, gx1 - 1, gy0 + 95, Mat.FlammableGas);
      // short fuse wire into the gas through the top-left gap (within charge range)
      const wy = gy0 + 12;
      fillRect(w, gx0 - 30, wy, gx0 + 6, wy + 1, Mat.Metal);
      w.setMat(gx0 - 32, wy, Mat.Spark);
      break;
    }
    case "thaw": {
      // A cavern of ice with a lava vent below: ice melts, water flows and pools,
      // and refreezes against the cold walls. Reversible phase change + hysteresis.
      fillRect(w, 0, H - 8, W - 1, H - 1, Mat.Stone);
      const x0 = 110, x1 = W - 110;
      fillRect(w, x0 - 8, H - 210, x0 - 1, H - 9, Mat.Stone); // cold walls
      fillRect(w, x1 + 1, H - 210, x1 + 8, H - 9, Mat.Stone);
      fillRect(w, x0, H - 200, x1, H - 44, Mat.Ice);          // ice body
      fillRect(w, (W >> 1) - 34, H - 40, (W >> 1) + 34, H - 9, Mat.Lava); // vent
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
