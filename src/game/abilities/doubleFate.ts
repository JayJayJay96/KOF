/**
 * 🎰 Double Fate — PROJECT_SPEC.md §12
 *
 * Rolls two other Fates and applies both, in order.
 *
 * Replaces Again, which was 8.9% of rolls and changed nothing — it re-rolled
 * without adding content. Double Fate takes the same "spin again" energy and
 * makes it the most explosive outcome on the wheel instead of the emptiest.
 *
 * CONFLICT RULES (spec §12 requires these be explicit before shipping):
 *
 *   - Both Fates resolve in the order drawn, through the normal event queue.
 *     Shield then Eliminate means the Shield is up in time to absorb the hit;
 *     Eliminate then Shield means the player is already gone and the Shield is
 *     discarded, because `eventResolver` refuses to arm an eliminated player.
 *   - Eliminate twice cannot happen: draws are without replacement.
 *   - A Fate whose target is already dead simply produces no events, because
 *     `attackPlayer` returns nothing for a non-alive target.
 *
 * EXCLUSIONS:
 *
 *   - Itself, which would recurse.
 *   - Any Fate needing a target spin (Hunter, Duel). The engine tracks ONE
 *     pending target spin at a time, so two would overwrite each other and
 *     strand the first ability mid-resolution. This is a real limitation, not
 *     an oversight — revisit if the queue ever supports stacked target requests.
 */

import type { AbilityDefinition } from '../types/ability';
import type { GameEvent } from '../events/eventTypes';
import type { GamePhase } from '../types/game';
import { shuffle } from '../../utils/random';

const WEIGHTS: Record<GamePhase, number> = {
  chaos: 8,
  danger: 8,
  final_five: 6,
  // Excluded from Sudden Death: with two players left, two stacked Fates can
  // produce an ending nobody can follow.
  sudden_death: 0,
};

export const DOUBLE_FATE_ID = 'double_fate';

export const doubleFateAbility: AbilityDefinition = {
  id: DOUBLE_FATE_ID,
  name: 'Double Fate',
  icon: '🎰',
  category: 'chaos',

  isAvailable: (context) => context.alivePlayers.length >= 2,

  getWeight: (phase) => WEIGHTS[phase],

  resolve: (context, selectedPlayerId): GameEvent[] => {
    const pool = getCompatiblePool(context);

    const picks = shuffle(pool).slice(0, 2);
    if (picks.length < 2) {
      return [{ type: 'SHOW_MESSAGE', message: 'DOUBLE FATE fizzles — nothing to pair.' }];
    }

    return [
      { type: 'SHOW_MESSAGE', message: `DOUBLE FATE — ${picks[0].name} + ${picks[1].name}` },
      { type: 'WAIT_FOR_HOST' },
      ...picks.flatMap((ability) => ability.resolve(context, selectedPlayerId)),
    ];
  },
};

/**
 * Fates this may pair, resolved live so phase availability is respected.
 *
 * Assigned by the registry at module load to avoid a static import cycle.
 */
let poolProvider:
  ((context: Parameters<AbilityDefinition['resolve']>[0]) => AbilityDefinition[]) | null = null;

export function setDoubleFatePoolProvider(
  provider: (context: Parameters<AbilityDefinition['resolve']>[0]) => AbilityDefinition[],
): void {
  poolProvider = provider;
}

function getCompatiblePool(
  context: Parameters<AbilityDefinition['resolve']>[0],
): AbilityDefinition[] {
  return poolProvider ? poolProvider(context) : [];
}
