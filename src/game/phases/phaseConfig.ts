/**
 * Phase thresholds and display metadata.
 *
 * Source of truth: PROJECT_SPEC.md §10, DEVELOPMENT_ROADMAP.md Phase 5A.
 * Values are provisional until playtesting (Phase 8).
 */

import type { GamePhase, PhaseThresholds } from '../types/game';

/**
 * Spec §10: Chaos 12+, Danger 6-11, Final Five 3-5, Sudden Death 2.
 * Encoded as inclusive upper bounds so the resolver is a simple cascade.
 */
export const DEFAULT_PHASE_THRESHOLDS: PhaseThresholds = {
  dangerAt: 11,
  finalAt: 5,
  suddenDeathAt: 2,
};

export const PHASE_LABELS: Record<GamePhase, string> = {
  chaos: 'CHAOS',
  danger: 'DANGER',
  final_five: 'FINAL FIVE',
  sudden_death: 'SUDDEN DEATH',
};

export const PHASE_ORDER: readonly GamePhase[] = ['chaos', 'danger', 'final_five', 'sudden_death'];
