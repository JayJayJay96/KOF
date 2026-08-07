/**
 * Derived reads over GameState, plus game-aware random selection.
 *
 * Selection routes through utils/random.ts so all randomness stays centralised
 * (AGENTS.md §7.5) while the random utility itself stays game-agnostic.
 *
 * The engine picks the result BEFORE any wheel animates (PROJECT_SPEC.md §8).
 */

import type { GameState } from '../types/game';
import type { Player } from '../types/player';
import { randomItem } from '../../utils/random';

export function getAlivePlayers(state: GameState): Player[] {
  return state.players.filter((player) => player.status === 'alive');
}

export function getEliminatedPlayers(state: GameState): Player[] {
  return state.players.filter((player) => player.status === 'eliminated');
}

export function getPlayerById(state: GameState, playerId: string | null): Player | null {
  if (playerId === null) return null;
  return state.players.find((player) => player.id === playerId) ?? null;
}

export function getCurrentPlayer(state: GameState): Player | null {
  return getPlayerById(state, state.currentPlayerId);
}

/**
 * Pick one alive player, optionally excluding specific ids.
 *
 * Exclusion covers Hunter (cannot target self) and Duel (opponent cannot be
 * the initiator) — PROJECT_SPEC.md §11.5, §11.8. Returns null when the pool
 * is empty so callers must handle the two-player edge cases explicitly.
 */
export function selectRandomEligiblePlayer(
  state: GameState,
  excludePlayerIds: readonly string[] = [],
): Player | null {
  const pool = getAlivePlayers(state).filter((player) => !excludePlayerIds.includes(player.id));
  return randomItem(pool);
}

/** Pick one eliminated player — Revive only draws from the eliminated pool. */
export function selectRandomEliminatedPlayer(state: GameState): Player | null {
  return randomItem(getEliminatedPlayers(state));
}

// --- Input gating (AGENTS.md §8: buttons must be state-aware) ---

export function canSpinPlayerWheel(state: GameState): boolean {
  return state.screenState === 'idle' && getAlivePlayers(state).length > 0;
}

export function canSpinFateWheel(state: GameState): boolean {
  return state.screenState === 'player_selected' && state.currentPlayerId !== null;
}

export function canAdvanceRound(state: GameState): boolean {
  return state.screenState === 'fate_selected' || state.screenState === 'player_selected';
}

export function isGameOver(state: GameState): boolean {
  return state.screenState === 'winner';
}
