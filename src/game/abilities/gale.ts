/**
 * 💨 Gale
 *
 * The wind picks a spot. Whoever is standing there dies IF they are behind a
 * Wall — it comes down on top of them. Anyone caught in the open is untouched.
 *
 * Guardrail checklist (DEVELOPMENT_ROADMAP.md §8, Guardrail 6):
 *
 *   eligibility   at least two living players are behind a Wall
 *   weight        config/abilityWeights.ts
 *   target rules  a spin across EVERY living player, excluding nobody
 *   resolution    walled -> piercing attack; unwalled -> nothing
 *   Wall          inverted: the Wall is the cause of death, not a defence
 *   phases        all five, rising as the game gets smaller
 *   edge cases    a miss is narrated rather than silent
 *
 * WHY IT CAN HIT THE PLAYER WHO ROLLED IT
 *
 * Hunter and Duel exclude the initiator because hunting yourself is incoherent
 * and a duel needs two people. A gale catching the person who called it is
 * perfectly coherent, and it is the best outcome the game can produce: a
 * player behind a Wall who rolls this is in immediate danger from their own
 * Fate.
 *
 * WHY IT IS ALLOWED TO MISS
 *
 * Most spins hit open ground and nothing happens, which looks like the dead
 * air Wave 1 was built to remove. It is not the same thing. Safe put nothing
 * at risk; here every walled player is publicly at risk for the length of a
 * spin, and the miss is the release. The whiff rate is measured rather than
 * assumed — Task 15 reports it over 200 games. If it is too high the answer is
 * a lower weight, not a different mechanic.
 *
 * Weights live in `config/abilityWeights.ts`.
 */

import type { AbilityDefinition } from '../types/ability';
import type { GameEvent } from '../events/eventTypes';
import type { Player } from '../types/player';
import { attackPlayer } from '../engine/attack';

/** Below this, a spin has one lonely candidate and no tension. */
const MIN_WALLS = 2;

function walledPlayers(players: readonly Player[]): Player[] {
  return players.filter((player) => player.status === 'alive' && player.wall > 0);
}

export const galeAbility: AbilityDefinition = {
  id: 'gale',
  name: 'Gale',
  icon: '💨',
  category: 'attack',

  isAvailable: (context) => walledPlayers(context.state.players).length >= MIN_WALLS,

  resolve: (): GameEvent[] => [
    { type: 'SHOW_MESSAGE', message: '💨 A GALE rips across the board' },
    // Nobody is excluded: the wind does not care who called it.
    { type: 'REQUEST_PLAYER_SPIN', purpose: 'gale', excludePlayerIds: [] },
  ],

  resolveTargetSpin: (context, _selectedPlayerId, targetPlayerId): GameEvent[] => {
    const target = context.state.players.find((player) => player.id === targetPlayerId);
    if (!target) return [];

    if (target.wall <= 0) {
      return [
        {
          type: 'SHOW_MESSAGE',
          message: `💨 The gust passes over ${target.name} — nothing to catch`,
        },
      ];
    }

    return [
      { type: 'SHOW_MESSAGE', message: `🧱 ${target.name}'s Wall comes down on top of them` },
      { type: 'WAIT_FOR_HOST' },
      // Pierced: the Wall is what kills them, so it cannot also block.
      ...attackPlayer(context.state, targetPlayerId, 'gale', { pierce: true }),
    ];
  },

  // Names who is at risk without naming who is hit — the spin has not happened.
  describeStakes: (context) => {
    const walled = walledPlayers(context.state.players);
    if (walled.length === 0) return null;

    return `💨 The wind is coming. ${walled.length} still standing behind a 🧱 Wall.`;
  },
};
