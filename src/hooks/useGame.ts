/**
 * React binding for the Game Engine.
 *
 * This hook is the ONLY bridge between React and the reducer. It also owns the
 * "engine decides first" step for both wheels: a spin picks the result here,
 * then dispatches it, so the reducer stays pure and each wheel animates toward
 * an already-known outcome (PROJECT_SPEC.md §8 and §16, AGENTS.md §7.2).
 */

import { useCallback, useReducer } from 'react';
import type { GameAction } from '../game/engine/reducer';
import { gameReducer } from '../game/engine/reducer';
import { createInitialGameState } from '../game/engine/gameEngine';
import { canSpinPlayerWheel, selectRandomEligiblePlayer } from '../game/engine/selectors';
import { canSpinFateWheel } from '../game/engine/selectors';
import { selectWeightedAbility } from '../game/abilities';
import type { GameState } from '../game/types/game';

export type UseGameResult = {
  state: GameState;
  dispatch: (action: GameAction) => void;
  /** Engine picks an eligible player, then starts the Main Wheel animation. */
  spinPlayer: () => void;
  completePlayerSpin: () => void;
  /** Engine picks a weighted ability, then starts the Fate Wheel animation. */
  spinFate: () => void;
  completeFateSpin: () => void;
  resolveFate: () => void;
};

export function useGame(): UseGameResult {
  const [state, dispatch] = useReducer(gameReducer, undefined, () => createInitialGameState());

  const spinPlayer = useCallback(() => {
    if (!canSpinPlayerWheel(state)) return;

    const player = selectRandomEligiblePlayer(state);
    if (!player) return;

    dispatch({ type: 'START_PLAYER_SPIN', playerId: player.id });
  }, [state]);

  const completePlayerSpin = useCallback(() => {
    dispatch({ type: 'PLAYER_SPIN_COMPLETE' });
  }, []);

  const spinFate = useCallback(() => {
    if (!canSpinFateWheel(state)) return;

    const ability = selectWeightedAbility(state);
    if (!ability) return;

    dispatch({ type: 'START_FATE_SPIN', abilityId: ability.id });
  }, [state]);

  const completeFateSpin = useCallback(() => {
    dispatch({ type: 'FATE_SPIN_COMPLETE' });
  }, []);

  const resolveFate = useCallback(() => {
    dispatch({ type: 'RESOLVE_FATE' });
  }, []);

  return {
    state,
    dispatch,
    spinPlayer,
    completePlayerSpin,
    spinFate,
    completeFateSpin,
    resolveFate,
  };
}
