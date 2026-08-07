/**
 * Main game screen — Phase 2 two-wheel loop.
 *
 * WHO → WHAT FATE, with a host-triggered pause at every step. Nothing
 * auto-chains (PROJECT_SPEC.md §7, AGENTS.md §8).
 *
 * One primary action at a time, relabelled by state:
 *
 *   Spin Player -> Spin Fate -> Resolve -> Next Round
 *
 * Only Hunter/Duel/Revive/Death Mark are missing from the MVP ability set;
 * those are Phase 4. No arcade theming yet — that is Phase 7.
 */

import type { GameAction } from '../../game/engine/reducer';
import type { AbilityDefinition } from '../../game/types/ability';
import type { GameState } from '../../game/types/game';
import type { Player } from '../../game/types/player';
import {
  canAdvanceRound,
  canResolveFate,
  canSpinFateWheel,
  canSpinPlayerWheel,
  isAnimating,
} from '../../game/engine/selectors';
import { getAbility } from '../../game/abilities';
import { PHASE_LABELS } from '../../game/phases/phaseConfig';
import { MainWheel } from '../MainWheel/MainWheel';
import { FateWheel } from '../FateWheel/FateWheel';

type GameScreenProps = {
  state: GameState;
  alivePlayers: Player[];
  availableAbilities: AbilityDefinition[];
  revealedPlayer: Player | null;
  revealedAbilityId: string | null;
  dispatch: (action: GameAction) => void;
  spinPlayer: () => void;
  completePlayerSpin: () => void;
  spinFate: () => void;
  completeFateSpin: () => void;
  resolveFate: () => void;
};

export function GameScreen({
  state,
  alivePlayers,
  availableAbilities,
  revealedPlayer,
  revealedAbilityId,
  dispatch,
  spinPlayer,
  completePlayerSpin,
  spinFate,
  completeFateSpin,
  resolveFate,
}: GameScreenProps) {
  const spinningPlayer = state.screenState === 'spinning_player';
  const spinningFate = state.screenState === 'spinning_fate';
  const locked = isAnimating(state);
  const isWinner = state.screenState === 'winner';

  const revealedAbility = getAbility(revealedAbilityId);
  const fateActive = revealedPlayer !== null && !isWinner;

  return (
    <section className="game">
      <div className="game__stats">
        <Stat label="Round" value={String(state.round)} />
        <Stat label="Alive" value={`${alivePlayers.length} / ${state.players.length}`} />
        <Stat label="Phase" value={PHASE_LABELS[state.phase]} />
      </div>

      <div className="game__wheels">
        <div className="game__wheel game__wheel--main">
          <MainWheel
            players={alivePlayers}
            selectedId={state.currentPlayerId}
            spinning={spinningPlayer}
            onSpinComplete={completePlayerSpin}
          />
        </div>

        <div className="game__wheel game__wheel--fate">
          <FateWheel
            abilities={availableAbilities}
            selectedId={state.currentAbilityId}
            spinning={spinningFate}
            active={fateActive}
            onSpinComplete={completeFateSpin}
          />
        </div>
      </div>

      <div className="game__readout" aria-live="polite">
        <p className="game__readout-line">
          {spinningPlayer && <span className="game__pending">Spinning…</span>}
          {!spinningPlayer && revealedPlayer && (
            <span className="game__name">{revealedPlayer.name}</span>
          )}
          {!spinningPlayer && !revealedPlayer && !isWinner && (
            <span className="game__pending">Who is next?</span>
          )}
          {revealedAbility && !spinningFate && (
            <>
              <span className="game__arrow">→</span>
              <span className="game__fate">
                {revealedAbility.icon} {revealedAbility.name}
              </span>
            </>
          )}
          {spinningFate && <span className="game__pending"> → deciding fate…</span>}
        </p>
        {isWinner && <p className="game__winner">WINNER — {winnerName(state)}</p>}
      </div>

      <div className="game__actions">
        <PrimaryAction
          state={state}
          spinPlayer={spinPlayer}
          spinFate={spinFate}
          resolveFate={resolveFate}
          dispatch={dispatch}
        />
      </div>

      <div className="game__roster">
        <ul className="game__roster-list">
          {state.players.map((player) => (
            <li
              key={player.id}
              className={[
                'game__roster-item',
                player.status === 'eliminated' ? 'is-out' : '',
                revealedPlayer?.id === player.id ? 'is-selected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {player.name}
              {player.shield > 0 && <span title="Shield"> 🛡</span>}
              {player.deathMark && <span title="Death Mark"> 💀</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* TEMPORARY dev control. Reset is not yet a host feature (Phase 6D). */}
      <div className="game__dev">
        <span className="game__dev-tag">dev</span>
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

/**
 * The single contextual action. Exactly one of these is live at a time, which
 * is what stops conflicting input during a round.
 */
function PrimaryAction({
  state,
  spinPlayer,
  spinFate,
  resolveFate,
  dispatch,
}: {
  state: GameState;
  spinPlayer: () => void;
  spinFate: () => void;
  resolveFate: () => void;
  dispatch: (action: GameAction) => void;
}) {
  const className = 'button button--primary button--large';

  if (state.screenState === 'winner') {
    return (
      <button type="button" className={className} onClick={() => dispatch({ type: 'RESET_GAME' })}>
        New Game
      </button>
    );
  }

  if (canAdvanceRound(state)) {
    return (
      <button type="button" className={className} onClick={() => dispatch({ type: 'NEXT_ROUND' })}>
        Next Round
      </button>
    );
  }

  if (canResolveFate(state)) {
    return (
      <button type="button" className={className} onClick={resolveFate}>
        Resolve
      </button>
    );
  }

  if (state.screenState === 'spinning_fate') {
    return (
      <button type="button" className={className} disabled>
        Spinning…
      </button>
    );
  }

  if (canSpinFateWheel(state)) {
    return (
      <button type="button" className={className} onClick={spinFate}>
        Spin Fate
      </button>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={spinPlayer}
      disabled={!canSpinPlayerWheel(state)}
    >
      {state.screenState === 'spinning_player' ? 'Spinning…' : 'Spin Player'}
    </button>
  );
}

function winnerName(state: GameState): string {
  return state.players.find((player) => player.id === state.winnerId)?.name ?? '—';
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="game__stat">
      <span className="game__stat-label">{label}</span>
      <span className="game__stat-value">{value}</span>
    </div>
  );
}
