/**
 * Game Engine behaviour — DEVELOPMENT_ROADMAP.md Enhancement Phase 0.
 *
 * The roadmap names the cases this file must cover:
 *
 *   Wall blocks attack        Death Mark triggers once
 *   Hunter excludes self        Duel excludes self
 *   Revive only uses eliminated pool
 *   Winner detection            Phase transitions
 *   Weighted Fate selection
 *
 * C4's plant / tick / defuse / detonate cycle is covered too, since it shipped
 * that list was written.
 *
 * WHY THESE ARE FILE-BASED TESTS AND NOT ANOTHER BROWSER HARNESS
 *
 * Every verification before this one was a script pasted into the dev page,
 * importing modules with cache-busting query strings. Vite treats
 * `utils/random.ts` and `utils/random.ts?v=3` as SEPARATE module instances, so
 * `setRandomSource` seeded a copy the abilities never used — which produced a
 * confident but completely wrong "the Duel coin flip is broken" result. Normal
 * imports cannot do that, which is most of the point of writing these down.
 */

import { afterEach, describe, expect, it } from 'vitest';

import type { GamePhase, GameState } from '../types/game';
import type { Player } from '../types/player';
import type { GameEvent } from '../events/eventTypes';
import { applyGameEvent } from '../events/eventResolver';
import type { AbilityDefinition } from '../types/ability';
import { createInitialGameState } from './gameEngine';
import { gameReducer } from './reducer';
import { attackPlayer } from './attack';
import { canSpinTarget, getAlivePlayers, getTargetPool, getWheelNeighbours } from './selectors';
import {
  ABILITIES,
  ABILITY_BY_ID,
  buildGameContext,
  getAbility,
  getAbilityWeight,
  getAvailableAbilities,
  selectWeightedAbility,
} from '../abilities';
import { drawSessionPool, SESSION_OPTIONAL_COUNT } from '../abilities/sessionPool';
import { ABILITY_WEIGHTS } from '../config/abilityWeights';
import { C4_FUSE, c4Trigger } from '../statuses/c4Trigger';
import { resetRandomSource, setRandomSource } from '../../utils/random';
import { DEFAULT_PHASE_THRESHOLDS, PHASE_LABELS } from '../phases/phaseConfig';
import { resolvePhase } from '../phases/phaseResolver';

// --- helpers -----------------------------------------------------------------

function startGame(names: string[]): GameState {
  let state = createInitialGameState();
  state = gameReducer(state, { type: 'ADD_PLAYERS', names });
  return gameReducer(state, { type: 'START_GAME' });
}

function idOf(state: GameState, name: string): string {
  const player = state.players.find((candidate) => candidate.name === name);
  if (!player) throw new Error(`no player named ${name}`);
  return player.id;
}

function playerOf(state: GameState, name: string): Player {
  const player = state.players.find((candidate) => candidate.name === name);
  if (!player) throw new Error(`no player named ${name}`);
  return player;
}

/** Apply events straight to state, bypassing the queue. */
function applyEvents(state: GameState, events: GameEvent[]): GameState {
  return events.reduce(applyGameEvent, state);
}
/** Force a status onto a player without going through a Fate. */
function withStatus(state: GameState, name: string, patch: Partial<Player>): GameState {
  return {
    ...state,
    players: state.players.map((player) =>
      player.name === name ? { ...player, ...patch } : player,
    ),
  };
}

/** Drain every queued event, as a host clicking Continue would. */
function drain(state: GameState): GameState {
  let next = state;
  let guard = 0;
  while (next.eventQueue.length > 0 && guard < 100) {
    next = gameReducer(next, { type: 'CONTINUE_EVENTS' });
    guard += 1;
  }
  return next;
}

/** Run one full round: select `name`, deal `abilityId`, resolve it. */
function playRound(state: GameState, name: string, abilityId: string): GameState {
  let next = gameReducer(state, {
    type: 'START_DUAL_SPIN',
    playerId: idOf(state, name),
    abilityId,
  });
  next = gameReducer(next, { type: 'PLAYER_SPIN_COMPLETE' });
  next = gameReducer(next, { type: 'FATE_SPIN_COMPLETE' });
  return drain(gameReducer(next, { type: 'RESOLVE_FATE' }));
}

/** Select a player with no Fate, letting statuses resolve alone. */
function selectOnly(state: GameState, name: string): GameState {
  const next = gameReducer(state, { type: 'START_PLAYER_SPIN', playerId: idOf(state, name) });
  return drain(gameReducer(next, { type: 'PLAYER_SPIN_COMPLETE' }));
}

afterEach(() => {
  // A test that seeds randomness must not leak into the next one.
  resetRandomSource();
});

// --- Wall ------------------------------------------------------------------

describe('Wall', () => {
  it('blocks an attack instead of eliminating', () => {
    const state = withStatus(startGame(['A', 'B', 'C']), 'A', { wall: 1 });
    const events = attackPlayer(state, idOf(state, 'A'), 'test');

    expect(events.map((event) => event.type)).toEqual(['ATTACK_PLAYER', 'WALL_BLOCK']);
  });

  it('eliminates when there is no Wall', () => {
    const state = startGame(['A', 'B', 'C']);
    const events = attackPlayer(state, idOf(state, 'A'), 'test');

    expect(events.map((event) => event.type)).toEqual(['ATTACK_PLAYER', 'ELIMINATE_PLAYER']);
  });

  it('is consumed by the block, so it only saves once', () => {
    let state = withStatus(startGame(['A', 'B', 'C']), 'A', { wall: 1 });

    state = playRound(state, 'A', 'eliminate');
    expect(playerOf(state, 'A').status).toBe('alive');
    expect(playerOf(state, 'A').wall).toBe(0);

    state = gameReducer(state, { type: 'NEXT_ROUND' });
    state = playRound(state, 'A', 'eliminate');
    expect(playerOf(state, 'A').status).toBe('eliminated');
  });

  it('never stacks above the MVP cap of 1', () => {
    let state = withStatus(startGame(['A', 'B', 'C']), 'A', { wall: 1 });
    state = playRound(state, 'A', 'wall');

    expect(playerOf(state, 'A').wall).toBe(1);
  });
});

