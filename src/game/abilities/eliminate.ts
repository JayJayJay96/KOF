/**
 * ☠ Eliminate — PROJECT_SPEC.md §11.1
 *
 * The selected player receives an elimination attack. Shield blocks it.
 * The Shield interaction is not implemented here: it lives in the shared
 * attack flow (AGENTS.md §7.7).
 */

import type { AbilityDefinition } from '../types/ability';
import type { GamePhase } from '../types/game';
import { attackPlayer } from '../engine/attack';

const WEIGHTS: Record<GamePhase, number> = {
  chaos: 25,
  danger: 30,
  final_five: 40,
  sudden_death: 55,
};

export const eliminateAbility: AbilityDefinition = {
  id: 'eliminate',
  name: 'Eliminate',
  icon: '☠',
  category: 'attack',

  isAvailable: () => true,

  getWeight: (phase) => WEIGHTS[phase],

  resolve: (context, selectedPlayerId) =>
    attackPlayer(context.state, selectedPlayerId, 'eliminate'),

  // The Shield check is the whole story here, and it is already on the board —
  // saying it out loud turns a foregone conclusion into a visible reprieve.
  describeStakes: (context, selectedPlayerId) => {
    const player = context.state.players.find((candidate) => candidate.id === selectedPlayerId);
    if (!player) return null;

    return player.shield > 0
      ? `${player.name} is hit — 🛡 the Shield takes it.`
      : `${player.name} is hit, with nothing to stop it.`;
  },
};
