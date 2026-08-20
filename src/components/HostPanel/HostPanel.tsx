/**
 * Host Panel — PROJECT_SPEC.md §22, DEVELOPMENT_ROADMAP.md Phase 6D.
 *
 * Hidden by default and toggled with Ctrl+Shift+H, because the main screen is
 * what gets streamed and should stay clean (spec §22). Replaces the temporary
 * `dev` strip that lived on the game screen since Phase 1.
 *
 * Roster edits are only offered between rounds. The engine enforces the same
 * rule; this just avoids showing controls that would be rejected.
 *
 * Audio controls are listed in the roadmap for this phase but are absent: there
 * is no audio system until Phase 7, so a volume slider would control nothing.
 */

import { useEffect, useState } from 'react';
import type { GameAction } from '../../game/engine/reducer';
import type { GameState } from '../../game/types/game';
import { isSimultaneousSpinEnabled } from '../../game/types/game';
import { EventLog } from '../EventLog/EventLog';

type HostPanelProps = {
  state: GameState;
  dispatch: (action: GameAction) => void;
  canUndo: boolean;
  onUndo: () => void;
  onSaveNow: () => boolean;
  onClearSave: () => void;
};

export function HostPanel({
  state,
  dispatch,
  canUndo,
  onUndo,
  onSaveNow,
  onClearSave,
}: HostPanelProps) {
  const [open, setOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'h') {
        event.preventDefault();
        setOpen((wasOpen) => !wasOpen);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Clear a transient notice so it does not linger after the next action.
  useEffect(() => {
    if (notice === null) return;
    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const rosterEditable = state.screenState === 'setup' || state.screenState === 'idle';

  const addPlayer = () => {
    if (newName.trim().length === 0) return;
    dispatch({ type: 'ADD_PLAYERS', names: [newName] });
    setNewName('');
  };

  if (!open) {
    return (
      <button
        type="button"
        className="host-panel__handle"
        onClick={() => setOpen(true)}
        title="Host panel (Ctrl+Shift+H)"
      >
        HOST
      </button>
    );
  }

  return (
    <aside className="host-panel" aria-label="Host panel">
      <header className="host-panel__header">
        <h2 className="host-panel__title">Host Panel</h2>
        <button
          type="button"
          className="button button--small"
          onClick={() => setOpen(false)}
          aria-label="Close host panel"
        >
          ✕
        </button>
      </header>

      <p className="host-panel__hint">Ctrl+Shift+H toggles this panel.</p>

      <section className="host-panel__section">
        <h3 className="host-panel__section-title">Game</h3>
        <div className="host-panel__actions">
          <button
            type="button"
            className="button button--small"
            onClick={onUndo}
            disabled={!canUndo}
          >
            Undo
          </button>
          <button
            type="button"
            className="button button--small"
            onClick={() => dispatch({ type: 'RESET_GAME' })}
          >
            Reset to setup
          </button>
          <button
            type="button"
            className="button button--small"
            onClick={() => document.documentElement.requestFullscreen?.()}
          >
            Fullscreen
          </button>
        </div>

        {/* Takes effect on the next round: the flag is read when a spin starts,
            so flipping it mid-spin cannot strand a wheel. */}
        <div className="host-panel__actions">
          <button
            type="button"
            className="button button--small"
            onClick={() =>
              dispatch({
                type: 'SET_SIMULTANEOUS_SPIN',
                enabled: !isSimultaneousSpinEnabled(state.config),
              })
            }
          >
            {isSimultaneousSpinEnabled(state.config)
              ? 'Spin wheels one at a time'
              : 'Spin both wheels together'}
          </button>
        </div>
      </section>

      <section className="host-panel__section">
        <h3 className="host-panel__section-title">Save</h3>
        <div className="host-panel__actions">
          <button
            type="button"
            className="button button--small"
            onClick={() => setNotice(onSaveNow() ? 'Saved.' : 'Save failed — storage unavailable.')}
          >
            Save now
          </button>
          <button
            type="button"
            className="button button--small"
            onClick={() => {
              onClearSave();
              setNotice('Saved game cleared.');
            }}
          >
            Clear save
          </button>
        </div>
        {notice && <p className="host-panel__notice">{notice}</p>}
      </section>

      <section className="host-panel__section">
        <h3 className="host-panel__section-title">Audio</h3>
        <div className="host-panel__actions">
          <button
            type="button"
            className="button button--small"
            onClick={() =>
              dispatch({ type: 'SET_AUDIO', audio: { muted: !state.config.audio.muted } })
            }
          >
            {state.config.audio.muted ? 'Unmute' : 'Mute'}
          </button>
        </div>
        <label className="host-panel__slider">
          <span>Volume</span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(state.config.audio.master * 100)}
            onChange={(event) =>
              dispatch({ type: 'SET_AUDIO', audio: { master: Number(event.target.value) / 100 } })
            }
          />
        </label>
      </section>

      <section className="host-panel__section">
        <h3 className="host-panel__section-title">
          Players <span className="host-panel__count">{state.players.length}</span>
        </h3>

        {rosterEditable ? (
          <div className="host-panel__add">
            <input
              type="text"
              className="host-panel__input"
              value={newName}
              placeholder="Add a player"
              aria-label="New player name"
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addPlayer();
                }
              }}
            />
            <button
              type="button"
              className="button button--small"
              onClick={addPlayer}
              disabled={newName.trim().length === 0}
            >
              Add
            </button>
          </div>
        ) : (
          <p className="host-panel__hint">Roster can be edited between rounds.</p>
        )}

        <ul className="host-panel__players">
          {state.players.map((player) => (
            <li key={player.id} className="host-panel__player">
              <span className={player.status === 'eliminated' ? 'is-out' : undefined}>
                {player.name}
              </span>
              {player.wall > 0 && <span title="Wall">🧱</span>}
              {player.deathMark && <span title="Death Mark">💀</span>}
              {rosterEditable && (
                <button
                  type="button"
                  className="host-panel__remove"
                  aria-label={`Remove ${player.name}`}
                  onClick={() => dispatch({ type: 'REMOVE_PLAYER', playerId: player.id })}
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="host-panel__section host-panel__section--log">
        <h3 className="host-panel__section-title">Event history</h3>
        <EventLog history={state.history} players={state.players} />
      </section>
    </aside>
  );
}
