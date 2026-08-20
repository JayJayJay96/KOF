/**
 * 🔨 Demolition
 *
 * Every Wall on the board comes down. Nobody is hurt.
 *
 * Guardrail checklist (DEVELOPMENT_ROADMAP.md §8, Guardrail 6):
 *
 *   eligibility   at least one living player is behind a Wall
 *   weight        config/abilityWeights.ts
 *   target rules  none — global, and it takes the roller's own Wall too
 *   resolution    REMOVE_WALL for every walled living player
 *   Wall          it is the target
 *   phases        all five, steady
 *   edge cases    gated so it can never be a no-op
 *
 * The merciful opposite of Gale: same subject, walls coming down, but on
 * purpose and not on top of anyone. Together they make holding a Wall a real
 * decision rather than a free good — one Fate takes it, the other kills you
 * for having it.
 *
 * Available from a single Wall. There is no beneficiary, so unlike a theft it
 * still changes the board when only one is standing.
 *
 * Named Demolition rather than EMP because an electromagnetic pulse does
 * nothing to masonry — the Fate list already mixes metaphors enough without
 * one that actively contradicts its own subject.
 *
 * Weights live in `config/abilityWeights.ts`.
 */

import type { AbilityDefinition } from '../types/ability';
import type { GameEvent } from '../events/eventTypes';
import type { Player } from '../types/player';

function walledPlayers(players: readonly Player[]): Player[] {
  return players.filter((player) => player.status === 'alive' && player.wall > 0);
}

export const demolitionAbility: AbilityDefinition = {
  id: 'demolition',
  name: 'Demolition',
  icon: '🔨',
  category: 'chaos',

  isAvailable: (context) => walledPlayers(context.state.players).length > 0,

  resolve: (context): GameEvent[] => {
    const walled = walledPlayers(context.state.players);

    return [
      {
        type: 'SHOW_MESSAGE',
        message:
          walled.length === 1
            ? `🔨 DEMOLITION — ${walled[0].name}'s Wall comes down`
            : `🔨 DEMOLITION — all ${walled.length} Walls come down`,
      },
      ...walled.map((player): GameEvent => ({ type: 'REMOVE_WALL', playerId: player.id })),
    ];
  },

  describeStakes: (context) => {
    const walled = walledPlayers(context.state.players);
    if (walled.length === 0) return null;

    return walled.length === 1
      ? `${walled[0].name} loses their 🧱 Wall.`
      : `Every 🧱 Wall on the board falls — ${walled.length} of them.`;
  },
};
