/**
 * 💀 Death Mark activation — PROJECT_SPEC.md §11.6
 *
 * Lifecycle (AGENTS.md §7.8):
 *
 *   acquired    the Death Mark Fate applies it to the selected player
 *   displayed   💀 badge beside the name in the status panel
 *   triggers    the next time the Main Wheel selects that player
 *   removed     on activation, always — even when Shield absorbs the attack
 *   Shield      yes, Shield blocks the attack (spec §11.6, §38)
 *   Revive      yes, revival clears it (handled in eventResolver)
 *   Fate Swap   post-MVP; the status is movable in principle
 *   persists    across rounds until it triggers
 *
 * When it triggers the Fate Wheel is skipped entirely — the mark IS the round's
 * outcome.
 */

import type { GameEvent } from '../events/eventTypes';
import type { StatusTrigger } from './statusTriggers';
import { attackPlayer } from '../engine/attack';

export const deathMarkTrigger: StatusTrigger = {
  id: 'death_mark',

  isTriggered: (player) => player.deathMark,

  resolve: (context, playerId): GameEvent[] => {
    const player = context.state.players.find((candidate) => candidate.id === playerId);
    const name = player?.name ?? 'Player';

    return [
      { type: 'SHOW_MESSAGE', message: `💀 DEATH MARK — ${name}` },
      { type: 'WAIT_FOR_HOST' },
      // Removed before the attack so the mark is spent even if Shield absorbs it.
      { type: 'REMOVE_DEATH_MARK', playerId },
      ...attackPlayer(context.state, playerId, 'death_mark'),
    ];
  },
};
