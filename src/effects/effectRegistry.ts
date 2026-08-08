/**
 * Which game event shows which effect — PROJECT_SPEC.md §27.
 *
 * Pure lookup. Effects subscribe to events the engine already emits, so adding
 * one never touches the reducer, an ability, or a wheel.
 *
 * Screen shake is limited to elimination. If everything shook, nothing would
 * read as an impact — and spec §28 is explicit that host controls must not
 * shake, which is why the shake class lands on the game scene rather than the
 * page root.
 */

import type { GameEvent } from '../game/events/eventTypes';

export type EffectTone = 'kill' | 'block' | 'dark' | 'gold' | 'cool';

export type ScreenEffect = {
  /** Big impact word, e.g. K.O. Omitted for effects that only flash. */
  title?: string;
  tone: EffectTone;
  flash: boolean;
  shake: boolean;
};

export function effectForEvent(event: GameEvent): ScreenEffect | null {
  switch (event.type) {
    case 'ELIMINATE_PLAYER':
      return { title: 'K.O.', tone: 'kill', flash: true, shake: true };

    case 'SHIELD_BLOCK':
      return { title: 'BLOCK', tone: 'block', flash: true, shake: false };

    case 'ADD_SHIELD':
      return { title: 'SHIELD', tone: 'cool', flash: true, shake: false };

    case 'ADD_DEATH_MARK':
      return { title: 'MARKED', tone: 'dark', flash: true, shake: false };

    case 'REVIVE_PLAYER':
      return { title: 'REVIVE', tone: 'gold', flash: true, shake: false };

    case 'REQUEST_PLAYER_SPIN':
      return event.purpose === 'duel_opponent'
        ? { title: 'DUEL', tone: 'kill', flash: true, shake: false }
        : { title: 'TARGET', tone: 'kill', flash: true, shake: false };

    // PHASE_CHANGED and GAME_WON have their own dedicated overlays.
    default:
      return null;
  }
}
