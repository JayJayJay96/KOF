/**
 * Which game event makes which sound — PROJECT_SPEC.md §26, §27.
 *
 * A lookup, not logic. The engine already emits everything worth hearing, so
 * audio is a *subscriber*: adding a cue never touches the reducer, an ability,
 * or a component.
 *
 * Events that map to null are silent on purpose. ATTACK_PLAYER is always
 * followed by its outcome, so voicing both would double every hit.
 */

import type { GameEvent } from '../game/events/eventTypes';
import type { SoundName } from './audioManager';

export function soundForEvent(event: GameEvent): SoundName | null {
  switch (event.type) {
    case 'ABILITY_SELECTED':
      return 'fateReveal';

    case 'ELIMINATE_PLAYER':
      return 'eliminate';

    case 'SHIELD_BLOCK':
      return 'shieldBlock';

    case 'ADD_SHIELD':
      return 'shieldGain';

    // Losing a Shield to theft or a graze reuses the block cue: from the
    // victim's side it is the same metallic "your armour just went" moment.
    case 'REMOVE_SHIELD':
      return 'shieldBlock';

    case 'ADD_DEATH_MARK':
      return 'deathMark';

    case 'REVIVE_PLAYER':
      return 'revive';

    case 'PHASE_CHANGED':
      return 'phaseChange';

    case 'GAME_WON':
      return 'winner';

    // Target requests are how Hunter and Duel announce themselves.
    case 'REQUEST_PLAYER_SPIN':
      return event.purpose === 'duel_opponent' ? 'duel' : 'hunter';

    default:
      return null;
  }
}
