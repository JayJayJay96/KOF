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
 */

import type { AbilityDefinition } from '../types/ability';
import type { GamePhase } from '../types/game';
import type { GameEvent } from '../events/eventTypes';
import { attackPlayer } from '../engine/attack';

const WEIGHTS: Record<GamePhase, number> = {
  chaos: 10,
  danger: 12,
  final_five: 15,
  sudden_death: 20,
};

export const hunterAbility: AbilityDefinition = {
  id: 'hunter',
  name: 'Hunter',
  icon: '🎯',
  category: 'attack',

  isAvailable: (context) => context.alivePlayers.length >= 2,

  getWeight: (phase) => WEIGHTS[phase],

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

    const bounty: GameEvent[] = killed
      ? [
          { type: 'ADD_SHIELD', playerId: selectedPlayerId },
          { type: 'SHOW_MESSAGE', message: `${hunter?.name ?? 'Hunter'} claims a Shield` },
        ]
      : [];

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
};