// --- Piercing attacks --------------------------------------------------------

describe('piercing attacks', () => {
  it('a normal attack is blocked by a Wall', () => {
    const state = withStatus(startGame(['A', 'B', 'C']), 'A', { wall: 1 });
    const events = attackPlayer(state, idOf(state, 'A'), 'test');

    expect(events.map((event) => event.type)).toEqual(['ATTACK_PLAYER', 'WALL_BLOCK']);
  });

  it('a piercing attack eliminates through a Wall', () => {
    const state = withStatus(startGame(['A', 'B', 'C']), 'A', { wall: 1 });
    const events = attackPlayer(state, idOf(state, 'A'), 'gale', { pierce: true });

    expect(events.map((event) => event.type)).toEqual(['ATTACK_PLAYER', 'ELIMINATE_PLAYER']);
  });

  it('piercing changes nothing for an unwalled target', () => {
    const state = startGame(['A', 'B', 'C']);

    expect(attackPlayer(state, idOf(state, 'A'), 'gale', { pierce: true })).toEqual(
      attackPlayer(state, idOf(state, 'A'), 'gale'),
    );
  });

  it('never touches an already-eliminated player, pierce or not', () => {
    let state = startGame(['A', 'B', 'C']);
    state = withStatus(state, 'A', { status: 'eliminated', wall: 1 });

    expect(attackPlayer(state, idOf(state, 'A'), 'gale', { pierce: true })).toEqual([]);
  });
});

// --- Gale --------------------------------------------------------------------

describe('Gale', () => {
  const roster = ['A', 'B', 'C', 'D', 'E'];

  /** Two Walls up and Gale in the session pool — Gale's minimum conditions. */
  function twoWalls(): GameState {
    let state = withStatus(startGame(roster), 'A', { wall: 1 });
    state = withStatus(state, 'B', { wall: 1 });
    return { ...state, sessionAbilityIds: [...state.sessionAbilityIds, 'gale'] };
  }

  function gale() {
    const ability = getAbility('gale');
    if (!ability?.resolveTargetSpin) throw new Error('gale is not registered');
    return ability;
  }

  it('is unavailable below two Walls', () => {
    let state = startGame(roster);
    state = { ...state, sessionAbilityIds: [...state.sessionAbilityIds, 'gale'] };
    expect(getAvailableAbilities(state).map((a) => a.id)).not.toContain('gale');

    state = withStatus(state, 'A', { wall: 1 });
    expect(getAvailableAbilities(state).map((a) => a.id)).not.toContain('gale');

    state = withStatus(state, 'B', { wall: 1 });
    expect(getAvailableAbilities(state).map((a) => a.id)).toContain('gale');
  });

  it('requests a target spin that excludes nobody', () => {
    const state = twoWalls();
    const request = gale()
      .resolve(buildGameContext(state), idOf(state, 'C'))
      .find((event) => event.type === 'REQUEST_PLAYER_SPIN');

    if (request?.type !== 'REQUEST_PLAYER_SPIN') throw new Error('no target spin requested');
    expect(request.excludePlayerIds ?? []).toEqual([]);
  });

  it('kills a walled target through its Wall', () => {
    const state = twoWalls();
    const types = gale().resolveTargetSpin!(
      buildGameContext(state),
      idOf(state, 'C'),
      idOf(state, 'A'),
    ).map((event) => event.type);

    expect(types).toContain('ELIMINATE_PLAYER');
    expect(types).not.toContain('WALL_BLOCK');
  });

  it('spares an unwalled target', () => {
    const state = twoWalls();
    const types = gale().resolveTargetSpin!(
      buildGameContext(state),
      idOf(state, 'A'),
      idOf(state, 'C'),
    ).map((event) => event.type);

    expect(types).not.toContain('ELIMINATE_PLAYER');
    expect(types).toContain('SHOW_MESSAGE');
  });

  it('can catch the player who called it', () => {
    const state = twoWalls();
    const types = gale().resolveTargetSpin!(
      buildGameContext(state),
      idOf(state, 'A'),
      idOf(state, 'A'),
    ).map((event) => event.type);

    expect(types).toContain('ELIMINATE_PLAYER');
  });
});

// --- Demolition --------------------------------------------------------------

describe('Demolition', () => {
  it('is unavailable with no Walls standing', () => {
    let state = startGame(['A', 'B', 'C', 'D']);
    state = { ...state, sessionAbilityIds: [...state.sessionAbilityIds, 'demolition'] };

    expect(getAvailableAbilities(state).map((a) => a.id)).not.toContain('demolition');

    state = withStatus(state, 'A', { wall: 1 });
    expect(getAvailableAbilities(state).map((a) => a.id)).toContain('demolition');
  });

  it('clears every Wall on the board and harms nobody', () => {
    let state = withStatus(startGame(['A', 'B', 'C', 'D']), 'A', { wall: 1 });
    state = withStatus(state, 'C', { wall: 1 });

    const after = playRound(state, 'B', 'demolition');

    expect(playerOf(after, 'A').wall).toBe(0);
    expect(playerOf(after, 'C').wall).toBe(0);
    expect(getAlivePlayers(after)).toHaveLength(4);
  });

  it('takes the roller own Wall down with everyone else', () => {
    const state = withStatus(startGame(['A', 'B', 'C', 'D']), 'B', { wall: 1 });
    const after = playRound(state, 'B', 'demolition');

    expect(playerOf(after, 'B').wall).toBe(0);
  });
});

