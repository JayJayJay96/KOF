/**
 * Event resolution — turns ability output into state.
 *
 * Abilities return events; only this file knows what an event does to
 * GameState. That keeps ability files declarative and means a new ability can
 * never invent a new way to mutate players (AGENTS.md §9).
 *
 * Phase 2 applies events immediately. The sequenced, animation-aware queue
 * (pauses, timing, choreography) is Phase 3 — this is the state half of it,
 * deliberately separated so adding sequencing later does not touch abilities.
 */

import type { GameEvent } from './eventTypes';
import type { GameState } from '../types/game';
import type { Player } from '../types/player';
import { appendEvents } from '../engine/gameEngine';

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
function applyGameEvent(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case 'ADD_SHIELD':
      return mapPlayer(state, event.playerId, (player) => ({
        ...player,
        shield: Math.min(MAX_SHIELD, player.shield + 1),
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

    // Hands control back to the host for another Fate roll (Again).
    case 'REQUEST_FATE_SPIN':
      return { ...state, screenState: 'player_selected', currentAbilityId: null };

    default:
      return state;
  }
}

/** Apply a batch of events and record every one of them in history. */
export function applyGameEvents(state: GameState, events: readonly GameEvent[]): GameState {
  if (events.length === 0) return state;

  let next = state;
  for (const event of events) {
    next = applyGameEvent(next, event);
  }

  return { ...next, history: appendEvents(next, events) };
}
