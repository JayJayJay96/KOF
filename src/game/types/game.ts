/**
 * Core game state types.
 *
 * Source of truth: PROJECT_SPEC.md §19 (screen states), §32 (config shape),
 * DEVELOPMENT_ROADMAP.md Phase 0 (minimal state shape).
 */

import type { GameEvent, GameHistoryEntry } from '../events/eventTypes';
import type { Player } from './player';

/**
 * Escalation tiers, least to most severe.
 *
 * `bloodbath` sits between Danger and the endgame and only exists in larger
 * games — below about 13 players its band falls under the absolute Final Four
 * floor and it is never entered. That is intended: a game that ends in six
 * eliminations does not need five tiers.
 */
export type GamePhase = 'chaos' | 'danger' | 'bloodbath' | 'final_four' | 'sudden_death';

export type GameScreenState =
  | 'setup'
  | 'idle'
  | 'spinning_player'
  /**
   * Both wheels turning at once — WHO and WHAT decided together.
   *
   * The engine picks both results before either wheel moves, exactly as the
   * sequential path does, so this is a presentation state and not a second way
   * to decide anything. It ends when the MAIN wheel lands, handing over to
   * 'spinning_fate' while the Fate Wheel is still turning; that keeps the
   * WHO -> WHAT reading order intact even though the spins overlap.
   */
  | 'spinning_both'
  | 'player_selected'
  | 'spinning_fate'
  | 'fate_selected'
  | 'resolving'
  | 'special_event'
  | 'phase_transition'
  | 'winner';

export type PhaseThresholds = {
  /** Alive count at or below this value enters DANGER. */
  dangerAt: number;
  /** Alive count at or below this value enters FINAL FOUR. */
  finalAt: number;
  /** Alive count at or below this value enters SUDDEN DEATH. */
  suddenDeathAt: number;
};

export type AnimationSpeed = 'slow' | 'normal' | 'fast';

export type AbilityConfig = {
  enabled: boolean;
  weights: Partial<Record<GamePhase, number>>;
};

export type GameConfig = {
  preset: 'normal' | 'chaos' | 'quick' | 'custom';

  phaseThresholds: PhaseThresholds;

  abilities: Record<string, AbilityConfig>;

  animationSpeed: AnimationSpeed;

  /**
   * Run the Main and Fate wheels together instead of one after the other.
   *
   * Optional so saves written before this existed still load; absent means on.
   * Read through `isSimultaneousSpinEnabled` rather than directly, so the
   * default lives in exactly one place.
   */
  simultaneousSpin?: boolean;

  audio: {
    master: number;
    music: number;
    sfx: number;
    /** Optional so saves written before Phase 7 still load; absent means unmuted. */
    muted?: boolean;
  };
};

export type GameState = {
  players: Player[];
  round: number;
  phase: GamePhase;
  screenState: GameScreenState;
  currentPlayerId: string | null;
  currentAbilityId: string | null;
  history: GameHistoryEntry[];
  winnerId: string | null;
  config: GameConfig;

  /**
   * Events produced but not yet applied.
   *
   * Non-empty means resolution is paused waiting on the host. Draining stops at
   * a blocking event so multi-step abilities (Hunter's target spin, Duel's
   * versus sequence) have somewhere to suspend mid-resolution.
   */
  eventQueue: GameEvent[];

  /**
   * Set while an ability is suspended waiting for a target spin.
   *
   * Records which ability is mid-resolution so the engine can hand the chosen
   * target back to it, and which players that spin must exclude (Hunter cannot
   * target itself; a Duel opponent is not the initiator).
   */
  pendingTargetSpin: PendingTargetSpin | null;

  /** The target chosen by the most recent target spin, for display. */
  targetPlayerId: string | null;
};

/** Single source of truth for the simultaneous-spin default. */
export function isSimultaneousSpinEnabled(config: GameConfig): boolean {
  return config.simultaneousSpin ?? true;
}

export type PendingTargetSpin = {
  abilityId: string;
  purpose: string;
  excludePlayerIds: string[];
};
