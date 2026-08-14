/**
 * Phase thresholds and display metadata.
 *
 * Source of truth: PROJECT_SPEC.md §10, DEVELOPMENT_ROADMAP.md Phase 5A.
 * Values are provisional until playtesting (Phase 8).
 */

import type { GamePhase, PhaseThresholds } from '../types/game';

/**
 * Encoded as inclusive upper bounds so the resolver stays a simple cascade,
 * most severe first.
 *
 * `finalAt` is 4 rather than 5 for a reason worth keeping: at 8 players the 70%
 * Danger band lands at 5 alive, and a Final floor of 5 would take that step
 * first — deleting DANGER from every game under about 12 players, which is the
 * same bug the share-based bands exist to fix.
 */
export const DEFAULT_PHASE_THRESHOLDS: PhaseThresholds = {
  dangerAtShare: 0.7,
  bloodbathAtShare: 0.4,
  finalAt: 4,
  suddenDeathAt: 2,
};

export const PHASE_LABELS: Record<GamePhase, string> = {
  chaos: 'CHAOS',
  danger: 'DANGER',
  bloodbath: 'BLOODBATH',
  final_four: 'FINAL FOUR',
  sudden_death: 'SUDDEN DEATH',
};

/**
 * Full-screen transition titles.
 *
 * These strings are the source of truth; PROJECT_SPEC.md §10 was updated to
 * match them in Task 5 of this phase.
 *
 * Chaos has no announcement: it is where games begin, so declaring it would
 * fire an overlay before anything has happened. A game that drops back to
 * Chaos after a Revive therefore transitions quietly, which is the right
 * emphasis — escalation is the dramatic beat, not de-escalation.
 */
export const PHASE_ANNOUNCEMENTS: Partial<Record<GamePhase, string>> = {
  danger: '⚠ DANGER MODE ⚠',
  bloodbath: '🩸 BLOODBATH 🩸',
  final_four: '🔥 FINAL FOUR 🔥',
  sudden_death: '☠ SUDDEN DEATH ☠',
};
