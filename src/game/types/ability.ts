/**
 * Ability definition model.
 *
 * Source of truth: PROJECT_SPEC.md §15.
 * Abilities are data-driven: ability logic never lives in React components or
 * in a central switch statement (AGENTS.md §7.6).
 *
 * No abilities are registered yet — Phase 3 introduces the registry.
 * This file exists so the interface is fixed before abilities are written.
 */

import type { GameEvent } from '../events/eventTypes';
import type { Player } from './player';
import type { GameConfig, GamePhase, GameState } from './game';

export type AbilityCategory = 'attack' | 'defense' | 'chaos' | 'neutral' | 'special';

/** Read-only view of the game handed to an ability during evaluation. */
export type GameContext = {
  state: GameState;
  config: GameConfig;
  phase: GamePhase;
  alivePlayers: Player[];
  eliminatedPlayers: Player[];
};

export type AbilityDefinition = {
  id: string;
  name: string;
  icon: string;
  category: AbilityCategory;

  /** Whether this ability may appear on the Fate Wheel right now. */
  isAvailable: (context: GameContext) => boolean;

  /** Relative selection weight for the given phase. Return 0 to exclude. */
  getWeight: (phase: GamePhase) => number;

  /** Resolution: returns events, never mutates state directly. */
  resolve: (context: GameContext, selectedPlayerId: string) => GameEvent[];

  /**
   * Second half of a multi-step ability, called once a target spin lands.
   *
   * Only abilities that emit REQUEST_PLAYER_SPIN need this. The engine stores
   * which ability is suspended and calls this with the chosen target, so the
   * reducer never learns that Hunter or Duel exist.
   */
  resolveTargetSpin?: (
    context: GameContext,
    selectedPlayerId: string,
    targetPlayerId: string,
  ) => GameEvent[];
};
