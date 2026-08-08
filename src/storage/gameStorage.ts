/**
 * localStorage save / resume — PROJECT_SPEC.md §24.
 *
 * A streamed session can lose a game to an accidental refresh or a browser
 * hiccup, so the whole GameState is persisted rather than a summary. That also
 * means players, round, phase, statuses, history and config all come back
 * without this module knowing what any of them are.
 *
 * `saveVersion` ships from the first commit deliberately. Enhancement Phase 0
 * calls for it, and retrofitting a version onto saves that already exist in
 * someone's browser is far harder than starting with one.
 *
 * Every entry point is defensive: localStorage throws in private-browsing
 * modes and when the quota is exceeded, and a game must never be lost because
 * saving failed. Failures are reported to the caller rather than swallowed.
 */

import type { GameState } from '../game/types/game';

export const SAVE_KEY = 'kof.save.v1';
export const SAVE_VERSION = 1;

export type SaveEnvelope = {
  saveVersion: number;
  /** ISO 8601 UTC, e.g. "2026-08-08T12:00:00.000Z". */
  savedAt: string;
  state: GameState;
};

export type SavedGame = {
  savedAt: string;
  state: GameState;
};

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    // Blocked by browser privacy settings.
    return null;
  }
}

/**
 * Shape check before trusting a save.
 *
 * A corrupt or hand-edited save should be discarded, not loaded into the
 * engine where it would fail somewhere much less obvious.
 */
function isPlausibleGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false;
  const state = value as Partial<GameState>;

  return (
    Array.isArray(state.players) &&
    Array.isArray(state.history) &&
    Array.isArray(state.eventQueue) &&
    typeof state.round === 'number' &&
    typeof state.phase === 'string' &&
    typeof state.screenState === 'string' &&
    typeof state.config === 'object' &&
    state.config !== null
  );
}

/** Returns true when the game was actually written. */
export function saveGame(state: GameState): boolean {
  const storage = getStorage();
  if (!storage) return false;

  const envelope: SaveEnvelope = {
    saveVersion: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    state,
  };

  try {
    storage.setItem(SAVE_KEY, JSON.stringify(envelope));
    return true;
  } catch {
    // Quota exceeded, or storage disabled mid-session.
    return false;
  }
}

/**
 * Load a previous game, or null when there is nothing usable.
 *
 * A save from a different `saveVersion` is discarded rather than guessed at.
 * When migrations arrive, this is where they belong.
 */
export function loadGame(): SavedGame | null {
  const storage = getStorage();
  if (!storage) return null;

  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<SaveEnvelope>;

    if (parsed.saveVersion !== SAVE_VERSION) {
      clearSave();
      return null;
    }
    if (!isPlausibleGameState(parsed.state)) {
      clearSave();
      return null;
    }

    return {
      savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
      state: parsed.state,
    };
  } catch {
    // Unparseable — drop it rather than leaving a landmine for next reload.
    clearSave();
    return null;
  }
}

export function clearSave(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(SAVE_KEY);
  } catch {
    // Nothing useful to do; the save simply stays.
  }
}