// --- Wheel neighbours --------------------------------------------------------

describe('wheel neighbours', () => {
  it('returns the players either side, wrapping at the ends', () => {
    const state = startGame(['A', 'B', 'C', 'D', 'E']);

    expect(
      getWheelNeighbours(state, idOf(state, 'C'))
        .map((p) => p.name)
        .sort(),
    ).toEqual(['B', 'D']);

    expect(
      getWheelNeighbours(state, idOf(state, 'A'))
        .map((p) => p.name)
        .sort(),
    ).toEqual(['B', 'E']);
  });

  it('skips eliminated players, because the wheel does not draw them', () => {
    let state = startGame(['A', 'B', 'C', 'D', 'E']);
    state = withStatus(state, 'B', { status: 'eliminated' });

    expect(
      getWheelNeighbours(state, idOf(state, 'C'))
        .map((p) => p.name)
        .sort(),
    ).toEqual(['A', 'D']);
  });

  it('deduplicates when both sides are the same player', () => {
    let state = startGame(['A', 'B', 'C']);
    state = withStatus(state, 'C', { status: 'eliminated' });

    expect(getWheelNeighbours(state, idOf(state, 'A')).map((p) => p.name)).toEqual(['B']);
  });

  it('returns nothing when the player stands alone', () => {
    let state = startGame(['A', 'B', 'C']);
    state = withStatus(state, 'B', { status: 'eliminated' });
    state = withStatus(state, 'C', { status: 'eliminated' });

    expect(getWheelNeighbours(state, idOf(state, 'A'))).toEqual([]);
  });

  it('returns nothing for a player who is not alive', () => {
    let state = startGame(['A', 'B', 'C']);
    state = withStatus(state, 'A', { status: 'eliminated' });

    expect(getWheelNeighbours(state, idOf(state, 'A'))).toEqual([]);
  });
});

// --- Death Mark --------------------------------------------------------------

describe('Death Mark', () => {
  it('triggers on the next selection and only once', () => {
    let state = withStatus(startGame(['A', 'B', 'C']), 'A', { deathMark: true });

    state = selectOnly(state, 'A');
    expect(playerOf(state, 'A').status).toBe('eliminated');
    // Spent on activation, so a revived player does not carry it back.
    expect(playerOf(state, 'A').deathMark).toBe(false);
  });

  it('is spent even when a Wall absorbs the attack', () => {
    let state = withStatus(startGame(['A', 'B', 'C']), 'A', { deathMark: true, wall: 1 });

    state = selectOnly(state, 'A');
    expect(playerOf(state, 'A').status).toBe('alive');
    expect(playerOf(state, 'A').wall).toBe(0);
    expect(playerOf(state, 'A').deathMark).toBe(false);
  });

  it('replaces the round Fate rather than being one', () => {
    let state = withStatus(startGame(['A', 'B', 'C']), 'A', { deathMark: true });
    state = selectOnly(state, 'A');

    expect(state.currentAbilityId).toBeNull();
    expect(state.history.some((entry) => entry.event.type === 'ABILITY_SELECTED')).toBe(false);
  });
});

// --- Hunter and Duel ---------------------------------------------------------

describe('Hunter', () => {
  it('excludes itself from the target pool', () => {
    const state = playRound(startGame(['A', 'B', 'C', 'D']), 'A', 'hunter');

    expect(canSpinTarget(state)).toBe(true);
    expect(getTargetPool(state).map((player) => player.name)).not.toContain('A');
    expect(getTargetPool(state)).toHaveLength(3);
  });

  it('forces the only other player when two are alive', () => {
    let state = startGame(['A', 'B', 'C']);
    state = gameReducer(state, { type: 'ELIMINATE_PLAYER', playerId: idOf(state, 'C') });
    state = playRound(state, 'A', 'hunter');

    expect(getTargetPool(state).map((player) => player.name)).toEqual(['B']);
  });

  it('pays a Wall bounty for a kill but not for a blocked hunt', () => {
    const hunt = (targetHasWall: boolean) => {
      let state = startGame(['A', 'B', 'C', 'D']);
      if (targetHasWall) state = withStatus(state, 'B', { wall: 1 });
      state = playRound(state, 'A', 'hunter');
      state = gameReducer(state, { type: 'START_TARGET_SPIN', playerId: idOf(state, 'B') });
      return drain(gameReducer(state, { type: 'PLAYER_SPIN_COMPLETE' }));
    };

    const killed = hunt(false);
    expect(playerOf(killed, 'B').status).toBe('eliminated');
    expect(playerOf(killed, 'A').wall).toBe(1);

    const blocked = hunt(true);
    expect(playerOf(blocked, 'B').status).toBe('alive');
    expect(playerOf(blocked, 'A').wall).toBe(0);
  });
});

describe('Duel', () => {
  it('excludes the initiator from the opponent pool', () => {
    const state = playRound(startGame(['A', 'B', 'C', 'D']), 'A', 'duel');

    expect(getTargetPool(state).map((player) => player.name)).not.toContain('A');
  });

  it('sends the initiator down below 0.5, and the opponent at or above it', () => {
    const duelWith = (roll: number) => {
      setRandomSource(() => roll);
      let state = playRound(startGame(['A', 'B', 'C', 'D']), 'A', 'duel');
      state = gameReducer(state, { type: 'START_TARGET_SPIN', playerId: idOf(state, 'B') });
      state = drain(gameReducer(state, { type: 'PLAYER_SPIN_COMPLETE' }));
      return state.players.filter((p) => p.status === 'eliminated').map((p) => p.name);
    };

    expect(duelWith(0)).toEqual(['A']);
    expect(duelWith(0.49)).toEqual(['A']);
    expect(duelWith(0.5)).toEqual(['B']);
    expect(duelWith(0.99)).toEqual(['B']);
  });
});

// --- Revive ------------------------------------------------------------------

