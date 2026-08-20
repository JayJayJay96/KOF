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
  return (
    state.screenState === 'spinning_player' ||
    state.screenState === 'spinning_fate' ||
    state.screenState === 'spinning_both'
  );
}

/**
 * The selected player, but only once it is allowed to be revealed.
 *
 * During 'spinning_player' the engine already knows the result; showing it
 * would spoil the spin.
 */
export function getRevealedPlayer(state: GameState): Player | null {
  if (state.screenState === 'spinning_player' || state.screenState === 'spinning_both') return null;
  return getCurrentPlayer(state);
}

export function canSpinFateWheel(state: GameState): boolean {
  return state.screenState === 'player_selected' && state.currentPlayerId !== null;
}

/**
 * Only a fully resolved Fate ends a round — the Fate step cannot be skipped,
 * and pending events cannot be abandoned.
 */
export function canAdvanceRound(state: GameState): boolean {
  return state.screenState === 'resolving' && state.eventQueue.length === 0;
}

/** Resolution is suspended on a blocking event, waiting for the host. */
export function canContinueEvents(state: GameState): boolean {
  return state.eventQueue.length > 0;
}

/** An ability is suspended waiting for the host to spin for a target. */
export function canSpinTarget(state: GameState): boolean {
  return state.screenState === 'special_event' && state.pendingTargetSpin !== null;
}

/**
 * The temporary eligible pool for a target spin (PROJECT_SPEC.md §11.5).
 *
 * Excluding the initiator is what stops the Hunter hunting itself and a Duel
 * pairing a player with themselves. With two players alive this leaves exactly
 * one candidate, which is the spec's forced-target edge case.
 */
export function getTargetPool(state: GameState): Player[] {
  const exclude = state.pendingTargetSpin?.excludePlayerIds ?? [];
  return getAlivePlayers(state).filter((player) => !exclude.includes(player.id));
}

/**
 * Entries the Main Wheel should show right now.
 *
 * During a target spin it shows the restricted pool, so the wheel visibly
 * cannot land on an excluded player.
 */
export function getMainWheelPlayers(state: GameState): Player[] {
  return state.pendingTargetSpin !== null ? getTargetPool(state) : getAlivePlayers(state);
}

/** The id the Main Wheel should animate toward. */
export function getMainWheelSelectedId(state: GameState): string | null {
  return state.targetPlayerId !== null ? state.targetPlayerId : state.currentPlayerId;
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
  if (state.screenState === 'spinning_fate' || state.screenState === 'spinning_both') return null;
  return state.currentAbilityId;
}

/**
 * The living players either side of one player on the Main Wheel.
 *
 * Adjacency is over the ALIVE roster, wrapping at the ends, because that is
 * what the wheel actually draws — eliminated players are not on it.
 *
 * Called once, when a C4 is PLANTED, to decide who its blast will catch. From
 * that moment the radius lives on the players themselves (`Player.c4Blast`)
 * and is never recomputed, so the host can reorder the wheel without changing
 * who dies.
 *
 * So this answers "who is beside them right now", NOT "who will the blast
 * take". Those were the same question until shuffling existed; conflating them
 * again would quietly turn the shuffle button into a weapon.
 *
 * Deduplicated, and never includes the player themselves. At two alive both
 * sides are the same person, and at one alive there is nobody.
 */
export function getWheelNeighbours(state: GameState, playerId: string): Player[] {
  const alive = getAlivePlayers(state);
  const index = alive.findIndex((player) => player.id === playerId);
  if (index === -1) return [];

  const byId = new Map<string, Player>();
  const left = alive[(index - 1 + alive.length) % alive.length];
  const right = alive[(index + 1) % alive.length];

  for (const neighbour of [left, right]) {
    if (neighbour.id !== playerId) byId.set(neighbour.id, neighbour);
  }

  return [...byId.values()];
}
