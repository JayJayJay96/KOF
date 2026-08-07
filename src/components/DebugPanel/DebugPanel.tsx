/**
 * TEMPORARY Phase 0 developer panel.
 *
 * DEVELOPMENT_ROADMAP.md Phase 0 calls this "disposable scaffolding". It exists
 * only to exercise the reducer before any wheel exists, and should be deleted
 * or replaced once the real Setup screen and Main Wheel land in Phase 1.
 *
 * It renders GameState and dispatches actions. It decides nothing itself
 * (AGENTS.md §7.1).
 */

import { useState } from 'react';
import type { GameAction } from '../../game/engine/reducer';
import { MIN_PLAYERS_TO_START } from '../../game/engine/reducer';
import {
  canSpinPlayerWheel,
  getAlivePlayers,
  getCurrentPlayer,
  getEliminatedPlayers,
} from '../../game/engine/selectors';
import { PHASE_LABELS } from '../../game/phases/phaseConfig';
import type { GameState } from '../../game/types/game';

const DUMMY_NAMES = ['Jason', 'Amy', 'Kelvin', 'Daniel', 'Han', '小明', 'Nguyễn', 'Zoë 🎯'];

type DebugPanelProps = {
  state: GameState;
  dispatch: (action: GameAction) => void;
  spinPlayer: () => void;
};

export function DebugPanel({ state, dispatch, spinPlayer }: DebugPanelProps) {
  const [nameInput, setNameInput] = useState('');

  const alivePlayers = getAlivePlayers(state);
  const eliminatedPlayers = getEliminatedPlayers(state);
  const currentPlayer = getCurrentPlayer(state);
  const isSetup = state.screenState === 'setup';

  const handleAddNames = () => {
    dispatch({ type: 'ADD_PLAYERS', names: nameInput.split('\n') });
    setNameInput('');
  };

  return (
    <section className="debug-panel">
      <h2 className="debug-panel__title">Debug Panel — Phase 0 scaffolding</h2>

      <dl className="debug-panel__stats">
        <div>
          <dt>Screen</dt>
          <dd>{state.screenState}</dd>
        </div>
        <div>
          <dt>Round</dt>
          <dd>{state.round}</dd>
        </div>
        <div>
          <dt>Phase</dt>
          <dd>{PHASE_LABELS[state.phase]}</dd>
        </div>
        <div>
          <dt>Alive</dt>
          <dd>
            {alivePlayers.length} / {state.players.length}
          </dd>
        </div>
        <div>
          <dt>Selected</dt>
          <dd>{currentPlayer ? currentPlayer.name : '—'}</dd>
        </div>
        <div>
          <dt>Winner</dt>
          <dd>{getWinnerName(state) ?? '—'}</dd>
        </div>
      </dl>

      {isSetup && (
        <div className="debug-panel__block">
          <label className="debug-panel__label" htmlFor="debug-names">
            Player names (one per line)
          </label>
          <textarea
            id="debug-names"
            className="debug-panel__textarea"
            rows={4}
            value={nameInput}
            onChange={(event) => setNameInput(event.target.value)}
            placeholder={'Jason\nAmy\nKelvin'}
          />
          <div className="debug-panel__actions">
            <button type="button" onClick={handleAddNames} disabled={nameInput.trim().length === 0}>
              Add names
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'ADD_PLAYERS', names: DUMMY_NAMES })}
            >
              Add {DUMMY_NAMES.length} dummy players
            </button>
          </div>
        </div>
      )}

      <div className="debug-panel__actions">
        <button
          type="button"
          onClick={() => dispatch({ type: 'START_GAME' })}
          disabled={!isSetup || state.players.length < MIN_PLAYERS_TO_START}
        >
          Start game
        </button>
        <button type="button" onClick={spinPlayer} disabled={!canSpinPlayerWheel(state)}>
          Select random player
        </button>
        <button
          type="button"
          onClick={() => {
            if (currentPlayer) {
              dispatch({ type: 'ELIMINATE_PLAYER', playerId: currentPlayer.id });
            }
          }}
          disabled={!currentPlayer || currentPlayer.status !== 'alive'}
        >
          Eliminate selected
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'NEXT_ROUND' })}
          disabled={isSetup || state.screenState === 'winner'}
        >
          Next round
        </button>
        <button type="button" onClick={() => dispatch({ type: 'RESET_GAME' })}>
          Reset game
        </button>
      </div>

      <div className="debug-panel__columns">
        <div className="debug-panel__block">
          <h3>Alive ({alivePlayers.length})</h3>
          <ul className="debug-panel__list">
            {alivePlayers.map((player) => (
              <li
                key={player.id}
                className={player.id === state.currentPlayerId ? 'is-current' : undefined}
              >
                <span>{player.name}</span>
                {player.shield > 0 && <span title="Shield">🛡</span>}
                {player.deathMark && <span title="Death Mark">💀</span>}
                {isSetup && (
                  <button
                    type="button"
                    className="debug-panel__remove"
                    onClick={() => dispatch({ type: 'REMOVE_PLAYER', playerId: player.id })}
                    aria-label={`Remove ${player.name}`}
                  >
                    ✕
                  </button>
                )}
              </li>
            ))}
            {alivePlayers.length === 0 && <li className="is-empty">No players</li>}
          </ul>
        </div>

        <div className="debug-panel__block">
          <h3>Eliminated ({eliminatedPlayers.length})</h3>
          <ul className="debug-panel__list">
            {eliminatedPlayers.map((player) => (
              <li key={player.id} className="is-eliminated">
                <span>{player.name}</span>
                <span className="debug-panel__meta">round {player.eliminatedAtRound}</span>
              </li>
            ))}
            {eliminatedPlayers.length === 0 && <li className="is-empty">Nobody yet</li>}
          </ul>
        </div>

        <div className="debug-panel__block">
          <h3>Event history ({state.history.length})</h3>
          <ol className="debug-panel__list debug-panel__list--events">
            {state.history.map((entry, index) => (
              <li key={`${entry.round}-${index}`}>
                <span className="debug-panel__meta">R{entry.round}</span> {entry.event.type}
              </li>
            ))}
            {state.history.length === 0 && <li className="is-empty">No events</li>}
          </ol>
        </div>
      </div>
    </section>
  );
}

function getWinnerName(state: GameState): string | null {
  if (state.winnerId === null) return null;
  return state.players.find((player) => player.id === state.winnerId)?.name ?? state.winnerId;
}
