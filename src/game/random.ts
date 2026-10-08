export class Random {
  constructor(public state: number) { this.state = state >>> 0 || 1; }
  next() { let x = this.state; x ^= x << 13; x ^= x >>> 17; x ^= x << 5; this.state = x >>> 0; return this.state / 4294967296; }
  int(max: number) { return Math.floor(this.next() * max); }
  pick<T>(values: readonly T[]) { return values[this.int(values.length)]; }
}
export function successes(chance: number, rng: Random) { const p = Math.max(0, chance) / 100; return Math.floor(p) + (rng.next() < p % 1 ? 1 : 0); }
