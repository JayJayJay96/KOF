/**
 * 🧨 C4 — PROJECT_SPEC.md §12
 *
 * Plants a charge on the selected player. The countdown, the defusal and the
 * blast all live in `statuses/c4Trigger.ts`; this only starts it.
 *
 * Guardrail checklist (DEVELOPMENT_ROADMAP.md §8, Guardrail 6):
 *
 *   eligibility   no charge already live, and at least MIN_ALIVE players
 *   weight        config/abilityWeights.ts — zero in the endgame phases
 *   target rules  the selected player, always
 *   resolution    SET_C4 at a full fuse
 *   Wall          handled at detonation, by the shared attack flow
 *   phases        Chaos through Bloodbath only
 *   edge cases    one charge at a time, enforced by SET_C4 itself
 *
 * Emits no message: SET_C4 narrates the plant, and a Fate that also announced
 * it would print the same fact twice. That duplication has now appeared three
 * times — Hunter's bounty, Bomb's hand-off, and here — so treat it as the
 * default: if an event already narrates itself, do not also emit a message.
 *
 * Weights live in `config/abilityWeights.ts`.
 */

import type { AbilityDefinition } from '../types/ability';
import type { GameEvent } from '../events/eventTypes';
import { C4_FUSE, getC4Holder } from '../statuses/c4Trigger';
import { getWheelNeighbours } from '../engine/selectors';

/**
 * A blast takes up to three people. Below this the charge alone could end the
 * game, which is a worse ending than any wheel can produce.
 */
const MIN_ALIVE = 6;

export const c4Ability: AbilityDefinition = {
  id: 'c4',
  name: 'C4',
  icon: '🧨',
  category: 'attack',

  isAvailable: (context) =>
    context.alivePlayers.length >= MIN_ALIVE && getC4Holder(context.state.players) === null,

  // The blast radius is bound HERE, at planting, and never recomputed. That is
  // what lets the host reorder the wheel without changing who dies — a shuffle
  // is presentation, and re-rolling the radius would make it a stealth weapon.
  // See `Player.c4Blast`.
  resolve: (context, selectedPlayerId): GameEvent[] => [
    {
      type: 'SET_C4',
      playerId: selectedPlayerId,
      fuse: C4_FUSE,
      blastPlayerIds: getWheelNeighbours(context.state, selectedPlayerId).map(
        (player) => player.id,
      ),
    },
  ],

  describeStakes: (context, selectedPlayerId) => {
    const player = context.state.players.find((candidate) => candidate.id === selectedPlayerId);
    if (!player) return null;

    return `🧨 ${C4_FUSE} rounds on ${player.name}. Only the wheel can call it off.`;
  },
};
