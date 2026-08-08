/**
 * Application root.
 *
 * Phase 2 routes between the Setup screen and the two-wheel game shell.
 * Arcade presentation, persistence and the advanced abilities are later phases.
 */

import { useMemo } from 'react';
import { useGame } from '../hooks/useGame';
import { GameScreen } from '../components/GameScreen/GameScreen';
import { PlayerSetup } from '../components/PlayerSetup/PlayerSetup';
import { filterAlive, getRevealedAbilityId, getRevealedPlayer } from '../game/engine/selectors';
import { getAvailableAbilities } from '../game/abilities';

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
          />
        )}
      </main>

      <footer className="app__footer">Phase 4 — Advanced MVP Fate Abilities</footer>
    </div>
  );
}
