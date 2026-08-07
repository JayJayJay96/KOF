/**
 * Application root.
 *
 * Phase 1 routes between two screens on `screenState`: Setup, and the Main
 * Wheel game shell. The Fate Wheel, abilities and arcade presentation are
 * later phases.
 */

import { useMemo } from 'react';
import { useGame } from '../hooks/useGame';
import { GameScreen } from '../components/GameScreen/GameScreen';
import { PlayerSetup } from '../components/PlayerSetup/PlayerSetup';
import { filterAlive, getRevealedPlayer } from '../game/engine/selectors';

export default function App() {
  const { state, dispatch, spinPlayer, completePlayerSpin } = useGame();

  // Memoised so the wheel receives a stable entries array; a fresh array on
  // every render would restart the spin animation.
  const alivePlayers = useMemo(() => filterAlive(state.players), [state.players]);
  const revealedPlayer = getRevealedPlayer(state);

  const isSetup = state.screenState === 'setup';

  return (
    <div className="app">
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
            revealedPlayer={revealedPlayer}
            dispatch={dispatch}
            spinPlayer={spinPlayer}
            completePlayerSpin={completePlayerSpin}
          />
        )}
      </main>

      <footer className="app__footer">Phase 1 — Main Wheel Vertical Slice</footer>
    </div>
  );
}
