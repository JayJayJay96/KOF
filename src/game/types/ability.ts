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

  /**
   * Always in the pool, exempt from the per-session draw.
   *
   * The five Fates that keep the game moving — Eliminate, Shield, Death Mark,
   * Hunter, Duel. Everything else is optional and drawn per session, which is
   * what makes two games feel different.
   */
  mandatory?: boolean;

  /** Whether this ability may appear on the Fate Wheel right now. */
  isAvailable: (context: GameContext) => boolean;

  /** Resolution: returns events, never mutates state directly. */
  resolve: (context: GameContext, selectedPlayerId: string) => GameEvent[];

  /**
   * One line describing what this Fate is about to do, given the board.
   *
   * Shown after the Fate Wheel lands and before the host resolves it, which is
   * the moment "Eliminate — but Ali's Shield will take it" is worth saying. It
   * lives on the ability so narration stays data like everything else: a new
   * Fate arrives with its own wording and no component learns its name.
   *
   * A FORECAST, not a result. It may only state what is already visible on the
   * wheel rims and in the status panel — never a roll the ability has not made
   * yet, or the host's reveal is spoiled. Hunter and Duel therefore say a target
   * is coming without saying who.
   *
   * Optional: omit it for Fates whose name already says everything.
   */
  describeStakes?: (context: GameContext, selectedPlayerId: string) => string | null;

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
