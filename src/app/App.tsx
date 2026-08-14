/**
 * Application root.
 *
 * Routes between the Setup screen and the two-wheel game shell, and hosts the
 * two things that sit above both: the resume prompt and the Host Panel.
 */

import { useMemo } from 'react';
import { useGame } from '../hooks/useGame';
import { GameScreen } from '../components/GameScreen/GameScreen';
import { PlayerSetup } from '../components/PlayerSetup/PlayerSetup';
import { HostPanel } from '../components/HostPanel/HostPanel';
import { ResumePrompt } from '../components/ResumePrompt/ResumePrompt';
import { filterAlive, getRevealedAbilityId, getRevealedPlayer } from '../game/engine/selectors';
import { getAvailableAbilities } from '../game/abilities';
import { useGameAudio } from '../hooks/useGameAudio';

export default function App() {
  const {
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
    autoAdvanceMs,
    savedGame,
    resumeSaved,
    discardSaved,
    saveNow,
  } = useGame();

  // Memoised so each wheel receives a stable entries array; a fresh array on
  // every render would restart an in-flight spin animation.
  const alivePlayers = useMemo(() => filterAlive(state.players), [state.players]);
  const eliminatedPlayers = useMemo(
    () => state.players.filter((player) => player.status === 'eliminated'),
    [state.players],
  );

  // Availability reads phase, roster and config, so it genuinely depends on the
  // whole state. Recomputing per dispatch is cheap, and no dispatch happens
  // mid-spin, so the Fate Wheel's entries stay stable while it animates.
  const availableAbilities = useMemo(() => getAvailableAbilities(state), [state]);

  // Audio subscribes to the same events the effects do; the engine is unaware.
  useGameAudio(state.history, state.config.audio);

  const revealedPlayer = getRevealedPlayer(state);
  const revealedAbilityId = getRevealedAbilityId(state);

  const isSetup = state.screenState === 'setup';

  return (
    /* data-phase drives the phase atmosphere in CSS (PROJECT_SPEC.md §10).
       Sudden Death gets its own treatment without any component branching. */
    <div className="app" data-phase={isSetup ? undefined : state.phase}>
      <header className="app__header">
        <h1 className="app__title">
          KOF <span className="app__subtitle">King of Fate</span>
        </h1>
      </header>

      <main className="app__main">
        {isSetup ? (
          <PlayerSetup players={state.players} dispatch={dispatch} />
        ) : (
          <GameScreen
            state={state}
            alivePlayers={alivePlayers}
            eliminatedPlayers={eliminatedPlayers}
            availableAbilities={availableAbilities}
            revealedPlayer={revealedPlayer}
            revealedAbilityId={revealedAbilityId}
            dispatch={dispatch}
            spinPlayer={spinPlayer}
            completePlayerSpin={completePlayerSpin}
            spinFate={spinFate}
            completeFateSpin={completeFateSpin}
            resolveFate={resolveFate}
            spinTarget={spinTarget}
            autoAdvanceMs={autoAdvanceMs}
          />
        )}
      </main>

      <footer className="app__footer">Phase 6 — Host Safety &amp; Persistence</footer>

      <HostPanel
        state={state}
        dispatch={dispatch}
        canUndo={canUndo}
        onUndo={undo}
        onSaveNow={saveNow}
        onClearSave={discardSaved}
      />

      {savedGame && (
        <ResumePrompt
          savedAt={savedGame.savedAt}
          playerCount={savedGame.state.players.length}
          round={savedGame.state.round}
          onResume={resumeSaved}
          onDiscard={discardSaved}
        />
      )}
    </div>
  );
}
