/**
 * Centralised randomness.
 *
 * AGENTS.md §7.5: no scattered Math.random() calls. Everything goes through
 * here so games can later be seeded, replayed and unit-tested deterministically.
 *
 * This module is deliberately game-agnostic — it knows nothing about Player or
 * GameState. Game-aware selection lives in game/engine/selectors.ts.
 */

export type RandomSource = () => number;

let randomSource: RandomSource = Math.random;

/** Swap the underlying source (tests, seeded runs, deterministic debugging). */
export function setRandomSource(source: RandomSource): void {
  randomSource = source;
}

export function resetRandomSource(): void {
  randomSource = Math.random;
}

/** Float in [0, 1). */
export function randomFloat(): number {
  return randomSource();
}

/** Integer in [minInclusive, maxExclusive). Returns minInclusive if range <= 0. */
export function randomInt(minInclusive: number, maxExclusive: number): number {
  const span = maxExclusive - minInclusive;
  if (span <= 0) return minInclusive;
  return minInclusive + Math.floor(randomFloat() * span);
}

/** Uniform pick. Returns null for an empty list rather than throwing. */
export function randomItem<T>(items: readonly T[]): T | null {
  if (items.length === 0) return null;
  return items[randomInt(0, items.length)];
}

/** Fisher-Yates. Returns a new array; the input is not mutated. */
export function shuffle<T>(items: readonly T[]): T[] {
  const result = items.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export type WeightedEntry<T> = {
  item: T;
  weight: number;
};

/**
 * Weighted pick. Non-positive weights are ignored.
 * Returns null when the list is empty or every weight is <= 0.
 */
export function selectWeightedItem<T>(entries: readonly WeightedEntry<T>[]): T | null {
  const candidates = entries.filter((entry) => entry.weight > 0);
  if (candidates.length === 0) return null;

  const totalWeight = candidates.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = randomFloat() * totalWeight;

  for (const entry of candidates) {
    roll -= entry.weight;
    if (roll < 0) return entry.item;
  }

  // Floating-point guard: fall back to the last eligible entry.
  return candidates[candidates.length - 1].item;
}
