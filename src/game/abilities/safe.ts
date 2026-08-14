/**
 * 😇 Safe — PROJECT_SPEC.md §11.3
 *
 * Nothing harmful happens. It still emits an event so the round reads as a
 * deliberate outcome rather than "nothing happened", and so the history has a
 * record of it.
 *
 * Weights live in `config/abilityWeights.ts`.
 */

import type { AbilityDefinition } from '../types/ability';

export const safeAbility: AbilityDefinition = {
  id: 'safe',
  name: 'Safe',
  icon: '😇',
  category: 'neutral',

  isAvailable: () => true,

  resolve: () => [{ type: 'SHOW_MESSAGE', message: 'SAFE! Not today.' }],

  describeStakes: (context, selectedPlayerId) => {
    const player = context.state.players.find((candidate) => candidate.id === selectedPlayerId);
    return player ? `${player.name} walks away clean.` : null;
  },
};