describe('Revive', () => {
  it('is unavailable while nobody is eliminated', () => {
    const state = startGame(['A', 'B', 'C', 'D']);

    expect(getAbility('revive')?.isAvailable(buildGameContext(state))).toBe(false);
  });

  it('only ever draws from the eliminated pool', () => {
    let state = startGame(['A', 'B', 'C', 'D']);
    state = gameReducer(state, { type: 'ELIMINATE_PLAYER', playerId: idOf(state, 'D') });

    // Whatever the roll, the only candidate is the one who is out.
    for (const roll of [0, 0.25, 0.5, 0.75, 0.999]) {
      setRandomSource(() => roll);
      const revived = playRound(state, 'A', 'revive');
      expect(playerOf(revived, 'D').status).toBe('alive');
      expect(getAlivePlayers(revived)).toHaveLength(4);
    }
  });

  it('returns a player clean, and counts repeat revivals', () => {
    let state = startGame(['A', 'B', 'C', 'D']);
    state = withStatus(state, 'D', { wall: 1, deathMark: true, c4Fuse: 2 });
    state = gameReducer(state, { type: 'ELIMINATE_PLAYER', playerId: idOf(state, 'D') });
    state = playRound(state, 'A', 'revive');

    const revived = playerOf(state, 'D');
    expect(revived.status).toBe('alive');
    expect(revived.wall).toBe(0);
    expect(revived.deathMark).toBe(false);
    expect(revived.c4Fuse).toBeUndefined();
    expect(revived.revivedCount).toBe(1);

    state = gameReducer(state, { type: 'NEXT_ROUND' });
    state = gameReducer(state, { type: 'ELIMINATE_PLAYER', playerId: idOf(state, 'D') });
    state = playRound(state, 'A', 'revive');
    expect(playerOf(state, 'D').revivedCount).toBe(2);
  });
});
// --- C4 ----------------------------------------------------------------------

describe('C4', () => {
  const roster = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

  it('plants a full fuse on the selected player', () => {
    const after = playRound(startGame(roster), 'A', 'c4');
    expect(playerOf(after, 'A').c4Fuse).toBe(C4_FUSE);
  });

  it('ticks down on every selection that is not the holder', () => {
    let state = withStatus(startGame(roster), 'A', { c4Fuse: 3 });
    state = selectOnly(state, 'B');

    expect(playerOf(state, 'A').c4Fuse).toBe(2);
  });

  it('is defused when the wheel lands on the holder, and takes the round', () => {
    let state = withStatus(startGame(roster), 'A', { c4Fuse: 2 });

    expect(c4Trigger.replacesFate(playerOf(state, 'A'), buildGameContext(state))).toBe(true);

    state = selectOnly(state, 'A');

    expect(playerOf(state, 'A').c4Fuse).toBeUndefined();
    expect(getAlivePlayers(state)).toHaveLength(7);
  });

  it('detonates on the tick that empties the fuse, taking both neighbours', () => {
    let state = withStatus(startGame(roster), 'B', { c4Fuse: 1 });
    state = drain(selectOnly(state, 'D'));

    // Roster order is A B C D E F G, so B's wheel neighbours are A and C.
    expect(playerOf(state, 'B').status).toBe('eliminated');
    expect(playerOf(state, 'A').status).toBe('eliminated');
    expect(playerOf(state, 'C').status).toBe('eliminated');
    expect(playerOf(state, 'D').status).toBe('alive');
  });

  it('a walled neighbour survives and loses the Wall', () => {
    let state = withStatus(startGame(roster), 'B', { c4Fuse: 1 });
    state = withStatus(state, 'A', { wall: 1 });
    state = drain(selectOnly(state, 'D'));

    expect(playerOf(state, 'A').status).toBe('alive');
    expect(playerOf(state, 'A').wall).toBe(0);
    expect(playerOf(state, 'B').status).toBe('eliminated');
  });

  it('a Wall saves the holder from their own charge', () => {
    let state = withStatus(startGame(roster), 'B', { c4Fuse: 1, wall: 1 });
    state = drain(selectOnly(state, 'D'));

    expect(playerOf(state, 'B').status).toBe('alive');
    expect(playerOf(state, 'B').wall).toBe(0);
  });

  it('never hits the same player twice when the board is tiny', () => {
    let state = startGame(['A', 'B', 'C']);
    state = withStatus(state, 'A', { c4Fuse: 1 });

    const attacked = c4Trigger
      .resolve(buildGameContext(state), idOf(state, 'B'))
      .filter((event) => event.type === 'ATTACK_PLAYER')
      .map((event) => (event.type === 'ATTACK_PLAYER' ? event.playerId : ''));

    expect(new Set(attacked).size).toBe(attacked.length);
  });

  it('is unavailable while a charge is live, and below the floor', () => {
    let state = startGame(roster);
    state = { ...state, sessionAbilityIds: [...state.sessionAbilityIds, 'c4'] };
    expect(getAvailableAbilities(state).map((a) => a.id)).toContain('c4');

    const live = withStatus(state, 'A', { c4Fuse: 3 });
    expect(getAvailableAbilities(live).map((a) => a.id)).not.toContain('c4');

    let small = startGame(['A', 'B', 'C', 'D', 'E']);
    small = { ...small, sessionAbilityIds: [...small.sessionAbilityIds, 'c4'] };
    expect(getAbility('c4')?.isAvailable(buildGameContext(small))).toBe(false);
  });

  it('announces a charge left on a player who died to something else', () => {
    let state = withStatus(startGame(roster), 'A', { c4Fuse: 3 });
    state = withStatus(state, 'A', { status: 'eliminated' });
    state = drain(selectOnly(state, 'B'));

    expect(playerOf(state, 'A').c4Fuse).toBeUndefined();
  });

  it('never leaves a negative fuse', () => {
    let state = withStatus(startGame(roster), 'A', { c4Fuse: 1 });
    state = drain(selectOnly(state, 'B'));

    const fuses = state.players
      .map((player) => player.c4Fuse)
      .filter((fuse): fuse is number => fuse !== undefined);

    for (const fuse of fuses) expect(fuse).toBeGreaterThanOrEqual(0);
  });
});
// --- Fate Swap ---------------------------------------------------------------

