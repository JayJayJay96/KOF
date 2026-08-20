/**
 * Default game configuration.
 *
 * Source of truth: PROJECT_SPEC.md §32 (shape). Default ability weights live in
 * `config/abilityWeights.ts` (PROJECT_SPEC.md §10.1-10.4) — this file only
 * carries the enabled flags and any host-tuned overrides.
 *
 * `double_kill` and `fate_swap` are listed but DISABLED: they appear in the
 * spec's Chaos/Danger tables yet are Post-MVP abilities (PROJECT_SPEC.md §12).
 */

import type { GameConfig } from '../types/game';
import { DEFAULT_PHASE_THRESHOLDS } from '../phases/phaseConfig';

export const DEFAULT_GAME_CONFIG: GameConfig = {
  preset: 'normal',

  phaseThresholds: DEFAULT_PHASE_THRESHOLDS,

  // Weights live in `config/abilityWeights.ts`. This map carries host overrides
  // only; an empty `weights` means "use the default table". Enhancement Phase 5
  // writes into it when the host tunes a Fate.
  abilities: {
    eliminate: { enabled: true, weights: {} },
    wall: { enabled: true, weights: {} },
    safe: { enabled: true, weights: {} },
    close_call: { enabled: true, weights: {} },
    hunter: { enabled: true, weights: {} },
    death_mark: { enabled: true, weights: {} },
    revive: { enabled: true, weights: {} },
    duel: { enabled: true, weights: {} },
    steal_wall: { enabled: true, weights: {} },
    double_fate: { enabled: true, weights: {} },
    bomb: { enabled: true, weights: {} },
    gale: { enabled: true, weights: {} },
    demolition: { enabled: true, weights: {} },
    fate_swap: { enabled: false, weights: {} },
    double_kill: { enabled: false, weights: {} },
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
