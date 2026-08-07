/**
 * Main game screen — Phase 1 shell.
 *
 * Scope is deliberately the Main Wheel only. No Fate Wheel (Phase 2), no
 * abilities (Phase 3), no arcade theming (Phase 7).
 *
 * The action button is state-aware and single-purpose at any moment
 * (AGENTS.md §8): it cannot start a second spin, and it cannot advance the
 * round while the wheel is turning.
 */

import type { GameAction } from '../../game/engine/reducer';
import type { GameState } from '../../game/types/game';
import type { Player } from '../../game/types/player';
import { canAdvanceRound, canSpinPlayerWheel, isAnimating } from '../../game/engine/selectors';
import { PHASE_LABELS } from '../../game/phases/phaseConfig';
import { MainWheel } from '../MainWheel/MainWheel';

type GameScreenProps = {
  state: GameState;
  alivePlayers: Player[];
  revealedPlayer: Player | null;
  dispatch: (action: GameAction) => void;
  spinPlayer: () => void;
  completePlayerSpin: () => void;
};

export function GameScreen({
  state,
  alivePlayers,
  revealedPlayer,
  dispatch,
  spinPlayer,
  completePlayerSpin,
}: GameScreenProps) {
  const spinning = state.screenState === 'spinning_player';
  const locked = isAnimating(state);

  return (
    <section className="game">
      <div className="game__stats">
        <Stat label="Round" value={String(state.round)} />
        <Stat label="Alive" value={`${alivePlayers.length} / ${state.players.length}`} />
        <Stat label="Phase" value={PHASE_LABELS[state.phase]} />
      </div>

      <div className="game__stage">
        <MainWheel
          players={alivePlayers}
          selectedId={state.currentPlayerId}
          spinning={spinning}
          onSpinComplete={completePlayerSpin}
        />

        <div className="game__result" aria-live="polite">
          {spinning && <p className="game__result-pending">Spinning…</p>}
          {!spinning && revealedPlayer && (
            <>
              <p className="game__result-label">Selected</p>
              <p className="game__result-name">{revealedPlayer.name}</p>
            </>
          )}
          {!spinning && !revealedPlayer && state.screenState !== 'winner' && (
            <p className="game__result-pending">Who is next?</p>
          )}
          {state.screenState === 'winner' && <p className="game__result-name">Game over</p>}
        </div>

        <div className="game__actions">
          {canAdvanceRound(state) ? (
            <button
              type="button"
              className="button button--primary button--large"
              onClick={() => dispatch({ type: 'NEXT_ROUND' })}
            >
              Next Round
            </button>
          ) : (
            <button
              type="button"
              className="button button--primary button--large"
              onClick={spinPlayer}
              disabled={!canSpinPlayerWheel(state)}
            >
              {spinning ? 'Spinning…' : 'Spin Player'}
            </button>
          )}
        </div>
      </div>

      <div className="game__roster">
        <h2 className="game__roster-heading">Players</h2>
        <ul className="game__roster-list">
          {state.players.map((player) => {
            const isOut = player.status === 'eliminated';
            const isSelected = revealedPlayer?.id === player.id;
            return (
              <li
                key={player.id}
                className={[
                  'game__roster-item',
                  isOut ? 'is-out' : '',
                  isSelected ? 'is-selected' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {player.name}
              </li>
            );
          })}
        </ul>
      </div>

      {/*
        TEMPORARY. Phase 1 has no abilities, so without this there is no way to
        remove a player and exercise the wheel's dynamic re-render. Delete once
        Eliminate exists as a real Fate in Phase 3.
      */}
      <div className="game__dev">
        <span className="game__dev-tag">dev</span>
        <button
          type="button"
          className="button button--small"
          onClick={() => {
            if (revealedPlayer) {
              dispatch({ type: 'ELIMINATE_PLAYER', playerId: revealedPlayer.id });
            }
          }}
          disabled={locked || !revealedPlayer || revealedPlayer.status !== 'alive'}
        >
          Eliminate selected
        </button>
        <button
          type="button"
          className="button button--small"
          onClick={() => dispatch({ type: 'RESET_GAME' })}
          disabled={locked}
        >
          Reset to setup
        </button>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="game__stat">
      <span className="game__stat-label">{label}</span>
      <span className="game__stat-value">{value}</span>
    </div>
  );
}
