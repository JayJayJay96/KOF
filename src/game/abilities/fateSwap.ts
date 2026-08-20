/**
 * 🔄 Fate Swap — PROJECT_SPEC.md §12
 *
 * Everything the selected player is carrying trades places with everything
 * another living player is carrying. Walls, marks and live charges all move.
 *
 * Guardrail checklist (DEVELOPMENT_ROADMAP.md §8, Guardrail 6):
 *
 *   eligibility   at least one status exists somewhere on the board
 *   weight        config/abilityWeights.ts
 *   target rules  a random living player who is not the selected one
 *   resolution    a single SWAP_STATUSES event
 *   Wall          moved, not spent
 *   phases        Chaos through Final Four
 *   edge cases    a swap of nothing is possible but rare, and is narrated
 *
 * Promoted from post-MVP, replacing the old Steal Shield. Both are two-player
 * Fates — the category playtesting showed produces every reaction, measured at
 * only ~21% of rolls before Wave 1 — but this one is valence-neutral, which is
 * why it is also the honest home for moving a live charge. "Steal the C4" as its own Fate
 * would be a name that is sometimes a gain and sometimes suicide.
 *
 * WHY THE PARTNER IS CHOSEN, NOT SPUN FOR
 *
 * The engine tracks one pending target spin at a time, and Hunter, Duel and
 * Gale already use it. A fourth would lengthen rounds and shrink what Double
 * Fate is allowed to pair.
 *
 * Weights live in `config/abilityWeights.ts`.
 */

import type { AbilityDefinition } from '../types/ability';
import type { GameEvent } from '../events/eventTypes';
import type { Player } from '../types/player';
import { randomItem } from '../../utils/random';

function hasStatus(player: Player): boolean {
  return player.wall > 0 || player.deathMark || player.c4Fuse !== undefined;
}

function sameStatuses(a: Player, b: Player): boolean {
  return a.wall === b.wall && a.deathMark === b.deathMark && a.c4Fuse === b.c4Fuse;
}

/**
 * Living players other than the selected one, preferring those who would
 * actually change hands.
 *
 * Availability is board-level — in a dual spin the Fate is chosen while
 * `currentPlayerId` is still null — so it cannot guarantee the pair differs.
 * Preferring a partner who differs makes a swap of nothing rare rather than
 * impossible.
 */
function partnersFor(players: readonly Player[], selectedId: string): Player[] {
  const others = players.filter((player) => player.status === 'alive' && player.id !== selectedId);
  const selected = players.find((player) => player.id === selectedId);
  if (!selected) return others;

  const different = others.filter((player) => !sameStatuses(player, selected));
  return different.length > 0 ? different : others;
}

export const fateSwapAbility: AbilityDefinition = {
  id: 'fate_swap',
  name: 'Fate Swap',
  icon: '🔄',
  category: 'chaos',

  isAvailable: (context) => context.alivePlayers.some(hasStatus),

  resolve: (context, selectedPlayerId): GameEvent[] => {
    const selected = context.state.players.find((player) => player.id === selectedPlayerId);
    const partner = randomItem(partnersFor(context.state.players, selectedPlayerId));

    if (!selected || !partner) {
      return [{ type: 'SHOW_MESSAGE', message: '🔄 Nobody to trade with.' }];
    }

    const message = sameStatuses(selected, partner)
      ? `🔄 ${selected.name} and ${partner.name} trade fates — and nothing changes`
      : `🔄 ${selected.name} and ${partner.name} trade fates`;

    return [
      { type: 'SHOW_MESSAGE', message },
      { type: 'SWAP_STATUSES', playerId: selectedPlayerId, otherPlayerId: partner.id },
    ];
  },

  // The partner is rolled at resolution, so it cannot be named here without
  // spoiling it. What the selected player is putting on the table is already
  // visible on the wheel rims, so saying that much is safe.
  describeStakes: (context, selectedPlayerId) => {
    const selected = context.state.players.find((player) => player.id === selectedPlayerId);
    if (!selected) return null;

    const carried: string[] = [];
    if (selected.wall > 0) carried.push('🧱 Wall');
    if (selected.deathMark) carried.push('💀 Death Mark');
    if (selected.c4Fuse !== undefined) carried.push('🧨 C4');

    return carried.length === 0
      ? `${selected.name} has nothing to give — and takes whatever the other has.`
      : `${selected.name} gives up ${carried.join(' + ')} for whatever comes back.`;
  },
};
