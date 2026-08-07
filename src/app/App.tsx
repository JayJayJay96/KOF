/**
 * Application root.
 *
 * Phase 0 deliberately renders only a header plus the temporary debug panel.
 * Wheels, the Setup screen and arcade presentation belong to Phase 1+.
 */

import { useGame } from '../hooks/useGame';
import { DebugPanel } from '../components/DebugPanel/DebugPanel';
import { PHASE_LABELS } from '../game/phases/phaseConfig';
import { getAlivePlayers } from '../game/engine/selectors';

export default function App() {
  const { state, dispatch, spinPlayer } = useGame();
  const aliveCount = getAlivePlayers(state).length;

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">
          KOF <span className="app__subtitle">King of Fate</span>
        </h1>
        <p className="app__meta">
          ROUND {state.round} · ALIVE {aliveCount}/{state.players.length} ·{' '}
          {PHASE_LABELS[state.phase]}
        </p>
      </header>

      <main className="app__main">
        <DebugPanel state={state} dispatch={dispatch} spinPlayer={spinPlayer} />
      </main>

      <footer className="app__footer">Phase 0 — Project Foundation</footer>
    </div>
  );
}
