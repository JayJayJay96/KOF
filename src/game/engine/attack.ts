/**
 * Shared attack resolution.
 *
 * AGENTS.md §7.7: every ability that applies elimination pressure reuses this.
 * Wall interaction is implemented once, here — never per ability. Hunter,
 * Duel, Death Mark and C4 must all call this rather than reimplement the Wall
 * check.
 *
 * Pulled forward from Phase 3 because Phase 2 ships Eliminate and Wall in the
 * same pool, and a Wall that does not block an attack is not a working
 * ability.
 *
 * Pure: returns events, mutates nothing.
 */

import type { GameEvent } from '../events/eventTypes';
import type { GameState } from '../types/game';

export type AttackOptions = {
  /**
   * Ignore the target's Wall.
   *
   * Gale is the only user, and the reason is not that its attack is stronger:
   * the Wall is not failing to protect its owner, it is the thing killing
   * them. Letting it block would be incoherent — you cannot hide behind the
   * wall that is falling on you.
   *
   * Kept as an option on the shared flow rather than a second attack function,
   * because AGENTS.md §7.7 exists to stop elimination having two
   * implementations that can drift apart.
   */
  pierce?: boolean;
};

/**
 * Resolve an elimination attack against one player.
 *
 * ```text
 * Wall > 0, not pierced  ->  consume Wall, survive
 * otherwise              ->  eliminate
 * ```
 *
 * Returns an empty list when the target is already gone, so a stale target id
 * can never eliminate a dead player twice.
 */
export function attackPlayer(
  state: GameState,
  playerId: string,
  source: string,
  options: AttackOptions = {},
): GameEvent[] {
  const target = state.players.find((player) => player.id === playerId);
  if (!target || target.status !== 'alive') return [];

  const events: GameEvent[] = [{ type: 'ATTACK_PLAYER', playerId, source }];

  if (target.wall > 0 && !options.pierce) {
    events.push({ type: 'WALL_BLOCK', playerId });
  } else {
    events.push({ type: 'ELIMINATE_PLAYER', playerId });
  }

  return events;
}