describe('Fate Swap', () => {
  const roster = ['A', 'B', 'C', 'D'];

  it('exchanges every status between the two players', () => {
    let state = startGame(roster);
    state = withStatus(state, 'A', { wall: 1, deathMark: false });
    state = withStatus(state, 'B', { wall: 0, deathMark: true, c4Fuse: 2 });

    const swapped = applyEvents(state, [
      { type: 'SWAP_STATUSES', playerId: idOf(state, 'A'), otherPlayerId: idOf(state, 'B') },
    ]);

    expect(playerOf(swapped, 'A').wall).toBe(0);
    expect(playerOf(swapped, 'A').deathMark).toBe(true);
    expect(playerOf(swapped, 'A').c4Fuse).toBe(2);
    expect(playerOf(swapped, 'B').wall).toBe(1);
    expect(playerOf(swapped, 'B').deathMark).toBe(false);
    expect(playerOf(swapped, 'B').c4Fuse).toBeUndefined();
  });

  it('keeps only one live charge on the board', () => {
    let state = startGame(roster);
    state = withStatus(state, 'B', { c4Fuse: 3 });

    const swapped = applyEvents(state, [
      { type: 'SWAP_STATUSES', playerId: idOf(state, 'A'), otherPlayerId: idOf(state, 'B') },
    ]);

    const live = swapped.players.filter((player) => player.c4Fuse !== undefined);
    expect(live).toHaveLength(1);
    expect(live[0].name).toBe('A');
  });

  it('is unavailable when the board is completely clean', () => {
    let state = startGame(roster);
    state = { ...state, sessionAbilityIds: [...state.sessionAbilityIds, 'fate_swap'] };
    expect(getAvailableAbilities(state).map((a) => a.id)).not.toContain('fate_swap');

    state = withStatus(state, 'A', { deathMark: true });
    expect(getAvailableAbilities(state).map((a) => a.id)).toContain('fate_swap');
  });

  it('prefers a partner whose statuses actually differ', () => {
    let state = startGame(roster);
    state = withStatus(state, 'A', { wall: 1 });
    state = withStatus(state, 'B', { wall: 1 });
    state = withStatus(state, 'C', { wall: 1 });
    // Only D differs from A, so every draw must land on D.
    const swap = getAbility('fate_swap');
    if (!swap) throw new Error('fate_swap is not registered');

    for (let run = 0; run < 20; run += 1) {
      const event = swap
        .resolve(buildGameContext(state), idOf(state, 'A'))
        .find((candidate) => candidate.type === 'SWAP_STATUSES');

      if (event?.type !== 'SWAP_STATUSES') throw new Error('no swap emitted');
      expect(event.otherPlayerId).toBe(idOf(state, 'D'));
    }
  });
});
// --- Purify ------------------------------------------------------------------

describe('Purify', () => {
  const roster = ['A', 'B', 'C', 'D'];

  it('is unavailable with no Death Mark on the board', () => {
    let state = startGame(roster);
    state = { ...state, sessionAbilityIds: [...state.sessionAbilityIds, 'purify'] };

    expect(getAvailableAbilities(state).map((a) => a.id)).not.toContain('purify');

    state = withStatus(state, 'C', { deathMark: true });
    expect(getAvailableAbilities(state).map((a) => a.id)).toContain('purify');
  });

  it('clears a mark from whoever is carrying it', () => {
    const state = withStatus(startGame(roster), 'C', { deathMark: true });
    const after = playRound(state, 'A', 'purify');

    expect(playerOf(after, 'C').deathMark).toBe(false);
  });

  it('cleanses the selected player when they are the marked one', () => {
    let state = withStatus(startGame(roster), 'A', { deathMark: true });
    state = withStatus(state, 'C', { deathMark: true });
    const after = playRound(state, 'A', 'purify');

    // Self is preferred over the draw, so A's own mark is the one that lifts.
    expect(playerOf(after, 'A').deathMark).toBe(false);
    expect(playerOf(after, 'C').deathMark).toBe(true);
  });

  it('cannot touch a live C4', () => {
    let state = withStatus(startGame(roster), 'B', { c4Fuse: 3 });
    state = withStatus(state, 'C', { deathMark: true });

    // Resolved directly rather than through playRound: a selection fires the
    // C4 trigger and ticks the fuse, which would mask what Purify itself does.
    const events = getAbility('purify')!.resolve(buildGameContext(state), idOf(state, 'A'));
    const types = events.map((event) => event.type);

    expect(types).not.toContain('CLEAR_C4');
    expect(types).not.toContain('SET_C4');
    expect(types).toContain('REMOVE_DEATH_MARK');

    const after = applyEvents(state, events);
    expect(playerOf(after, 'B').c4Fuse).toBe(3);
    expect(playerOf(after, 'C').deathMark).toBe(false);
  });
});

// --- Phases and winner -------------------------------------------------------

