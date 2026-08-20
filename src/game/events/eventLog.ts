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
import { C4_FUSE } from '../statuses/c4Trigger';

/**
 * How a line should read at a glance.
 *
 * Colour carries the story faster than text on a stream — someone scanning the
 * rail should see that a player died before they read the name. The mapping
 * from tone to actual colour belongs to the component, not to this file.
 */
export type EventTone = 'kill' | 'threat' | 'save' | 'crown' | 'info';

export type EventLine = {
  text: string;
  tone: EventTone;
};

export type EventLogRound = {
  round: number;
  lines: EventLine[];
};

function nameOf(players: readonly Player[], playerId: string): string {
  return players.find((player) => player.id === playerId)?.name ?? 'Unknown';
}

/** One log line, or null when the event is flow control rather than story. */
export function describeEventLine(event: GameEvent, players: readonly Player[]): EventLine | null {
  switch (event.type) {
    case 'GAME_STARTED':
      return { text: `Game started — ${event.playerCount} players`, tone: 'info' };

    case 'PLAYER_SELECTED':
      return { text: `🎡 ${nameOf(players, event.playerId)} selected`, tone: 'info' };

    case 'TARGET_SELECTED':
      return { text: `🎯 Target: ${nameOf(players, event.playerId)}`, tone: 'threat' };

    case 'SHOW_MESSAGE':
      return { text: event.message, tone: 'info' };

    case 'ADD_WALL':
      return { text: `🧱 ${nameOf(players, event.playerId)} gains a Wall`, tone: 'save' };

    case 'WALL_BLOCK':
      return { text: `🧱 ${nameOf(players, event.playerId)} blocked it`, tone: 'save' };

    case 'REMOVE_WALL':
      return { text: `🪝 ${nameOf(players, event.playerId)} loses their Wall`, tone: 'threat' };

    case 'ADD_DEATH_MARK':
      return { text: `💀 ${nameOf(players, event.playerId)} is marked`, tone: 'threat' };

    // The fuse IS the story, so every tick earns a line — and this event is the
    // ONLY thing that narrates one. The C4 Fate adds no message of its own,
    // because two lines saying "X is carrying it" is noise, not emphasis.
    //
    // A full fuse can only mean a fresh plant: a tick always arrives already
    // decremented. That is what makes the explanatory wording safe to put here.
    case 'SET_C4': {
      const name = nameOf(players, event.playerId);
      if (event.fuse === C4_FUSE) {
        return {
          text: `🧨 A charge is planted on ${name} — ${C4_FUSE} rounds, and only the wheel can call it off`,
          tone: 'threat',
        };
      }
      // Fuse 0 is the tick that detonates; the TIME UP message and the
      // eliminations that follow both say so already.
      if (event.fuse === 0) return null;

      return { text: `🧨 ${name} — ${event.fuse} left`, tone: 'threat' };
    }

    case 'ELIMINATE_PLAYER':
      return { text: `☠ ${nameOf(players, event.playerId)} eliminated`, tone: 'kill' };

    case 'REVIVE_PLAYER':
      return { text: `❤️ ${nameOf(players, event.playerId)} revived`, tone: 'save' };

    case 'PHASE_CHANGED':
      return { text: `⚑ ${PHASE_LABELS[event.phase]}`, tone: 'crown' };

    case 'GAME_WON':
      return { text: `👑 ${nameOf(players, event.playerId)} wins`, tone: 'crown' };

    // Flow control, and duplicates of the outcome that follows.
    case 'ROUND_STARTED':
    case 'ABILITY_SELECTED':
    case 'ATTACK_PLAYER':
    case 'REMOVE_DEATH_MARK':
    // Silent: the blast narrates itself through its message and the
    // elimination that follows.
    case 'CLEAR_C4':
    case 'WAIT_FOR_HOST':
    case 'REQUEST_PLAYER_SPIN':
    case 'REQUEST_FATE_SPIN':
      return null;

    default:
      return null;
  }
}

/** Text-only view, for callers that do not colour their output. */
export function describeEvent(event: GameEvent, players: readonly Player[]): string | null {
  return describeEventLine(event, players)?.text ?? null;
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
    const line = describeEventLine(entry.event, players);
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
