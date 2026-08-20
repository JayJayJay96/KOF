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
              // The name is clamped in CSS, so the full one lives here.
              title={player.name}
            >
              <span className="status__name">{player.name}</span>
              {/* The fuse IS the mechanic, so the number rides on the badge. A
                  bare 🧨 would say someone is holding it but not how long
                  anyone has left to care. */}
              {player.c4Fuse !== undefined && (
                <span
                  className="status__badge status__badge--c4"
                  title={`C4 — ${player.c4Fuse} round${player.c4Fuse === 1 ? '' : 's'} left`}
                  aria-label={`C4, ${player.c4Fuse} rounds left`}
                >
                  🧨{player.c4Fuse}
                </span>
              )}
              {player.wall > 0 && (
                <span className="status__badge" title="Wall" aria-label="Wall">
                  🧱
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
              <li key={player.id} className="status__chip is-out" title={player.name}>
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
