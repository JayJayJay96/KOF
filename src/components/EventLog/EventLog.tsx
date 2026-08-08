/**
 * Event history — PROJECT_SPEC.md §25.
 *
 * Grouped by round, newest first. Wording comes from `events/eventLog.ts`, so
 * this stays a renderer.
 *
 * Lives inside the Host Panel rather than the main screen: the game screen
 * already shows the current narration line, and vertical space there is the
 * binding constraint at 1280x720.
 */

import type { GameHistoryEntry } from '../../game/events/eventTypes';
import type { Player } from '../../game/types/player';
import { buildEventLog } from '../../game/events/eventLog';

type EventLogProps = {
  history: readonly GameHistoryEntry[];
  players: readonly Player[];
};

export function EventLog({ history, players }: EventLogProps) {
  const rounds = buildEventLog(history, players);

  if (rounds.length === 0) {
    return <p className="event-log__empty">Nothing has happened yet.</p>;
  }

  return (
    <ol className="event-log">
      {rounds.map((round) => (
        <li key={round.round} className="event-log__round">
          <h4 className="event-log__round-label">Round {String(round.round).padStart(2, '0')}</h4>
          <ul className="event-log__lines">
            {round.lines.map((line, index) => (
              <li key={index} className="event-log__line">
                {line}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}
