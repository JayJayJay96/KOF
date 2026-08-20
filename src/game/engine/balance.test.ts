/**
 * Balance measurement, not an assertion suite.
 *
 * Wave 1 and Wave 2 were both decided by numbers rather than opinion, and this
 * phase makes two claims that need the same treatment: that Gale's whiff rate
 * is tolerable, and that a 5-round C4 fuse is escapable often enough to be a
 * countdown rather than a death sentence.
 *
 * The only hard assertions here are the ones that would be BUGS rather than
 * balance — every game must reach a valid end, and no fuse may go negative.
 * Everything else is printed for a human to read and judge.
 *
 * Run with `npm run test:run` and read the console output.
 */

import { describe, expect, it } from 'vitest';

import type { GameState } from '../types/game';
import { createInitialGameState } from './gameEngine';
import { gameReducer } from './reducer';
import {
  canSpinPlayerWheel,
  canSpinTarget,
  getAlivePlayers,
  selectRandomEligiblePlayer,
} from './selectors';
import { buildGameContext, selectWeightedAbility } from '../abilities';
import { selectionReplacesFate } from '../statuses/statusTriggers';
import { randomItem } from '../../utils/random';
import { C4_FUSE } from '../statuses/c4Trigger';

const GAMES = 200;
const PLAYERS = 12;

/**
 * Fates that put a SECOND player on the board.
 *
 * Wave 1 measured this at 37.1% and treated it as the number that mattered —
 * two-player Fates were where every reaction came from. Declared as data rather
 * than inferred from events, because "involves someone else" is a property of
 * the Fate's design, not of any one resolution.
 */
const TWO_PLAYER_FATES = new Set(['hunter', 'duel', 'gale', 'fate_swap', 'purify', 'demolition']);

type Tally = {
  rolls: number;
  twoPlayerRolls: number;
  inertRolls: number;
  galeSpins: number;
  galeHits: number;
  c4Planted: number;
  c4Detonated: number;
  c4Caught: number;
};

function emptyTally(): Tally {
  return {
    rolls: 0,
    twoPlayerRolls: 0,
    inertRolls: 0,
    galeSpins: 0,
    galeHits: 0,
    c4Planted: 0,
    c4Detonated: 0,
    c4Caught: 0,
  };
}

/**
 * Fold one finished game's history into the running totals.
 *
 * A Gale that changed nothing is a spin with no matching attack, which is why
 * hits are counted from ATTACK_PLAYER rather than from eliminations — Gale
 * pierces, so an attack IS a death, and counting eliminations would measure the
 * same thing less obviously.
 */
function tally(state: GameState, into: Tally): void {
  let galeSpins = 0;
  let galeHits = 0;

  for (const { event } of state.history) {
    switch (event.type) {
      case 'ABILITY_SELECTED':
        into.rolls += 1;
        if (TWO_PLAYER_FATES.has(event.abilityId)) into.twoPlayerRolls += 1;
        if (event.abilityId === 'safe') into.inertRolls += 1;
        break;

      case 'REQUEST_PLAYER_SPIN':
        if (event.purpose === 'gale') galeSpins += 1;
        break;

      case 'ATTACK_PLAYER':
        if (event.source === 'gale') galeHits += 1;
        if (event.source === 'c4') into.c4Caught += 1;
        break;

      case 'SET_C4':
        // A full fuse can only mean a plant; zero can only mean a detonation.
        if (event.fuse === C4_FUSE) into.c4Planted += 1;
        if (event.fuse === 0) into.c4Detonated += 1;
        break;

      default:
        break;
    }
  }

  into.galeSpins += galeSpins;
  into.galeHits += galeHits;
  // Every Gale that found open ground changed nothing, exactly like a Safe.
  into.inertRolls += galeSpins - galeHits;
}

function newGame(): GameState {
  const names = Array.from({ length: PLAYERS }, (_, index) => `P${index + 1}`);
  let state = createInitialGameState();
  state = gameReducer(state, { type: 'ADD_PLAYERS', names });
  return gameReducer(state, { type: 'START_GAME' });
}

