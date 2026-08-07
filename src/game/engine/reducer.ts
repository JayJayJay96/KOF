/**
 * Game reducer — the only place GameState changes.
 *
 * Scope: DEVELOPMENT_ROADMAP.md Phase 0 + Phase 1 actions. Fate abilities, the
 * shared attack abstraction and the event queue arrive in Phase 3; do not add
 * ability logic here.
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
import { drainEventQueue, enqueueEvents } from '../events/eventQueue';
import { buildGameContext, getAbility } from '../abilities';

/** A game needs at least two players to have a loser and a winner. */
export const MIN_PLAYERS_TO_START = 2;

export type GameAction =
  | { type: 'ADD_PLAYERS'; names: string[] }
  | { type: 'REMOVE_PLAYER'; playerId: string }
  | { type: 'START_GAME' }
  | { type: 'START_PLAYER_SPIN'; playerId: string }
  | { type: 'PLAYER_SPIN_COMPLETE' }
  | { type: 'SELECT_PLAYER'; playerId: string }
  | { type: 'START_FATE_SPIN'; abilityId: string }
  | { type: 'FATE_SPIN_COMPLETE' }
  | { type: 'RESOLVE_FATE' }
  | { type: 'CONTINUE_EVENTS' }
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

    case 'START_PLAYER_SPIN':
      return startPlayerSpin(state, action.playerId);

    case 'PLAYER_SPIN_COMPLETE':
      return completePlayerSpin(state);

    case 'SELECT_PLAYER':
      return selectPlayer(state, action.playerId);

    case 'START_FATE_SPIN':
      return startFateSpin(state, action.abilityId);

    case 'FATE_SPIN_COMPLETE':
      return completeFateSpin(state);

    case 'RESOLVE_FATE':
      return resolveFate(state);

    case 'CONTINUE_EVENTS':
      return continueEvents(state);

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
    eventQueue: [],
  };

  const events: GameEvent[] = [
    { type: 'GAME_STARTED', playerCount: players.length },
    { type: 'ROUND_STARTED', round: 1 },
  ];

  return applyPhaseAndWinner({ ...started, history: appendEvents(started, events) });
}

/**
 * Begin a Main Wheel spin toward an already-decided player.
 *
 * The engine has picked the winner before the wheel moves (PROJECT_SPEC.md §8),
 * so `currentPlayerId` is set immediately. The UI must not reveal it while
 * `screenState` is 'spinning_player' — that is what makes the wheel a renderer
 * rather than a decision-maker (AGENTS.md §7.2).
 *
 * Entering 'spinning_player' also locks every host control, so a double click
 * cannot start a second spin.
 */
function startPlayerSpin(state: GameState, playerId: string): GameState {
  if (state.screenState !== 'idle') return state;

  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player || player.status !== 'alive') return state;

  return {
    ...state,
    currentPlayerId: playerId,
    currentAbilityId: null,
    screenState: 'spinning_player',
  };
}

/** The wheel finished animating — reveal the result and log it. */
function completePlayerSpin(state: GameState): GameState {
  if (state.screenState !== 'spinning_player') return state;
  if (state.currentPlayerId === null) return state;

  return {
    ...state,
    screenState: 'player_selected',
    history: appendEvents(state, [{ type: 'PLAYER_SELECTED', playerId: state.currentPlayerId }]),
  };
}

/**
 * Instant selection with no animation.
 *
 * Kept alongside the spin pair for tests and for the "skip animation" option
 * planned in Enhancement Phase 2.
 */
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

/**
 * Begin a Fate Wheel spin toward an already-decided ability.
 *
 * Mirrors the Main Wheel pair: the engine picks, the wheel animates, the
 * result is revealed on completion. The Fate Wheel cannot spin before a player
 * exists (PROJECT_SPEC.md §9).
 */
function startFateSpin(state: GameState, abilityId: string): GameState {
  if (state.screenState !== 'player_selected') return state;
  if (state.currentPlayerId === null) return state;

  return {
    ...state,
    currentAbilityId: abilityId,
    screenState: 'spinning_fate',
  };
}

/** The Fate Wheel finished animating — reveal the ability and log it. */
function completeFateSpin(state: GameState): GameState {
  if (state.screenState !== 'spinning_fate') return state;
  if (state.currentAbilityId === null) return state;

  return {
    ...state,
    screenState: 'fate_selected',
    history: appendEvents(state, [{ type: 'ABILITY_SELECTED', abilityId: state.currentAbilityId }]),
  };
}

/**
 * Resolve the revealed Fate.
 *
 * The ability produces events; eventResolver applies them. This function knows
 * nothing about individual abilities — adding a new one never changes it.
 *
 * Screen state lands on 'resolving' so the host reads the outcome before
 * advancing, unless the ability asked for another Fate roll (Again), in which
 * case eventResolver has already returned the screen to 'player_selected'.
 */
function resolveFate(state: GameState): GameState {
  if (state.screenState !== 'fate_selected') return state;

  const ability = getAbility(state.currentAbilityId);
  const playerId = state.currentPlayerId;
  if (!ability || playerId === null) return state;

  const events = ability.resolve(buildGameContext(state), playerId);
  const queued = enqueueEvents({ ...state, screenState: 'resolving' }, events);

  // applyPhaseAndWinner may override screenState to 'winner'.
  return applyPhaseAndWinner(drainEventQueue(queued));
}

/**
 * Resume a suspended resolution.
 *
 * The queue stops at blocking events so the host can react between steps. This
 * is what the Continue button dispatches; it is also how Phase 4's multi-step
 * abilities will advance without the reducer knowing which ability is running.
 */
function continueEvents(state: GameState): GameState {
  if (state.eventQueue.length === 0) return state;
  return applyPhaseAndWinner(drainEventQueue(state));
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
  // Only from a fully resolved Fate. This prevents skipping the Fate step,
  // advancing mid-animation, advancing past pending events, or advancing once
  // the game is decided.
  if (state.screenState !== 'resolving') return state;
  if (state.eventQueue.length > 0) return state;

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
