/**
 * Plays a cue for every game event that has one.
 *
 * Audio is a subscriber, exactly like effects: the engine emits, this listens
 * (PROJECT_SPEC.md §27). Nothing in `src/game/` knows sound exists.
 *
 * Two browser realities are handled here:
 *   - an AudioContext stays suspended until a real user gesture, so the first
 *     pointer or key event unlocks it;
 *   - levels live in `config.audio`, so they persist with the save and survive
 *     a resume without any extra storage.
 */

import { useCallback, useEffect } from 'react';
import type { GameEvent, GameHistoryEntry } from '../game/events/eventTypes';
import type { GameConfig } from '../game/types/game';
import { playSound, setAudioLevels, unlockAudio } from '../audio/audioManager';
import { soundForEvent } from '../audio/soundRegistry';
import { useNewEvents } from './useNewEvents';

export function useGameAudio(
  history: readonly GameHistoryEntry[],
  audio: GameConfig['audio'],
): void {
  useEffect(() => {
    // `muted` is optional so pre-Phase-7 saves still load; absent means unmuted.
    setAudioLevels({ master: audio.master, sfx: audio.sfx, muted: audio.muted ?? false });
  }, [audio.master, audio.sfx, audio.muted]);

  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const handleEvents = useCallback((events: GameEvent[]) => {
    for (const event of events) {
      const sound = soundForEvent(event);
      if (sound) playSound(sound);
    }
  }, []);

  useNewEvents(history, handleEvents);
}
