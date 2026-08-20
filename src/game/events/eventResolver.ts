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

/** MVP Wall stack cap (PROJECT_SPEC.md §11.2). */
export const MAX_WALL = 1;

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
    // then Wall in one resolution, and a Wall on a corpse would reappear if
    // that player were later revived.
    case 'ADD_WALL':
      return mapPlayer(state, event.playerId, (player) =>
        player.status === 'alive'
          ? { ...player, wall: Math.min(MAX_WALL, player.wall + 1) }
          : player,
      );

    case 'REMOVE_WALL':
      return mapPlayer(state, event.playerId, (player) => ({
        ...player,
        wall: Math.max(0, player.wall - 1),
      }));

    case 'WALL_BLOCK':
      return mapPlayer(state, event.playerId, (player) => ({
        ...player,
        wall: Math.max(0, player.wall - 1),
      }));

    case 'ADD_DEATH_MARK':
      return mapPlayer(state, event.playerId, (player) => ({ ...player, deathMark: true }));

    case 'REMOVE_DEATH_MARK':
      return mapPlayer(state, event.playerId, (player) => ({ ...player, deathMark: false }));

    case 'SWAP_STATUSES': {
      const first = state.players.find((player) => player.id === event.playerId);
      const second = state.players.find((player) => player.id === event.otherPlayerId);
      if (!first || !second) return state;

      // Everything a status can be. Adding a new one means adding it here —
      // which is the point of doing this in a single event rather than a
      // sequence of primitives that could each be forgotten.
      const swap = (player: Player, from: Player): Player => ({
        ...player,
        wall: from.wall,
        deathMark: from.deathMark,
        c4Fuse: from.c4Fuse,
      });

      return {
        ...state,
        players: state.players.map((player) => {
          if (player.id === first.id) return swap(player, second);
          if (player.id === second.id) return swap(player, first);
          return player;
        }),
      };
    }

    // Setting the charge clears it from everyone else in the same step, so two
    // holders cannot exist even briefly. An eliminated target is refused for
    // the same reason a corpse cannot be armed with a Wall.
    case 'SET_C4':
      return {
        ...state,
        players: state.players.map((player) => {
          if (player.id !== event.playerId) {
            return player.c4Fuse === undefined ? player : { ...player, c4Fuse: undefined };
          }
          return player.status === 'alive' ? { ...player, c4Fuse: event.fuse } : player;
        }),
      };

    case 'CLEAR_C4':
      return {
        ...state,
        players: state.players.map((player) =>
          player.c4Fuse === undefined ? player : { ...player, c4Fuse: undefined },
        ),
      };

    case 'ELIMINATE_PLAYER':
      return mapPlayer(state, event.playerId, (player) =>
        player.status === 'alive'
          ? {
              ...player,
              status: 'eliminated',
              wall: 0,
              deathMark: false,
              // NOTE: `c4Fuse` is deliberately NOT cleared here.
              //
              // The charge does die with its holder — that is the intended rule,
              // and dying to something else is a fair way to take it out of
              // play. But clearing it here would delete the countdown with
              // nothing said, which is how half of all bombs used to end. The fuse
              // is left on the body so `c4Trigger` can clear it on the next
              // selection and explain what happened. `getC4Holder` only ever looks
              // at living players, so a charge on a corpse is already inert for
              // every other purpose.
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
              wall: 0,
              deathMark: false,
              c4Fuse: undefined,
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
