/**
 * 💣 Bomb — PROJECT_SPEC.md §12
 *
 * This file only PLANTS the bomb. Passing, ticking and detonation are status
 * lifecycle rules and live in `statuses/bombTrigger.ts`, because they fire on
 * every Main Wheel selection rather than as a Fate outcome — the same split as
 * Death Mark.
 *
 * Availability is deliberately narrow:
 *
 *   - only one bomb at a time. A second would mean two countdowns to follow,
 *     and PROJECT_SPEC.md §45 wants the viewer experience to stay simple.
 *   - at least four players alive. The bomb is a hot potato: with three it
 *     barely moves before it goes off, and with two it is a coin flip.
 *
 * Weight 0 in Sudden Death for the same reason — a three-round fuse cannot tell
 * its story when the game is one elimination from over.
 */

import type { AbilityDefinition } from '../types/ability';
import type { GamePhase } from '../types/game';
import { BOMB_FUSE, getBombHolder } from '../statuses/bombTrigger';

const WEIGHTS: Record<GamePhase, number> = {
  chaos: 10,
  danger: 10,
  final_five: 6,
  sudden_death: 0,
};

/** Below this the potato has nowhere to travel. */
const MIN_PLAYERS_FOR_BOMB = 4;

export const bombAbility: AbilityDefinition = {
  id: 'bomb',
  name: 'Bomb',
  icon: '💣',
  category: 'chaos',

  isAvailable: (context) =>
    context.alivePlayers.length >= MIN_PLAYERS_FOR_BOMB &&
    getBombHolder(context.state.players) === null,

  getWeight: (phase) => WEIGHTS[phase],

  // SET_BOMB narrates itself, including the explanatory wording for a fresh
  // plant, so there is no message here. Emitting one produced two lines saying
  // the same thing in the readout — the same duplication Hunter's bounty had.
  resolve: (_context, selectedPlayerId) => [
    { type: 'SET_BOMB', playerId: selectedPlayerId, fuse: BOMB_FUSE },
  ],

  describeStakes: (context, selectedPlayerId) => {
    const player = context.state.players.find((candidate) => candidate.id === selectedPlayerId);
    if (!player) return null;

    return `${player.name} gets the 💣 — it moves to whoever is picked next, and goes off in ${BOMB_FUSE} rounds.`;
  },
};
