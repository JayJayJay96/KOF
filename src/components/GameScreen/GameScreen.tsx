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

import { useState } from 'react';
import type { GameAction } from '../../game/engine/reducer';
import type { AbilityDefinition } from '../../game/types/ability';
import type { GameState } from '../../game/types/game';
import type { Player } from '../../game/types/player';
import {
  canAdvanceRound,
  canContinueEvents,
  canResolveFate,
  canSpinFateWheel,
  canSpinPlayerWheel,
  canSpinTarget,
  getMainWheelPlayers,
  getMainWheelSelectedId,
  isAnimating,
} from '../../game/engine/selectors';
import { describeSituation } from '../../game/narration/situation';
import { getAbility } from '../../game/abilities';
import { PHASE_LABELS } from '../../game/phases/phaseConfig';
import { MainWheel } from '../MainWheel/MainWheel';
import { FateWheel } from '../FateWheel/FateWheel';
import { StoryLog } from '../StoryLog/StoryLog';
import { StatusPanel } from '../StatusPanel/StatusPanel';
import { PhaseAnnouncement } from '../PhaseAnnouncement/PhaseAnnouncement';
import { WinnerScreen } from '../WinnerScreen/WinnerScreen';
import { EffectLayer } from '../../effects/EffectLayer';
import { usePhaseAnnouncement } from '../../hooks/usePhaseAnnouncement';
import { useScreenEffects } from '../../hooks/useScreenEffects';

/**
 * How late the Fate Wheel launches when both wheels run in one round.
 *
 * The first attempt started them together and made the Fate Wheel 800ms longer.
 * That got the reveal order right but split attention for the whole spin — two
 * wheels moving at once, neither of them clearly the thing to watch.
 *
 * Staggering fixes that without giving the seconds back. The Main Wheel gets
 * three seconds alone, which is where "who is it going to be" actually lives.
 * The Fate Wheel is on screen the entire time, visibly armed and still, and
 * launches into the Main Wheel's final crawl.
 *
 * ```text
 * Main   0.0s ──────────────────────────► 7.8s
 * Fate            3.0s ──────────────────────────► 9.2s
 * ```
 *
 * WHO still lands before WHAT, with a 1.4s gap, and the round costs 9.2s against
 * 12.9s when the spins ran fully sequentially.
 *
 * Both wheels grew by a second in Enhancement Phase 1, spent entirely on the
 * crawl — the tail is an absolute 3.3s on each now, rather than a share of the
 * spin. The stagger itself is unchanged, which is why the gap between the two
 * reveals is exactly what it was.
 */
const DUAL_FATE_START_DELAY_MS = 3000;

type GameScreenProps = {
  state: GameState;
  alivePlayers: Player[];
  eliminatedPlayers: Player[];
  availableAbilities: AbilityDefinition[];
  revealedPlayer: Player | null;
  revealedAbilityId: string | null;
  dispatch: (action: GameAction) => void;
  spinPlayer: () => void;
  completePlayerSpin: () => void;
  spinFate: () => void;
  completeFateSpin: () => void;
  resolveFate: () => void;
  spinTarget: () => void;
};

