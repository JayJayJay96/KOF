/**
 * Human-readable event history — PROJECT_SPEC.md §25.
 *
 * The log serves three audiences: viewers following the story, the host
 * verifying a status, and whoever is debugging a weird round. It reads from
 * `state.history`, which the engine already stamps with a round number.
 *
 * Formatting lives here rather than in the component so the wording is in one
 * place and the component stays a renderer.
 *
 * Events with no narrative value return null and are dropped: ATTACK_PLAYER is
 * always followed by its outcome, and the spin-request and WAIT_FOR_HOST events
 * are flow control the audience never needs to see.
 */

import type { GameEvent, GameHistoryEntry } from './eventTypes';
import type { Player } from '../types/player';
import { PHASE_LABELS } from '../phases/phaseConfig';

export type EventLogRound = {
  round: number;
  lines: string[];
};

function nameOf(players: readonly Player[], playerId: string): string {
  return players.find((player) => player.id === playerId)?.name ?? 'Unknown';
}

/** One log line, or null when the event is flow control rather than story. */
export function describeEvent(event: GameEvent, players: readonly Player[]): string | null {
  switch (event.type) {
    case 'GAME_STARTED':
      return `Game started — ${event.playerCount} players`;

    case 'PLAYER_SELECTED':
      return `🎡 ${nameOf(players, event.playerId)} selected`;

    case 'TARGET_SELECTED':
      return `🎯 Target: ${nameOf(players, event.playerId)}`;

    case 'SHOW_MESSAGE':
      return event.message;

    case 'ADD_SHIELD':
      return `🛡 ${nameOf(players, event.playerId)} gains a Shield`;

    case 'SHIELD_BLOCK':
      return `🛡 ${nameOf(players, event.playerId)} blocked it`;

    case 'ADD_DEATH_MARK':
      return `💀 ${nameOf(players, event.playerId)} is marked`;

    case 'ELIMINATE_PLAYER':
      return `☠ ${nameOf(players, event.playerId)} eliminated`;

    case 'REVIVE_PLAYER':
      return `❤️ ${nameOf(players, event.playerId)} revived`;

    case 'PHASE_CHANGED':
      return `⚑ ${PHASE_LABELS[event.phase]}`;

    case 'GAME_WON':
      return `👑 ${nameOf(players, event.playerId)} wins`;

    // Flow control, and duplicates of the outcome that follows.
    case 'ROUND_STARTED':
    case 'ABILITY_SELECTED':
    case 'ATTACK_PLAYER':
    case 'REMOVE_DEATH_MARK':
    case 'WAIT_FOR_HOST':
    case 'REQUEST_PLAYER_SPIN':
    case 'REQUEST_FATE_SPIN':
      return null;

    default:
      return null;
  }
}

/**
 * Group the history into rounds, newest round first.
 *
 * Newest-first matters on a live screen: the host should not have to scroll to
 * see what just happened.
 */
export function buildEventLog(
  history: readonly GameHistoryEntry[],
  players: readonly Player[],
): EventLogRound[] {
  const rounds: EventLogRound[] = [];

  for (const entry of history) {
    const line = describeEvent(entry.event, players);
    if (line === null) continue;

    const current = rounds[rounds.length - 1];
    if (current && current.round === entry.round) {
      current.lines.push(line);
    } else {
      rounds.push({ round: entry.round, lines: [line] });
    }
  }

  return rounds.reverse();
}
