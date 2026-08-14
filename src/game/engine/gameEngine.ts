/**
 * Game Engine primitives.
 *
 * AGENTS.md §7.1: the engine owns eligibility, status, elimination, phase
 * transitions and winner detection. React components never decide outcomes.
 *
 * Everything here is a PURE function. Randomness lives in utils/random.ts and
 * is applied by callers before dispatching, so the reducer stays replayable.
 */

import type { GameConfig, GamePhase, GameState } from '../types/game';
import type { Player } from '../types/player';
import type { GameEvent, GameHistoryEntry } from '../events/eventTypes';
import { createDefaultGameConfig } from '../config/defaultConfig';
import { resolvePhase } from '../phases/phaseResolver';
import { createPlayerId } from '../../utils/ids';

/** Phase shown before a game starts, when the alive count is meaningless. */
export const SETUP_PHASE: GamePhase = 'chaos';

export function createPlayer(name: string): Player {
  return {
    id: createPlayerId(),
    name,
    status: 'alive',
    shield: 0,
    deathMark: false,
    revivedCount: 0,
  };
}

export function createInitialGameState(config: GameConfig = createDefaultGameConfig()): GameState {
  return {
    players: [],
    round: 0,
    phase: SETUP_PHASE,
    screenState: 'setup',
    currentPlayerId: null,
    currentAbilityId: null,
    history: [],
    winnerId: null,
    config,
    // Empty until START_GAME draws it. `getAvailableAbilities` treats an empty
    // pool as "no restriction", so the setup screen and any pre-game
    // inspection still see the full registry.
    sessionAbilityIds: [],
    // 0 until START_GAME sets it. Never read before then — phase resolution
    // only runs once a game is in progress.
    startingPlayerCount: 0,
    eventQueue: [],
    pendingTargetSpin: null,
    targetPlayerId: null,
  };
}

/** Clear all in-game status but keep identity — used by RESET_GAME. */
export function resetPlayerForNewGame(player: Player): Player {
  return {
    id: player.id,
    name: player.name,
    status: 'alive',
    shield: 0,
    deathMark: false,
    revivedCount: 0,
  };
}

export function getAliveCount(players: readonly Player[]): number {
  return players.reduce((count, player) => (player.status === 'alive' ? count + 1 : count), 0);
}

/** Stamp events onto the history with the round in which they happened. */
export function appendEvents(state: GameState, events: readonly GameEvent[]): GameHistoryEntry[] {
  if (events.length === 0) return state.history;
  return [...state.history, ...events.map((event) => ({ round: state.round, event }))];
}

/**
 * Recompute phase and winner after any change to the alive set.
 *
 * Emits PHASE_CHANGED when the phase actually moves (it may move backward
 * after a Revive — PROJECT_SPEC.md §38) and GAME_WON when one player remains.
 * Screen state is only forced to 'winner'; otherwise it is left untouched so
 * the caller keeps control of the flow.
 */
export function applyPhaseAndWinner(state: GameState): GameState {
  const aliveCount = getAliveCount(state.players);
  // `startingPlayerCount` is captured once at START_GAME and never moves
  // again. It used to be inferred from `players.length`, which looked
  // equivalent (eliminated players stay in the array) but wasn't: roster
  // edits are legal at 'idle' (canEditRoster), so a host removing eliminated
  // players there would shrink `players.length`, raise the alive share, and
  // quietly de-escalate the phase (e.g. Bloodbath back to Danger) even though
  // nobody was revived. Reading the stored starting count instead means
  // roster housekeeping can never unwind the game's tension.
  const nextPhase = resolvePhase({
    aliveCount,
    startingCount: state.startingPlayerCount,
    thresholds: state.config.phaseThresholds,
  });

  const events: GameEvent[] = [];
  if (nextPhase !== state.phase) {
    events.push({ type: 'PHASE_CHANGED', phase: nextPhase });
  }

  let winnerId = state.winnerId;
  let screenState = state.screenState;

  if (winnerId === null && aliveCount === 1) {
    const winner = state.players.find((player) => player.status === 'alive');
    if (winner) {
      winnerId = winner.id;
      screenState = 'winner';
      events.push({ type: 'GAME_WON', playerId: winner.id });
    }
  }

  // Everyone eliminated: no winner exists, but the game is still over.
  if (winnerId === null && aliveCount === 0 && state.round > 0) {
    screenState = 'winner';
  }

  return {
    ...state,
    phase: nextPhase,
    winnerId,
    screenState,
    history: appendEvents(state, events),
  };
}
