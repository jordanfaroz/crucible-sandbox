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
  | "powderkeg" | "circuit" | "frost";

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
  }
}
