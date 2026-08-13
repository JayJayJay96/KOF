/**
 * 🛡 Shield — PROJECT_SPEC.md §11.2
 *
 * Grants one Shield charge. MVP maximum stack is 1; the cap is enforced when
 * ADD_SHIELD is applied, so every future source of Shield inherits it.
 */

import type { AbilityDefinition } from '../types/ability';
import type { GamePhase } from '../types/game';

const WEIGHTS: Record<GamePhase, number> = {
  chaos: 15,
  danger: 10,
  final_five: 10,
  sudden_death: 15,
};

export const shieldAbility: AbilityDefinition = {
  id: 'shield',
  name: 'Shield',
  icon: '🛡',
  category: 'defense',

  isAvailable: () => true,

  getWeight: (phase) => WEIGHTS[phase],

  resolve: (_context, selectedPlayerId) => [{ type: 'ADD_SHIELD', playerId: selectedPlayerId }],

  // Worth stating when it is wasted: the cap is invisible otherwise, and a
  // second Shield landing on an already-shielded player looks like a bug.
  describeStakes: (context, selectedPlayerId) => {
    const player = context.state.players.find((candidate) => candidate.id === selectedPlayerId);
    if (!player) return null;

    return player.shield > 0
      ? `${player.name} already holds a Shield — this one is wasted.`
      : `${player.name} gets armour.`;
  },
};
