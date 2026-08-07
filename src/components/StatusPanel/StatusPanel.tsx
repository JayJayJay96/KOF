/**
 * Player status display.
 *
 * DEVELOPMENT_ROADMAP.md Phase 3: a simple list showing status, with eliminated
 * players in a separate section. PROJECT_SPEC.md §13 wants badges visible near
 * names so viewers can follow ongoing player stories on a stream.
 *
 * Pure projection of GameState — it decides nothing.
 */

import type { Player } from '../../game/types/player';

type StatusPanelProps = {
  alive: Player[];
  eliminated: Player[];
  selectedId: string | null;
};

export function StatusPanel({ alive, eliminated, selectedId }: StatusPanelProps) {
  return (
    <div className="status">
      <section className="status__group">
        <h2 className="status__heading">
          Alive <span className="status__count">{alive.length}</span>
        </h2>
        <ul className="status__list">
          {alive.map((player) => (
            <li
              key={player.id}
              className={`status__chip${player.id === selectedId ? ' is-selected' : ''}`}
            >
              <span className="status__name">{player.name}</span>
              {player.shield > 0 && (
                <span className="status__badge" title="Shield" aria-label="Shield">
                  🛡
                </span>
              )}
              {player.deathMark && (
                <span className="status__badge" title="Death Mark" aria-label="Death Mark">
                  💀
                </span>
              )}
            </li>
          ))}
          {alive.length === 0 && <li className="status__empty">Nobody left</li>}
        </ul>
      </section>

      {eliminated.length > 0 && (
        <section className="status__group status__group--out">
          <h2 className="status__heading">
            Out <span className="status__count">{eliminated.length}</span>
          </h2>
          <ul className="status__list">
            {eliminated.map((player) => (
              <li key={player.id} className="status__chip is-out">
                <span className="status__name">{player.name}</span>
                <span className="status__round">R{player.eliminatedAtRound}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