/** Drive one round exactly as `useGame` does, minus the animation. */
function playRound(state: GameState): GameState {
  const player = selectRandomEligiblePlayer(state);
  if (!player) return state;

  let next: GameState;
  if (selectionReplacesFate(player, buildGameContext(state))) {
    next = gameReducer(state, { type: 'START_PLAYER_SPIN', playerId: player.id });
    next = gameReducer(next, { type: 'PLAYER_SPIN_COMPLETE' });
  } else {
    const ability = selectWeightedAbility(state);
    if (!ability) return state;
    next = gameReducer(state, {
      type: 'START_DUAL_SPIN',
      playerId: player.id,
      abilityId: ability.id,
    });
    next = gameReducer(next, { type: 'PLAYER_SPIN_COMPLETE' });
    next = gameReducer(next, { type: 'FATE_SPIN_COMPLETE' });
    next = gameReducer(next, { type: 'RESOLVE_FATE' });
  }

  // Drain, answering any target spin the way the host would.
  // Gated on canSpinTarget, not on pendingTargetSpin being set. The pending
  // Gated on canSpinTarget, not on pendingTargetSpin being set. The pending
  // spin is recorded while the queue is still draining, but START_TARGET_SPIN
  // is only legal once the blocking event has flipped the screen to
  // 'special_event'. Checking the raw field instead dispatches a rejected
  // action forever and strands every multi-step Fate.
  let guard = 0;
  while (guard < 200) {
    guard += 1;

    if (canSpinTarget(next)) {
      const exclude = next.pendingTargetSpin?.excludePlayerIds ?? [];
      const pool = getAlivePlayers(next).filter((candidate) => !exclude.includes(candidate.id));
      // Random, not a fixed index. The real Main Wheel picks at random, and
      // Gale's whole measurement is who gets hit — a deterministic pick would
      // bias the whiff rate by whatever the roster ordering happens to be.
      const target = randomItem(pool);
      if (!target) break;
      next = gameReducer(next, { type: 'START_TARGET_SPIN', playerId: target.id });
      next = gameReducer(next, { type: 'PLAYER_SPIN_COMPLETE' });
      continue;
    }

    if (next.eventQueue.length > 0) {
      const before = next;
      next = gameReducer(next, { type: 'CONTINUE_EVENTS' });
      if (next === before) break;
      continue;
    }

    break;
  }

  if (next.screenState === 'winner') return next;
  return gameReducer(next, { type: 'NEXT_ROUND' });
}

describe('balance measurement', () => {
  it('reaches a valid end in every game, and reports the numbers', () => {
    const totals = emptyTally();
    let finished = 0;
    let stuck = 0;
    let negativeFuse = 0;

    for (let game = 0; game < GAMES; game += 1) {
      let state = newGame();
      let rounds = 0;

      while (state.screenState !== 'winner' && rounds < 400) {
        if (!canSpinPlayerWheel(state) && state.eventQueue.length === 0) break;
        const before = state;
        state = playRound(state);
        if (state === before) break;
        rounds += 1;

        for (const player of state.players) {
          if (player.c4Fuse !== undefined && player.c4Fuse < 0) negativeFuse += 1;
        }
      }

      if (state.screenState === 'winner') finished += 1;
      else stuck += 1;

      tally(state, totals);
    }

    const pct = (part: number, whole: number): string =>
      whole === 0 ? 'n/a' : `${((part / whole) * 100).toFixed(1)}%`;

    console.info(`games ${GAMES} of ${PLAYERS}  finished ${finished}  stuck ${stuck}`);
    console.info(`rolls ${totals.rolls}`);
    console.info(`  changed nothing     ${pct(totals.inertRolls, totals.rolls)}  (Wave 1: 3.3%)`);
    console.info(
      `  second player       ${pct(totals.twoPlayerRolls, totals.rolls)}  (Wave 1: 37.1%)`,
    );
    console.info(`gale spins ${totals.galeSpins}  hits ${totals.galeHits}`);
    console.info(
      `  whiff rate          ${pct(totals.galeSpins - totals.galeHits, totals.galeSpins)}`,
    );
    console.info(`c4 planted ${totals.c4Planted}  detonated ${totals.c4Detonated}`);
    console.info(
      `  ended without blast ${pct(totals.c4Planted - totals.c4Detonated, totals.c4Planted)}`,
    );
    console.info(
      `  caught per blast    ${
        totals.c4Detonated === 0 ? 'n/a' : (totals.c4Caught / totals.c4Detonated).toFixed(2)
      }`,
    );

    expect(stuck).toBe(0);
    expect(negativeFuse).toBe(0);
    expect(finished).toBe(GAMES);
  });
});
