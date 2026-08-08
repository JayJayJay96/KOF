/**
 * Undo — snapshot history around the reducer.
 *
 * PROJECT_SPEC.md §23: live games suffer accidental clicks, and the host needs
 * a way back. This wraps `gameReducer` without changing it, so the reducer
 * stays a plain state machine that knows nothing about undo.
 *
 * SNAPSHOTS, NOT REPLAY. Since Phase 4, abilities call randomness during
 * `resolve` (Revive picks a player, Duel flips a coin), so replaying an action
 * log would produce a *different* game. Storing whole states sidesteps that
 * entirely, and `GameState` is a plain serialisable object so cloning is cheap.
 *
 * Wheel completions are deliberately NOT checkpoints. A snapshot taken before
 * `START_PLAYER_SPIN` captures a stable 'idle' state, so undoing after a spin
 * lands the host back before the spin rather than inside a frozen animation.
 */

import type { GameState } from '../types/game';
import type { GameAction } from './reducer';
import { gameReducer } from './reducer';

/** Deep enough for a long game without unbounded memory growth. */
export const UNDO_LIMIT = 40;

export type HistoryStack = {
  present: GameState;
  past: GameState[];
};

export type HistoryAction =
  | GameAction
  | { type: 'UNDO' }
  /** Replace everything — used when resuming a saved game. */
  | { type: 'RESTORE'; state: GameState };

/**
 * Engine-driven completions, not host decisions.
 *
 * Excluding them is what makes undo operate on whole host actions: the state
 * they consume ('spinning_*') is not somewhere the host can safely be returned
 * to, since no animation would be running there.
 */
const NON_CHECKPOINT_ACTIONS: ReadonlySet<string> = new Set([
  'PLAYER_SPIN_COMPLETE',
  'FATE_SPIN_COMPLETE',
]);

export function createHistoryStack(present: GameState): HistoryStack {
  return { present, past: [] };
}

export function canUndo(stack: HistoryStack): boolean {
  return stack.past.length > 0;
}

export function historyReducer(stack: HistoryStack, action: HistoryAction): HistoryStack {
  if (action.type === 'RESTORE') {
    return createHistoryStack(action.state);
  }

  if (action.type === 'UNDO') {
    if (stack.past.length === 0) return stack;
    return {
      present: stack.past[stack.past.length - 1],
      past: stack.past.slice(0, -1),
    };
  }

  const next = gameReducer(stack.present, action);

  // The reducer returns the same reference for rejected transitions, so a
  // no-op never consumes an undo slot.
  if (next === stack.present) return stack;

  if (NON_CHECKPOINT_ACTIONS.has(action.type)) {
    return { present: next, past: stack.past };
  }

  return {
    present: next,
    past: [...stack.past, stack.present].slice(-UNDO_LIMIT),
  };
}
