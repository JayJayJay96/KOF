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
    // Rebalanced after Phase 7 playtesting. Measured over 5,220 rolls, the old
    // spread left 19.4% of rolls changing nothing (Safe + Again) while only
    // 20.7% involved a second player — and the two-player Fates were where all
    // the reactions came from. These weights cut dead air to roughly 4% and
    // push two-player Fates toward 35%.
    eliminate: {
      enabled: true,
      weights: { chaos: 22, danger: 28, final_five: 34, sudden_death: 50 },
    },
    shield: {
      enabled: true,
      weights: { chaos: 10, danger: 8, final_five: 8, sudden_death: 12 },
    },
    // Pure relief, now rare. Kept because if EVERY roll matters the tension
    // flatlines — an occasional clean escape is what makes the rest land.
    safe: {
      enabled: true,
      weights: { chaos: 4, danger: 3, final_five: 2, sudden_death: 0 },
    },
    close_call: {
      enabled: true,
      weights: { chaos: 10, danger: 8, final_five: 6, sudden_death: 8 },
    },
    hunter: {
      enabled: true,
      weights: { chaos: 15, danger: 16, final_five: 18, sudden_death: 20 },
    },
    death_mark: {
      enabled: true,
      weights: { chaos: 10, danger: 10, final_five: 8, sudden_death: 0 },
    },
    revive: {
      enabled: true,
      weights: { chaos: 6, danger: 4, final_five: 0, sudden_death: 0 },
    },
    duel: {
      enabled: true,
      weights: { chaos: 13, danger: 14, final_five: 16, sudden_death: 0 },
    },
    steal_shield: {
      enabled: true,
      weights: { chaos: 9, danger: 8, final_five: 6, sudden_death: 6 },
    },
    double_fate: {
      enabled: true,
      weights: { chaos: 8, danger: 8, final_five: 6, sudden_death: 0 },
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

  // Both wheels together by default. Sequential spinning cost ~12.9s of
  // animation per round, roughly 12 minutes of watching wheels turn across a
  // 20-player game. Overlapping them removes about 5s a round while keeping the
  // WHO -> WHAT reveal order. The host can turn it off mid-game.
  simultaneousSpin: true,

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
