/**
 * Shared attack resolution.
 *
 * AGENTS.md §7.7: every ability that applies elimination pressure reuses this.
 * Shield interaction is implemented once, here — never per ability. Hunter,
 * Duel, Death Mark and Double Kill must all call this rather than reimplement
 * the Shield check.
 *
 * Pulled forward from Phase 3 because Phase 2 ships Eliminate and Shield in the
 * same pool, and a Shield that does not block an attack is not a working
 * ability.
 *
 * Pure: returns events, mutates nothing.
 */

import type { GameEvent } from '../events/eventTypes';
import type { GameState } from '../types/game';

/**
 * Resolve an elimination attack against one player.
 *
 * ```text
 * Shield > 0  ->  consume Shield, survive
 * otherwise   ->  eliminate
 * ```
 *
 * Returns an empty list when the target is already gone, so a stale target id
 * can never eliminate a dead player twice.
 */
export function attackPlayer(state: GameState, playerId: string, source: string): GameEvent[] {
  const target = state.players.find((player) => player.id === playerId);
  if (!target || target.status !== 'alive') return [];

  const events: GameEvent[] = [{ type: 'ATTACK_PLAYER', playerId, source }];

  if (target.shield > 0) {
    events.push({ type: 'SHIELD_BLOCK', playerId });
  } else {
    events.push({ type: 'ELIMINATE_PLAYER', playerId });
  }

  return events;
}