describe('Phase transitions', () => {
  it('resolves each band from the alive count', () => {
    const phaseAt = (aliveCount: number, startingCount: number) =>
      resolvePhase({ aliveCount, startingCount, thresholds: DEFAULT_PHASE_THRESHOLDS });

    // A 20-player roster exercises every band, matching the verified table
    // for the roster-share rework (Enhancement Phase 3, Task 3).
    expect(phaseAt(20, 20)).toBe('chaos');
    expect(phaseAt(14, 20)).toBe('danger');
    expect(phaseAt(8, 20)).toBe('bloodbath');
    expect(phaseAt(DEFAULT_PHASE_THRESHOLDS.finalAt, 20)).toBe('final_four');
    expect(phaseAt(DEFAULT_PHASE_THRESHOLDS.suddenDeathAt, 20)).toBe('sudden_death');
  });

  it('may move BACKWARD after a Revive (PROJECT_SPEC.md §38)', () => {
    // The move has to CROSS a threshold to be visible. Sudden Death is at 2
    // alive and Final Four covers 3-4, so dropping to two and reviving one is
    // the smallest change that actually steps back a band. Both bounds are
    // absolute (not roster-share), so this holds regardless of starting size.
    let state = startGame(['A', 'B', 'C', 'D', 'E', 'F']);
    for (const name of ['C', 'D', 'E', 'F']) {
      state = gameReducer(state, { type: 'ELIMINATE_PLAYER', playerId: idOf(state, name) });
    }

    expect(getAlivePlayers(state)).toHaveLength(2);
    expect(state.phase).toBe('sudden_death');

    state = playRound(state, 'A', 'revive');

    expect(getAlivePlayers(state)).toHaveLength(3);
    expect(state.phase).toBe('final_four');
  });
});

describe('phase thresholds scale to roster size', () => {
  const bands = (starting: number): GamePhase[] =>
    Array.from({ length: starting }, (_, index) =>
      resolvePhase({ aliveCount: starting - index, startingCount: starting }),
    );

  it('an 8-player game still passes through Danger', () => {
    expect(bands(8)).toEqual([
      'chaos', // 8
      'chaos', // 7
      'chaos', // 6
      'danger', // 5
      'final_four', // 4
      'final_four', // 3
      'sudden_death', // 2
      'sudden_death', // 1
    ]);
  });

  it('a 12-player game starts in Chaos', () => {
    expect(resolvePhase({ aliveCount: 12, startingCount: 12 })).toBe('chaos');
    expect(resolvePhase({ aliveCount: 9, startingCount: 12 })).toBe('chaos');
    expect(resolvePhase({ aliveCount: 8, startingCount: 12 })).toBe('danger');
    expect(resolvePhase({ aliveCount: 5, startingCount: 12 })).toBe('danger');
    expect(resolvePhase({ aliveCount: 4, startingCount: 12 })).toBe('final_four');
  });

  it('Bloodbath appears only in larger games', () => {
    expect(bands(12)).not.toContain('bloodbath');
    expect(bands(20)).toContain('bloodbath');
    expect(resolvePhase({ aliveCount: 9, startingCount: 20 })).toBe('danger');
    expect(resolvePhase({ aliveCount: 8, startingCount: 20 })).toBe('bloodbath');
    expect(resolvePhase({ aliveCount: 5, startingCount: 20 })).toBe('bloodbath');
    expect(resolvePhase({ aliveCount: 4, startingCount: 20 })).toBe('final_four');
  });

  it('a 30-player game uses every phase', () => {
    const seen = new Set(bands(30));
    expect(seen.has('chaos')).toBe(true);
    expect(seen.has('danger')).toBe(true);
    expect(seen.has('bloodbath')).toBe(true);
    expect(seen.has('final_four')).toBe(true);
    expect(seen.has('sudden_death')).toBe(true);
  });

  it('resolves to chaos when startingCount is 0, since aliveCount / 0 fails every share band', () => {
    // Not a real production case (see phaseResolver.ts), but the arithmetic
    // that makes it safe — Infinity/NaN failing every `<=` comparison and
    // falling through to the last band — is worth pinning down explicitly.
    expect(resolvePhase({ aliveCount: 10, startingCount: 0 })).toBe('chaos');
  });
});

describe('Winner detection', () => {
  it('declares the last player standing', () => {
    let state = startGame(['A', 'B', 'C']);
    state = gameReducer(state, { type: 'ELIMINATE_PLAYER', playerId: idOf(state, 'B') });
    expect(state.winnerId).toBeNull();

    state = gameReducer(state, { type: 'ELIMINATE_PLAYER', playerId: idOf(state, 'C') });
    expect(state.screenState).toBe('winner');
    expect(state.winnerId).toBe(idOf(state, 'A'));
    expect(state.history.some((entry) => entry.event.type === 'GAME_WON')).toBe(true);
  });

  it('ends the game with no winner when everyone is gone', () => {
    let state = startGame(['A', 'B']);
    state = gameReducer(state, { type: 'ELIMINATE_PLAYER', playerId: idOf(state, 'A') });
    state = gameReducer(state, { type: 'ELIMINATE_PLAYER', playerId: idOf(state, 'B') });

    expect(state.screenState).toBe('winner');
  });
});

// --- Weighted Fate selection -------------------------------------------------

