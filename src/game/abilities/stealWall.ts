/**
 * 🪝 Steal Wall — PROJECT_SPEC.md §12
 *
 * Take a Wall from another player and put it up around yourself.
 *
 * Promoted from Post-MVP after playtesting: only ~21% of rolls involved a
 * second player, and those were the moments people actually reacted to. This
 * is the cheapest way to add another, because it needs no target spin — the
 * victim is whoever actually has one up.
 *
 * Unavailable unless someone has one up, so it is almost never a no-op.
 * The thief's own Wall is irrelevant: a second one is still capped at the MVP
 * maximum of 1, but the victim loses theirs regardless, which is the point.
 *
 * Weights live in `config/abilityWeights.ts`.
 */

import type { AbilityDefinition } from '../types/ability';
import type { GameEvent } from '../events/eventTypes';
import type { Player } from '../types/player';
import { randomItem } from '../../utils/random';

/** Living players other than the thief who currently have a Wall up. */
function walledVictims(players: readonly Player[], thiefId: string): Player[] {
  return players.filter(
    (player) => player.id !== thiefId && player.status === 'alive' && player.wall > 0,
  );
}

export const stealWallAbility: AbilityDefinition = {
  id: 'steal_wall',
  name: 'Steal Wall',
  icon: '🪝',
  category: 'chaos',

  // Somebody has to be carrying one. The thief may turn out to be that
  // somebody, which `resolve` handles.
  isAvailable: (context) => context.alivePlayers.some((player) => player.wall > 0),

  resolve: (context, selectedPlayerId): GameEvent[] => {
    const thief = context.state.players.find((player) => player.id === selectedPlayerId);
    const victim = randomItem(walledVictims(context.state.players, selectedPlayerId));

    // Availability is recomputed before every Fate spin, but the only walled
    // player can be the thief. Say so rather than silently doing nothing.
    if (!victim) {
      return [{ type: 'SHOW_MESSAGE', message: 'Nothing left to steal.' }];
    }

    return [
      {
        type: 'SHOW_MESSAGE',
        message: `${thief?.name ?? 'Player'} steals ${victim.name}'s Wall`,
      },
      { type: 'REMOVE_WALL', playerId: victim.id },
      { type: 'ADD_WALL', playerId: selectedPlayerId },
    ];
  },

  // The victim is rolled at resolution, so count them rather than name one —
  // except when there is only one, where naming them spoils nothing.
  describeStakes: (context, selectedPlayerId) => {
    const thief = context.state.players.find((player) => player.id === selectedPlayerId);
    if (!thief) return null;

    const victims = walledVictims(context.state.players, selectedPlayerId);
    if (victims.length === 0) return `${thief.name} finds nothing left to steal.`;
    if (victims.length === 1) return `${thief.name} takes ${victims[0].name}'s 🧱 Wall.`;

    return `${thief.name} takes a 🧱 Wall — ${victims.length} on the board to choose from.`;
  },
};
