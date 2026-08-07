/**
 * Core game state types.
 *
 * Source of truth: PROJECT_SPEC.md §19 (screen states), §32 (config shape),
 * DEVELOPMENT_ROADMAP.md Phase 0 (minimal state shape).
 */

import type { GameHistoryEntry } from '../events/eventTypes';
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
};
