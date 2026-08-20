/**
 * The Fates in play for one game.
 *
 * Five mandatory Fates are always in, because they are what keeps a game
 * moving. Everything else is drawn once at START_GAME and held for the whole
 * session, so two games with the same roster still play differently.
 *
 * CURRENT STATE: six optional Fates exist today (safe, close_call, revive,
 * steal_wall, double_fate, c4) and the defensive mandatory Fate is now
 * called Wall. The "eight optional" language below describes where this phase
 * ENDS UP, not what is registered right now — later tasks add two more
 * optional Fates.
 *
 * WHY FOUR
 *
 * Today: six optional Fates choosing four gives C(6,4) = 15 distinct pools,
 * and any one Fate is left out of 1 draw in 3 (5 of the 15 combinations omit
 * it). At the end state of this phase, once two more optional Fates land:
 * eight optional Fates choosing four gives C(8,4) = 70 distinct pools and
 * every game genuinely omits half of them. Drawing six — the number
 * originally proposed, against that larger eight-Fate pool — would show 75%
 * of the same Fates every session and the draw would stop being felt.
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
