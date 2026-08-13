/**
 * ⚔ Duel — PROJECT_SPEC.md §11.8
 *
 * Two-step, like Hunter: name the duel, suspend for an opponent spin, then
 * resolve a 50/50 and attack the loser.
 *
 * Rules:
 *   - the opponent is never the initiator (excludePlayerIds)
 *   - with exactly two players alive the opponent is forced, which falls out of
 *     the exclusion rather than needing a special case (spec §38)
 *   - Shield blocks the resulting elimination, via the shared attack flow
 *
 * The coin flip happens when the opponent lands, before the host clicks through
 * WAIT_FOR_HOST. That matches how both wheels already work: the engine decides
 * first, the presentation reveals afterwards.
 *
 * MVP scope: no dedicated duel wheel or VS scene. DEVELOPMENT_ROADMAP.md Phase
 * 4D says a two-entry wheel *can* be used, and Enhancement Phase 4 owns the
 * real Duel scene. The outcome is announced in the readout instead.
 */

import type { AbilityDefinition } from '../types/ability';
import type { GamePhase } from '../types/game';
import { attackPlayer } from '../engine/attack';
import { randomFloat } from '../../utils/random';

const WEIGHTS: Record<GamePhase, number> = {
  chaos: 5,
  danger: 10,
  final_five: 15,
  sudden_death: 0,
};

export const duelAbility: AbilityDefinition = {
  id: 'duel',
  name: 'Duel',
  icon: '⚔',
  category: 'chaos',

  isAvailable: (context) => context.alivePlayers.length >= 2,

  getWeight: (phase) => WEIGHTS[phase],

  resolve: (context, selectedPlayerId) => {
    const initiator = context.state.players.find((player) => player.id === selectedPlayerId);

    return [
      { type: 'SHOW_MESSAGE', message: `${initiator?.name ?? 'Player'} calls a DUEL` },
      {
        type: 'REQUEST_PLAYER_SPIN',
        purpose: 'duel_opponent',
        excludePlayerIds: [selectedPlayerId],
      },
    ];
  },

  resolveTargetSpin: (context, selectedPlayerId, targetPlayerId) => {
    const initiator = context.state.players.find((player) => player.id === selectedPlayerId);
    const opponent = context.state.players.find((player) => player.id === targetPlayerId);

    const initiatorLoses = randomFloat() < 0.5;
    const loserId = initiatorLoses ? selectedPlayerId : targetPlayerId;
    const loserName = initiatorLoses ? initiator?.name : opponent?.name;

    return [
      {
        type: 'SHOW_MESSAGE',
        message: `${initiator?.name ?? 'A'}  VS  ${opponent?.name ?? 'B'}`,
      },
      { type: 'WAIT_FOR_HOST' },
      { type: 'SHOW_MESSAGE', message: `${loserName ?? 'Loser'} loses the duel` },
      ...attackPlayer(context.state, loserId, 'duel'),
    ];
  },

  // Says a second player is coming without saying who: the opponent has not
  // been spun for yet, and the coin flip has not happened either.
  describeStakes: (context, selectedPlayerId) => {
    const initiator = context.state.players.find((player) => player.id === selectedPlayerId);
    if (!initiator) return null;

    return `${initiator.name} calls a DUEL — a spin picks the opponent, then it is 50/50.`;
  },
};
