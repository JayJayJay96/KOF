/**
 * Default game configuration.
 *
 * Source of truth: PROJECT_SPEC.md §32 (shape) and §10.1-10.4 (weight tables).
 *
 * These weights are DATA ONLY. No ability implementation exists yet — the
 * ability registry arrives in Phase 3. Recording the spec's tables here now
 * keeps the numbers in one place and out of future component code.
 *
 * `double_kill` and `fate_swap` are listed but DISABLED: they appear in the
 * spec's Chaos/Danger tables yet are Post-MVP abilities (PROJECT_SPEC.md §12).
 */

import type { GameConfig } from '../types/game';
import { DEFAULT_PHASE_THRESHOLDS } from '../phases/phaseConfig';

export const DEFAULT_GAME_CONFIG: GameConfig = {
  preset: 'normal',

  phaseThresholds: DEFAULT_PHASE_THRESHOLDS,

  abilities: {
    eliminate: {
      enabled: true,
      weights: { chaos: 25, danger: 30, final_five: 40, sudden_death: 55 },
    },
    shield: {
      enabled: true,
      weights: { chaos: 15, danger: 10, final_five: 10, sudden_death: 15 },
    },
    safe: {
      enabled: true,
      weights: { chaos: 15, danger: 10, final_five: 5, sudden_death: 0 },
    },
    again: {
      enabled: true,
      weights: { chaos: 10, danger: 7, final_five: 5, sudden_death: 10 },
    },
    hunter: {
      enabled: true,
      weights: { chaos: 10, danger: 12, final_five: 15, sudden_death: 20 },
    },
    death_mark: {
      enabled: true,
      weights: { chaos: 8, danger: 10, final_five: 10, sudden_death: 0 },
    },
    revive: {
      enabled: true,
      weights: { chaos: 7, danger: 5, final_five: 0, sudden_death: 0 },
    },
    duel: {
      enabled: true,
      weights: { chaos: 5, danger: 10, final_five: 15, sudden_death: 0 },
    },

    // Post-MVP (PROJECT_SPEC.md §12) — weights recorded, ability disabled.
    fate_swap: {
      enabled: false,
      weights: { chaos: 5, danger: 0, final_five: 0, sudden_death: 0 },
    },
    double_kill: {
      enabled: false,
      weights: { chaos: 0, danger: 6, final_five: 0, sudden_death: 0 },
    },
  },

  animationSpeed: 'normal',

  audio: {
    master: 0.8,
    music: 0.5,
    sfx: 0.8,
    muted: false,
  },
};

/** Deep copy so a running game never shares mutable state with the default. */
export function createDefaultGameConfig(): GameConfig {
  return structuredClone(DEFAULT_GAME_CONFIG);
}
