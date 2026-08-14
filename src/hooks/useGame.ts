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
import { buildGameContext, selectWeightedAbility } from '../game/abilities';
import { selectionReplacesFate } from '../game/statuses/statusTriggers';
import { randomItem } from '../utils/random';
import type { GameState } from '../game/types/game';
import { isSimultaneousSpinEnabled } from '../game/types/game';
import type { SavedGame } from '../storage/gameStorage';
import { clearSave, loadGame, saveGame } from '../storage/gameStorage';

/** Beat between the player landing and the Fate Wheel starting. */
export const AUTO_FATE_DELAY_MS = 900;

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

  /** Set when a player spin lands, consumed by the auto-fate effect below. */
  const autoFatePending = useRef(false);

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

  /**
   * Start the round.
   *
   * Both wheels turn together when nothing about this selection would make the
   * Fate roll meaningless. Two cases opt out:
   *
   *   - a status is about to CONSUME the round (a Death Mark, or a bomb whose
   *     fuse runs out on this selection). It replaces the round's Fate, so a
   *     Fate rolled in parallel would be thrown away and its wheel left
   *     spinning over a resolution already in progress.
   *   - no Fate is available at all, which the sequential path already handles.
   *
   * Note the question is "does it consume the round", not "does anything fire".
   * A bomb changing hands fires on every selection and must NOT drop the game
   * back to sequential spinning for the whole length of a fuse.
   *
   * The check happens here rather than in the reducer because it is a question
   * about which PRESENTATION to use. The reducer stays the authority on what
   * actually happens, and still lets a trigger win if one somehow fires.
   */
  const spinPlayer = useCallback(() => {
    if (!canSpinPlayerWheel(state)) return;

    const player = selectRandomEligiblePlayer(state);
    if (!player) return;

    if (
      isSimultaneousSpinEnabled(state.config) &&
      !selectionReplacesFate(player, buildGameContext(state))
    ) {
      const ability = selectWeightedAbility(state);
      if (ability) {
        dispatchHistory({ type: 'START_DUAL_SPIN', playerId: player.id, abilityId: ability.id });
        return;
      }
    }

    dispatchHistory({ type: 'START_PLAYER_SPIN', playerId: player.id });
  }, [state]);

  const completePlayerSpin = useCallback(() => {
    // A landed player spin flows straight into the Fate spin (see the auto-fate
    // effect below), so the host does not click twice for one decision.
    autoFatePending.current = true;
    dispatchHistory({ type: 'PLAYER_SPIN_COMPLETE' });
  }, []);

  const spinFate = useCallback(() => {
    if (!canSpinFateWheel(state)) return;

    const ability = selectWeightedAbility(state);
    if (!ability) return;

    dispatchHistory({ type: 'START_FATE_SPIN', abilityId: ability.id });
  }, [state]);

  /** Set when the Fate Wheel lands before the Main Wheel during a dual spin. */
  const fateLandedEarly = useRef(false);

  /**
   * The Fate Wheel finished animating.
   *
   * During a dual spin the two wheels are timed so the Main Wheel lands first
   * (WHO before WHAT), but that ordering is wall-clock timing, not a guarantee —
   * a dropped frame or a backgrounded tab could invert it. If the Fate Wheel
   * reports in while the round is still 'spinning_both', the reducer would
   * reject the completion and the result would be stranded, so hold it and
   * replay it the moment the player is revealed.
   */
  const completeFateSpin = useCallback(() => {
    if (state.screenState === 'spinning_both') {
      fateLandedEarly.current = true;
      return;
    }
    dispatchHistory({ type: 'FATE_SPIN_COMPLETE' });
  }, [state.screenState]);

  useEffect(() => {
    if (!fateLandedEarly.current) return;
    if (state.screenState === 'spinning_both') return;

    fateLandedEarly.current = false;
    // Anything else means the round was intercepted (a trigger fired, the game
    // was won, the host undid it) and the held result no longer applies.
    if (state.screenState === 'spinning_fate') {
      dispatchHistory({ type: 'FATE_SPIN_COMPLETE' });
    }
  }, [state.screenState]);

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

  /**
   * Auto-continue from a landed player spin into the Fate spin.
   *
   * The fallback path for rounds that could not spin both wheels together: the
   * Fate Wheel still follows on its own without a second click. It does not fire
   * when a Death Mark intercepts the round, because that skips Fate entirely and
   * leaves `screenState` somewhere other than 'player_selected' — which is also
   * why a dual spin never reaches here: it rests in 'spinning_fate'.
   *
   * The short delay lets the selected name register before the second wheel
   * starts moving; without it the reveal is lost under the next animation.
   */
  const spinFateRef = useRef(spinFate);
  spinFateRef.current = spinFate;

  useEffect(() => {
    if (!autoFatePending.current) return;

    // Anything other than a plain reveal (Death Mark, a win) cancels it.
    if (state.screenState !== 'player_selected') {
      autoFatePending.current = false;
      return;
    }

    autoFatePending.current = false;
    const timer = window.setTimeout(() => spinFateRef.current(), AUTO_FATE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [state.screenState]);

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
