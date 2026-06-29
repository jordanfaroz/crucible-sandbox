// Material -> pixel colour, with per-cell jitter (cheap texture so bodies aren't
// flat) and heat/age gradients for emissive materials (fire, lava, embers).
import { MATERIALS, Mat } from "../sim/materials";

const N = MATERIALS.length;
const baseR = new Float32Array(N);
const baseG = new Float32Array(N);
const baseB = new Float32Array(N);
const jit = new Float32Array(N);

for (let id = 0; id < N; id++) {
  const m = MATERIALS[id];
  if (!m) continue;
  baseR[id] = m.color[0];
  baseG[id] = m.color[1];
  baseB[id] = m.color[2];
  jit[id] = m.jitter;
}

const clamp255 = (v: number) => (v > 255 ? 255 : v < 0 ? 0 : v);

/** Write one cell's RGBA into the framebuffer at byte offset p. */
export function writeColor(
  out: Uint8Array, p: number, mat: number, tint: number, extra: number, frame: number,
): void {
  let r: number, g: number, b: number;

  switch (mat) {
    case Mat.Spark: {
      // brilliant electric blue-white with a fast flicker — blooms hard
      const fl = ((tint + frame) & 15) * 3;
      r = clamp255(170 + fl); g = 235; b = 255;
      break;
    }
    case Mat.FlammableGas: {
      // dim, slightly translucent green haze (kept under the bloom threshold)
      const f = 0.7 + (tint / 255) * 0.3;
      r = clamp255(90 * f); g = clamp255(160 * f); b = clamp255(70 * f);
      break;
    }
    case Mat.Metal: {
      if (extra > 0) { // charged: electric glow
        r = clamp255(150 + extra * 2); g = 225; b = 255;
      } else {
        const f = 1 + ((tint - 128) / 128) * jit[mat];
        r = clamp255(baseR[mat] * f); g = clamp255(baseG[mat] * f); b = clamp255(baseB[mat] * f);
      }
      break;
    }
    case Mat.Fire: {
      // blackbody-ish: hotter (more life) = whiter/yellower, cooler = deep red.
      const t = extra > 90 ? 1 : extra / 90;
      const flick = ((tint + frame) & 31) * 0.4; // cheap per-cell flicker
      r = 255;
      g = clamp255(50 + t * 185 + flick);
      b = clamp255(t * t * 150);
      break;
    }
    case Mat.Ember: {
      const t = extra > 30 ? 1 : extra / 30;
      r = 255;
      g = clamp255(180 + t * 60);
      b = clamp255(80 + t * 90);
      break;
    }
    case Mat.Lava: {
      // pseudo-heat from the tint: brighter "veins" run hotter.
      const heat = 0.55 + (tint / 255) * 0.45;
      r = clamp255(255 * heat + 30);
      g = clamp255(70 * heat + 25);
      b = clamp255(12 * heat);
      break;
    }
    case Mat.Acid: {
      const f = 0.85 + (tint / 255) * 0.4;
      r = clamp255(110 * f);
      g = clamp255(235 * f);
      b = clamp255(55 * f);
      break;
    }
    case Mat.Water: {
      if (extra > 0) { // electrified: a momentary cyan-white charge glow
        r = clamp255(120 + extra * 2); g = 230; b = 255;
        break;
      }
      // faint shimmer so it reads as a moving surface, not blue sand.
      const f = 1 + ((tint - 128) / 128) * jit[mat];
      const sh = (((tint ^ frame) & 7) - 3) * 1.5;
      r = clamp255(baseR[mat] * f + sh);
      g = clamp255(baseG[mat] * f + sh);
      b = clamp255(baseB[mat] * f + sh * 2);
      break;
    }
    default: {
      const f = 1 + ((tint - 128) / 128) * jit[mat];
      r = clamp255(baseR[mat] * f);
      g = clamp255(baseG[mat] * f);
      b = clamp255(baseB[mat] * f);
    }
  }

  out[p] = r;
  out[p + 1] = g;
  out[p + 2] = b;
  out[p + 3] = 255;
}
