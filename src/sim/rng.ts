// Fast, allocation-free PRNG. Mulberry32 — good enough for a sandbox, very fast.

let s = 0x9e3779b9 ^ 0xa3c59ac3;

export function seed(n: number): void {
  s = n >>> 0;
}

/** Returns a 32-bit unsigned int. */
export function nextU32(): number {
  s |= 0;
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return (t ^ (t >>> 14)) >>> 0;
}

/** Float in [0, 1). */
export function rand(): number {
  return nextU32() / 4294967296;
}

/** Integer in [0, n). */
export function randInt(n: number): number {
  return (nextU32() % n) >>> 0;
}

/** Returns -1 or +1 with equal probability. Used to debias L/R checks. */
export function randSign(): number {
  return nextU32() & 1 ? 1 : -1;
}

/** True with probability p. */
export function chance(p: number): boolean {
  return rand() < p;
}

/** Inclusive integer range [lo, hi]. */
export function randRange(lo: number, hi: number): number {
  return lo + randInt(hi - lo + 1);
}
