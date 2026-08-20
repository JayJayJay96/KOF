/**
 * Game event vocabulary.
 *
 * Source of truth: PROJECT_SPEC.md §18.
 * Abilities emit events; UI / effects / audio react to them (AGENTS.md §9).
 * The spec states this list can evolve — GAME_STARTED and ROUND_STARTED are
 * additions needed so the debug/event history is readable from round 1.
 */

import type { GamePhase } from '../types/game';

export type GameEvent =
  | { type: 'GAME_STARTED'; playerCount: number }
  | { type: 'ROUND_STARTED'; round: number }
  | { type: 'PLAYER_SELECTED'; playerId: string }
  | { type: 'ABILITY_SELECTED'; abilityId: string }
  | { type: 'SHOW_MESSAGE'; message: string }
  | { type: 'WAIT_FOR_HOST' }
  // excludePlayerIds keeps "Hunter cannot target itself" and "Duel opponent is
  // not the initiator" as data on the event, not rules in the reducer.
  | { type: 'REQUEST_PLAYER_SPIN'; purpose: string; excludePlayerIds?: string[] }
  | { type: 'TARGET_SELECTED'; playerId: string }
  // Sibling of REQUEST_PLAYER_SPIN. Lets Again hand control back to the host
  // for another Fate roll without the reducer switching on ability id.
  | { type: 'REQUEST_FATE_SPIN'; purpose: string }
  | { type: 'ATTACK_PLAYER'; playerId: string; source: string }
  | { type: 'WALL_BLOCK'; playerId: string }
  | { type: 'ADD_WALL'; playerId: string }
  // Distinct from WALL_BLOCK: the Wall is taken or destroyed, not spent
  // absorbing a hit.
  | { type: 'REMOVE_WALL'; playerId: string }
  | { type: 'ADD_DEATH_MARK'; playerId: string }
  | { type: 'REMOVE_DEATH_MARK'; playerId: string }
  // Moves the bomb TO playerId and sets its fuse, clearing it from whoever held
  // it before. One event covers both planting and passing, which is what makes
  // "only one bomb exists" structural rather than a rule to remember.
  | { type: 'SET_BOMB'; playerId: string; fuse: number }
  | { type: 'CLEAR_BOMB' }
  | { type: 'ELIMINATE_PLAYER'; playerId: string }
  | { type: 'REVIVE_PLAYER'; playerId: string }
  | { type: 'PHASE_CHANGED'; phase: GamePhase }
  | { type: 'GAME_WON'; playerId: string };

export type GameEventType = GameEvent['type'];

/** History entry: an event stamped with the round it occurred in. */
export type GameHistoryEntry = {
  round: number;
  event: GameEvent;
};
