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
 * Derive the current phase from the number of alive players.
 *
 * An alive count of 1 or 0 still reports 'sudden_death'; winner detection is
 * the engine's responsibility, not the phase resolver's.
 */
export function resolvePhase(
  aliveCount: number,
  thresholds: PhaseThresholds = DEFAULT_PHASE_THRESHOLDS,
): GamePhase {
  if (aliveCount <= thresholds.suddenDeathAt) return 'sudden_death';
  if (aliveCount <= thresholds.finalAt) return 'final_five';
  if (aliveCount <= thresholds.dangerAt) return 'danger';
  return 'chaos';
}
