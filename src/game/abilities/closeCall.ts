/**
 * 😰 Close Call
 *
 * Added after Phase 7 playtesting. Safe was 10.5% of all rolls and changed
 * nothing — on a stream that is dead air with nothing to react to.
 *
 * Close Call keeps the relief but always leaves a mark on the board:
 *
 * ```text
 * has a Shield  ->  the Shield is destroyed absorbing the graze
 * no Shield     ->  survives, but picks up a Death Mark
 * ```
 *
 * That branch is what keeps it distinct from Death Mark rather than a reskin of
 * it: for a shielded player it is a real loss with no lingering threat, and for
 * an exposed player it is survival bought on credit.
 *
 * Either way the player lives, so it still reads as relief in the moment.
 *
 * Weights live in `config/abilityWeights.ts`.
 */

import type { AbilityDefinition } from '../types/ability';
import type { GameEvent } from '../events/eventTypes';

export const closeCallAbility: AbilityDefinition = {
  id: 'close_call',
  name: 'Close Call',
  icon: '😰',
  category: 'neutral',

  isAvailable: () => true,

  resolve: (context, selectedPlayerId): GameEvent[] => {
    const player = context.state.players.find((candidate) => candidate.id === selectedPlayerId);
    const name = player?.name ?? 'Player';

    if (player && player.shield > 0) {
      return [
        { type: 'SHOW_MESSAGE', message: `CLOSE CALL — ${name}'s Shield takes it` },
        { type: 'REMOVE_SHIELD', playerId: selectedPlayerId },
      ];
    }

    return [
      { type: 'SHOW_MESSAGE', message: `CLOSE CALL — ${name} survives, but is marked` },
      { type: 'ADD_DEATH_MARK', playerId: selectedPlayerId },
    ];
  },

  // The branch is the point of this Fate, so the forecast has to show it —
  // otherwise "Close Call" reads as pure relief right up until it is not.
  describeStakes: (context, selectedPlayerId) => {
    const player = context.state.players.find((candidate) => candidate.id === selectedPlayerId);
    if (!player) return null;

    return player.shield > 0
      ? `${player.name} lives — 🛡 the Shield is destroyed absorbing it.`
      : `${player.name} lives — and picks up a 💀 Death Mark for it.`;
  },
};