describe('Weighted Fate selection', () => {
  it('never offers a Fate whose configured weight is zero in this phase', () => {
    const state = startGame(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);

    for (const ability of getAvailableAbilities(state)) {
      const weight = state.config.abilities[ability.id]?.weights?.[state.phase];
      expect(weight === undefined || weight > 0).toBe(true);
    }
  });

  it('respects a config weight of zero by dropping the Fate entirely', () => {
    const base = startGame(['A', 'B', 'C', 'D']);
    const silenced: GameState = {
      ...base,
      config: {
        ...base.config,
        abilities: {
          ...base.config.abilities,
          eliminate: {
            enabled: true,
            weights: { chaos: 0, danger: 0, bloodbath: 0, final_four: 0, sudden_death: 0 },
          },
        },
      },
    };

    expect(getAvailableAbilities(silenced).map((ability) => ability.id)).not.toContain('eliminate');
  });

  it('drops a disabled Fate even when it has weight', () => {
    const base = startGame(['A', 'B', 'C', 'D']);
    const disabled: GameState = {
      ...base,
      config: {
        ...base.config,
        abilities: {
          ...base.config.abilities,
          hunter: {
            enabled: false,
            weights: { chaos: 50, danger: 50, bloodbath: 50, final_four: 50, sudden_death: 50 },
          },
        },
      },
    };

    expect(getAvailableAbilities(disabled).map((ability) => ability.id)).not.toContain('hunter');
  });

  it('picks the first eligible Fate on a roll of zero, and the last on a roll near one', () => {
    const state = startGame(['A', 'B', 'C', 'D']);
    const pool = getAvailableAbilities(state);

    setRandomSource(() => 0);
    expect(selectWeightedAbility(state)?.id).toBe(pool[0].id);

    setRandomSource(() => 0.999999);
    expect(selectWeightedAbility(state)?.id).toBe(pool[pool.length - 1].id);
  });

  it('only ever returns a Fate that is currently available', () => {
    const state = startGame(['A', 'B', 'C', 'D']);
    const allowed = new Set(getAvailableAbilities(state).map((ability) => ability.id));

    for (let i = 0; i < 200; i += 1) {
      const picked = selectWeightedAbility(state);
      expect(picked).not.toBeNull();
      expect(allowed.has(picked!.id)).toBe(true);
    }
  });
});

// --- Round flow guards -------------------------------------------------------

describe('Round flow', () => {
  it('ignores a second spin while one is already running', () => {
    const state = startGame(['A', 'B', 'C']);
    const spinning = gameReducer(state, { type: 'START_PLAYER_SPIN', playerId: idOf(state, 'A') });
    const again = gameReducer(spinning, { type: 'START_PLAYER_SPIN', playerId: idOf(state, 'B') });

    expect(again.currentPlayerId).toBe(idOf(state, 'A'));
  });

  it('cannot advance the round while events are still queued', () => {
    let state = withStatus(startGame(['A', 'B', 'C']), 'A', { deathMark: true });
    state = gameReducer(state, { type: 'START_PLAYER_SPIN', playerId: idOf(state, 'A') });
    state = gameReducer(state, { type: 'PLAYER_SPIN_COMPLETE' });

    expect(state.eventQueue.length).toBeGreaterThan(0);
    expect(gameReducer(state, { type: 'NEXT_ROUND' }).round).toBe(state.round);
  });

  it('refuses to start below the minimum roster', () => {
    let state = createInitialGameState();
    state = gameReducer(state, { type: 'ADD_PLAYERS', names: ['Solo'] });

    expect(gameReducer(state, { type: 'START_GAME' }).screenState).toBe('setup');
  });

  it('trims names and drops blank ones', () => {
    let state = createInitialGameState();
    state = gameReducer(state, { type: 'ADD_PLAYERS', names: ['  Padded  ', '', '   ', 'Real'] });

    expect(state.players.map((player) => player.name)).toEqual(['Padded', 'Real']);
  });
});

// --- ability weights ----------------------------------------------------------

describe('phase vocabulary', () => {
  // Task 2 renamed final_five -> final_four and added bloodbath as a fifth
  // tier. Task 3 then reshaped DEFAULT_PHASE_THRESHOLDS so the upper bands are
  // a share of the starting roster rather than absolute counts (see
  // PhaseThresholds in src/game/types/game.ts). Types cannot catch a shifted
  // band boundary, so this table pins the bands down count-by-count for a
  // fixed 15-player roster — large enough to give bloodbath a real range
  // (5-6 alive; see the DEFAULT_PHASE_THRESHOLDS table in phaseConfig.ts).
  //
  // This is deliberately a single fixed roster, not a roster-scaling check —
  // that behaviour has its own coverage in the "phase thresholds scale to
  // roster size" describe block above.
  it.each([
    [1, 'sudden_death'],
    [2, 'sudden_death'],
    [3, 'final_four'],
    [4, 'final_four'],
    [5, 'bloodbath'],
    [6, 'bloodbath'],
    [7, 'danger'],
    [8, 'danger'],
    [9, 'danger'],
    [10, 'danger'],
    [11, 'chaos'],
    [12, 'chaos'],
    [13, 'chaos'],
    [14, 'chaos'],
    [15, 'chaos'],
  ] as const)('resolves %i alive (of 15) to %s', (alive, expected) => {
    expect(
      resolvePhase({ aliveCount: alive, startingCount: 15, thresholds: DEFAULT_PHASE_THRESHOLDS }),
    ).toBe(expected);
  });

  it('gives every phase a non-empty label', () => {
    // PHASE_LABELS is a total Record<GamePhase, string>, so a MISSING entry
    // is a compile error the type system already catches. An EMPTY string is
    // not, which is the one gap worth a runtime check here.
    const phases: GamePhase[] = ['chaos', 'danger', 'bloodbath', 'final_four', 'sudden_death'];

    for (const phase of phases) {
      expect(PHASE_LABELS[phase], phase).not.toBe('');
    }
  });
});

