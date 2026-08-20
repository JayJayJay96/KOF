/**
 * The Fates in play for one game.
 *
 * Five mandatory Fates are always in, because they are what keeps a game
 * moving. Everything else is drawn once at START_GAME and held for the whole
 * session, so two games with the same roster still play differently.
 *
 * The five mandatory Fates are Eliminate, Wall, Death Mark, Hunter and Duel.
 * The eight optional ones are Safe, Revive, Double Fate, C4, Gale, Demolition,
 * Fate Swap and Purify.
 *
 * WHY FOUR
 *
 * Eight optional Fates choosing four gives C(8,4) = 70 distinct pools, and
 * every game genuinely omits half of them. Drawing six — the number originally
 * proposed — would show 75% of the same Fates every session and the draw would
 * stop being felt at all.
 *
 * The count is load-bearing in the other direction too. If the optional pool
 * ever shrinks to four, the draw becomes degenerate: one possible pool, every
 * session identical, and the feature silently stops working. That nearly
 * happened during this phase — deleting two optional Fates before adding the
 * new ones would have hit exactly that — so the removals were reordered to run
 * last. Keep `SESSION_OPTIONAL_COUNT` comfortably below the optional count.
 *
 * WHY NO CATEGORY QUOTAS
 *
 * The obvious risk is a session with no defence, or with no Fate that involves
 * a second player. The mandatory core already rules both out: Wall guarantees
 * defence, Hunter and Duel guarantee two-player Fates. A quota system would be
 * a second mechanism enforcing something already structurally true.
 */

import type { AbilityDefinition } from '../types/ability';
import { shuffle } from '../../utils/random';

/** Optional Fates drawn per session, on top of every mandatory one. */
export const SESSION_OPTIONAL_COUNT = 4;

/**
 * Draw the pool for one game.
 *
 * Pure apart from `shuffle`, which routes through utils/random like all other
 * randomness (AGENTS.md §7.5). Draws fewer than `SESSION_OPTIONAL_COUNT` only
 * when fewer optional Fates exist than that, which keeps the function total.
 */
export function drawSessionPool(
  abilities: readonly AbilityDefinition[],
  optionalCount: number = SESSION_OPTIONAL_COUNT,
): string[] {
  const mandatory = abilities.filter((ability) => ability.mandatory);
  const optional = abilities.filter((ability) => !ability.mandatory);

  const drawn = shuffle(optional).slice(0, Math.max(0, optionalCount));

  return [...mandatory, ...drawn].map((ability) => ability.id);
}
