/**
 * Persistent status triggers.
 *
 * Some statuses act on their own schedule rather than being rolled on the Fate
 * Wheel. Death Mark fires when the Main Wheel selects the marked player, which
 * is not a Fate outcome at all — it replaces one. C4 fires on every selection
 * while it is live, ticking down, and only replaces the Fate when it is defused
 * or on the round it goes off.
 *
 * Keeping these as data mirrors the ability registry: the reducer asks "does
 * anything trigger for this selection?" and never learns what a Death Mark or
 * a C4 is.
 */

import type { GameEvent } from '../events/eventTypes';
import type { GameContext } from '../types/ability';
import type { Player } from '../types/player';
import { deathMarkTrigger } from './deathMarkTrigger';
import { c4Trigger } from './c4Trigger';

export type StatusTrigger = {
  id: string;

  /**
   * Whether this fires for the current selection.
   *
   * Takes the whole context, not just the selected player, because a status can
   * live elsewhere on the board: the C4 sits with its holder and
   * fires because *someone new was selected*, which a predicate seeing only the
   * selected player cannot express.
   */
  isTriggered: (player: Player, context: GameContext) => boolean;

  /**
   * Does firing consume the round, skipping the Fate Wheel?
   *
   * Death Mark always does — the mark IS the round's outcome. A C4 usually does
   * not; it hands over and ticks down while the round carries on normally, and
   * only takes the round on the tick that detonates it.
   *
   * Declared separately from `resolve` so callers can ask the question without
   * running the resolution.
   */
  replacesFate: (player: Player, context: GameContext) => boolean;

  /** Events to resolve when it fires. */
  resolve: (context: GameContext, playerId: string) => GameEvent[];
};

/** Checked in order when the Main Wheel selects a player. */
export const SELECTION_TRIGGERS: readonly StatusTrigger[] = [deathMarkTrigger, c4Trigger];

/**
 * Every trigger that fires for this selection, in order.
 *
 * Collection STOPS after the first trigger that consumes the round. A Death
 * Mark that kills its holder has already decided the round, and letting the
 * a charge then landing on them would plant it on a corpse. "The round was
 * spent on the mark" is both correct and easy to say out loud.
 */
export function findSelectionTriggers(player: Player, context: GameContext): StatusTrigger[] {
  const matched: StatusTrigger[] = [];

  for (const trigger of SELECTION_TRIGGERS) {
    if (!trigger.isTriggered(player, context)) continue;

    matched.push(trigger);
    if (trigger.replacesFate(player, context)) break;
  }

  return matched;
}

/**
 * Will this selection skip the Fate Wheel?
 *
 * Asked before a spin starts, so both wheels are only launched together when a
 * Fate is actually going to be dealt.
 */
export function selectionReplacesFate(player: Player, context: GameContext): boolean {
  return findSelectionTriggers(player, context).some((trigger) =>
    trigger.replacesFate(player, context),
  );
}
