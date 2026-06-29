// Small index/bounds helpers shared across modules.
import { GRID_W, GRID_H } from "../config";

export const idx = (x: number, y: number): number => y * GRID_W + x;

export const inBounds = (x: number, y: number): boolean =>
  x >= 0 && x < GRID_W && y >= 0 && y < GRID_H;

export { GRID_W, GRID_H };
