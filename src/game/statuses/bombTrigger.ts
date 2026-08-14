/**
 * 💣 Bomb — PROJECT_SPEC.md §12
 *
 * A hot potato. Whoever the Main Wheel selects takes the bomb, and the fuse
 * drops by one. When the fuse runs out it goes off in the hands of whoever was
 * just selected.
 *
 * Lifecycle (AGENTS.md §7.8):
 *
 *   acquired    the Bomb Fate plants it on the selected player
 *   displayed   💣 badge with the fuse, plus an orange rim on the wheel
 *   triggers    EVERY Main Wheel selection while it is live — it passes
 *   removed     on detonation, and on its holder's elimination by anything else
 *   Shield      yes, Shield blocks the blast, via the shared attack flow
 *   Revive      revival returns a player clean, bomb included
 *   persists    across rounds until the fuse runs out
 *
 * WHY IT PASSES RATHER THAN SITTING STILL
 *
 * A bomb that stays put and counts down is a slower Death Mark: the holder can
 * do nothing about it and nobody else has a stake in it. Passing it to whoever
 * is selected inverts that. Every spin becomes "not me", the marker visibly
 * travels around the wheel, and on the last tick being selected simply kills
 * you. The whole table watches the same object for three rounds.
 *
 * A consequence worth stating plainly: because it moves every round, holding it
 * between ticks is not itself dangerous — the danger is being selected on the
 * final tick. The bomb is a countdown everyone can see, wearing someone's name.
 *
 * WHY THIS DOES NOT EAT THE ROUND
 *
 * Death Mark replaces the Fate because the mark IS the outcome. If Bomb did the
 * same, every round of a live fuse would lose its Fate and the game would stall
 * into a three-round cutscene. So it reports `replacesFate` false while it is
 * merely changing hands, and true only on the tick that detonates it.
 */

import type { GameEvent } from '../events/eventTypes';
import type { Player } from '../types/player';
import type { StatusTrigger } from './statusTriggers';
import { attackPlayer } from '../engine/attack';

/**
 * Rounds from planting to detonation.
 *
 * Three is the shortest fuse that still reads as a countdown: the table hears
 * "three", "two", "one" and knows exactly which spin is the dangerous one. Two
 * would be over before anyone settled into it; four starts to feel like
 * background noise rather than a timer.
 */
export const BOMB_FUSE = 3;

/** The living player holding the bomb, if anyone is. */
export function getBombHolder(players: readonly Player[]): Player | null {
  return (
    players.find((player) => player.status === 'alive' && player.bombFuse !== undefined) ?? null
  );
}

/**
 * A bomb left on someone who has just been eliminated by something else.
 *
 * Measured over 200 games, this is how HALF of all bombs end: the selected
 * player takes the bomb and then that same round's Fate kills them, so the
 * countdown the table has been following stops mid-sentence.
 *
 * The bomb is genuinely gone — that part is intended, and dying to something
 * else is a fair way to take it out of play. What is not acceptable is the
 * countdown evaporating with nothing said. The fuse is therefore left on the
 * body and cleared here, on the next selection, with a line explaining it.
 *
 * Safe against overlapping with a fresh bomb: this fires on SELECTION, while
 * planting happens later in the round at Fate resolution, so the stale fuse is
 * always cleared before a new one can be handed out.
 */
export function getAbandonedBomb(players: readonly Player[]): Player | null {
  return (
    players.find((player) => player.status !== 'alive' && player.bombFuse !== undefined) ?? null
  );
}

export const bombTrigger: StatusTrigger = {
  id: 'bomb',

  // Fires for any selection while a bomb is live — including one that lands on
  // the current holder, who simply keeps it as the fuse drops. Also fires once
  // more to clean up after a holder who died holding it.
  isTriggered: (_player, context) =>
    getBombHolder(context.state.players) !== null ||
    getAbandonedBomb(context.state.players) !== null,

  // Only the tick that empties a LIVE fuse takes the round. Clearing up after a
  // dead holder is a footnote, not an outcome.
  replacesFate: (_player, context) => {
    const holder = getBombHolder(context.state.players);
    return holder !== null && (holder.bombFuse ?? 0) <= 1;
  },

  resolve: (context, playerId): GameEvent[] => {
    const abandoned = getAbandonedBomb(context.state.players);
    if (abandoned) {
      return [
        { type: 'CLEAR_BOMB' },
        {
          type: 'SHOW_MESSAGE',
          message: `💣 The bomb went up with ${abandoned.name} — the countdown is over`,
        },
      ];
    }

    const holder = getBombHolder(context.state.players);
    if (!holder) return [];

    const taker = context.state.players.find((player) => player.id === playerId);
    const name = taker?.name ?? 'Player';
    const next = (holder.bombFuse ?? 0) - 1;

    // SET_BOMB is the only line a hand-off needs; adding a message here printed
    // the same fact twice in the readout.
    if (next > 0) return [{ type: 'SET_BOMB', playerId, fuse: next }];

    // The fuse is spent. Move it first, so the wheel rim and the status panel
    // both show who is holding it at the moment it goes off, then pause for the
    // room to react before the blast resolves.
    return [
      { type: 'SET_BOMB', playerId, fuse: 0 },
      { type: 'SHOW_MESSAGE', message: `💣 TIME UP — the bomb is in ${name}'s hands` },
      { type: 'WAIT_FOR_HOST' },
      // Cleared before the attack, so the bomb is spent even when a Shield
      // absorbs the blast. Same rule as the Death Mark.
      { type: 'CLEAR_BOMB' },
      ...attackPlayer(context.state, playerId, 'bomb'),
    ];
  },
};
