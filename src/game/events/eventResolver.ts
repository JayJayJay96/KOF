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

    // Moving the bomb clears it from everyone else in the same step, so two
    // holders cannot exist even briefly. An eliminated target is refused for
    // the same reason a corpse cannot be armed with a Shield.
    case 'SET_BOMB':
      return {
        ...state,
        players: state.players.map((player) => {
          if (player.id !== event.playerId) {
            return player.bombFuse === undefined ? player : { ...player, bombFuse: undefined };
          }
          return player.status === 'alive' ? { ...player, bombFuse: event.fuse } : player;
        }),
      };

    case 'CLEAR_BOMB':
      return {
        ...state,
        players: state.players.map((player) =>
          player.bombFuse === undefined ? player : { ...player, bombFuse: undefined },
        ),
      };

    case 'ELIMINATE_PLAYER':
      return mapPlayer(state, event.playerId, (player) =>
        player.status === 'alive'
          ? {
              ...player,
              status: 'eliminated',
              shield: 0,
              deathMark: false,
              // NOTE: `bombFuse` is deliberately NOT cleared here.
              //
              // The bomb does die with its holder — that is the intended rule,
              // and dying to something else is a fair way to take it out of
              // play. But clearing it here would delete the countdown with
              // nothing said, and half of all bombs end this way. The fuse is
              // left on the body so `bombTrigger` can clear it on the next
              // selection and explain what happened. `getBombHolder` only ever
              // looks at living players, so a bomb on a corpse is already inert
              // for every other purpose.
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
              bombFuse: undefined,
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
