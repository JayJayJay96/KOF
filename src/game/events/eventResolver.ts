/**
 * Event resolution — turns ability output into state.
 *
 * Abilities return events; only this file knows what an event does to
 * GameState. That keeps ability files declarative and means a new ability can
 * never invent a new way to mutate players (AGENTS.md §9).
 *
 * This file is the STATE half of resolution: what one event does. Ordering,
 * pausing and host hand-offs live in eventQueue.ts. Keeping them apart means
 * sequencing changes never touch the per-event rules, and vice versa.
 */

import type { GameEvent } from './eventTypes';
import type { GameState } from '../types/game';
import type { Player } from '../types/player';

/** MVP Shield stack cap (PROJECT_SPEC.md §11.2). */
export const MAX_SHIELD = 1;

function mapPlayer(
  state: GameState,
  playerId: string,
  update: (player: Player) => Player,
): GameState {
  return {
    ...state,
    players: state.players.map((player) => (player.id === playerId ? update(player) : player)),
  };
}

/**
 * Apply one event's state change.
 *
 * Events with no state effect (ATTACK_PLAYER, SHOW_MESSAGE, WAIT_FOR_HOST) are
 * presentation and history markers — they still reach the log, they simply do
 * not move state here.
 */
export function applyGameEvent(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    // Eliminated players cannot be armed. Double Fate can roll Eliminate and
    // then Shield in one resolution, and a Shield on a corpse would reappear if
    // that player were later revived.
    case 'ADD_SHIELD':
      return mapPlayer(state, event.playerId, (player) =>
        player.status === 'alive'
          ? { ...player, shield: Math.min(MAX_SHIELD, player.shield + 1) }
          : player,
      );

    case 'REMOVE_SHIELD':
      return mapPlayer(state, event.playerId, (player) => ({
        ...player,
        shield: Math.max(0, player.shield - 1),
      }));

    case 'SHIELD_BLOCK':
      return mapPlayer(state, event.playerId, (player) => ({
        ...player,
        shield: Math.max(0, player.shield - 1),
      }));

    case 'ADD_DEATH_MARK':
      return mapPlayer(state, event.playerId, (player) => ({ ...player, deathMark: true }));

    case 'REMOVE_DEATH_MARK':
      return mapPlayer(state, event.playerId, (player) => ({ ...player, deathMark: false }));

    case 'ELIMINATE_PLAYER':
      return mapPlayer(state, event.playerId, (player) =>
        player.status === 'alive'
          ? {
              ...player,
              status: 'eliminated',
              shield: 0,
              deathMark: false,
              eliminatedAtRound: state.round,
            }
          : player,
      );

    case 'REVIVE_PLAYER':
      return mapPlayer(state, event.playerId, (player) =>
        player.status === 'eliminated'
          ? {
              ...player,
              status: 'alive',
              shield: 0,
              deathMark: false,
              eliminatedAtRound: undefined,
              revivedCount: player.revivedCount + 1,
            }
          : player,
      );

    // Blocking events are handled by the queue, not here — see eventQueue.ts.
    default:
      return state;
  }
}
