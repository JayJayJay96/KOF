/**
 * Game reducer — the only place GameState changes.
 *
 * Scope: DEVELOPMENT_ROADMAP.md Phase 0 actions only. Fate abilities, the
 * shared attack abstraction and the event queue arrive in Phase 3; do not
 * add ability logic here.
 *
 * The reducer is PURE. It never calls Math.random(): callers pick the target
 * with selectors.ts and dispatch the chosen id. That keeps the action log
 * replayable and makes undo (Phase 6B) a snapshot problem, not a rewind one.
 *
 * Invalid transitions return the current state unchanged rather than throwing,
 * so a stray double click can never corrupt a live game (AGENTS.md §8).
 */

import type { GameState } from '../types/game';
import type { GameEvent } from '../events/eventTypes';
import type { Player } from '../types/player';
import {
  appendEvents,
  applyPhaseAndWinner,
  createInitialGameState,
  createPlayer,
  resetPlayerForNewGame,
} from './gameEngine';
import { getAlivePlayers } from './selectors';

/** A game needs at least two players to have a loser and a winner. */
export const MIN_PLAYERS_TO_START = 2;

export type GameAction =
  | { type: 'ADD_PLAYERS'; names: string[] }
  | { type: 'REMOVE_PLAYER'; playerId: string }
  | { type: 'START_GAME' }
  | { type: 'SELECT_PLAYER'; playerId: string }
  | { type: 'SELECT_ABILITY'; abilityId: string }
  | { type: 'ELIMINATE_PLAYER'; playerId: string }
  | { type: 'NEXT_ROUND' }
  | { type: 'RESET_GAME' };

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ADD_PLAYERS':
      return addPlayers(state, action.names);

    case 'REMOVE_PLAYER':
      return removePlayer(state, action.playerId);

    case 'START_GAME':
      return startGame(state);

    case 'SELECT_PLAYER':
      return selectPlayer(state, action.playerId);

    case 'SELECT_ABILITY':
      return selectAbility(state, action.abilityId);

    case 'ELIMINATE_PLAYER':
      return eliminatePlayer(state, action.playerId);

    case 'NEXT_ROUND':
      return nextRound(state);

    case 'RESET_GAME':
      return resetGame(state);

    default:
      return state;
  }
}

// --- Setup ---

function addPlayers(state: GameState, names: string[]): GameState {
  if (state.screenState !== 'setup') return state;

  const cleanNames = names.map((name) => name.trim()).filter((name) => name.length > 0);
  if (cleanNames.length === 0) return state;

  return {
    ...state,
    players: [...state.players, ...cleanNames.map(createPlayer)],
  };
}

function removePlayer(state: GameState, playerId: string): GameState {
  if (state.screenState !== 'setup') return state;

  const players = state.players.filter((player) => player.id !== playerId);
  if (players.length === state.players.length) return state;

  return { ...state, players };
}

// --- Game flow ---

function startGame(state: GameState): GameState {
  if (state.screenState !== 'setup') return state;
  if (state.players.length < MIN_PLAYERS_TO_START) return state;

  const players = state.players.map(resetPlayerForNewGame);

  const started: GameState = {
    ...state,
    players,
    round: 1,
    screenState: 'idle',
    currentPlayerId: null,
    currentAbilityId: null,
    winnerId: null,
    history: [],
  };

  const events: GameEvent[] = [
    { type: 'GAME_STARTED', playerCount: players.length },
    { type: 'ROUND_STARTED', round: 1 },
  ];

  return applyPhaseAndWinner({ ...started, history: appendEvents(started, events) });
}

function selectPlayer(state: GameState, playerId: string): GameState {
  if (state.screenState !== 'idle') return state;

  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player || player.status !== 'alive') return state;

  return {
    ...state,
    currentPlayerId: playerId,
    currentAbilityId: null,
    screenState: 'player_selected',
    history: appendEvents(state, [{ type: 'PLAYER_SELECTED', playerId }]),
  };
}

function selectAbility(state: GameState, abilityId: string): GameState {
  if (state.screenState !== 'player_selected') return state;
  if (state.currentPlayerId === null) return state;

  return {
    ...state,
    currentAbilityId: abilityId,
    screenState: 'fate_selected',
    history: appendEvents(state, [{ type: 'ABILITY_SELECTED', abilityId }]),
  };
}

/**
 * Direct elimination.
 *
 * Phase 0 has no Shield check — the shared attack abstraction that consumes
 * Shield first lands in Phase 3 (DEVELOPMENT_ROADMAP.md Phase 3, "Attack
 * abstraction"). Until then this is the raw elimination primitive that the
 * attack flow will call.
 *
 * Shield and Death Mark are cleared on elimination so a revived player always
 * returns clean (PROJECT_SPEC.md §11.7).
 */
function eliminatePlayer(state: GameState, playerId: string): GameState {
  const target = state.players.find((player) => player.id === playerId);
  if (!target || target.status !== 'alive') return state;

  const players: Player[] = state.players.map((player) =>
    player.id === playerId
      ? {
          ...player,
          status: 'eliminated' as const,
          shield: 0,
          deathMark: false,
          eliminatedAtRound: state.round,
        }
      : player,
  );

  const eliminated: GameState = {
    ...state,
    players,
    history: appendEvents(state, [{ type: 'ELIMINATE_PLAYER', playerId }]),
  };

  return applyPhaseAndWinner(eliminated);
}

function nextRound(state: GameState): GameState {
  if (state.screenState === 'setup' || state.screenState === 'winner') return state;

  const round = state.round + 1;

  const advanced: GameState = {
    ...state,
    round,
    currentPlayerId: null,
    currentAbilityId: null,
    screenState: 'idle',
  };

  return { ...advanced, history: appendEvents(advanced, [{ type: 'ROUND_STARTED', round }]) };
}

/** Back to setup with the same roster, all status cleared. */
function resetGame(state: GameState): GameState {
  return {
    ...createInitialGameState(state.config),
    players: state.players.map(resetPlayerForNewGame),
  };
}

/** Convenience guard for hosts/debug UI: is a spin even possible? */
export function hasSpinnablePlayers(state: GameState): boolean {
  return getAlivePlayers(state).length > 0;
}
