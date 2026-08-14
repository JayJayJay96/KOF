/**
 * Automatic phase resolution.
 *
 * Source of truth: PROJECT_SPEC.md §10 and §38 ("Revive after phase threshold
 * change"). Phase is derived from the alive count only, so it may move BACKWARD
 * after a Revive — this is the intended MVP behaviour.
 */

import type { GamePhase, PhaseThresholds } from '../types/game';
import { DEFAULT_PHASE_THRESHOLDS } from './phaseConfig';

/**
 * Derive the current phase from how many players are left, relative to how many
 * there were at the start.
 *
 * An alive count of 1 or 0 still reports 'sudden_death'; winner detection is
 * the engine's responsibility, not the phase resolver's.
 *
 * A `startingCount` of 0 falls back to the alive count, which reports 'chaos'.
 * That is the setup screen, where the alive count is meaningless anyway.
 */
export function resolvePhase(
  aliveCount: number,
  startingCount: number,
  thresholds: PhaseThresholds = DEFAULT_PHASE_THRESHOLDS,
): GamePhase {
  if (aliveCount <= thresholds.suddenDeathAt) return 'sudden_death';
  if (aliveCount <= thresholds.finalAt) return 'final_four';

  const total = startingCount > 0 ? startingCount : aliveCount;
  const share = aliveCount / total;

  if (share <= thresholds.bloodbathAtShare) return 'bloodbath';
  if (share <= thresholds.dangerAtShare) return 'danger';
  return 'chaos';
}