describe('ability weights', () => {
  it('every registered ability has a weight for every phase', () => {
    const phases: GamePhase[] = ['chaos', 'danger', 'bloodbath', 'final_four', 'sudden_death'];

    for (const ability of ABILITIES) {
      for (const phase of phases) {
        const weight = ABILITY_WEIGHTS[ability.id]?.[phase];
        expect(weight, `${ability.id} / ${phase}`).toBeTypeOf('number');
        expect(weight, `${ability.id} / ${phase}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('has no entries for abilities that are not registered', () => {
    const registeredIds = new Set(ABILITIES.map((ability) => ability.id));

    for (const id of Object.keys(ABILITY_WEIGHTS)) {
      expect(
        registeredIds.has(id),
        `ABILITY_WEIGHTS has an orphaned entry for "${id}", which is not in ABILITIES`,
      ).toBe(true);
    }
  });

  it('config overrides the default table', () => {
    // A fresh roster is always 100% alive, which is always inside the Chaos
    // band regardless of size (PROJECT_SPEC.md §10) — no specific player
    // count is needed to land there, just a game that hasn't started yet.
    const state = startGame(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L']);
    const eliminate = getAbility('eliminate');
    if (!eliminate) throw new Error('eliminate missing');

    expect(getAbilityWeight(state, eliminate)).toBe(ABILITY_WEIGHTS.eliminate.chaos);

    const tuned: GameState = {
      ...state,
      config: {
        ...state.config,
        abilities: {
          ...state.config.abilities,
          eliminate: { enabled: true, weights: { chaos: 999 } },
        },
      },
    };

    expect(getAbilityWeight(tuned, eliminate)).toBe(999);
  });
});

// --- Session pool -------------------------------------------------------------

describe('session pool', () => {
  const roster = ['A', 'B', 'C', 'D', 'E', 'F'];

  it('always includes every mandatory Fate', () => {
    const state = startGame(roster);
    const mandatory = ABILITIES.filter((ability) => ability.mandatory).map((a) => a.id);

    for (const id of mandatory) {
      expect(state.sessionAbilityIds, id).toContain(id);
    }
  });

  it('draws exactly SESSION_OPTIONAL_COUNT optional Fates', () => {
    const state = startGame(roster);
    const optional = state.sessionAbilityIds.filter((id) => !ABILITY_BY_ID[id]?.mandatory);

    expect(optional).toHaveLength(SESSION_OPTIONAL_COUNT);
  });

  it('excludes Fates left out of the draw from the wheel', () => {
    let state = startGame(roster);
    state = {
      ...state,
      sessionAbilityIds: ['eliminate', 'wall', 'death_mark', 'hunter', 'duel'],
    };

    const availableIds = getAvailableAbilities(state).map((ability) => ability.id);

    expect(availableIds).not.toContain('safe');
    // Unlike Revive (unavailable anyway with nobody eliminated yet), C4 IS
    // otherwise available here — six alive players clears its four-player
    // minimum and its chaos weight is non-zero — so excluding it can only be
    // the pool filter's doing, not a coincidence of C4's own eligibility.
    expect(availableIds).not.toContain('c4');
    expect(availableIds).toContain('eliminate');
  });

  it('holds the same pool for the whole game', () => {
    const state = startGame(roster);
    const after = playRound(state, 'A', 'wall');

    expect(after.sessionAbilityIds).toEqual(state.sessionAbilityIds);
  });

  it('draws a different pool on a new game', () => {
    // Six optional Fates choosing four is only 15 combinations, so two draws
    // can legitimately match. Sample enough to prove the draw is not frozen.
    const draws = new Set<string>();
    for (let run = 0; run < 40; run += 1) {
      draws.add([...startGame(roster).sessionAbilityIds].sort().join(','));
    }

    expect(draws.size).toBeGreaterThan(1);
  });

  it('draws every optional Fate without padding, erroring, or dropping mandatory ones when fewer optional Fates exist than SESSION_OPTIONAL_COUNT', () => {
    // A short synthetic registry — not the real ABILITIES — because this
    // exercises a branch that cannot currently happen with the real registry
    // (it has six optional Fates, well above SESSION_OPTIONAL_COUNT). Later
    // tasks in this phase move that count around, so the branch needs its own
    // coverage rather than waiting for the real registry to shrink into it.
    const stub = (id: string, mandatory: boolean): AbilityDefinition => ({
      id,
      name: id,
      icon: '?',
      category: 'neutral',
      mandatory,
      isAvailable: () => true,
      resolve: () => [],
    });

    const shortRegistry = [
      stub('m1', true),
      stub('m2', true),
      stub('o1', false),
      stub('o2', false),
    ];

    // Two optional Fates, SESSION_OPTIONAL_COUNT (4) requested — asking for
    // more than exists.
    const drawn = drawSessionPool(shortRegistry, SESSION_OPTIONAL_COUNT);

    expect(drawn.sort()).toEqual(['m1', 'm2', 'o1', 'o2']);
  });
});

// --- Starting roster count -----------------------------------------------------

describe('startingPlayerCount', () => {
  it('is fixed at START_GAME and untouched by later roster housekeeping', () => {
    // Reproduces the wrinkle Task 3 left behind: `applyPhaseAndWinner` used to
    // pass `players.length` (the CURRENT roster) as the starting count. Roster
    // edits are legal at 'idle' (canEditRoster), so a host removing eliminated
    // players there would shrink that denominator, raise the alive share, and
    // de-escalate the phase even though nobody was revived.
    const names = Array.from({ length: 20 }, (_, index) => `P${index}`);
    let state = startGame(names);
    expect(state.startingPlayerCount).toBe(20);

    // Eliminate down to 8 alive (of 20 starting = 40% => bloodbath, per the
    // DEFAULT_PHASE_THRESHOLDS table exercised elsewhere in this file).
    const toEliminate = names.slice(0, 12);
    for (const name of toEliminate) {
      state = gameReducer(state, { type: 'ELIMINATE_PLAYER', playerId: idOf(state, name) });
    }
    expect(getAlivePlayers(state)).toHaveLength(8);
    expect(state.phase).toBe('bloodbath');

    // Back to 'idle' housekeeping: remove some already-eliminated players from
    // the roster. This shrinks `players.length` from 20 to 15 without changing
    // who is alive, which is exactly the scenario that used to unwind the phase.
    for (const name of toEliminate.slice(0, 5)) {
      state = gameReducer(state, { type: 'REMOVE_PLAYER', playerId: idOf(state, name) });
    }
    expect(state.players).toHaveLength(15);
    expect(getAlivePlayers(state)).toHaveLength(8);

    // The starting count must not have moved, and the phase must not have
    // de-escalated back to Danger.
    expect(state.startingPlayerCount).toBe(20);
    expect(state.phase).toBe('bloodbath');
  });
});