export function GameScreen({
  state,
  alivePlayers,
  eliminatedPlayers,
  availableAbilities,
  revealedPlayer,
  revealedAbilityId,
  dispatch,
  spinPlayer,
  completePlayerSpin,
  spinFate,
  completeFateSpin,
  resolveFate,
  spinTarget,
}: GameScreenProps) {
  const [storyOpen, setStoryOpen] = useState(true);

  // In a dual spin both wheels are live at once. The Main Wheel drops out first:
  // landing it moves the round to 'spinning_fate', so WHO is revealed while the
  // Fate Wheel is still turning and the WHO -> WHAT reading order survives.
  const dualSpin = state.screenState === 'spinning_both';
  const spinningPlayer = dualSpin || state.screenState === 'spinning_player';
  const spinningFate = dualSpin || state.screenState === 'spinning_fate';
  const isWinner = state.screenState === 'winner';

  const revealedAbility = getAbility(revealedAbilityId);
  // The Fate Wheel is no longer "waiting" while it is turning alongside the
  // Main Wheel, even though no player has been revealed yet.
  const fateActive = dualSpin || (revealedPlayer !== null && !isWinner);
  const situation = describeSituation(state);

  // Suppressed once the game is decided so a final elimination cannot fire a
  // phase title over the winner overlay.
  const phaseTitle = usePhaseAnnouncement(state.phase, !isWinner);

  // Shake lands on the game scene, never the page root, so the host panel and
  // its controls stay still (PROJECT_SPEC.md §28).
  const { effect, shaking } = useScreenEffects(state.history);

  return (
    <section className={`game${shaking ? ' game--shake' : ''}`}>
      <EffectLayer effect={effect} />
      <PhaseAnnouncement title={phaseTitle} />

      {isWinner && (
        <WinnerScreen
          winnerName={winnerName(state)}
          onNewGame={() => dispatch({ type: 'RESET_GAME' })}
        />
      )}

      <div className="game__stage">
        <div className="game__stats">
          <Stat label="Round" value={String(state.round)} />
          <Stat label="Alive" value={`${alivePlayers.length} / ${state.players.length}`} />
          <Stat label="Phase" value={PHASE_LABELS[state.phase]} />

          {/* The rail costs the wheels about a fifth of the width, so it has to
              be dismissable — PROJECT_SPEC.md §8 wants the Main Wheel dominant. */}
          <button
            type="button"
            className="button button--small game__log-toggle"
            aria-expanded={storyOpen}
            onClick={() => setStoryOpen((wasOpen) => !wasOpen)}
          >
            {storyOpen ? 'Hide story' : 'Show story'}
          </button>
        </div>

        <div className="game__wheels">
          <div className="game__wheel game__wheel--main">
            <MainWheel
              players={getMainWheelPlayers(state)}
              selectedId={getMainWheelSelectedId(state)}
              spinning={spinningPlayer}
              phase={state.phase}
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
              phase={state.phase}
              startDelayMs={dualSpin ? DUAL_FATE_START_DELAY_MS : 0}
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
          {situation && <p className="game__message">{situation}</p>}
        </div>

        <div className="game__actions">
          <PrimaryAction
            state={state}
            spinPlayer={spinPlayer}
            spinFate={spinFate}
            resolveFate={resolveFate}
            spinTarget={spinTarget}
            dispatch={dispatch}
          />
        </div>

        <StatusPanel
          alive={alivePlayers}
          eliminated={eliminatedPlayers}
          selectedId={revealedPlayer?.id ?? null}
        />
      </div>

      {storyOpen && (
        <div className="game__rail">
          <StoryLog history={state.history} players={state.players} />
        </div>
      )}
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
  spinTarget,
  dispatch,
}: {
  state: GameState;
  spinPlayer: () => void;
  spinFate: () => void;
  resolveFate: () => void;
  spinTarget: () => void;
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

  // Any wheel turning locks the control. Checked before everything else so the
  // dual-spin state cannot fall through to a live "Spin Player" button.
  if (isAnimating(state)) {
    return (
      <button type="button" className={className} disabled>
        Spinning…
      </button>
    );
  }

  // An ability is waiting on a target (Hunter, Duel).
  if (canSpinTarget(state)) {
    return (
      <button type="button" className={className} onClick={spinTarget}>
        Spin Target
      </button>
    );
  }

  // Resolution suspended on a blocking event — the host decides when to resume.
  if (canContinueEvents(state)) {
    return (
      <button
        type="button"
        className={className}
        onClick={() => dispatch({ type: 'CONTINUE_EVENTS' })}
      >
        Continue
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
      Spin Player
    </button>
  );
}

/** Null when everyone was eliminated — the game is over with no survivor. */
function winnerName(state: GameState): string | null {
  return state.players.find((player) => player.id === state.winnerId)?.name ?? null;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="game__stat">
      <span className="game__stat-label">{label}</span>
      <span className="game__stat-value">{value}</span>
    </div>
  );
}
