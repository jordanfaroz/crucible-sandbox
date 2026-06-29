import type { World } from "../sim/World";
import type { Renderer } from "../render/Renderer";
import { CONFIG } from "../config";
import { Mat, MAT, Class } from "../sim/materials";
import { chance } from "../sim/rng";

export class Brush {
  radius: number = CONFIG.brushRadius;
  material: Mat = Mat.Sand;
  onPick: (m: Mat) => void = () => {};

  private down = false;
  private erase = false;
  private lastX = -1;
  private lastY = -1;

  constructor(private world: World, private renderer: Renderer) {}

  attach(canvas: HTMLCanvasElement): void {
    canvas.addEventListener("pointerdown", (e) => this.onDown(e));
    canvas.addEventListener("pointermove", (e) => this.onMove(e));
    window.addEventListener("pointerup", () => this.onUp());
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const step = e.deltaY > 0 ? -1 : 1;
      this.setRadius(this.radius + step);
    }, { passive: false });
  }

  setRadius(r: number): void {
    this.radius = Math.max(CONFIG.brushMin, Math.min(CONFIG.brushMax, r));
  }

  private onDown(e: PointerEvent): void {
    const g = this.renderer.screenToGrid(e.clientX, e.clientY);
    if (!g) return;
    // Alt = eyedropper, right button = erase.
    if (e.altKey) {
      const m = this.world.matAt(g.x, g.y);
      if (m > 0) { this.material = m; this.onPick(m); }
      return;
    }
    this.down = true;
    this.erase = e.button === 2;
    this.lastX = g.x; this.lastY = g.y;
    this.stamp(g.x, g.y);
  }

  private onMove(e: PointerEvent): void {
    if (!this.down) return;
    const g = this.renderer.screenToGrid(e.clientX, e.clientY);
    if (!g) return;
    this.line(this.lastX, this.lastY, g.x, g.y);
    this.lastX = g.x; this.lastY = g.y;
  }

  private onUp(): void {
    this.down = false;
  }

  /** Bresenham-ish line of stamps so fast drags don't leave gaps. */
  private line(x0: number, y0: number, x1: number, y1: number): void {
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy, x = x0, y = y0;
    for (;;) {
      this.stamp(x, y);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }

  private stamp(cx: number, cy: number): void {
    const r = this.radius;
    const r2 = r * r;
    const mat = this.erase ? Mat.Air : this.material;
    const sparse = !this.erase &&
      (MAT(mat).cls === Class.Gas || MAT(mat).cls === Class.Energy);
    const w = this.world;
    for (let dy = -r; dy <= r; dy++) {
      const yy = cy + dy;
      if (yy < 0 || yy >= w.height) continue;
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r2) continue;
        const xx = cx + dx;
        if (xx < 0 || xx >= w.width) continue;
        if (sparse && !chance(0.4)) continue;
        // Don't overwrite solids when sprinkling gas/fire (feels better).
        if (sparse && w.matAt(xx, yy) !== Mat.Air) continue;
        w.paint(xx, yy, mat);
      }
    }
  }
}
