/**
 * ❤️ Revive — PROJECT_SPEC.md §11.7
 *
 * Restores one random eliminated player. They return alive with no Shield and
 * no Death Mark, and `revivedCount` increments — all handled by REVIVE_PLAYER
 * in the event resolver, so repeat revivals of the same player just work.
 *
 * Unavailable when nobody is eliminated (spec §37 item 11). Weight is 0 in
 * Final Five and Sudden Death, where comeback mechanics would stall the ending.
 *
 * Phase recalculation after a revival is automatic: the alive count rises and
 * `applyPhaseAndWinner` re-derives the phase, which may move BACKWARD. That is
 * the intended MVP behaviour (spec §38).
 *
 * ---
 * NOTE ON RANDOMNESS — this reverses a Phase 0 decision.
 *
 * The reducer was previously kept free of randomness so the action log replayed
 * deterministically. Revive and Duel need a random target chosen at resolution
 * time, and the alternatives were worse: threading ability-specific roll
 * payloads through a generic RESOLVE_FATE action, or letting the reducer learn
 * which abilities need which rolls.
 *
 * Determinism is preserved instead by `setRandomSource` in utils/random.ts —
 * seeding the shared source makes resolution reproducible without constraining
 * where randomness may be called. Wheel results are still decided before the
 * animation starts, because that is a rendering requirement, not a purity one.
 */

import type { AbilityDefinition } from '../types/ability';
import type { GamePhase } from '../types/game';
import { selectRandomEliminatedPlayer } from '../engine/selectors';

const WEIGHTS: Record<GamePhase, number> = {
  chaos: 7,
  danger: 5,
  final_five: 0,
  sudden_death: 0,
};

export const reviveAbility: AbilityDefinition = {
  id: 'revive',
  name: 'Revive',
  icon: '❤️',
  category: 'special',

  isAvailable: (context) => context.eliminatedPlayers.length > 0,

  getWeight: (phase) => WEIGHTS[phase],

  resolve: (context) => {
    const revived = selectRandomEliminatedPlayer(context.state);
    if (!revived) return [{ type: 'SHOW_MESSAGE', message: 'Nobody to revive.' }];

    return [
      { type: 'SHOW_MESSAGE', message: `${revived.name} RETURNS!` },
      { type: 'REVIVE_PLAYER', playerId: revived.id },
    ];
  },
};
