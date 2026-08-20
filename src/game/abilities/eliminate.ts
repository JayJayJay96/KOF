/**
 * ☠ Eliminate — PROJECT_SPEC.md §11.1
 *
 * The selected player receives an elimination attack. A Wall blocks it.
 * The Wall interaction is not implemented here: it lives in the shared
 * attack flow (AGENTS.md §7.7).
 *
 * Weights live in `config/abilityWeights.ts`.
 */

import type { AbilityDefinition } from '../types/ability';
import { attackPlayer } from '../engine/attack';

export const eliminateAbility: AbilityDefinition = {
  id: 'eliminate',
  name: 'Eliminate',
  icon: '☠',
  category: 'attack',
  mandatory: true,

  isAvailable: () => true,

  resolve: (context, selectedPlayerId) =>
    attackPlayer(context.state, selectedPlayerId, 'eliminate'),

  // The Wall check is the whole story here, and it is already on the board —
  // saying it out loud turns a foregone conclusion into a visible reprieve.
  describeStakes: (context, selectedPlayerId) => {
    const player = context.state.players.find((candidate) => candidate.id === selectedPlayerId);
    if (!player) return null;

    return player.wall > 0
      ? `${player.name} is hit — 🧱 the Wall takes it.`
      : `${player.name} is hit, with nothing to stop it.`;
  },
};
