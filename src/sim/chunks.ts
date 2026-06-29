// Chunked dirty-rect / sleeping-chunk system — the performance core (Phase 5).
//
// The grid is divided into chunkSize x chunkSize tiles. Each frame we only
// process chunks that are AWAKE, and within them only the dirty rectangle of
// cells that actually changed. A settled chunk goes to sleep and costs nothing.
//
// Double-buffered: we read this frame's dirty rects (`cur*`) while accumulating
// next frame's (`next*`). markDirty() expands the 3x3 region around a changed
// cell, which naturally wakes neighbouring chunks across a border (the critical
// boundary wake-up that stops particles freezing at chunk seams).

export class Chunks {
  readonly cols: number;
  readonly rows: number;
  readonly count: number;
  readonly size: number;
  private readonly w: number;
  private readonly h: number;

  // Per-chunk dirty rect for THIS frame (the region to process). Inactive when
  // curActive[c] === 0.
  private curActive: Uint8Array;
  private curMinX: Int32Array;
  private curMinY: Int32Array;
  private curMaxX: Int32Array;
  private curMaxY: Int32Array;

  // Per-chunk dirty rect being accumulated for NEXT frame.
  private nextActive: Uint8Array;
  private nextMinX: Int32Array;
  private nextMinY: Int32Array;
  private nextMaxX: Int32Array;
  private nextMaxY: Int32Array;

  constructor(width: number, height: number, chunkSize: number) {
    this.w = width;
    this.h = height;
    this.size = chunkSize;
    this.cols = Math.ceil(width / chunkSize);
    this.rows = Math.ceil(height / chunkSize);
    this.count = this.cols * this.rows;

    this.curActive = new Uint8Array(this.count);
    this.curMinX = new Int32Array(this.count);
    this.curMinY = new Int32Array(this.count);
    this.curMaxX = new Int32Array(this.count);
    this.curMaxY = new Int32Array(this.count);

    this.nextActive = new Uint8Array(this.count);
    this.nextMinX = new Int32Array(this.count);
    this.nextMinY = new Int32Array(this.count);
    this.nextMaxX = new Int32Array(this.count);
    this.nextMaxY = new Int32Array(this.count);
    this.resetNext();
  }

  private resetNext(): void {
    this.nextActive.fill(0);
    this.nextMinX.fill(this.w);
    this.nextMinY.fill(this.h);
    this.nextMaxX.fill(-1);
    this.nextMaxY.fill(-1);
  }

  /** Wake the chunk(s) overlapping the 3x3 neighbourhood of cell (x,y). */
  markDirty(x: number, y: number): void {
    const x0 = x > 0 ? x - 1 : 0;
    const y0 = y > 0 ? y - 1 : 0;
    const x1 = x < this.w - 1 ? x + 1 : this.w - 1;
    const y1 = y < this.h - 1 ? y + 1 : this.h - 1;
    const s = this.size;
    const cx0 = (x0 / s) | 0, cx1 = (x1 / s) | 0;
    const cy0 = (y0 / s) | 0, cy1 = (y1 / s) | 0;
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const c = cy * this.cols + cx;
        this.nextActive[c] = 1;
        // expand this chunk's next rect to include the overlap with [x0..x1]x[y0..y1]
        const lx0 = cx * s, ly0 = cy * s;
        const rx0 = x0 > lx0 ? x0 : lx0;
        const ry0 = y0 > ly0 ? y0 : ly0;
        const rx1 = x1 < lx0 + s - 1 ? x1 : lx0 + s - 1;
        const ry1 = y1 < ly0 + s - 1 ? y1 : ly0 + s - 1;
        if (rx0 < this.nextMinX[c]) this.nextMinX[c] = rx0;
        if (ry0 < this.nextMinY[c]) this.nextMinY[c] = ry0;
        if (rx1 > this.nextMaxX[c]) this.nextMaxX[c] = rx1;
        if (ry1 > this.nextMaxY[c]) this.nextMaxY[c] = ry1;
      }
    }
  }

  /** Like markDirty but expands THIS frame's rects too — used when painting so
   *  freshly placed cells are processed on the very next step (even from pause). */
  markDirtyNow(x: number, y: number): void {
    const x0 = x > 0 ? x - 1 : 0;
    const y0 = y > 0 ? y - 1 : 0;
    const x1 = x < this.w - 1 ? x + 1 : this.w - 1;
    const y1 = y < this.h - 1 ? y + 1 : this.h - 1;
    const s = this.size;
    const cx0 = (x0 / s) | 0, cx1 = (x1 / s) | 0;
    const cy0 = (y0 / s) | 0, cy1 = (y1 / s) | 0;
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const c = cy * this.cols + cx;
        this.curActive[c] = 1;
        const lx0 = cx * s, ly0 = cy * s;
        const rx0 = x0 > lx0 ? x0 : lx0;
        const ry0 = y0 > ly0 ? y0 : ly0;
        const rx1 = x1 < lx0 + s - 1 ? x1 : lx0 + s - 1;
        const ry1 = y1 < ly0 + s - 1 ? y1 : ly0 + s - 1;
        if (rx0 < this.curMinX[c]) this.curMinX[c] = rx0;
        if (ry0 < this.curMinY[c]) this.curMinY[c] = ry0;
        if (rx1 > this.curMaxX[c]) this.curMaxX[c] = rx1;
        if (ry1 > this.curMaxY[c]) this.curMaxY[c] = ry1;
      }
    }
  }

  /** Promote accumulated `next*` rects to `cur*` and clear `next*`. */
  commit(): void {
    // swap cur <-> next buffers
    let t: Uint8Array | Int32Array;
    t = this.curActive; this.curActive = this.nextActive; this.nextActive = t as Uint8Array;
    t = this.curMinX; this.curMinX = this.nextMinX; this.nextMinX = t as Int32Array;
    t = this.curMinY; this.curMinY = this.nextMinY; this.nextMinY = t as Int32Array;
    t = this.curMaxX; this.curMaxX = this.nextMaxX; this.nextMaxX = t as Int32Array;
    t = this.curMaxY; this.curMaxY = this.nextMaxY; this.nextMaxY = t as Int32Array;
    this.resetNext();
  }

  isActive(c: number): boolean {
    return this.curActive[c] === 1;
  }

  // Accessors for the current dirty rect of chunk c.
  cMinX(c: number) { return this.curMinX[c]; }
  cMinY(c: number) { return this.curMinY[c]; }
  cMaxX(c: number) { return this.curMaxX[c]; }
  cMaxY(c: number) { return this.curMaxY[c]; }

  /** Count of awake chunks this frame (for HUD/profiling). */
  activeCount(): number {
    let n = 0;
    for (let i = 0; i < this.count; i++) if (this.curActive[i]) n++;
    return n;
  }

  /** Wake every chunk fully (used on clear / first frame / global ops). */
  wakeAll(): void {
    for (let cy = 0; cy < this.rows; cy++) {
      for (let cx = 0; cx < this.cols; cx++) {
        const c = cy * this.cols + cx;
        this.nextActive[c] = 1;
        this.nextMinX[c] = cx * this.size;
        this.nextMinY[c] = cy * this.size;
        this.nextMaxX[c] = Math.min(cx * this.size + this.size - 1, this.w - 1);
        this.nextMaxY[c] = Math.min(cy * this.size + this.size - 1, this.h - 1);
      }
    }
  }
}
