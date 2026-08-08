/**
 * Feed of events appended since the last render.
 *
 * Effects and audio are both *subscribers* to the engine (PROJECT_SPEC.md §27):
 * the reducer already emits everything worth reacting to, so presentation only
 * has to notice what is new.
 *
 * UNDO REWINDS HISTORY. When the log gets shorter the cursor is reset without
 * replaying anything, otherwise undoing an elimination would fire the K.O.
 * effect and sound again — the opposite of what the host asked for.
 */

import { useEffect, useRef } from 'react';
import type { GameEvent, GameHistoryEntry } from '../game/events/eventTypes';

export function useNewEvents(
  history: readonly GameHistoryEntry[],
  onEvents: (events: GameEvent[]) => void,
): void {
  const cursor = useRef(0);
  const handler = useRef(onEvents);
  handler.current = onEvents;

  useEffect(() => {
    // Rewound by undo, or reset by a new game: resync silently.
    if (history.length < cursor.current) {
      cursor.current = history.length;
      return;
    }

    if (history.length === cursor.current) return;

    const fresh = history.slice(cursor.current).map((entry) => entry.event);
    cursor.current = history.length;
    handler.current(fresh);
  }, [history]);
}
