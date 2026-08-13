/**
 * 😇 Safe — PROJECT_SPEC.md §11.3
 *
 * Nothing harmful happens. It still emits an event so the round reads as a
 * deliberate outcome rather than "nothing happened", and so the history has a
 * record of it.
 */

import type { AbilityDefinition } from '../types/ability';
import type { GamePhase } from '../types/game';

const WEIGHTS: Record<GamePhase, number> = {
  chaos: 15,
  danger: 10,
  final_five: 5,
  sudden_death: 0,
};

export const safeAbility: AbilityDefinition = {
  id: 'safe',
  name: 'Safe',
  icon: '😇',
  category: 'neutral',

  isAvailable: () => true,

  getWeight: (phase) => WEIGHTS[phase],

  resolve: () => [{ type: 'SHOW_MESSAGE', message: 'SAFE! Not today.' }],

  describeStakes: (context, selectedPlayerId) => {
    const player = context.state.players.find((candidate) => candidate.id === selectedPlayerId);
    return player ? `${player.name} walks away clean.` : null;
  },
};
