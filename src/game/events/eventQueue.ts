/**
 * Event queue — ordering, pausing, and handing control back to the host.
 *
 * DEVELOPMENT_ROADMAP.md Phase 3 asks for architectural separation rather than
 * animation choreography, so this is deliberately a state machine, not a timer.
 *
 * Abilities return a list of events. Those events are queued, then drained one
 * at a time until the queue empties or hits a BLOCKING event. A blocking event
 * suspends resolution mid-ability, which is the whole point: Hunter (Phase 4)
 * must stop after "Jason becomes the Hunter" and wait for a target spin before
 * the attack resolves. Without a queue that can suspend, that flow would have
 * to be special-cased in the reducer.
 *
 * Nothing here knows what any individual ability is.
 */

import type { GameEvent } from './eventTypes';
import type { GameState } from '../types/game';
import { appendEvents } from '../engine/gameEngine';
import { applyGameEvent } from './eventResolver';

/**
 * Events that suspend the drain and return control to the host.
 *
 * WAIT_FOR_HOST       — pause for reactions; host clicks Continue.
 * REQUEST_FATE_SPIN   — another Fate roll is needed (Again).
 * REQUEST_PLAYER_SPIN — a target spin is needed (Hunter/Duel, Phase 4).
 */
const BLOCKING_EVENTS = new Set<GameEvent['type']>([
  'WAIT_FOR_HOST',
  'REQUEST_FATE_SPIN',
  'REQUEST_PLAYER_SPIN',
]);

export function isBlockingEvent(event: GameEvent): boolean {
  return BLOCKING_EVENTS.has(event.type);
}

/** Resolution is suspended while anything remains queued. */
export function isQueuePaused(state: GameState): boolean {
  return state.eventQueue.length > 0;
}

export function enqueueEvents(state: GameState, events: readonly GameEvent[]): GameState {
  if (events.length === 0) return state;
  return { ...state, eventQueue: [...state.eventQueue, ...events] };
}

/**
 * Apply the screen-state effect of a blocking event.
 *
 * REQUEST_PLAYER_SPIN records which ability is suspended so the engine can hand
 * the chosen target back to it later. The exclusion list travels on the event,
 * which is how "Hunter cannot target itself" stays a property of Hunter rather
 * than a rule in the reducer.
 */
function applyBlockingEvent(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case 'REQUEST_FATE_SPIN':
      return { ...state, screenState: 'player_selected', currentAbilityId: null };

    case 'REQUEST_PLAYER_SPIN':
      return {
        ...state,
        screenState: 'special_event',
        targetPlayerId: null,
        pendingTargetSpin: {
          abilityId: state.currentAbilityId ?? '',
          purpose: event.purpose,
          excludePlayerIds: event.excludePlayerIds ?? [],
        },
      };

    case 'WAIT_FOR_HOST':
      return { ...state, screenState: 'resolving' };

    default:
      return state;
  }
}

/**
 * Drain the queue until it empties or blocks.
 *
 * Every event consumed — blocking or not — reaches the history, so the log
 * stays a faithful record of resolution order.
 */
export function drainEventQueue(state: GameState): GameState {
  if (state.eventQueue.length === 0) return state;

  let next = state;
  let queue = state.eventQueue;
  const consumed: GameEvent[] = [];

  while (queue.length > 0) {
    const [event, ...rest] = queue;
    queue = rest;
    consumed.push(event);

    if (isBlockingEvent(event)) {
      next = applyBlockingEvent(next, event);
      break;
    }

    next = applyGameEvent(next, event);
  }

  return { ...next, eventQueue: queue, history: appendEvents(next, consumed) };
}
