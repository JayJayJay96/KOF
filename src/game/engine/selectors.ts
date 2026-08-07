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

/**
 * Roster-level filter.
 *
 * Exposed separately so React can memoise on `state.players` alone. Memoising
 * on the whole state would produce a new array on every dispatch, which would
 * restart the wheel animation mid-spin.
 */
export function filterAlive(players: readonly Player[]): Player[] {
  return players.filter((player) => player.status === 'alive');
}

export function getAlivePlayers(state: GameState): Player[] {
  return filterAlive(state.players);
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

/** True while a wheel animation owns the screen — all host input must be locked. */
export function isAnimating(state: GameState): boolean {
  return state.screenState === 'spinning_player' || state.screenState === 'spinning_fate';
}

/**
 * The selected player, but only once it is allowed to be revealed.
 *
 * During 'spinning_player' the engine already knows the result; showing it
 * would spoil the spin.
 */
export function getRevealedPlayer(state: GameState): Player | null {
  if (state.screenState === 'spinning_player') return null;
  return getCurrentPlayer(state);
}

export function canSpinFateWheel(state: GameState): boolean {
  return state.screenState === 'player_selected' && state.currentPlayerId !== null;
}

/** Only a resolved Fate ends a round — the Fate step cannot be skipped. */
export function canAdvanceRound(state: GameState): boolean {
  return state.screenState === 'resolving';
}

/** The Fate Wheel is live only once a player is selected (PROJECT_SPEC.md §9). */
export function canResolveFate(state: GameState): boolean {
  return state.screenState === 'fate_selected' && state.currentAbilityId !== null;
}

/**
 * The chosen ability, but only once it may be revealed.
 * Hidden while the Fate Wheel is still turning, exactly as the player is.
 */
export function getRevealedAbilityId(state: GameState): string | null {
  if (state.screenState === 'spinning_fate') return null;
  return state.currentAbilityId;
}

export function isGameOver(state: GameState): boolean {
  return state.screenState === 'winner';
}
