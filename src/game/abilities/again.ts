/**
 * 🔄 Again — PROJECT_SPEC.md §11.4
 *
 * The same player stays selected and the host spins the Fate Wheel again.
 * Explicitly does NOT auto-spin: it emits REQUEST_FATE_SPIN, which returns
 * control to the host (spec §11.4, AGENTS.md §8).
 *
 * Repeated Again results are allowed (spec §38).
 */

import type { AbilityDefinition } from '../types/ability';
import type { GamePhase } from '../types/game';

const WEIGHTS: Record<GamePhase, number> = {
  chaos: 10,
  danger: 7,
  final_five: 5,
  sudden_death: 10,
};

export const againAbility: AbilityDefinition = {
  id: 'again',
  name: 'Again',
  icon: '🔄',
  category: 'chaos',

  isAvailable: () => true,

  getWeight: (phase) => WEIGHTS[phase],

  resolve: () => [
    { type: 'SHOW_MESSAGE', message: 'AGAIN! Spin Fate once more.' },
    { type: 'REQUEST_FATE_SPIN', purpose: 'again' },
  ],
};
