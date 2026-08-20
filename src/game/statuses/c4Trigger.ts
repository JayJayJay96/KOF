/**
 * 🧨 C4 — the charge that sits still.
 *
 * Lifecycle (AGENTS.md §7.8):
 *
 *   acquired    the C4 Fate plants it on the selected player
 *   displayed   🧨 badge carrying the fuse, plus an orange rim on the wheel
 *   triggers    every Main Wheel selection while it is live
 *   removed     on defusal, on detonation, and on its holder's death to
 *               anything else (announced on the next selection)
 *   Wall        yes — a Wall saves the holder and each neighbour, and breaks
 *   Revive      revival returns a player clean, charge included
 *   Fate Swap   yes, the fuse moves with everything else
 *   persists    across rounds until it is defused or goes off
 *
 * WHY IT SITS STILL WHERE THE BOMB PASSED
 *
 * Wave 2 argued that a stationary countdown is a slower Death Mark: the holder
 * can do nothing about it and nobody else has a stake. Passing the bomb fixed
 * that. C4 fixes it a different way, and better:
 *
 *   the NEIGHBOURS have a stake   they can see what they are standing next to
 *   the HOLDER has a stake        being selected is the only way out
 *
 * That second one inverts the whole game for one player. Every other round the
 * wheel landing on you is dread. For the person holding this it is rescue —
 * and that beat exists nowhere else in KOF.
 *
 * It also fixes Bomb's measured flaw. 49% of bombs died with their holder and
 * the countdown simply stopped; Wave 2 patched that with an announcement. A C4
 * can only end by being defused or by going off, so a fuse ends out loud by
 * construction rather than by patch.
 *
 * WHY IT TICKS ON SELECTION RATHER THAN AT ROUND END
 *
 * There is exactly one Main Wheel selection per round, so the cadence is the
 * same either way. Ticking on selection keeps the countdown inside the trigger
 * registry, where every other status lives, instead of adding a special case
 * to the reducer.
 */

import type { GameEvent } from '../events/eventTypes';
import type { Player } from '../types/player';
import type { StatusTrigger } from './statusTriggers';
import { attackPlayer } from '../engine/attack';

/**
 * Rounds from planting to detonation.
 *
 * Being selected is the only escape, so the fuse length IS the escape
 * probability. At twelve alive a 3-round fuse gives roughly a 23% chance of
 * ever being picked, meaning three quarters of all charges take three people.
 * Five brings that to about 35% and leaves the countdown long enough to be
 * felt. Task 15 measures the real split over 200 games.
 */
export const C4_FUSE = 5;

/** The living player carrying a live charge, if anyone is. */
export function getC4Holder(players: readonly Player[]): Player | null {
  return players.find((player) => player.status === 'alive' && player.c4Fuse !== undefined) ?? null;
}

/**
 * A charge left on someone already eliminated by something else.
 *
 * Bomb measured this at roughly half of all cases. C4 should see far fewer,
 * because it does not move onto whoever is about to receive a Fate — but it
 * still happens, and a countdown that stops with nothing said is
 * indistinguishable from a bug.
 */
export function getAbandonedC4(players: readonly Player[]): Player | null {
  return players.find((player) => player.status !== 'alive' && player.c4Fuse !== undefined) ?? null;
}

export const c4Trigger: StatusTrigger = {
  id: 'c4',

  isTriggered: (_player, context) =>
    getC4Holder(context.state.players) !== null || getAbandonedC4(context.state.players) !== null,

  // Two outcomes own their round: the defusal and the blast. A tick that merely
  // counts down does not, or a live fuse would cost the game its Fate for five
  // consecutive rounds — the cutscene Wave 2 was built to avoid.
  replacesFate: (player, context) => {
    const holder = getC4Holder(context.state.players);
    if (!holder) return false;
    if (holder.id === player.id) return true;
    return (holder.c4Fuse ?? 0) <= 1;
  },

  resolve: (context, playerId): GameEvent[] => {
    const abandoned = getAbandonedC4(context.state.players);
    if (abandoned) {
      return [
        { type: 'CLEAR_C4' },
        {
          type: 'SHOW_MESSAGE',
          message: `🧨 The charge went up with ${abandoned.name} — the countdown is over`,
        },
      ];
    }

    const holder = getC4Holder(context.state.players);
    if (!holder) return [];

    // The wheel picked the person carrying it. For once, that is good news.
    //
    // WAIT_FOR_HOST before the charge is cleared, so the rescue gets its own
    // beat instead of passing in a single log line. This is the one moment in
    // the game where being selected saves you, and it is worth the pause.
    if (holder.id === playerId) {
      return [
        {
          type: 'SHOW_MESSAGE',
          message: `🧨 DEFUSED — the wheel found ${holder.name} with ${holder.c4Fuse} to spare`,
        },
        { type: 'WAIT_FOR_HOST' },
        { type: 'CLEAR_C4' },
      ];
    }

    const next = (holder.c4Fuse ?? 0) - 1;
    if (next > 0) {
      return [{ type: 'SET_C4', playerId: holder.id, fuse: next }];
    }

    // The radius was bound when the charge was planted, so any reordering since
    // then cannot have changed who is caught. Bound players who died in the
    // meantime are simply not here any more — the blast shrinks rather than
    // topping itself up from whoever moved in beside the holder.
    const caught = [
      holder,
      ...context.state.players.filter(
        (player) => player.status === 'alive' && player.c4Blast && player.id !== holder.id,
      ),
    ];

    return [
      { type: 'SET_C4', playerId: holder.id, fuse: 0 },
      { type: 'SHOW_MESSAGE', message: `🧨 TIME UP — ${holder.name} and everyone beside them` },
      { type: 'WAIT_FOR_HOST' },
      // Cleared before the blast, so the charge is spent even when a Wall
      // absorbs it. Same rule as the Death Mark.
      { type: 'CLEAR_C4' },
      ...caught.flatMap((victim) => attackPlayer(context.state, victim.id, 'c4')),
    ];
  },
};
