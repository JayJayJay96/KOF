/**
 * Player Setup screen.
 *
 * DEVELOPMENT_ROADMAP.md Phase 1: multiline paste, one player per line,
 * add/remove, Start Game. Replaces the Phase 0 debug panel.
 *
 * Duplicate names are allowed — players are identified by id, not name
 * (PROJECT_SPEC.md §38).
 */

import { useState } from 'react';
import type { GameAction } from '../../game/engine/reducer';
import { MIN_PLAYERS_TO_START } from '../../game/engine/reducer';
import type { Player } from '../../game/types/player';

type PlayerSetupProps = {
  players: Player[];
  dispatch: (action: GameAction) => void;
};

export function PlayerSetup({ players, dispatch }: PlayerSetupProps) {
  const [draft, setDraft] = useState('');

  const pendingCount = draft
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0).length;

  const addPending = () => {
    if (pendingCount === 0) return;
    dispatch({ type: 'ADD_PLAYERS', names: draft.split('\n') });
    setDraft('');
  };

  const readyToStart = players.length >= MIN_PLAYERS_TO_START;

  return (
    <section className="setup">
      <h2 className="setup__heading">Player Setup</h2>

      <div className="setup__grid">
        <div className="setup__entry">
          <label className="setup__label" htmlFor="setup-names">
            Paste names — one per line
          </label>
          <textarea
            id="setup-names"
            className="setup__textarea"
            rows={10}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Ctrl/Cmd+Enter adds without reaching for the mouse.
              if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                addPending();
              }
            }}
            placeholder={'Jason\nAmy\nKelvin\nDaniel'}
          />
          <div className="setup__actions">
            <button
              type="button"
              className="button"
              onClick={addPending}
              disabled={pendingCount === 0}
            >
              {pendingCount > 0
                ? `Add ${pendingCount} player${pendingCount === 1 ? '' : 's'}`
                : 'Add players'}
            </button>
          </div>
        </div>

        <div className="setup__roster">
          <h3 className="setup__label">Roster ({players.length})</h3>

          {players.length === 0 ? (
            <p className="setup__empty">No players yet. Paste some names to begin.</p>
          ) : (
            <ul className="setup__list">
              {players.map((player, index) => (
                <li key={player.id} className="setup__list-item">
                  <span className="setup__index">{String(index + 1).padStart(2, '0')}</span>
                  <span className="setup__name">{player.name}</span>
                  <button
                    type="button"
                    className="setup__remove"
                    onClick={() => dispatch({ type: 'REMOVE_PLAYER', playerId: player.id })}
                    aria-label={`Remove ${player.name}`}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="setup__actions">
            <button
              type="button"
              className="button button--primary"
              onClick={() => dispatch({ type: 'START_GAME' })}
              disabled={!readyToStart}
            >
              Start Game
            </button>
            {!readyToStart && (
              <span className="setup__hint">Need at least {MIN_PLAYERS_TO_START} players</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
