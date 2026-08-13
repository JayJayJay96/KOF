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
 */

import type { AbilityDefinition } from '../types/ability';
import type { GameEvent } from '../events/eventTypes';
import type { GamePhase } from '../types/game';

const WEIGHTS: Record<GamePhase, number> = {
  chaos: 10,
  danger: 8,
  final_five: 6,
  sudden_death: 8,
};

export const closeCallAbility: AbilityDefinition = {
  id: 'close_call',
  name: 'Close Call',
  icon: '😰',
  category: 'neutral',

  isAvailable: () => true,

  getWeight: (phase) => WEIGHTS[phase],

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
};
