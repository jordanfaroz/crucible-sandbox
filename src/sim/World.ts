import { GRID_W, GRID_H, CELL_COUNT, CONFIG } from "../config";
import { Chunks } from "./chunks";
import { Mat, Class, MAT } from "./materials";
import { randInt, randRange } from "./rng";
import { behave } from "./behaviors";
import { applyReactions } from "./reactions";

export class World {
  readonly width = GRID_W;
  readonly height = GRID_H;

  // Parallel flat arrays — never per-cell objects.
  readonly material = new Uint8Array(CELL_COUNT); // 0 = Air
  readonly tint = new Uint8Array(CELL_COUNT); // per-cell colour jitter seed
  readonly extra = new Uint8Array(CELL_COUNT); // scratch: lifetime, or charge on conductors
  readonly updatedAt = new Uint32Array(CELL_COUNT); // frame-stamp guard

  readonly chunks = new Chunks(GRID_W, GRID_H, CONFIG.chunkSize);

  frame = 1;

  idx(x: number, y: number): number {
    return y * GRID_W + x;
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < GRID_W && y >= 0 && y < GRID_H;
  }

  /** Material at (x,y), or -1 if out of bounds. */
  matAt(x: number, y: number): number {
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return -1;
    return this.material[y * GRID_W + x];
  }

  isAir(x: number, y: number): boolean {
    return this.matAt(x, y) === Mat.Air;
  }

  /** Random lifetime for transient materials, else 0. */
  spawnLife(mat: number): number {
    const d = MAT(mat);
    return d.lifeMax > 0 ? randRange(d.lifeMin, d.lifeMax) : 0;
  }

  /** Set a cell with fresh per-cell state, stamp it, and wake its chunk. */
  setMat(x: number, y: number, mat: number): void {
    const i = y * GRID_W + x;
    this.material[i] = mat;
    this.tint[i] = randInt(256);
    this.extra[i] = this.spawnLife(mat);
    this.updatedAt[i] = this.frame;
    this.chunks.markDirty(x, y);
  }

  /** Paint from the brush — wakes both current and next frame so it reacts immediately. */
  paint(x: number, y: number, mat: number): void {
    const i = y * GRID_W + x;
    this.material[i] = mat;
    this.tint[i] = randInt(256);
    this.extra[i] = this.spawnLife(mat);
    this.chunks.markDirty(x, y);
    this.chunks.markDirtyNow(x, y);
  }

  /** Can a cell of `srcDensity` fall/move into (tx,ty)? Air, or a lighter liquid/gas. */
  canFallInto(srcDensity: number, tx: number, ty: number): boolean {
    if (tx < 0 || tx >= GRID_W || ty < 0 || ty >= GRID_H) return false;
    const dm = this.material[ty * GRID_W + tx];
    if (dm === Mat.Air) return true;
    const d = MAT(dm);
    return (d.cls === Class.Liquid || d.cls === Class.Gas) && d.density < srcDensity;
  }

  /** Move src→dst when dst is air; otherwise swap the two cells. Stamps + wakes. */
  moveOrSwap(xi: number, yi: number, xj: number, yj: number): void {
    const i = yi * GRID_W + xi;
    const j = yj * GRID_W + xj;
    if (this.material[j] === Mat.Air) {
      this.material[j] = this.material[i];
      this.tint[j] = this.tint[i];
      this.extra[j] = this.extra[i];
      this.material[i] = Mat.Air;
      this.extra[i] = 0;
    } else {
      const m = this.material[i], t = this.tint[i], e = this.extra[i];
      this.material[i] = this.material[j];
      this.tint[i] = this.tint[j];
      this.extra[i] = this.extra[j];
      this.material[j] = m;
      this.tint[j] = t;
      this.extra[j] = e;
    }
    this.updatedAt[j] = this.frame;
    this.updatedAt[i] = this.frame;
    this.chunks.markDirty(xi, yi);
    this.chunks.markDirty(xj, yj);
  }

  /** Stamp a cell as handled this frame and wake its chunk. */
  touch(x: number, y: number): void {
    this.updatedAt[y * GRID_W + x] = this.frame;
    this.chunks.markDirty(x, y);
  }

  /** Wipe the world. Resets EVERY parallel array (not just material) and returns
   *  the chunk system to a clean fully-asleep state — so no stale tint, lifetime,
   *  frame-stamp, or dirty-rect can leak across a clear / preset load (A3). */
  clear(): void {
    this.material.fill(Mat.Air);
    this.tint.fill(0);
    this.extra.fill(0);
    this.updatedAt.fill(0);
    this.chunks.reset();
  }

  /** One fixed simulation step. */
  step(): void {
    const frame = ++this.frame;
    const ch = this.chunks;
    const cols = ch.cols, rows = ch.rows;

    // Walk chunk-rows bottom-to-top so falling matter lands into already-processed
    // cells (correct ordering). The frame-stamp guard handles any cross-chunk
    // and gas-rising cases regardless of order.
    for (let cy = rows - 1; cy >= 0; cy--) {
      for (let cx = 0; cx < cols; cx++) {
        const c = cy * cols + cx;
        if (!ch.isActive(c)) continue;
        const minX = ch.cMinX(c), maxX = ch.cMaxX(c);
        const minY = ch.cMinY(c), maxY = ch.cMaxY(c);
        if (maxX < minX || maxY < minY) continue;
        for (let y = maxY; y >= minY; y--) {
          // Alternate horizontal scan direction to debias left/right flow.
          if (((frame + y) & 1) === 0) {
            for (let x = minX; x <= maxX; x++) this.processCell(x, y, frame);
          } else {
            for (let x = maxX; x >= minX; x--) this.processCell(x, y, frame);
          }
        }
      }
    }

    ch.commit();
  }

  private processCell(x: number, y: number, frame: number): void {
    const i = y * GRID_W + x;
    if (this.updatedAt[i] === frame) return; // already moved into this frame
    const mat = this.material[i];
    if (mat === Mat.Air) return;

    // Reactions can transform the cell; if so it's already stamped — skip movement.
    if (applyReactions(this, x, y, i)) return;

    behave(this, x, y, MAT(this.material[i]).cls);
  }
}
