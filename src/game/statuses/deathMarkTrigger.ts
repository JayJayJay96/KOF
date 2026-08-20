/**
 * 💀 Death Mark activation — PROJECT_SPEC.md §11.6
 *
 * Lifecycle (AGENTS.md §7.8):
 *
 *   acquired    the Death Mark Fate applies it to the selected player
 *   displayed   💀 badge beside the name in the status panel
 *   triggers    the next time the Main Wheel selects that player
 *   removed     on activation, always — even when Wall absorbs the attack
 *   Wall        yes, Wall blocks the attack (spec §11.6, §38)
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

  // Always. The mark IS the round's outcome, which is why the Fate Wheel is
  // skipped entirely when it fires.
  replacesFate: () => true,

  resolve: (context, playerId): GameEvent[] => {
    const player = context.state.players.find((candidate) => candidate.id === playerId);
    const name = player?.name ?? 'Player';

    // A marked player skips the Fate Wheel, so this message IS the round's
    // narration and has to carry the Wall check with it. Without that, the
    // most confusing moment in the game — "the mark fired and he lived?" — has
    // nothing on screen explaining itself. The pause below is where the room
    // reacts, so the answer must already be visible when it starts.
    const headline =
      player && player.wall > 0
        ? `💀 DEATH MARK — ${name}, but 🧱 the Wall stands in the way`
        : `💀 DEATH MARK — ${name}, with nothing to stop it`;

    return [
      { type: 'SHOW_MESSAGE', message: headline },
      { type: 'WAIT_FOR_HOST' },
      // Removed before the attack so the mark is spent even if Wall absorbs it.
      { type: 'REMOVE_DEATH_MARK', playerId },
      ...attackPlayer(context.state, playerId, 'death_mark'),
    ];
  },
};
