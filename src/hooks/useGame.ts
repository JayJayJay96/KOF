/**
 * React binding for the Game Engine.
 *
 * This hook is the ONLY bridge between React and the reducer. It also owns the
 * "engine decides first" step: a spin picks the result here, then dispatches
 * the chosen id, so the reducer stays pure and a wheel can later animate
 * toward an already-known outcome (PROJECT_SPEC.md §8, AGENTS.md §7.2).
 */

import { useCallback, useReducer } from 'react';
import type { GameAction } from '../game/engine/reducer';
import { gameReducer } from '../game/engine/reducer';
import { createInitialGameState } from '../game/engine/gameEngine';
import { canSpinPlayerWheel, selectRandomEligiblePlayer } from '../game/engine/selectors';
import type { GameState } from '../game/types/game';

export type UseGameResult = {
  state: GameState;
  dispatch: (action: GameAction) => void;
  /** Engine picks an eligible player, then starts the wheel animation toward it. */
  spinPlayer: () => void;
  /** Called by the wheel when its animation finishes; reveals the result. */
  completePlayerSpin: () => void;
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

  return { state, dispatch, spinPlayer, completePlayerSpin };
}
