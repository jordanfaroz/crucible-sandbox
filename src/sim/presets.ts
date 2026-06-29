// A few starter scenes so the rich interactions are visible instantly.
import type { World } from "./World";
import { Mat } from "./materials";
import { GRID_W, GRID_H } from "../config";

function fillRect(w: World, x0: number, y0: number, x1: number, y1: number, mat: Mat): void {
  for (let y = Math.max(0, y0); y <= Math.min(GRID_H - 1, y1); y++)
    for (let x = Math.max(0, x0); x <= Math.min(GRID_W - 1, x1); x++)
      w.setMat(x, y, mat);
}

export type PresetName = "dam" | "oilpit" | "lavacave" | "garden";

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
  }
}
