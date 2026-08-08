/**
 * Core game state types.
 *
 * Source of truth: PROJECT_SPEC.md §19 (screen states), §32 (config shape),
 * DEVELOPMENT_ROADMAP.md Phase 0 (minimal state shape).
 */

import type { GameEvent, GameHistoryEntry } from '../events/eventTypes';
import type { Player } from './player';

export type GamePhase = 'chaos' | 'danger' | 'final_five' | 'sudden_death';

export type GameScreenState =
  | 'setup'
  | 'idle'
  | 'spinning_player'
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
  /** Alive count at or below this value enters FINAL FIVE. */
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

export type PendingTargetSpin = {
  abilityId: string;
  purpose: string;
  excludePlayerIds: string[];
};
