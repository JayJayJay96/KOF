/**
 * 🧱 Wall — PROJECT_SPEC.md §11.2
 *
 * Grants one Wall charge. MVP maximum stack is 1; the cap is enforced when
 * ADD_WALL is applied, so every future source of Wall inherits it.
 *
 * Weights live in `config/abilityWeights.ts`.
 */

import type { AbilityDefinition } from '../types/ability';

export const wallAbility: AbilityDefinition = {
  id: 'wall',
  name: 'Wall',
  icon: '🧱',
  category: 'defense',
  mandatory: true,

  isAvailable: () => true,

  resolve: (_context, selectedPlayerId) => [{ type: 'ADD_WALL', playerId: selectedPlayerId }],

  // Worth stating when it is wasted: the cap is invisible otherwise, and a
  // second Wall landing on an already-walled player looks like a bug.
  describeStakes: (context, selectedPlayerId) => {
    const player = context.state.players.find((candidate) => candidate.id === selectedPlayerId);
    if (!player) return null;

    return player.wall > 0
      ? `${player.name} already has a Wall up — this one is wasted.`
      : `${player.name} gets cover.`;
  },
};
