/**
 * Story rail — the running account of the game, beside the wheels.
 *
 * Distinct from `EventLog`, which shows the same data inside the Host Panel for
 * the host's own checking. This one is on the streamed screen, so it is built
 * for someone who just arrived: newest round first, so the latest beat is
 * visible without scrolling, and colour-toned so a death reads before the name
 * does (PROJECT_SPEC.md §25).
 *
 * A pure renderer. The wording and the tones both come from
 * `events/eventLog.ts`, so this file never learns what a Death Mark is.
 */

import type { GameHistoryEntry } from '../../game/events/eventTypes';
import type { Player } from '../../game/types/player';
import { buildEventLog } from '../../game/events/eventLog';

type StoryLogProps = {
  history: readonly GameHistoryEntry[];
  players: readonly Player[];
};

export function StoryLog({ history, players }: StoryLogProps) {
  const rounds = buildEventLog(history, players);

  return (
    <aside className="story-log" aria-label="Story log">
      <h2 className="story-log__heading">Story</h2>

      {rounds.length === 0 ? (
        <p className="story-log__empty">Nothing has happened yet.</p>
      ) : (
        <ol className="story-log__rounds">
          {rounds.map((round) => (
            <li key={round.round} className="story-log__round">
              <h3 className="story-log__round-label">Round {round.round}</h3>
              <ul className="story-log__lines">
                {round.lines.map((line, index) => (
                  <li key={index} className="story-log__line" data-tone={line.tone}>
                    {line.text}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </aside>
  );
}
