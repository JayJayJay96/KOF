/**
 * Drives the impact effects: flash, shake, and the big impact word.
 *
 * Presentation timing only — it owns no game state, and the engine has no idea
 * it exists (AGENTS.md §7.4).
 *
 * When several effects land in one batch (a Death Mark activation resolves an
 * attack and an elimination together) only the LAST is shown. Stacking two
 * impact words on top of each other reads as a glitch rather than drama.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameEvent, GameHistoryEntry } from '../game/events/eventTypes';
import type { ScreenEffect } from '../effects/effectRegistry';
import { effectForEvent } from '../effects/effectRegistry';
import { useNewEvents } from './useNewEvents';

export const EFFECT_MS = 900;
export const SHAKE_MS = 420;

export type ActiveEffect = ScreenEffect & { key: number };

export function useScreenEffects(history: readonly GameHistoryEntry[]): {
  effect: ActiveEffect | null;
  shaking: boolean;
} {
  const [effect, setEffect] = useState<ActiveEffect | null>(null);
  const [shaking, setShaking] = useState(false);
  const sequence = useRef(0);

  const handleEvents = useCallback((events: GameEvent[]) => {
    let latest: ScreenEffect | null = null;
    for (const event of events) {
      const candidate = effectForEvent(event);
      if (candidate) latest = candidate;
    }
    if (!latest) return;

    // A changing key restarts the CSS animation even for a repeated effect.
    sequence.current += 1;
    setEffect({ ...latest, key: sequence.current });
    if (latest.shake) setShaking(true);
  }, []);

  useNewEvents(history, handleEvents);

  useEffect(() => {
    if (!effect) return;
    const timer = window.setTimeout(() => setEffect(null), EFFECT_MS);
    return () => window.clearTimeout(timer);
  }, [effect]);

  useEffect(() => {
    if (!shaking) return;
    const timer = window.setTimeout(() => setShaking(false), SHAKE_MS);
    return () => window.clearTimeout(timer);
  }, [shaking]);

  return { effect, shaking };
}
