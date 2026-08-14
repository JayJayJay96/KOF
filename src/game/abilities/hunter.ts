/**
 * 🎯 Hunter — PROJECT_SPEC.md §11.5
 *
 * Two-step ability. `resolve` names the hunter and suspends the queue with
 * REQUEST_PLAYER_SPIN; `resolveTargetSpin` runs once the host has spun for a
 * target and attacks it.
 *
 * Rules:
 *   - the hunter cannot target itself (excludePlayerIds)
 *   - the hunter is never eliminated by its own Hunter roll
 *   - Shield can block the attack, via the shared attack flow
 *   - a successful hunt rewards the hunter with a Shield; a blocked one does not
 *   - with exactly two players alive the target is forced to be the other one,
 *     which falls out of the exclusion rather than needing a special case
 *
 * Needs at least one other living player, hence the availability check.
 *
 * Weights live in `config/abilityWeights.ts`.
 */

import type { AbilityDefinition } from '../types/ability';
import type { GameEvent } from '../events/eventTypes';
import { attackPlayer } from '../engine/attack';

export const hunterAbility: AbilityDefinition = {
  id: 'hunter',
  name: 'Hunter',
  icon: '🎯',
  category: 'attack',
  mandatory: true,

  isAvailable: (context) => context.alivePlayers.length >= 2,

  resolve: (context, selectedPlayerId) => {
    const hunter = context.state.players.find((player) => player.id === selectedPlayerId);

    return [
      { type: 'SHOW_MESSAGE', message: `${hunter?.name ?? 'Player'} becomes the Hunter` },
      {
        type: 'REQUEST_PLAYER_SPIN',
        purpose: 'hunter_target',
        excludePlayerIds: [selectedPlayerId],
      },
    ];
  },

  resolveTargetSpin: (context, selectedPlayerId, targetPlayerId) => {
    const hunter = context.state.players.find((player) => player.id === selectedPlayerId);
    const target = context.state.players.find((player) => player.id === targetPlayerId);

    const attack = attackPlayer(context.state, targetPlayerId, 'hunter');

    // A hunt that actually lands earns the hunter a Shield — the bounty makes
    // rolling Hunter something to want rather than merely survive. A Shielded
    // target blocks the attack, so no kill and no bounty.
    //
    // ADD_SHIELD is capped at the MVP maximum of 1 by the event resolver, so a
    // hunter already holding a Shield gains nothing and the cap still holds.
    const killed = attack.some((event) => event.type === 'ELIMINATE_PLAYER');

    // ADD_SHIELD already narrates itself as "gains a Shield", and the situation
    // line now shows the whole burst — hunt, kill, bounty — so a second message
    // saying the same thing only crowded it out.
    const bounty: GameEvent[] = killed ? [{ type: 'ADD_SHIELD', playerId: selectedPlayerId }] : [];

    return [
      {
        type: 'SHOW_MESSAGE',
        message: `${hunter?.name ?? 'Hunter'} hunts ${target?.name ?? 'target'}`,
      },
      { type: 'WAIT_FOR_HOST' },
      ...attack,
      ...bounty,
    ];
  },

  // Names the hunter but never the prey — the target spin has not happened, and
  // spoiling it would remove the only reason to run that second wheel.
  describeStakes: (context, selectedPlayerId) => {
    const hunter = context.state.players.find((player) => player.id === selectedPlayerId);
    if (!hunter) return null;

    return `${hunter.name} becomes the Hunter — a kill earns them a 🛡 Shield.`;
  },
};
