/**
 * Game Engine behaviour — DEVELOPMENT_ROADMAP.md Enhancement Phase 0.
 *
 * The roadmap names the cases this file must cover:
 *
 *   Shield blocks attack        Death Mark triggers once
 *   Hunter excludes self        Duel excludes self
 *   Revive only uses eliminated pool
 *   Winner detection            Phase transitions
 *   Weighted Fate selection
 *
 * Bomb's pass / tick / detonate cycle is covered too, since it shipped after
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
import { createInitialGameState } from './gameEngine';
import { gameReducer } from './reducer';
import { attackPlayer } from './attack';
import { canSpinTarget, getAlivePlayers, getTargetPool } from './selectors';
import {
  ABILITIES,
  buildGameContext,
  getAbility,
  getAbilityWeight,
  getAvailableAbilities,
  selectWeightedAbility,
} from '../abilities';
import { ABILITY_WEIGHTS } from '../config/abilityWeights';
import { BOMB_FUSE, getBombHolder } from '../statuses/bombTrigger';
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

// --- Shield ------------------------------------------------------------------

describe('Shield', () => {
  it('blocks an attack instead of eliminating', () => {
    const state = withStatus(startGame(['A', 'B', 'C']), 'A', { shield: 1 });
    const events = attackPlayer(state, idOf(state, 'A'), 'test');

    expect(events.map((event) => event.type)).toEqual(['ATTACK_PLAYER', 'SHIELD_BLOCK']);
  });

  it('eliminates when there is no Shield', () => {
    const state = startGame(['A', 'B', 'C']);
    const events = attackPlayer(state, idOf(state, 'A'), 'test');

    expect(events.map((event) => event.type)).toEqual(['ATTACK_PLAYER', 'ELIMINATE_PLAYER']);
  });

  it('is consumed by the block, so it only saves once', () => {
    let state = withStatus(startGame(['A', 'B', 'C']), 'A', { shield: 1 });

    state = playRound(state, 'A', 'eliminate');
    expect(playerOf(state, 'A').status).toBe('alive');
    expect(playerOf(state, 'A').shield).toBe(0);

    state = gameReducer(state, { type: 'NEXT_ROUND' });
    state = playRound(state, 'A', 'eliminate');
    expect(playerOf(state, 'A').status).toBe('eliminated');
  });

  it('never stacks above the MVP cap of 1', () => {
    let state = withStatus(startGame(['A', 'B', 'C']), 'A', { shield: 1 });
    state = playRound(state, 'A', 'shield');

    expect(playerOf(state, 'A').shield).toBe(1);
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

  it('is spent even when a Shield absorbs the attack', () => {
    let state = withStatus(startGame(['A', 'B', 'C']), 'A', { deathMark: true, shield: 1 });

    state = selectOnly(state, 'A');
    expect(playerOf(state, 'A').status).toBe('alive');
    expect(playerOf(state, 'A').shield).toBe(0);
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

  it('pays a Shield bounty for a kill but not for a blocked hunt', () => {
    const hunt = (targetHasShield: boolean) => {
      let state = startGame(['A', 'B', 'C', 'D']);
      if (targetHasShield) state = withStatus(state, 'B', { shield: 1 });
      state = playRound(state, 'A', 'hunter');
      state = gameReducer(state, { type: 'START_TARGET_SPIN', playerId: idOf(state, 'B') });
      return drain(gameReducer(state, { type: 'PLAYER_SPIN_COMPLETE' }));
    };

    const killed = hunt(false);
    expect(playerOf(killed, 'B').status).toBe('eliminated');
    expect(playerOf(killed, 'A').shield).toBe(1);

    const blocked = hunt(true);
    expect(playerOf(blocked, 'B').status).toBe('alive');
    expect(playerOf(blocked, 'A').shield).toBe(0);
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
    state = withStatus(state, 'D', { shield: 1, deathMark: true, bombFuse: 2 });
    state = gameReducer(state, { type: 'ELIMINATE_PLAYER', playerId: idOf(state, 'D') });
    state = playRound(state, 'A', 'revive');

    const revived = playerOf(state, 'D');
    expect(revived.status).toBe('alive');
    expect(revived.shield).toBe(0);
    expect(revived.deathMark).toBe(false);
    expect(revived.bombFuse).toBeUndefined();
    expect(revived.revivedCount).toBe(1);

    state = gameReducer(state, { type: 'NEXT_ROUND' });
    state = gameReducer(state, { type: 'ELIMINATE_PLAYER', playerId: idOf(state, 'D') });
    state = playRound(state, 'A', 'revive');
    expect(playerOf(state, 'D').revivedCount).toBe(2);
  });
});

// --- Bomb --------------------------------------------------------------------

describe('Bomb', () => {
  const four = ['A', 'B', 'C', 'D'];

  it('plants with a full fuse, and only one may be live at a time', () => {
    const state = playRound(startGame(four), 'A', 'bomb');

    expect(getBombHolder(state.players)?.name).toBe('A');
    expect(getBombHolder(state.players)?.bombFuse).toBe(BOMB_FUSE);
    expect(getAbility('bomb')?.isAvailable(buildGameContext(state))).toBe(false);
    expect(getAvailableAbilities(state).map((ability) => ability.id)).not.toContain('bomb');
  });

  it('needs at least four players alive', () => {
    let state = startGame(four);
    state = gameReducer(state, { type: 'ELIMINATE_PLAYER', playerId: idOf(state, 'D') });

    expect(getAbility('bomb')?.isAvailable(buildGameContext(state))).toBe(false);
  });

  it('passes to whoever is selected, ticking down, without eating the Fate', () => {
    let state = playRound(startGame(four), 'A', 'bomb');
    state = gameReducer(state, { type: 'NEXT_ROUND' });

    state = playRound(state, 'B', 'safe');
    expect(getBombHolder(state.players)?.name).toBe('B');
    expect(getBombHolder(state.players)?.bombFuse).toBe(2);
    // The round's Fate still ran: a pass must not replace it.
    expect(state.currentAbilityId).toBe('safe');

    state = gameReducer(state, { type: 'NEXT_ROUND' });
    state = playRound(state, 'C', 'safe');
    expect(getBombHolder(state.players)?.bombFuse).toBe(1);
  });

  it('detonates on the player selected when the fuse runs out', () => {
    let state = withStatus(startGame(four), 'A', { bombFuse: 1 });
    state = selectOnly(state, 'B');

    expect(playerOf(state, 'B').status).toBe('eliminated');
    expect(getBombHolder(state.players)).toBeNull();
  });

  it('is blocked by a Shield, and is spent either way', () => {
    let state = withStatus(startGame(four), 'A', { bombFuse: 1 });
    state = withStatus(state, 'B', { shield: 1 });
    state = selectOnly(state, 'B');

    expect(playerOf(state, 'B').status).toBe('alive');
    expect(playerOf(state, 'B').shield).toBe(0);
    expect(getBombHolder(state.players)).toBeNull();
  });

  it('sticks to a holder who is selected again', () => {
    let state = withStatus(startGame(four), 'A', { bombFuse: 3 });
    state = selectOnly(state, 'A');

    expect(getBombHolder(state.players)?.name).toBe('A');
    expect(getBombHolder(state.players)?.bombFuse).toBe(2);
  });

  it('announces itself as lost when its holder dies to something else', () => {
    let state = withStatus(startGame(four), 'A', { bombFuse: 2 });
    state = playRound(state, 'A', 'eliminate');
    expect(playerOf(state, 'A').status).toBe('eliminated');
    expect(getBombHolder(state.players)).toBeNull();

    // The next selection clears the abandoned fuse and says so.
    state = gameReducer(state, { type: 'NEXT_ROUND' });
    state = selectOnly(state, 'B');

    const said = state.history.some(
      (entry) =>
        entry.event.type === 'SHOW_MESSAGE' && entry.event.message.includes('went up with'),
    );
    expect(said).toBe(true);
    expect(state.players.every((player) => player.bombFuse === undefined)).toBe(true);
  });

  it('lets a Death Mark take the round instead, leaving the fuse untouched', () => {
    let state = withStatus(startGame(four), 'A', { bombFuse: 3 });
    state = withStatus(state, 'B', { deathMark: true });
    state = selectOnly(state, 'B');

    expect(playerOf(state, 'B').status).toBe('eliminated');
    expect(getBombHolder(state.players)?.name).toBe('A');
    expect(getBombHolder(state.players)?.bombFuse).toBe(3);
  });
});

// --- Phases and winner -------------------------------------------------------

describe('Phase transitions', () => {
  it('resolves each band from the alive count', () => {
    const phaseAt = (alive: number) => resolvePhase(alive, DEFAULT_PHASE_THRESHOLDS);

    expect(phaseAt(50)).toBe('chaos');
    expect(phaseAt(DEFAULT_PHASE_THRESHOLDS.dangerAt)).toBe('danger');
    expect(phaseAt(DEFAULT_PHASE_THRESHOLDS.finalAt)).toBe('final_four');
    expect(phaseAt(DEFAULT_PHASE_THRESHOLDS.suddenDeathAt)).toBe('sudden_death');
  });

  it('may move BACKWARD after a Revive (PROJECT_SPEC.md §38)', () => {
    // The move has to CROSS a threshold to be visible. Sudden Death is at 2
    // alive and Final Four covers 3-5, so dropping to two and reviving one is
    // the smallest change that actually steps back a band.
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
  it('labels exist for all five phases', () => {
    const phases: GamePhase[] = ['chaos', 'danger', 'bloodbath', 'final_four', 'sudden_death'];

    for (const phase of phases) {
      expect(PHASE_LABELS[phase], phase).toBeTypeOf('string');
      expect(PHASE_LABELS[phase], phase).not.toBe('');
    }
  });

  it('every ability declares a bloodbath weight', () => {
    for (const ability of ABILITIES) {
      expect(ABILITY_WEIGHTS[ability.id]?.bloodbath, ability.id).toBeTypeOf('number');
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
    // 12 players: dangerAt is 11, so this is the smallest roster that starts
    // in Chaos rather than Danger/Final Four (PROJECT_SPEC.md §10).
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
