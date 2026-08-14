/**
 * Automatic phase resolution.
 *
 * Source of truth: PROJECT_SPEC.md §10 and §38 ("Revive after phase threshold
 * change"). Phase is derived from the alive count only, so it may move BACKWARD
 * after a Revive — this is the intended MVP behaviour.
 */

import type { GamePhase, PhaseThresholds } from '../types/game';
import { DEFAULT_PHASE_THRESHOLDS } from './phaseConfig';

export type ResolvePhaseArgs = {
  aliveCount: number;
  startingCount: number;
  thresholds?: PhaseThresholds;
};

/**
 * Derive the current phase from how many players are left, relative to how many
 * there were at the start.
 *
 * Named arguments on purpose: `aliveCount` and `startingCount` are both plain
 * numbers, so a positional `(aliveCount, startingCount)` pair is silently
 * swappable — a transposition still type-checks and produces a plausible but
 * wrong phase (a large roster read as permanently Chaos, or the reverse). An
 * object with named keys makes that mistake a visible diff instead of a
 * runtime surprise.
 *
 * An alive count of 1 or 0 still reports 'sudden_death'; winner detection is
 * the engine's responsibility, not the phase resolver's.
 *
 * `startingCount` of 0 is not a real case at the one production call site (an
 * empty roster never reaches this function), but the arithmetic is still
 * well-defined if it happens: `aliveCount / 0` is `Infinity`, or `NaN` if
 * `aliveCount` is also 0, and both fail every `<=` band comparison below, so
 * the cascade falls through to 'chaos' — the correct answer for a game that
 * has not started.
 */
export function resolvePhase({
  aliveCount,
  startingCount,
  thresholds = DEFAULT_PHASE_THRESHOLDS,
}: ResolvePhaseArgs): GamePhase {
  if (aliveCount <= thresholds.suddenDeathAt) return 'sudden_death';
  if (aliveCount <= thresholds.finalAt) return 'final_four';

  const share = aliveCount / startingCount;

  if (share <= thresholds.bloodbathAtShare) return 'bloodbath';
  if (share <= thresholds.dangerAtShare) return 'danger';
  return 'chaos';
}
