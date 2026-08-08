/**
 * React binding for the Game Engine.
 *
 * This hook is the ONLY bridge between React and the reducer. It owns three
 * things the reducer deliberately does not:
 *
 *   1. "engine decides first" — a spin picks its result here, then dispatches
 *      it, so each wheel animates toward a known outcome (spec §8, §16).
 *   2. undo — snapshots wrap the reducer without it knowing (spec §23).
 *   3. persistence — autosave and resume (spec §24).
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { GameAction } from '../game/engine/reducer';
import { createInitialGameState } from '../game/engine/gameEngine';
import { canUndo as canUndoStack, createHistoryStack, historyReducer } from '../game/engine/undo';
import { canSpinPlayerWheel, selectRandomEligiblePlayer } from '../game/engine/selectors';
import { canSpinFateWheel, canSpinTarget, getTargetPool } from '../game/engine/selectors';
import { selectWeightedAbility } from '../game/abilities';
import { randomItem } from '../utils/random';
import type { GameState } from '../game/types/game';
import type { SavedGame } from '../storage/gameStorage';
import { clearSave, loadGame, saveGame } from '../storage/gameStorage';

export type UseGameResult = {
  state: GameState;
  dispatch: (action: GameAction) => void;
  spinPlayer: () => void;
  completePlayerSpin: () => void;
  spinFate: () => void;
  completeFateSpin: () => void;
  resolveFate: () => void;
  spinTarget: () => void;

  canUndo: boolean;
  undo: () => void;

  /** A previous session found on load, until the host resumes or discards it. */
  savedGame: SavedGame | null;
  resumeSaved: () => void;
  discardSaved: () => void;
  saveNow: () => boolean;
};

export function useGame(): UseGameResult {
  const [stack, dispatchHistory] = useReducer(historyReducer, undefined, () =>
    createHistoryStack(createInitialGameState()),
  );
  const state = stack.present;

  // Read once on mount. The host decides whether to resume, so this is not
  // loaded straight into the engine.
  const [savedGame, setSavedGame] = useState<SavedGame | null>(() => loadGame());

  const dispatch = useCallback((action: GameAction) => dispatchHistory(action), []);

  const undo = useCallback(() => dispatchHistory({ type: 'UNDO' }), []);

  const resumeSaved = useCallback(() => {
    if (!savedGame) return;
    dispatchHistory({ type: 'RESTORE', state: savedGame.state });
    setSavedGame(null);
  }, [savedGame]);

  const discardSaved = useCallback(() => {
    clearSave();
    setSavedGame(null);
  }, []);

  const saveNow = useCallback(() => saveGame(state), [state]);

  // Autosave every change once a game is under way. Setup has nothing worth
  // resuming, and saving it would offer a pointless prompt on next load.
  const pendingResume = savedGame !== null;
  const lastSaved = useRef<GameState | null>(null);

  useEffect(() => {
    // Do not overwrite the save the host has not yet decided about.
    if (pendingResume) return;
    if (state.screenState === 'setup') return;
    if (lastSaved.current === state) return;

    lastSaved.current = state;
    saveGame(state);
  }, [state, pendingResume]);

  const spinPlayer = useCallback(() => {
    if (!canSpinPlayerWheel(state)) return;

    const player = selectRandomEligiblePlayer(state);
    if (!player) return;

    dispatchHistory({ type: 'START_PLAYER_SPIN', playerId: player.id });
  }, [state]);

  const completePlayerSpin = useCallback(() => {
    dispatchHistory({ type: 'PLAYER_SPIN_COMPLETE' });
  }, []);

  const spinFate = useCallback(() => {
    if (!canSpinFateWheel(state)) return;

    const ability = selectWeightedAbility(state);
    if (!ability) return;

    dispatchHistory({ type: 'START_FATE_SPIN', abilityId: ability.id });
  }, [state]);

  const completeFateSpin = useCallback(() => {
    dispatchHistory({ type: 'FATE_SPIN_COMPLETE' });
  }, []);

  const resolveFate = useCallback(() => {
    dispatchHistory({ type: 'RESOLVE_FATE' });
  }, []);

  const spinTarget = useCallback(() => {
    if (!canSpinTarget(state)) return;

    // The pool already excludes whoever the ability barred, so a uniform pick
    // is enough — the exclusion rule lives with the ability, not here.
    const target = randomItem(getTargetPool(state));
    if (!target) return;

    dispatchHistory({ type: 'START_TARGET_SPIN', playerId: target.id });
  }, [state]);

  const canUndo = useMemo(() => canUndoStack(stack), [stack]);

  return {
    state,
    dispatch,
    spinPlayer,
    completePlayerSpin,
    spinFate,
    completeFateSpin,
    resolveFate,
    spinTarget,
    canUndo,
    undo,
    savedGame,
    resumeSaved,
    discardSaved,
    saveNow,
  };
}
