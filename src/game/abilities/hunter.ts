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
 *   - with exactly two players alive the target is forced to be the other one,
 *     which falls out of the exclusion rather than needing a special case
 *
 * Needs at least one other living player, hence the availability check.
 */

import type { AbilityDefinition } from '../types/ability';
import type { GamePhase } from '../types/game';
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

    return [
      {
        type: 'SHOW_MESSAGE',
        message: `${hunter?.name ?? 'Hunter'} hunts ${target?.name ?? 'target'}`,
      },
      { type: 'WAIT_FOR_HOST' },
      ...attackPlayer(context.state, targetPlayerId, 'hunter'),
    ];
  },
};
