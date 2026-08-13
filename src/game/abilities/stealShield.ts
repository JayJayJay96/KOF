/**
 * 🪝 Steal Shield — PROJECT_SPEC.md §12
 *
 * Take a Shield from another player and wear it yourself.
 *
 * Promoted from Post-MVP after playtesting: only ~21% of rolls involved a
 * second player, and those were the moments people actually reacted to. This
 * is the cheapest way to add another, because it needs no target spin — the
 * victim is whoever is actually holding a Shield.
 *
 * Unavailable unless someone is holding one, so it is almost never a no-op.
 * The thief's own Shield is irrelevant: a second one is still capped at the MVP
 * maximum of 1, but the victim loses theirs regardless, which is the point.
 */

import type { AbilityDefinition } from '../types/ability';
import type { GameEvent } from '../events/eventTypes';
import type { GamePhase } from '../types/game';
import type { Player } from '../types/player';
import { randomItem } from '../../utils/random';

const WEIGHTS: Record<GamePhase, number> = {
  chaos: 9,
  danger: 8,
  final_five: 6,
  sudden_death: 6,
};

/** Living players other than the thief who currently hold a Shield. */
function shieldedVictims(players: readonly Player[], thiefId: string): Player[] {
  return players.filter(
    (player) => player.id !== thiefId && player.status === 'alive' && player.shield > 0,
  );
}

export const stealShieldAbility: AbilityDefinition = {
  id: 'steal_shield',
  name: 'Steal Shield',
  icon: '🪝',
  category: 'chaos',

  // Somebody has to be carrying one. The thief may turn out to be that
  // somebody, which `resolve` handles.
  isAvailable: (context) => context.alivePlayers.some((player) => player.shield > 0),

  getWeight: (phase) => WEIGHTS[phase],

  resolve: (context, selectedPlayerId): GameEvent[] => {
    const thief = context.state.players.find((player) => player.id === selectedPlayerId);
    const victim = randomItem(shieldedVictims(context.state.players, selectedPlayerId));

    // Availability is recomputed before every Fate spin, but the only shielded
    // player can be the thief. Say so rather than silently doing nothing.
    if (!victim) {
      return [{ type: 'SHOW_MESSAGE', message: 'Nothing left to steal.' }];
    }

    return [
      {
        type: 'SHOW_MESSAGE',
        message: `${thief?.name ?? 'Player'} steals ${victim.name}'s Shield`,
      },
      { type: 'REMOVE_SHIELD', playerId: victim.id },
      { type: 'ADD_SHIELD', playerId: selectedPlayerId },
    ];
  },

  // The victim is rolled at resolution, so count them rather than name one —
  // except when there is only one, where naming them spoils nothing.
  describeStakes: (context, selectedPlayerId) => {
    const thief = context.state.players.find((player) => player.id === selectedPlayerId);
    if (!thief) return null;

    const victims = shieldedVictims(context.state.players, selectedPlayerId);
    if (victims.length === 0) return `${thief.name} finds nothing left to steal.`;
    if (victims.length === 1) return `${thief.name} takes ${victims[0].name}'s 🛡 Shield.`;

    return `${thief.name} takes a 🛡 Shield — ${victims.length} on the board to choose from.`;
  },
};
