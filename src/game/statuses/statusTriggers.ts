/**
 * Persistent status triggers.
 *
 * Some statuses act on their own schedule rather than being rolled on the Fate
 * Wheel. Death Mark fires when the Main Wheel selects the marked player, which
 * is not a Fate outcome at all — it replaces one.
 *
 * Keeping these as data mirrors the ability registry: the reducer asks "does
 * anything trigger for this player?" and never learns what Death Mark is. Bomb
 * (post-MVP) drops in here without touching the reducer.
 */

import type { GameEvent } from '../events/eventTypes';
import type { GameContext } from '../types/ability';
import type { Player } from '../types/player';
import { deathMarkTrigger } from './deathMarkTrigger';

export type StatusTrigger = {
  id: string;
  /** Whether this status fires for the given player right now. */
  isTriggered: (player: Player) => boolean;
  /** Events to resolve when it fires. */
  resolve: (context: GameContext, playerId: string) => GameEvent[];
};

/**
 * Checked in order when the Main Wheel selects a player.
 *
 * Only the first match resolves — two statuses firing in one selection would
 * need an explicit interaction rule, and none exists yet.
 */
export const SELECTION_TRIGGERS: readonly StatusTrigger[] = [deathMarkTrigger];

export function findSelectionTrigger(player: Player): StatusTrigger | null {
  return SELECTION_TRIGGERS.find((trigger) => trigger.isTriggered(player)) ?? null;
}
