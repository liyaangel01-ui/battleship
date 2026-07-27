/**
 * Randomness is passed in rather than called directly, so that anything random —
 * fleet placement, the AI's search — can be replayed exactly in a test. A random bug
 * that cannot be reproduced is very expensive; a seeded one is cheap.
 */
export type Rng = () => number

export const defaultRng: Rng = Math.random

/**
 * A small deterministic generator (mulberry32) for tests.
 * Not cryptographically strong, which does not matter for choosing where a ship goes.
 */
export function seededRng(seed: number): Rng {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Picks one item at random. Returns undefined only when the list is empty. */
export function pick<T>(items: readonly T[], rng: Rng): T | undefined {
  if (items.length === 0) return undefined
  return items[Math.floor(rng() * items.length)]
}
