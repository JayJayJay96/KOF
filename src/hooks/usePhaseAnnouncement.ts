/**
 * Transient phase-transition announcement.
 *
 * DEVELOPMENT_ROADMAP.md Phase 5 asks for a simple overlay when a threshold is
 * crossed, not final visual polish.
 *
 * The engine already emits PHASE_CHANGED and re-derives `phase` on every
 * elimination and revival, so this hook only has to notice the value move. It
 * owns no game state — purely presentation timing, which is why it lives in
 * hooks and not in the reducer (AGENTS.md §7.4).
 *
 * Auto-dismisses rather than waiting for the host: a phase change is a reveal,
 * not a decision, and spec §7 reserves host clicks for actual choices.
 */

import { useEffect, useRef, useState } from 'react';
import type { GamePhase } from '../game/types/game';
import { PHASE_ANNOUNCEMENTS } from '../game/phases/phaseConfig';

export const PHASE_ANNOUNCEMENT_MS = 1900;

export function usePhaseAnnouncement(
  phase: GamePhase,
  active: boolean,
  durationMs = PHASE_ANNOUNCEMENT_MS,
): string | null {
  const previousPhase = useRef<GamePhase | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  useEffect(() => {
    // While out of play, forget the phase so returning to setup and starting
    // again does not replay a stale transition.
    if (!active) {
      previousPhase.current = null;
      setAnnouncement(null);
      return;
    }

    const previous = previousPhase.current;
    previousPhase.current = phase;

    // First render of a live game is not a transition.
    if (previous === null || previous === phase) return;

    const title = PHASE_ANNOUNCEMENTS[phase];
    if (!title) {
      setAnnouncement(null);
      return;
    }

    setAnnouncement(title);
    const timer = window.setTimeout(() => setAnnouncement(null), durationMs);
    return () => window.clearTimeout(timer);
  }, [phase, active, durationMs]);

  return announcement;
}
