/**
 * ✨ Purify
 *
 * Lifts a Death Mark off whoever is carrying one.
 *
 * Guardrail checklist (DEVELOPMENT_ROADMAP.md §8, Guardrail 6):
 *
 *   eligibility   at least one living player is marked
 *   weight        config/abilityWeights.ts
 *   target rules  a random marked living player, self first when applicable
 *   resolution    REMOVE_DEATH_MARK
 *   Wall          none
 *   phases        Chaos through Final Four
 *   edge cases    gated so it can never be a no-op
 *
 * WHY IT CANNOT CLEAR A C4
 *
 * A charge has exactly one escape — the wheel landing on its holder. Purify
 * appears in roughly half of all sessions, and a second escape route that
 * common would leave the countdown toothless. Narrow beats versatile here.
 *
 * WHY IT AIMS AT THE BOARD AND NOT THE SELECTED PLAYER
 *
 * In a dual spin the Fate is chosen while `currentPlayerId` is still null, so
 * `isAvailable` can only ask board-level questions. Aimed at the selected
 * player this would be a Fate that does nothing most of the time. Aimed at the
 * board it always lands — and when the selected player IS the marked one they
 * cleanse themselves, which is the best version of it, so that case is
 * preferred rather than left to the draw.
 *
 * Weights live in `config/abilityWeights.ts`.
 */

import type { AbilityDefinition } from '../types/ability';
import type { GameEvent } from '../events/eventTypes';
import type { Player } from '../types/player';
import { randomItem } from '../../utils/random';

function markedPlayers(players: readonly Player[]): Player[] {
  return players.filter((player) => player.status === 'alive' && player.deathMark);
}

export const purifyAbility: AbilityDefinition = {
  id: 'purify',
  name: 'Purify',
  icon: '✨',
  category: 'defense',

  isAvailable: (context) => markedPlayers(context.state.players).length > 0,

  resolve: (context, selectedPlayerId): GameEvent[] => {
    const marked = markedPlayers(context.state.players);
    // When the selected player is carrying one, it is theirs that lifts.
    const target = marked.find((player) => player.id === selectedPlayerId) ?? randomItem(marked);

    if (!target) {
      return [{ type: 'SHOW_MESSAGE', message: '✨ Nothing left to cleanse.' }];
    }

    return [
      {
        type: 'SHOW_MESSAGE',
        message:
          target.id === selectedPlayerId
            ? `✨ ${target.name} is cleansed — the 💀 Death Mark lifts`
            : `✨ The 💀 Death Mark lifts from ${target.name}`,
      },
      { type: 'REMOVE_DEATH_MARK', playerId: target.id },
    ];
  },

  describeStakes: (context, selectedPlayerId) => {
    const marked = markedPlayers(context.state.players);
    if (marked.length === 0) return null;

    const self = marked.find((player) => player.id === selectedPlayerId);
    if (self) return `${self.name} lifts their own 💀 Death Mark.`;

    return marked.length === 1
      ? `${marked[0].name} walks free of the 💀 Death Mark.`
      : `One of ${marked.length} 💀 Death Marks lifts.`;
  },
};
