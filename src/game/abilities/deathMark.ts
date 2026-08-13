/**
 * 💀 Death Mark — PROJECT_SPEC.md §11.6
 *
 * This file only APPLIES the mark. Activation is a status lifecycle rule and
 * lives in `statuses/deathMarkTrigger.ts`, because it fires on the marked
 * player's next Main Wheel selection rather than as a Fate outcome.
 *
 * Re-marking an already-marked player is allowed and is a no-op: ADD_DEATH_MARK
 * sets a boolean. Unavailable in Sudden Death, where its delayed payoff cannot
 * land before the game ends (weight 0 there).
 */

import type { AbilityDefinition } from '../types/ability';
import type { GamePhase } from '../types/game';

const WEIGHTS: Record<GamePhase, number> = {
  chaos: 8,
  danger: 10,
  final_five: 10,
  sudden_death: 0,
};

export const deathMarkAbility: AbilityDefinition = {
  id: 'death_mark',
  name: 'Death Mark',
  icon: '💀',
  category: 'attack',

  isAvailable: () => true,

  getWeight: (phase) => WEIGHTS[phase],

  resolve: (_context, selectedPlayerId) => [
    { type: 'ADD_DEATH_MARK', playerId: selectedPlayerId },
    { type: 'SHOW_MESSAGE', message: 'MARKED. The next selection is fatal.' },
  ],

  describeStakes: (context, selectedPlayerId) => {
    const player = context.state.players.find((candidate) => candidate.id === selectedPlayerId);
    if (!player) return null;

    // Re-marking is a no-op on a boolean, which looks like the game ignoring a
    // roll unless the readout says why.
    return player.deathMark
      ? `${player.name} is already Marked — nothing new lands.`
      : `${player.name} is Marked. Their next selection kills them.`;
  },
};
