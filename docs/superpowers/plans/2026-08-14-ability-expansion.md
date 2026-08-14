# Enhancement Phase 3 — Ability Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw a different Fate pool every session, rescale phases to roster size, and reshape the pool to thirteen Fates in which armour is a liability.

**Architecture:** Two independently shippable parts. **3a** changes no gameplay content — it consolidates ability weights to one table, adds a fifth phase, rescales phase thresholds to a share of the starting roster, and adds a per-session Fate draw. All of it is testable against the eleven Fates that exist today. **3b** then reshapes the pool: three Fates removed, Shield renamed to Wall throughout, and four new Fates added. Every change stays inside the existing patterns — abilities are data (`AbilityDefinition` + a registry line), statuses are triggers (`StatusTrigger` + a `SELECTION_TRIGGERS` entry + a rim colour), and elimination has exactly one implementation (`attackPlayer`).

**Tech Stack:** React 19, TypeScript, Vite 8, Vitest 4.1.10, oxlint, Prettier.

**Spec:** `docs/superpowers/specs/2026-08-14-ability-expansion-design.md`

---

## File Structure

**Part 3a — created**

| File | Responsibility |
|---|---|
| `src/game/config/abilityWeights.ts` | The single default weight table: ability id → phase → weight. Replaces eleven per-ability `WEIGHTS` constants *and* the duplicate copies in `defaultConfig.ts`. |
| `src/game/abilities/sessionPool.ts` | Draws the per-session Fate pool. Pure; randomness via `utils/random`. |

**Part 3a — modified**

| File | Change |
|---|---|
| `src/game/types/ability.ts` | Drop `getWeight`; add `mandatory?: boolean`. |
| `src/game/types/game.ts` | `GamePhase` gains `bloodbath`, `final_five` → `final_four`; `PhaseThresholds` becomes share-based; `GameState` gains `sessionAbilityIds`. |
| `src/game/phases/phaseConfig.ts` | New thresholds, labels and announcements. |
| `src/game/phases/phaseResolver.ts` | Takes the starting roster size. |
| `src/game/engine/gameEngine.ts` | `createInitialGameState` seeds `sessionAbilityIds`; `applyPhaseAndWinner` passes `players.length`. |
| `src/game/engine/reducer.ts` | `START_GAME` draws the session pool. |
| `src/game/abilities/index.ts` | `getAbilityWeight` reads the table; `getAvailableAbilities` filters on the session pool. |
| `src/game/config/defaultConfig.ts` | Keeps `enabled`, drops the duplicated weights. |
| `src/components/MainWheel/wheelTheme.ts` | Tints for five phases. |
| `src/storage/gameStorage.ts` | `SAVE_VERSION` → 3. |
| All eleven `src/game/abilities/*.ts` | Delete the local `WEIGHTS` constant and `getWeight`; add `mandatory` to five. |

**Part 3b — created**

| File | Responsibility |
|---|---|
| `src/game/abilities/gale.ts` | 💨 Gale — target spin over everyone; kills only the walled. |
| `src/game/abilities/demolition.ts` | 🔨 Demolition — clears every wall, harms nobody. |
| `src/game/abilities/c4.ts` | 🧨 C4 — plants the charge. |
| `src/game/statuses/c4Trigger.ts` | C4's tick / defuse / detonate cycle. |
| `src/game/abilities/fateSwap.ts` | 🔄 Fate Swap — exchanges all statuses between two players. |
| `src/game/abilities/purify.ts` | ✨ Purify — removes a Death Mark. |

**Part 3b — deleted**

`src/game/abilities/closeCall.ts`, `src/game/abilities/stealShield.ts`, `src/game/abilities/bomb.ts`, `src/game/statuses/bombTrigger.ts`.

**Part 3b — modified**

`attack.ts` (pierce), `eventTypes.ts` (wall events, `SET_C4`, `CLEAR_C4`, `SWAP_STATUSES`), `eventResolver.ts`, `player.ts`, `selectors.ts` (neighbours), plus the wall rename across the 30 files grep reports.

---

## Ordering, and why

Weights are consolidated **before** the phase change. Adding a fifth phase to eleven per-ability `WEIGHTS` records plus eleven config entries is 22 edits; against one table it is one edit. Doing it in the other order doubles the work and doubles the chance of a typo.

The wall rename comes **before** the new Fates, so Gale and Demolition are written once against final vocabulary rather than written as `shield` and renamed an hour later.

---

# PART 3a — FRAMEWORK

### Task 1: One ability weight table

**Files:**
- Create: `src/game/config/abilityWeights.ts`
- Modify: `src/game/types/ability.ts`, `src/game/abilities/index.ts`, `src/game/config/defaultConfig.ts`
- Modify: all eleven files in `src/game/abilities/` except `index.ts`
- Test: `src/game/engine/gameEngine.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `src/game/engine/gameEngine.test.ts`:

```ts
// --- ability weights ----------------------------------------------------------

describe('ability weights', () => {
  it('every registered ability has a weight for every phase', () => {
    const phases: GamePhase[] = ['chaos', 'danger', 'final_five', 'sudden_death'];

    for (const ability of ABILITIES) {
      for (const phase of phases) {
        const weight = ABILITY_WEIGHTS[ability.id]?.[phase];
        expect(weight, `${ability.id} / ${phase}`).toBeTypeOf('number');
        expect(weight, `${ability.id} / ${phase}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('config overrides the default table', () => {
    const state = startGame(['A', 'B', 'C']);
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
```

Add these imports to the existing import block at the top of the test file:

```ts
import type { GamePhase } from '../types/game';
import { ABILITIES, getAbilityWeight } from '../abilities';
import { ABILITY_WEIGHTS } from '../config/abilityWeights';
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run`
Expected: FAIL — `Cannot find module '../config/abilityWeights'`.

- [ ] **Step 3: Create the weight table**

Create `src/game/config/abilityWeights.ts`:

```ts
/**
 * Default Fate weights, by ability and phase.
 *
 * ONE table. Before Enhancement Phase 3 these numbers lived twice — a local
 * `WEIGHTS` constant inside each ability file and a duplicate copy in
 * `defaultConfig.ts` — with the config copy silently winning. Two sources of
 * truth for one fact, and adding a phase meant editing both for every ability.
 *
 * Host overrides still live in `GameConfig.abilities[id].weights` and still
 * win; this is the default they override (see `getAbilityWeight`).
 *
 * A missing entry reads as weight 0, which excludes the ability from the wheel.
 * That is deliberate: an ability with no declared weight should never appear
 * rather than quietly default to something.
 */

import type { GamePhase } from '../types/game';

export type PhaseWeights = Record<GamePhase, number>;

export const ABILITY_WEIGHTS: Record<string, PhaseWeights> = {
  eliminate: { chaos: 22, danger: 28, final_five: 34, sudden_death: 50 },
  shield: { chaos: 10, danger: 8, final_five: 8, sudden_death: 12 },
  safe: { chaos: 4, danger: 3, final_five: 2, sudden_death: 0 },
  close_call: { chaos: 10, danger: 8, final_five: 6, sudden_death: 8 },
  hunter: { chaos: 15, danger: 16, final_five: 18, sudden_death: 20 },
  death_mark: { chaos: 10, danger: 10, final_five: 8, sudden_death: 0 },
  revive: { chaos: 6, danger: 4, final_five: 0, sudden_death: 0 },
  duel: { chaos: 13, danger: 14, final_five: 16, sudden_death: 0 },
  steal_shield: { chaos: 9, danger: 8, final_five: 6, sudden_death: 6 },
  double_fate: { chaos: 8, danger: 8, final_five: 6, sudden_death: 0 },
  bomb: { chaos: 10, danger: 10, final_five: 6, sudden_death: 0 },
};
```

These are the values currently in `defaultConfig.ts`, copied exactly. This task must not change any weight — behaviour stays identical so the consolidation is provably safe.

- [ ] **Step 4: Drop `getWeight` from the ability interface**

In `src/game/types/ability.ts`, delete this block:

```ts
  /** Relative selection weight for the given phase. Return 0 to exclude. */
  getWeight: (phase: GamePhase) => number;
```

and add, directly under `category`:

```ts
  /**
   * Always in the pool, exempt from the per-session draw.
   *
   * The five Fates that keep the game moving — Eliminate, Wall, Death Mark,
   * Hunter, Duel. Everything else is optional and drawn per session, which is
   * what makes two games feel different.
   */
  mandatory?: boolean;
```

`GamePhase` is still used by other members of the file, so leave the import alone.

- [ ] **Step 5: Read the table in `getAbilityWeight`**

In `src/game/abilities/index.ts`, replace the body of `getAbilityWeight`:

```ts
export function getAbilityWeight(state: GameState, ability: AbilityDefinition): number {
  const configured = state.config.abilities[ability.id]?.weights?.[state.phase];
  return configured ?? ABILITY_WEIGHTS[ability.id]?.[state.phase] ?? 0;
}
```

and add the import:

```ts
import { ABILITY_WEIGHTS } from '../config/abilityWeights';
```

- [ ] **Step 6: Strip the local weights from all eleven ability files**

In each of `eliminate.ts`, `shield.ts`, `safe.ts`, `closeCall.ts`, `deathMark.ts`, `hunter.ts`, `revive.ts`, `duel.ts`, `stealShield.ts`, `doubleFate.ts`, `bomb.ts`:

1. Delete the `const WEIGHTS: Record<GamePhase, number> = { … };` block.
2. Delete the `getWeight: (phase) => WEIGHTS[phase],` line from the exported ability.
3. Delete `import type { GamePhase } from '../types/game';` **only if** `GamePhase` is now unused in that file.

Worked example — `src/game/abilities/shield.ts` becomes:

```ts
/**
 * 🛡 Shield — PROJECT_SPEC.md §11.2
 *
 * Grants one Shield charge. MVP maximum stack is 1; the cap is enforced when
 * ADD_SHIELD is applied, so every future source of Shield inherits it.
 *
 * Weights live in `config/abilityWeights.ts`.
 */

import type { AbilityDefinition } from '../types/ability';

export const shieldAbility: AbilityDefinition = {
  id: 'shield',
  name: 'Shield',
  icon: '🛡',
  category: 'defense',
  mandatory: true,

  isAvailable: () => true,

  resolve: (_context, selectedPlayerId) => [{ type: 'ADD_SHIELD', playerId: selectedPlayerId }],

  // Worth stating when it is wasted: the cap is invisible otherwise, and a
  // second Shield landing on an already-shielded player looks like a bug.
  describeStakes: (context, selectedPlayerId) => {
    const player = context.state.players.find((candidate) => candidate.id === selectedPlayerId);
    if (!player) return null;

    return player.shield > 0
      ? `${player.name} already holds a Shield — this one is wasted.`
      : `${player.name} gets armour.`;
  },
};
```

Add `mandatory: true,` to exactly five abilities: `eliminate.ts`, `shield.ts`, `deathMark.ts`, `hunter.ts`, `duel.ts`. Leave it off the other six.

- [ ] **Step 7: Empty the duplicate weights in the default config**

In `src/game/config/defaultConfig.ts`, replace the whole `abilities:` object with:

```ts
  // Weights live in `config/abilityWeights.ts`. This map carries host overrides
  // only; an empty `weights` means "use the default table". Enhancement Phase 5
  // writes into it when the host tunes a Fate.
  abilities: {
    eliminate: { enabled: true, weights: {} },
    shield: { enabled: true, weights: {} },
    safe: { enabled: true, weights: {} },
    close_call: { enabled: true, weights: {} },
    hunter: { enabled: true, weights: {} },
    death_mark: { enabled: true, weights: {} },
    revive: { enabled: true, weights: {} },
    duel: { enabled: true, weights: {} },
    steal_shield: { enabled: true, weights: {} },
    double_fate: { enabled: true, weights: {} },
    bomb: { enabled: true, weights: {} },
    fate_swap: { enabled: false, weights: {} },
    double_kill: { enabled: false, weights: {} },
  },
```

- [ ] **Step 8: Run the whole suite**

Run: `npm run test:run`
Expected: PASS, 67 tests (65 existing + 2 new). Every pre-existing test must still pass — this task changes no behaviour.

- [ ] **Step 9: Typecheck and lint**

Run: `npm run build && npm run lint`
Expected: build succeeds with no type errors; oxlint clean. Unused `GamePhase` imports are the likely failure here — remove them where flagged.

- [ ] **Step 10: Commit**

```bash
git add src/game/config/abilityWeights.ts src/game/types/ability.ts src/game/abilities src/game/config/defaultConfig.ts src/game/engine/gameEngine.test.ts
git commit -m "refactor: one ability weight table instead of two"
```

---

### Task 2: Bloodbath phase, and Final Five becomes Final Four

**Files:**
- Modify: `src/game/types/game.ts`, `src/game/phases/phaseConfig.ts`, `src/game/config/abilityWeights.ts`, `src/components/MainWheel/wheelTheme.ts`
- Test: `src/game/engine/gameEngine.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

Add to the test file's imports:

```ts
import { PHASE_LABELS } from '../phases/phaseConfig';
```

Also update the Task 1 test's phase list to all five:

```ts
    const phases: GamePhase[] = ['chaos', 'danger', 'bloodbath', 'final_four', 'sudden_death'];
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run`
Expected: FAIL — `'bloodbath'` and `'final_four'` are not assignable to `GamePhase`.

- [ ] **Step 3: Extend the phase union**

In `src/game/types/game.ts`, replace the `GamePhase` line:

```ts
/**
 * Escalation tiers, least to most severe.
 *
 * `bloodbath` sits between Danger and the endgame and only exists in larger
 * games — below about 13 players its band falls under the absolute Final Four
 * floor and it is never entered. That is intended: a game that ends in six
 * eliminations does not need five tiers.
 */
export type GamePhase = 'chaos' | 'danger' | 'bloodbath' | 'final_four' | 'sudden_death';
```

- [ ] **Step 4: Update labels and announcements**

In `src/game/phases/phaseConfig.ts`, replace `PHASE_LABELS` and `PHASE_ANNOUNCEMENTS`:

```ts
export const PHASE_LABELS: Record<GamePhase, string> = {
  chaos: 'CHAOS',
  danger: 'DANGER',
  bloodbath: 'BLOODBATH',
  final_four: 'FINAL FOUR',
  sudden_death: 'SUDDEN DEATH',
};

/**
 * Full-screen transition titles.
 *
 * Chaos has no announcement: it is where games begin, so declaring it would
 * fire an overlay before anything has happened. A game that drops back to
 * Chaos after a Revive therefore transitions quietly, which is the right
 * emphasis — escalation is the dramatic beat, not de-escalation.
 */
export const PHASE_ANNOUNCEMENTS: Partial<Record<GamePhase, string>> = {
  danger: '⚠ DANGER MODE ⚠',
  bloodbath: '🩸 BLOODBATH 🩸',
  final_four: '🔥 FINAL FOUR 🔥',
  sudden_death: '☠ SUDDEN DEATH ☠',
};
```

- [ ] **Step 5: Add the bloodbath column and rename the final column**

Replace `ABILITY_WEIGHTS` in `src/game/config/abilityWeights.ts`:

```ts
export const ABILITY_WEIGHTS: Record<string, PhaseWeights> = {
  eliminate: { chaos: 18, danger: 24, bloodbath: 30, final_four: 34, sudden_death: 50 },
  shield: { chaos: 12, danger: 10, bloodbath: 8, final_four: 8, sudden_death: 12 },
  safe: { chaos: 5, danger: 3, bloodbath: 2, final_four: 2, sudden_death: 0 },
  close_call: { chaos: 10, danger: 8, bloodbath: 6, final_four: 6, sudden_death: 8 },
  hunter: { chaos: 14, danger: 15, bloodbath: 16, final_four: 18, sudden_death: 20 },
  death_mark: { chaos: 10, danger: 12, bloodbath: 12, final_four: 8, sudden_death: 0 },
  revive: { chaos: 6, danger: 4, bloodbath: 2, final_four: 0, sudden_death: 0 },
  duel: { chaos: 12, danger: 14, bloodbath: 15, final_four: 16, sudden_death: 0 },
  steal_shield: { chaos: 9, danger: 8, bloodbath: 6, final_four: 6, sudden_death: 6 },
  double_fate: { chaos: 8, danger: 8, bloodbath: 7, final_four: 6, sudden_death: 0 },
  bomb: { chaos: 8, danger: 10, bloodbath: 10, final_four: 0, sudden_death: 0 },
};
```

- [ ] **Step 6: Add the bloodbath tint**

In `src/components/MainWheel/wheelTheme.ts`, replace the `TINTS` record:

```ts
const TINTS: Record<GamePhase, string> = {
  chaos: '#2b313d',
  danger: '#5a3f22',
  bloodbath: '#6d2f1e',
  final_four: '#7a3a1c',
  sudden_death: '#8c2020',
};
```

- [ ] **Step 7: Fix every remaining `final_five`**

Run: `npx rg -n "final_five|FINAL FIVE" src/`

Fix each match. Known sites are `gameEngine.test.ts` and possibly a phase class name in `src/styles/globals.css`.
Expected after fixing: no matches.

- [ ] **Step 8: Run the suite**

Run: `npm run test:run`
Expected: PASS. Pre-existing phase tests will need `final_five` → `final_four` in their expectations; that is the intended rename, not a regression.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: add Bloodbath phase, rename Final Five to Final Four"
```

---

### Task 3: Phase thresholds scale with the starting roster

**Files:**
- Modify: `src/game/types/game.ts`, `src/game/phases/phaseConfig.ts`, `src/game/phases/phaseResolver.ts`, `src/game/engine/gameEngine.ts`
- Test: `src/game/engine/gameEngine.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
describe('phase thresholds scale to roster size', () => {
  const bands = (starting: number): GamePhase[] =>
    Array.from({ length: starting }, (_, index) => resolvePhase(starting - index, starting));

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
    expect(resolvePhase(12, 12)).toBe('chaos');
    expect(resolvePhase(9, 12)).toBe('chaos');
    expect(resolvePhase(8, 12)).toBe('danger');
    expect(resolvePhase(5, 12)).toBe('danger');
    expect(resolvePhase(4, 12)).toBe('final_four');
  });

  it('Bloodbath appears only in larger games', () => {
    expect(bands(12)).not.toContain('bloodbath');
    expect(bands(20)).toContain('bloodbath');
    expect(resolvePhase(9, 20)).toBe('danger');
    expect(resolvePhase(8, 20)).toBe('bloodbath');
    expect(resolvePhase(5, 20)).toBe('bloodbath');
    expect(resolvePhase(4, 20)).toBe('final_four');
  });

  it('a 30-player game uses every phase', () => {
    const seen = new Set(bands(30));
    expect(seen.has('chaos')).toBe(true);
    expect(seen.has('danger')).toBe(true);
    expect(seen.has('bloodbath')).toBe(true);
    expect(seen.has('final_four')).toBe(true);
    expect(seen.has('sudden_death')).toBe(true);
  });

  it('treats a zero starting count as the alive count', () => {
    expect(resolvePhase(10, 0)).toBe('chaos');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run`
Expected: FAIL — `resolvePhase` takes `(aliveCount, thresholds)`, so the second argument is the wrong type.

- [ ] **Step 3: Change the threshold shape**

In `src/game/types/game.ts`, replace `PhaseThresholds`:

```ts
/**
 * Where each phase begins.
 *
 * The upper bands are a SHARE of the starting roster, the endgame bands are
 * absolute counts. An 8-player game and a 30-player game should both spend
 * roughly the same proportion of their length in Chaos, but "four left" means
 * the same thing in both — it is a stage of the game, not a proportion of it.
 *
 * Before this, thresholds were absolute throughout (`dangerAt: 11`), which
 * meant any game under 12 players began in DANGER and never saw Chaos.
 */
export type PhaseThresholds = {
  /** Alive share at or below this enters DANGER. 0.7 = 70%. */
  dangerAtShare: number;
  /** Alive share at or below this enters BLOODBATH. */
  bloodbathAtShare: number;
  /** Alive count at or below this enters FINAL FOUR. */
  finalAt: number;
  /** Alive count at or below this enters SUDDEN DEATH. */
  suddenDeathAt: number;
};
```

- [ ] **Step 4: Update the default thresholds**

In `src/game/phases/phaseConfig.ts`, replace `DEFAULT_PHASE_THRESHOLDS`:

```ts
/**
 * Encoded as inclusive upper bounds so the resolver stays a simple cascade,
 * most severe first.
 *
 * `finalAt` is 4 rather than 5 for a reason worth keeping: at 8 players the 70%
 * Danger band lands at 5 alive, and a Final floor of 5 would take that step
 * first — deleting DANGER from every game under about 12 players, which is the
 * same bug the share-based bands exist to fix.
 */
export const DEFAULT_PHASE_THRESHOLDS: PhaseThresholds = {
  dangerAtShare: 0.7,
  bloodbathAtShare: 0.4,
  finalAt: 4,
  suddenDeathAt: 2,
};
```

- [ ] **Step 5: Rewrite the resolver**

Replace the whole of `src/game/phases/phaseResolver.ts`:

```ts
/**
 * Automatic phase resolution.
 *
 * Source of truth: PROJECT_SPEC.md §10 and §38 ("Revive after phase threshold
 * change"). Phase is derived from the alive count only, so it may move BACKWARD
 * after a Revive — this is the intended MVP behaviour.
 */

import type { GamePhase, PhaseThresholds } from '../types/game';
import { DEFAULT_PHASE_THRESHOLDS } from './phaseConfig';

/**
 * Derive the current phase from how many players are left, relative to how many
 * there were at the start.
 *
 * An alive count of 1 or 0 still reports 'sudden_death'; winner detection is
 * the engine's responsibility, not the phase resolver's.
 *
 * A `startingCount` of 0 falls back to the alive count, which reports 'chaos'.
 * That is the setup screen, where the alive count is meaningless anyway.
 */
export function resolvePhase(
  aliveCount: number,
  startingCount: number,
  thresholds: PhaseThresholds = DEFAULT_PHASE_THRESHOLDS,
): GamePhase {
  if (aliveCount <= thresholds.suddenDeathAt) return 'sudden_death';
  if (aliveCount <= thresholds.finalAt) return 'final_four';

  const total = startingCount > 0 ? startingCount : aliveCount;
  const share = aliveCount / total;

  if (share <= thresholds.bloodbathAtShare) return 'bloodbath';
  if (share <= thresholds.dangerAtShare) return 'danger';
  return 'chaos';
}
```

- [ ] **Step 6: Pass the starting roster from the engine**

In `src/game/engine/gameEngine.ts`, inside `applyPhaseAndWinner`, replace the first two lines of the body:

```ts
  const aliveCount = getAliveCount(state.players);
  // `players` keeps eliminated players, so its length IS the starting roster.
  // Roster edits are only legal at 'setup' and 'idle', so it cannot shift
  // mid-round.
  const nextPhase = resolvePhase(aliveCount, state.players.length, state.config.phaseThresholds);
```

- [ ] **Step 7: Run the suite**

Run: `npm run test:run`
Expected: PASS. The pre-existing "phase moves backward after a Revive" test drops to 2 alive and revives to 3; at a small roster 3 alive is `final_four` both times, so give that test a roster of at least 12 and adjust its expectations to `sudden_death` → `danger`.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "fix: scale phase thresholds to the starting roster

Absolute thresholds meant any game under 12 players began in DANGER and
never saw Chaos. The upper bands are now a share of the starting roster;
the endgame bands stay absolute because 'four left' is a stage, not a
proportion."
```

---

### Task 4: Session pool

**Files:**
- Create: `src/game/abilities/sessionPool.ts`
- Modify: `src/utils/random.ts`, `src/game/types/game.ts`, `src/game/engine/gameEngine.ts`, `src/game/engine/reducer.ts`, `src/game/abilities/index.ts`
- Test: `src/game/engine/gameEngine.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
      sessionAbilityIds: ['eliminate', 'shield', 'death_mark', 'hunter', 'duel'],
    };

    const availableIds = getAvailableAbilities(state).map((ability) => ability.id);

    expect(availableIds).not.toContain('safe');
    expect(availableIds).not.toContain('revive');
    expect(availableIds).toContain('eliminate');
  });

  it('holds the same pool for the whole game', () => {
    const state = startGame(roster);
    const after = playRound(state, 'A', 'shield');

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
});
```

Add to the test file's imports:

```ts
import { ABILITY_BY_ID } from '../abilities';
import { SESSION_OPTIONAL_COUNT } from '../abilities/sessionPool';
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run`
Expected: FAIL — `sessionAbilityIds` does not exist on `GameState`.

- [ ] **Step 3: Add `shuffle` to the random utility**

First read the existing contract:

Run: `npx rg -n "export function randomInt" -A 8 src/utils/random.ts`

Then add to `src/utils/random.ts`, matching whatever inclusivity `randomInt` already documents:

```ts
/**
 * Fisher-Yates, on a copy.
 *
 * Returns a new array so callers cannot accidentally reorder a registry that
 * other code is iterating.
 */
export function shuffle<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = randomInt(0, index);
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}
```

If `randomInt(min, max)` is exclusive of `max`, change the call to `randomInt(0, index + 1)`.

- [ ] **Step 4: Create the draw**

Create `src/game/abilities/sessionPool.ts`:

```ts
/**
 * The Fates in play for one game.
 *
 * Five mandatory Fates are always in, because they are what keeps a game
 * moving. Everything else is drawn once at START_GAME and held for the whole
 * session, so two games with the same roster still play differently.
 *
 * WHY FOUR
 *
 * With eight optional Fates, drawing four gives 70 distinct pools and every
 * game genuinely omits half of them. Drawing six — the number originally
 * proposed, against a larger pool than this one — would show 75% of the same
 * Fates every session and the draw would stop being felt.
 *
 * WHY NO CATEGORY QUOTAS
 *
 * The obvious risk is a session with no defence, or with no Fate that involves
 * a second player. The mandatory core already rules both out: Wall guarantees
 * defence, Hunter and Duel guarantee two-player Fates. A quota system would be
 * a second mechanism enforcing something already structurally true.
 */

import type { AbilityDefinition } from '../types/ability';
import { shuffle } from '../../utils/random';

/** Optional Fates drawn per session, on top of every mandatory one. */
export const SESSION_OPTIONAL_COUNT = 4;

/**
 * Draw the pool for one game.
 *
 * Pure apart from `shuffle`, which routes through utils/random like all other
 * randomness (AGENTS.md §7.5). Draws fewer than `SESSION_OPTIONAL_COUNT` only
 * when fewer optional Fates exist than that, which keeps the function total.
 */
export function drawSessionPool(
  abilities: readonly AbilityDefinition[],
  optionalCount: number = SESSION_OPTIONAL_COUNT,
): string[] {
  const mandatory = abilities.filter((ability) => ability.mandatory);
  const optional = abilities.filter((ability) => !ability.mandatory);

  const drawn = shuffle(optional).slice(0, Math.max(0, optionalCount));

  return [...mandatory, ...drawn].map((ability) => ability.id);
}
```

- [ ] **Step 5: Add the field to state**

In `src/game/types/game.ts`, add to `GameState` directly under `config`:

```ts
  /**
   * Ability ids in play for this game — every mandatory Fate plus the draw.
   *
   * Fixed at START_GAME and never re-rolled, including after a Revive: a pool
   * that changed mid-game would make the wheel a moving target for anyone
   * trying to follow it.
   */
  sessionAbilityIds: string[];
```

- [ ] **Step 6: Seed it in the engine**

In `src/game/engine/gameEngine.ts`, add to the object returned by `createInitialGameState`, under `config`:

```ts
    // Empty until START_GAME draws it. `getAvailableAbilities` treats an empty
    // pool as "no restriction", so the setup screen and any pre-game
    // inspection still see the full registry.
    sessionAbilityIds: [],
```

- [ ] **Step 7: Draw it at START_GAME**

In `src/game/engine/reducer.ts`, find the `startGame` function — it is the one returning `{ ...state, players, round: 1, screenState: 'idle', currentPlayerId: null, … }`. Add to that returned object:

```ts
    sessionAbilityIds: drawSessionPool(ABILITIES),
```

and add the imports:

```ts
import { ABILITIES } from '../abilities';
import { drawSessionPool } from '../abilities/sessionPool';
```

If `reducer.ts` already imports from `'../abilities'`, extend that import rather than adding a second one.

- [ ] **Step 8: Filter on it**

In `src/game/abilities/index.ts`, replace `getAvailableAbilities`:

```ts
export function getAvailableAbilities(state: GameState): AbilityDefinition[] {
  const context = buildGameContext(state);
  // An empty pool means the draw has not happened yet (setup, or a save from
  // before session pools existed). Treat it as no restriction rather than as
  // "nothing is available", which would leave the Fate Wheel empty.
  const pool = state.sessionAbilityIds.length > 0 ? new Set(state.sessionAbilityIds) : null;

  return ABILITIES.filter((ability) => {
    if (pool !== null && !pool.has(ability.id)) return false;
    if (state.config.abilities[ability.id]?.enabled === false) return false;
    if (!ability.isAvailable(context)) return false;
    return getAbilityWeight(state, ability) > 0;
  });
}
```

- [ ] **Step 9: Run the suite**

Run: `npm run test:run`
Expected: PASS. Existing tests calling `playRound(state, name, 'bomb')` with a Fate that was not drawn still work — `playRound` dispatches the ability id straight to the reducer, and the reducer does not re-check the pool. That is correct: the pool governs what the wheel may *select*, not what the engine can be told to resolve.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: draw a per-session Fate pool at game start"
```

---

### Task 5: Bump the save version, and update the project docs

**Files:**
- Modify: `src/storage/gameStorage.ts`, `PROJECT_SPEC.md`, `DEVELOPMENT_ROADMAP.md`, `PROJECT_STATUS.md`

- [ ] **Step 1: Bump the version**

In `src/storage/gameStorage.ts`, replace the `SAVE_VERSION` line and extend the comment above it:

```ts
/**
 * Bumped to 3 in Enhancement Phase 3. `GameState` gained `sessionAbilityIds`
 * and `PhaseThresholds` changed shape from absolute counts to shares, so a v2
 * save would resume with an undrawn pool and thresholds the resolver cannot
 * read. Discarding those saves is exactly what the version check exists for.
 */
export const SAVE_VERSION = 3;
```

- [ ] **Step 2: Update PROJECT_SPEC.md**

Read `PROJECT_SPEC.md` first, then make these edits:

1. **§10 (game phases):** replace the four-phase list and the absolute thresholds with the five-phase table and the share-based bands from the design doc.
2. **§32 (config shape):** note that `abilities[id].weights` is now an override map over `config/abilityWeights.ts`, and record `sessionAbilityIds` on the state.
3. Add a short new section, **"Session pool"**, stating the mandatory five, the optional draw of four, and that the pool is fixed for the game.

Leave §14 (Player model) alone — the field rename lands in Task 6.

- [ ] **Step 3: Update DEVELOPMENT_ROADMAP.md**

`DEVELOPMENT_ROADMAP.md:1283-1351` still lists Enhancement Phase 3 as 3A Double Kill / 3B Fate Swap / 3C Steal Shield / 3D Double Fate / 3E Bomb / 3F Jackpot. Four of those six are already built or now cut. Replace that whole section with:

```markdown
# Enhancement Phase 3 — Ability Expansion

## Goal

Make every session play differently, and make defence a decision rather than a
free good.

Design: `docs/superpowers/specs/2026-08-14-ability-expansion-design.md`

## 3A — Framework

- one ability weight table replacing per-ability constants
- BLOODBATH phase; FINAL FIVE becomes FINAL FOUR
- phase thresholds scale to the starting roster
- per-session Fate pool: 5 mandatory + 4 of 8 optional

## 3B — Pool

Removed: Close Call, Steal Shield, Bomb.
Renamed: Shield becomes Wall, through the code as well as the UI.
Added: Gale, Demolition, C4, Fate Swap, Purify.

## Deferred, not dropped

Bodyguard, Lucky Charm, Revenge and Bounty all need engine work this phase does
not do — an interceptor chain in `attackPlayer` for the first two, kill
attribution for the second two.

## Dropped

Double Kill (superseded by C4's blast), Jackpot (Purify covers the cleanse),
Ghost (breaks the alive-count invariant, and removes drama rather than adding
it).
```

- [ ] **Step 4: Update PROJECT_STATUS.md**

Set Current Phase to `Enh. Phase 3 — Ability Expansion (3a COMPLETE, 3b in progress)`, add a section summarising 3a, and record `SAVE_VERSION` 3.

- [ ] **Step 5: Verify the full gate**

Run: `npm run build && npm run lint && npx prettier --check . && npm run test:run`
Expected: all four clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Enhancement Phase 3a — session pool, five phases, one weight table"
```

**3a is shippable here.** Push and let the host play a game before starting 3b if there is any appetite for it.

---

# PART 3b — THE POOL

### Task 6: Shield becomes Wall

Mechanical rename, no behaviour change. 155 occurrences across 30 files.

**Files:** `src/game/types/player.ts`, `src/game/events/eventTypes.ts`, `src/game/events/eventResolver.ts`, `src/game/engine/attack.ts`, `src/game/engine/gameEngine.ts`, `src/game/abilities/*.ts`, `src/game/statuses/*.ts`, `src/game/narration/situation.ts`, `src/game/events/eventLog.ts`, `src/components/StatusPanel/StatusPanel.tsx`, `src/components/MainWheel/MainWheel.tsx`, `src/effects/effectRegistry.ts`, `src/audio/soundRegistry.ts`, `src/audio/audioManager.ts`, `src/game/engine/gameEngine.test.ts`

- [ ] **Step 1: Rename the state field**

`src/game/types/player.ts` — replace the `shield` field:

```ts
  /** Walls block one hit, then break. Range is 0 or 1 (PROJECT_SPEC.md §11.2). */
  wall: number;
```

- [ ] **Step 2: Rename the events**

`src/game/events/eventTypes.ts` — three renames:

```ts
  | { type: 'WALL_BLOCK'; playerId: string }
  | { type: 'ADD_WALL'; playerId: string }
  // Distinct from WALL_BLOCK: the Wall is taken or destroyed, not spent
  // absorbing a hit.
  | { type: 'REMOVE_WALL'; playerId: string }
```

- [ ] **Step 3: Follow the type errors**

Run: `npm run build`

Work through every error. The compiler finds all of them — this is why the rename goes through the types first. Renames to apply consistently:

| Old | New |
|---|---|
| `Player.shield` | `Player.wall` |
| `ADD_SHIELD` / `REMOVE_SHIELD` / `SHIELD_BLOCK` | `ADD_WALL` / `REMOVE_WALL` / `WALL_BLOCK` |
| `MAX_SHIELD` | `MAX_WALL` |
| `shieldAbility` | `wallAbility` |
| ability id `'shield'` | `'wall'` |
| icon `🛡` | `🧱` |
| user-facing "Shield" | "Wall" |

Rename the file with `git mv src/game/abilities/shield.ts src/game/abilities/wall.ts`, and update its registry line in `abilities/index.ts`, its key in `abilityWeights.ts`, and its key in `defaultConfig.ts`.

- [ ] **Step 4: Update the rim colour**

`src/components/MainWheel/MainWheel.tsx` — rename `SHIELD_COLOR` to `WALL_COLOR`, change its value to a stone tone (`#9aa3ad`), and update the marker line:

```ts
        if (player.wall > 0) markers.push({ color: WALL_COLOR, icon: '🧱' });
```

- [ ] **Step 5: Run everything**

Run: `npm run build && npm run lint && npm run test:run`
Expected: all pass, with the same test count as before this task. A changed count means the rename dropped or duplicated a test.

Run: `npx rg -n "shield|Shield|SHIELD" src/`
Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: rename Shield to Wall throughout

A wall blowing over onto the person behind it explains Gale without
anyone having to reason about metal. Renamed in the code as well as the
UI so the codebase and the screen say the same word."
```

---

### Task 7: Remove Close Call and Steal Shield

**Files:**
- Delete: `src/game/abilities/closeCall.ts`, `src/game/abilities/stealShield.ts`
- Modify: `src/game/abilities/index.ts`, `src/game/config/abilityWeights.ts`, `src/game/config/defaultConfig.ts`, `src/game/engine/gameEngine.test.ts`

- [ ] **Step 1: Delete the files**

```bash
git rm src/game/abilities/closeCall.ts src/game/abilities/stealShield.ts
```

- [ ] **Step 2: Unregister them**

In `src/game/abilities/index.ts`, remove `closeCallAbility` and `stealShieldAbility` from both the import block and the `ABILITIES` array.

In `src/game/config/abilityWeights.ts`, delete the `close_call` and `steal_shield` entries.

In `src/game/config/defaultConfig.ts`, delete the `close_call` and `steal_shield` entries.

- [ ] **Step 3: Remove their tests**

In `src/game/engine/gameEngine.test.ts`, delete any `describe` block for Close Call or Steal Shield.

- [ ] **Step 4: Verify**

Run: `npm run build && npm run test:run`
Expected: pass.

Run: `npx rg -n "close_call|closeCall|steal_shield|stealShield" src/`
Expected: no matches.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: remove Close Call and Steal Shield

Close Call emits ADD_DEATH_MARK when unwalled — it is Death Mark with an
extra sentence, and it was the only half of the 'Double Fate can waste
half a roll' collision. Steal Shield is superseded by Fate Swap, which
moves marks and fuses as well."
```

---

### Task 8: `attackPlayer` can pierce a Wall

**Files:**
- Modify: `src/game/engine/attack.ts`
- Test: `src/game/engine/gameEngine.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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

  it('never touches an already-eliminated player', () => {
    let state = startGame(['A', 'B', 'C']);
    state = withStatus(state, 'A', { status: 'eliminated' });

    expect(attackPlayer(state, idOf(state, 'A'), 'gale', { pierce: true })).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run`
Expected: FAIL — `attackPlayer` takes three arguments.

- [ ] **Step 3: Add the option**

Replace the signature and body in `src/game/engine/attack.ts`:

```ts
export type AttackOptions = {
  /**
   * Ignore the target's Wall.
   *
   * Gale is the only user: the Wall is not failing to protect its owner, it is
   * the thing killing them, so letting it block would be incoherent. Kept as an
   * option on the shared flow rather than a second attack function, because
   * AGENTS.md §7.7 exists to stop elimination having two implementations.
   */
  pierce?: boolean;
};

export function attackPlayer(
  state: GameState,
  playerId: string,
  source: string,
  options: AttackOptions = {},
): GameEvent[] {
  const target = state.players.find((player) => player.id === playerId);
  if (!target || target.status !== 'alive') return [];

  const events: GameEvent[] = [{ type: 'ATTACK_PLAYER', playerId, source }];

  if (target.wall > 0 && !options.pierce) {
    events.push({ type: 'WALL_BLOCK', playerId });
  } else {
    events.push({ type: 'ELIMINATE_PLAYER', playerId });
  }

  return events;
}
```

- [ ] **Step 4: Run the suite**

Run: `npm run test:run`
Expected: PASS. Existing callers pass three arguments and default to non-piercing, so nothing else changes.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: attackPlayer can pierce a Wall"
```

---

### Task 9: Gale

**Files:**
- Create: `src/game/abilities/gale.ts`
- Modify: `src/game/abilities/index.ts`, `src/game/config/abilityWeights.ts`, `src/game/config/defaultConfig.ts`
- Test: `src/game/engine/gameEngine.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
describe('Gale', () => {
  const roster = ['A', 'B', 'C', 'D', 'E'];

  function twoWalls(): GameState {
    let state = withStatus(startGame(roster), 'A', { wall: 1 });
    state = withStatus(state, 'B', { wall: 1 });
    return { ...state, sessionAbilityIds: [...state.sessionAbilityIds, 'gale'] };
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
    const gale = getAbility('gale');
    if (!gale) throw new Error('gale missing');

    const events = gale.resolve(buildGameContext(state), idOf(state, 'C'));
    const request = events.find((event) => event.type === 'REQUEST_PLAYER_SPIN');

    if (request?.type !== 'REQUEST_PLAYER_SPIN') throw new Error('no target spin requested');
    expect(request.excludePlayerIds ?? []).toEqual([]);
  });

  it('kills a walled target through its Wall', () => {
    const state = twoWalls();
    const gale = getAbility('gale');
    if (!gale?.resolveTargetSpin) throw new Error('gale missing');

    const types = gale
      .resolveTargetSpin(buildGameContext(state), idOf(state, 'C'), idOf(state, 'A'))
      .map((event) => event.type);

    expect(types).toContain('ELIMINATE_PLAYER');
    expect(types).not.toContain('WALL_BLOCK');
  });

  it('spares an unwalled target', () => {
    const state = twoWalls();
    const gale = getAbility('gale');
    if (!gale?.resolveTargetSpin) throw new Error('gale missing');

    const types = gale
      .resolveTargetSpin(buildGameContext(state), idOf(state, 'A'), idOf(state, 'C'))
      .map((event) => event.type);

    expect(types).not.toContain('ELIMINATE_PLAYER');
    expect(types).toContain('SHOW_MESSAGE');
  });

  it('can catch the player who called it', () => {
    const state = twoWalls();
    const gale = getAbility('gale');
    if (!gale?.resolveTargetSpin) throw new Error('gale missing');

    const types = gale
      .resolveTargetSpin(buildGameContext(state), idOf(state, 'A'), idOf(state, 'A'))
      .map((event) => event.type);

    expect(types).toContain('ELIMINATE_PLAYER');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run`
Expected: FAIL — `getAbility('gale')` returns null.

- [ ] **Step 3: Write the ability**

Create `src/game/abilities/gale.ts`:

```ts
/**
 * 💨 Gale
 *
 * The wind picks a spot. Whoever is standing there dies IF they are behind a
 * Wall — it comes down on top of them. Anyone caught in the open is untouched.
 *
 * Guardrail checklist (DEVELOPMENT_ROADMAP.md §8, Guardrail 6):
 *
 *   eligibility   at least two living players hold a Wall
 *   weight        config/abilityWeights.ts
 *   target rules  a spin across EVERY living player, excluding nobody
 *   resolution    walled -> piercing attack; unwalled -> nothing
 *   Wall          inverted: the Wall is the cause of death, not a defence
 *   phases        all five, rising as the game gets smaller
 *   edge cases    a miss is narrated rather than silent
 *
 * WHY IT CAN HIT THE PLAYER WHO ROLLED IT
 *
 * Hunter and Duel exclude the initiator because hunting yourself is incoherent
 * and a duel needs two people. A gale catching the person who called it is
 * perfectly coherent, and it is the best outcome the game can produce: a walled
 * player who rolls this is in immediate danger from their own Fate.
 *
 * WHY IT IS ALLOWED TO MISS
 *
 * Most spins hit open ground and nothing happens, which looks like the dead air
 * Wave 1 was built to remove. It is not the same thing. Safe put nothing at
 * risk; here every walled player is publicly at risk for the length of a spin,
 * and the miss is the release. The whiff rate is measured rather than assumed —
 * if it is too high the answer is a lower weight, not a different mechanic.
 */

import type { AbilityDefinition } from '../types/ability';
import type { GameEvent } from '../events/eventTypes';
import type { Player } from '../types/player';
import { attackPlayer } from '../engine/attack';

/** Below this, a spin has one lonely candidate and no tension. */
const MIN_WALLS = 2;

function walledPlayers(players: readonly Player[]): Player[] {
  return players.filter((player) => player.status === 'alive' && player.wall > 0);
}

export const galeAbility: AbilityDefinition = {
  id: 'gale',
  name: 'Gale',
  icon: '💨',
  category: 'attack',

  isAvailable: (context) => walledPlayers(context.state.players).length >= MIN_WALLS,

  resolve: (): GameEvent[] => [
    { type: 'SHOW_MESSAGE', message: '💨 A GALE rips across the board' },
    // Nobody is excluded: the wind does not care who called it.
    { type: 'REQUEST_PLAYER_SPIN', purpose: 'gale', excludePlayerIds: [] },
  ],

  resolveTargetSpin: (context, _selectedPlayerId, targetPlayerId): GameEvent[] => {
    const target = context.state.players.find((player) => player.id === targetPlayerId);
    if (!target) return [];

    if (target.wall <= 0) {
      return [
        {
          type: 'SHOW_MESSAGE',
          message: `💨 The gust passes over ${target.name} — nothing to catch`,
        },
      ];
    }

    return [
      { type: 'SHOW_MESSAGE', message: `🧱 ${target.name}'s Wall comes down on top of them` },
      // Pierce: the Wall is what kills them, so it cannot also block.
      ...attackPlayer(context.state, targetPlayerId, 'gale', { pierce: true }),
    ];
  },

  // Names who is at risk without naming who is hit — the spin has not happened.
  describeStakes: (context) => {
    const walled = walledPlayers(context.state.players);
    if (walled.length === 0) return null;

    return `💨 The wind is coming. ${walled.length} still standing behind a 🧱 Wall.`;
  },
};
```

- [ ] **Step 4: Register it**

`src/game/abilities/index.ts` — import `galeAbility` and add it to `ABILITIES`.

`src/game/config/abilityWeights.ts` — add:

```ts
  gale: { chaos: 6, danger: 8, bloodbath: 10, final_four: 10, sudden_death: 12 },
```

`src/game/config/defaultConfig.ts` — add `gale: { enabled: true, weights: {} },`.

- [ ] **Step 5: Confirm Double Fate already excludes it**

Read the `setDoubleFatePoolProvider` call in `src/game/abilities/index.ts`. It filters out anything with `resolveTargetSpin`, so Gale is excluded with no change. Confirm this by reading rather than assuming — if the filter has changed, restore it.

- [ ] **Step 6: Run the suite**

Run: `npm run test:run`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: Gale — the wind drops a Wall on whoever is behind it"
```

---

### Task 10: Demolition

**Files:**
- Create: `src/game/abilities/demolition.ts`
- Modify: `src/game/abilities/index.ts`, `src/game/config/abilityWeights.ts`, `src/game/config/defaultConfig.ts`
- Test: `src/game/engine/gameEngine.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run`
Expected: FAIL — no `demolition` ability.

- [ ] **Step 3: Write the ability**

Create `src/game/abilities/demolition.ts`:

```ts
/**
 * 🔨 Demolition
 *
 * Every Wall on the board comes down. Nobody is hurt.
 *
 * Guardrail checklist (DEVELOPMENT_ROADMAP.md §8, Guardrail 6):
 *
 *   eligibility   at least one living player holds a Wall
 *   weight        config/abilityWeights.ts
 *   target rules  none — global
 *   resolution    REMOVE_WALL for every walled living player
 *   Wall          it is the target
 *   phases        all five, steady
 *   edge cases    gated so it can never be a no-op
 *
 * The merciful opposite of Gale: same subject, walls coming down, but on
 * purpose and not on top of anyone. Together they make holding a Wall a real
 * decision rather than a free good — one Fate takes it, another kills you for
 * having it.
 *
 * Available from a single Wall. There is no beneficiary, so unlike a theft it
 * still changes the board when only one is standing.
 */

import type { AbilityDefinition } from '../types/ability';
import type { GameEvent } from '../events/eventTypes';
import type { Player } from '../types/player';

function walledPlayers(players: readonly Player[]): Player[] {
  return players.filter((player) => player.status === 'alive' && player.wall > 0);
}

export const demolitionAbility: AbilityDefinition = {
  id: 'demolition',
  name: 'Demolition',
  icon: '🔨',
  category: 'chaos',

  isAvailable: (context) => walledPlayers(context.state.players).length > 0,

  resolve: (context): GameEvent[] => {
    const walled = walledPlayers(context.state.players);

    return [
      {
        type: 'SHOW_MESSAGE',
        message:
          walled.length === 1
            ? `🔨 DEMOLITION — ${walled[0].name}'s Wall comes down`
            : `🔨 DEMOLITION — all ${walled.length} Walls come down`,
      },
      ...walled.map((player): GameEvent => ({ type: 'REMOVE_WALL', playerId: player.id })),
    ];
  },

  describeStakes: (context) => {
    const walled = walledPlayers(context.state.players);
    if (walled.length === 0) return null;

    return walled.length === 1
      ? `${walled[0].name} loses their 🧱 Wall.`
      : `Every 🧱 Wall on the board falls — ${walled.length} of them.`;
  },
};
```

- [ ] **Step 4: Register it**

`abilities/index.ts` — import and add to `ABILITIES`.

`abilityWeights.ts` — add:

```ts
  demolition: { chaos: 6, danger: 7, bloodbath: 8, final_four: 6, sudden_death: 6 },
```

`defaultConfig.ts` — add `demolition: { enabled: true, weights: {} },`.

- [ ] **Step 5: Run the suite**

Run: `npm run test:run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Demolition — every Wall comes down, nobody is hurt"
```

---

### Task 11: Wheel neighbours

**Files:**
- Modify: `src/game/engine/selectors.ts`
- Test: `src/game/engine/gameEngine.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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

  it('skips eliminated players', () => {
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
```

Add `getWheelNeighbours` to the existing `selectors` import in the test file.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run`
Expected: FAIL — `getWheelNeighbours` is not exported.

- [ ] **Step 3: Add the selector**

Append to `src/game/engine/selectors.ts`:

```ts
/**
 * The living players either side of one player on the Main Wheel.
 *
 * Adjacency is over the ALIVE roster, wrapping at the ends, because that is
 * what the wheel actually draws — eliminated players are not on it. C4's blast
 * therefore takes the two slices either side of the one that just lit up, which
 * explains itself on screen with no commentary. A fixed seat order would be
 * stable but invisible, and an audience cannot follow a rule it cannot see.
 *
 * Deduplicated, and never includes the player themselves. At two alive both
 * sides are the same person, and at one alive there is nobody — returning a
 * unique set means callers can attack every entry without hitting anyone twice.
 */
export function getWheelNeighbours(state: GameState, playerId: string): Player[] {
  const alive = getAlivePlayers(state);
  const index = alive.findIndex((player) => player.id === playerId);
  if (index === -1) return [];

  const byId = new Map<string, Player>();
  const left = alive[(index - 1 + alive.length) % alive.length];
  const right = alive[(index + 1) % alive.length];

  for (const neighbour of [left, right]) {
    if (neighbour.id !== playerId) byId.set(neighbour.id, neighbour);
  }

  return [...byId.values()];
}
```

- [ ] **Step 4: Run the suite**

Run: `npm run test:run`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: wheel-adjacency selector for blast radius"
```

---

### Task 12: C4 replaces Bomb

The largest task. Bomb's two files are the template; the differences are that C4 stays put, can be defused by being selected, and takes its neighbours with it.

**Files:**
- Delete: `src/game/abilities/bomb.ts`, `src/game/statuses/bombTrigger.ts`
- Create: `src/game/abilities/c4.ts`, `src/game/statuses/c4Trigger.ts`
- Modify: `src/game/types/player.ts`, `src/game/events/eventTypes.ts`, `src/game/events/eventResolver.ts`, `src/game/statuses/statusTriggers.ts`, `src/game/abilities/index.ts`, `src/game/config/abilityWeights.ts`, `src/game/config/defaultConfig.ts`, `src/components/MainWheel/MainWheel.tsx`, `src/components/StatusPanel/StatusPanel.tsx`
- Test: `src/game/engine/gameEngine.test.ts`

- [ ] **Step 1: Write the failing tests**

Replace the whole existing `describe('Bomb', …)` block with:

```ts
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

    // Roster order is A B C D E F G, so B's neighbours are A and C.
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

    let small = startGame(['A', 'B', 'C', 'D']);
    small = { ...small, sessionAbilityIds: [...small.sessionAbilityIds, 'c4'] };
    expect(getAvailableAbilities(small).map((a) => a.id)).not.toContain('c4');
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
```

Update the test file's imports: replace `import { BOMB_FUSE, getBombHolder } from '../statuses/bombTrigger';` with

```ts
import { C4_FUSE, c4Trigger } from '../statuses/c4Trigger';
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:run`
Expected: FAIL — no `c4Trigger` module.

- [ ] **Step 3: Rename the player field**

In `src/game/types/player.ts`, replace `bombFuse`:

```ts
  /**
   * Rounds left on the C4 charge planted on this player (PROJECT_SPEC.md §12).
   *
   * Absent means no charge. At most one exists at a time, which `SET_C4`
   * enforces by clearing every other holder as it lands — so storing it per
   * player is a convenience for rendering, not a licence for two live charges.
   */
  c4Fuse?: number;
```

- [ ] **Step 4: Rename the events**

In `src/game/events/eventTypes.ts`, replace the two bomb events:

```ts
  // Plants the charge on playerId, clearing it from anyone who held it before.
  // One event for planting keeps "only one C4 exists" structural rather than a
  // rule to remember.
  | { type: 'SET_C4'; playerId: string; fuse: number }
  | { type: 'CLEAR_C4' }
```

- [ ] **Step 5: Update the event resolver**

In `src/game/events/eventResolver.ts`, rename the `SET_BOMB` / `CLEAR_BOMB` cases to `SET_C4` / `CLEAR_C4` and the field they write from `bombFuse` to `c4Fuse`. Keep the deliberate rule in `ELIMINATE_PLAYER` and update its comment:

```ts
              // NOTE: `c4Fuse` is deliberately NOT cleared here. The charge does
              // die with its holder, and dying to something else is a fair way
              // to take it out of play — but clearing it here would delete the
              // countdown with nothing said. The trigger clears it on the next
              // selection, with a line explaining it.
```

- [ ] **Step 6: Write the trigger**

Create `src/game/statuses/c4Trigger.ts`:

```ts
/**
 * 🧨 C4 — the charge that sits still.
 *
 * Lifecycle (AGENTS.md §7.8):
 *
 *   acquired    the C4 Fate plants it on the selected player
 *   displayed   🧨 badge carrying the fuse, plus an orange rim on the wheel
 *   triggers    every Main Wheel selection while it is live
 *   removed     on defusal, on detonation, and on its holder's death to
 *               anything else (announced on the next selection)
 *   Wall        yes — a Wall saves the holder and each neighbour, and breaks
 *   Revive      revival returns a player clean, charge included
 *   Fate Swap   yes, the fuse moves with everything else
 *   persists    across rounds until it is defused or goes off
 *
 * WHY IT SITS STILL WHERE THE BOMB PASSED
 *
 * Wave 2 argued that a stationary countdown is a slower Death Mark: the holder
 * can do nothing and nobody else has a stake. Passing the bomb fixed that. C4
 * fixes it a different way, and better:
 *
 *   the NEIGHBOURS have a stake   they can see what they are standing next to
 *   the HOLDER has a stake        being selected is the only way out
 *
 * That second one inverts the whole game for one player. Every other round the
 * wheel landing on you is dread. For the person holding this it is rescue —
 * and that beat exists nowhere else.
 *
 * WHY IT TICKS ON SELECTION RATHER THAN AT ROUND END
 *
 * There is exactly one Main Wheel selection per round, so the cadence is the
 * same either way. Ticking on selection keeps the countdown inside the trigger
 * registry, where every other status lives, instead of adding a special case to
 * the reducer.
 */

import type { GameEvent } from '../events/eventTypes';
import type { Player } from '../types/player';
import type { StatusTrigger } from './statusTriggers';
import { attackPlayer } from '../engine/attack';
import { getWheelNeighbours } from '../engine/selectors';

/**
 * Rounds from planting to detonation.
 *
 * Being selected is the only escape, so the fuse length IS the escape
 * probability. At twelve alive a 3-round fuse gives a 23% chance of ever being
 * picked, meaning three quarters of all charges take three people. Five brings
 * that to about 35% and leaves the countdown long enough to be felt.
 */
export const C4_FUSE = 5;

/** The living player carrying a live charge, if anyone is. */
export function getC4Holder(players: readonly Player[]): Player | null {
  return players.find((player) => player.status === 'alive' && player.c4Fuse !== undefined) ?? null;
}

/**
 * A charge left on someone already eliminated by something else.
 *
 * Bomb measured this at roughly half of all cases. C4 should see far fewer,
 * because it does not move onto whoever is about to receive a Fate — but it
 * still happens, and a countdown that stops with nothing said is
 * indistinguishable from a bug.
 */
export function getAbandonedC4(players: readonly Player[]): Player | null {
  return players.find((player) => player.status !== 'alive' && player.c4Fuse !== undefined) ?? null;
}

export const c4Trigger: StatusTrigger = {
  id: 'c4',

  isTriggered: (_player, context) =>
    getC4Holder(context.state.players) !== null || getAbandonedC4(context.state.players) !== null,

  // Two outcomes own their round: the defusal and the blast. A tick that merely
  // counts down does not, or a live fuse would cost the game its Fate for five
  // consecutive rounds.
  replacesFate: (player, context) => {
    const holder = getC4Holder(context.state.players);
    if (!holder) return false;
    if (holder.id === player.id) return true;
    return (holder.c4Fuse ?? 0) <= 1;
  },

  resolve: (context, playerId): GameEvent[] => {
    const abandoned = getAbandonedC4(context.state.players);
    if (abandoned) {
      return [
        { type: 'CLEAR_C4' },
        {
          type: 'SHOW_MESSAGE',
          message: `🧨 The charge went up with ${abandoned.name} — the countdown is over`,
        },
      ];
    }

    const holder = getC4Holder(context.state.players);
    if (!holder) return [];

    // The wheel picked the person carrying it. For once, that is good news.
    if (holder.id === playerId) {
      return [
        { type: 'SHOW_MESSAGE', message: `🧨 DEFUSED — the wheel found ${holder.name} in time` },
        { type: 'CLEAR_C4' },
      ];
    }

    const next = (holder.c4Fuse ?? 0) - 1;
    if (next > 0) {
      return [{ type: 'SET_C4', playerId: holder.id, fuse: next }];
    }

    // Deduplicated by the selector, so nobody takes two hits from one blast.
    const caught = [holder, ...getWheelNeighbours(context.state, holder.id)];

    return [
      { type: 'SET_C4', playerId: holder.id, fuse: 0 },
      { type: 'SHOW_MESSAGE', message: `🧨 TIME UP — ${holder.name} and everyone beside them` },
      { type: 'WAIT_FOR_HOST' },
      // Cleared before the blast, so the charge is spent even when a Wall
      // absorbs it. Same rule as the Death Mark.
      { type: 'CLEAR_C4' },
      ...caught.flatMap((victim) => attackPlayer(context.state, victim.id, 'c4')),
    ];
  },
};
```

- [ ] **Step 7: Write the ability**

Create `src/game/abilities/c4.ts`:

```ts
/**
 * 🧨 C4
 *
 * Plants a charge on the selected player. The countdown, the defusal and the
 * blast all live in `statuses/c4Trigger.ts`; this only starts it.
 *
 * Guardrail checklist (DEVELOPMENT_ROADMAP.md §8, Guardrail 6):
 *
 *   eligibility   no charge already live, and at least MIN_ALIVE players
 *   weight        config/abilityWeights.ts — zero in the endgame phases
 *   target rules  the selected player, always
 *   resolution    SET_C4 at a full fuse
 *   Wall          handled at detonation, by the shared attack flow
 *   phases        Chaos through Bloodbath only
 *   edge cases    one charge at a time, enforced by SET_C4 itself
 *
 * Emits no message: SET_C4 narrates the plant, and a Fate that also announced
 * it would print the same fact twice. That duplication has now appeared three
 * times — Hunter's bounty, Bomb's hand-off, and here.
 */

import type { AbilityDefinition } from '../types/ability';
import type { GameEvent } from '../events/eventTypes';
import { C4_FUSE, getC4Holder } from '../statuses/c4Trigger';

/**
 * A blast takes up to three people. Below this the charge alone could end the
 * game, which is a worse ending than any wheel can produce.
 */
const MIN_ALIVE = 6;

export const c4Ability: AbilityDefinition = {
  id: 'c4',
  name: 'C4',
  icon: '🧨',
  category: 'attack',

  isAvailable: (context) =>
    context.alivePlayers.length >= MIN_ALIVE && getC4Holder(context.state.players) === null,

  resolve: (_context, selectedPlayerId): GameEvent[] => [
    { type: 'SET_C4', playerId: selectedPlayerId, fuse: C4_FUSE },
  ],

  describeStakes: (context, selectedPlayerId) => {
    const player = context.state.players.find((candidate) => candidate.id === selectedPlayerId);
    if (!player) return null;

    return `🧨 ${C4_FUSE} rounds on ${player.name}. Only the wheel can call it off.`;
  },
};
```

- [ ] **Step 8: Swap the registrations**

`src/game/statuses/statusTriggers.ts` — replace the import and the registry line:

```ts
import { c4Trigger } from './c4Trigger';

export const SELECTION_TRIGGERS: readonly StatusTrigger[] = [deathMarkTrigger, c4Trigger];
```

`src/game/abilities/index.ts` — replace `bombAbility` with `c4Ability` in the import block and in `ABILITIES`.

`abilityWeights.ts` — replace the `bomb` entry with:

```ts
  c4: { chaos: 8, danger: 10, bloodbath: 10, final_four: 0, sudden_death: 0 },
```

`defaultConfig.ts` — replace the `bomb` entry with `c4: { enabled: true, weights: {} },`.

- [ ] **Step 9: Update the presentation**

`src/components/MainWheel/MainWheel.tsx` — rename `BOMB_COLOR` to `C4_COLOR` (keep the orange value) and change the marker line:

```ts
        if (player.c4Fuse !== undefined) markers.push({ color: C4_COLOR, icon: '🧨' });
```

`src/components/StatusPanel/StatusPanel.tsx` — change the badge to read `c4Fuse` and render 🧨 with the number, and update the `aria-label` from "Bomb, N rounds left" to "C4, N rounds left".

- [ ] **Step 10: Delete the bomb**

```bash
git rm src/game/abilities/bomb.ts src/game/statuses/bombTrigger.ts
```

- [ ] **Step 11: Verify**

Run: `npm run build && npm run lint && npm run test:run`
Expected: all pass.

Run: `npx rg -in "bomb" src/`
Expected: no matches.

- [ ] **Step 12: Commit**

```bash
git add -A
git commit -m "feat: C4 replaces Bomb

The charge stays put and takes its neighbours with it. Being selected
defuses it, which inverts the wheel for one player: every other round
being picked is dread, and for the holder it is rescue.

Fixes Bomb's measured flaw as a side effect — half of all bombs died
silently with their holder, patched after the fact with an announcement.
A C4 can only end by being defused or going off."
```

---

### Task 13: Fate Swap

**Files:**
- Create: `src/game/abilities/fateSwap.ts`
- Modify: `src/game/events/eventTypes.ts`, `src/game/events/eventResolver.ts`, `src/game/abilities/index.ts`, `src/game/config/abilityWeights.ts`, `src/game/config/defaultConfig.ts`
- Test: `src/game/engine/gameEngine.test.ts`

- [ ] **Step 1: Add a test helper**

Add next to the other helpers at the top of `src/game/engine/gameEngine.test.ts`:

```ts
/** Apply events straight to state, bypassing the queue. */
function applyEvents(state: GameState, events: GameEvent[]): GameState {
  return events.reduce(applyGameEvent, state);
}
```

with imports:

```ts
import type { GameEvent } from '../events/eventTypes';
import { applyGameEvent } from '../events/eventResolver';
```

- [ ] **Step 2: Write the failing test**

```ts
describe('Fate Swap', () => {
  it('exchanges every status between the two players', () => {
    let state = startGame(['A', 'B', 'C', 'D']);
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
    let state = startGame(['A', 'B', 'C', 'D']);
    state = withStatus(state, 'B', { c4Fuse: 3 });

    const swapped = applyEvents(state, [
      { type: 'SWAP_STATUSES', playerId: idOf(state, 'A'), otherPlayerId: idOf(state, 'B') },
    ]);

    const live = swapped.players.filter((player) => player.c4Fuse !== undefined);
    expect(live).toHaveLength(1);
    expect(live[0].name).toBe('A');
  });

  it('is unavailable when the board is completely clean', () => {
    let state = startGame(['A', 'B', 'C', 'D']);
    state = { ...state, sessionAbilityIds: [...state.sessionAbilityIds, 'fate_swap'] };
    expect(getAvailableAbilities(state).map((a) => a.id)).not.toContain('fate_swap');

    state = withStatus(state, 'A', { deathMark: true });
    expect(getAvailableAbilities(state).map((a) => a.id)).toContain('fate_swap');
  });

  it('prefers a partner whose statuses actually differ', () => {
    let state = startGame(['A', 'B', 'C', 'D']);
    state = withStatus(state, 'A', { wall: 1 });
    state = withStatus(state, 'B', { wall: 1 });
    state = withStatus(state, 'C', { wall: 1 });
    // Only D differs from A, so every draw must land on D.
    const swap = getAbility('fate_swap');
    if (!swap) throw new Error('fate_swap missing');

    for (let run = 0; run < 20; run += 1) {
      const event = swap
        .resolve(buildGameContext(state), idOf(state, 'A'))
        .find((candidate) => candidate.type === 'SWAP_STATUSES');

      if (event?.type !== 'SWAP_STATUSES') throw new Error('no swap emitted');
      expect(event.otherPlayerId).toBe(idOf(state, 'D'));
    }
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm run test:run`
Expected: FAIL — `SWAP_STATUSES` is not a known event type.

- [ ] **Step 4: Add the event**

In `src/game/events/eventTypes.ts`, add next to the other status events:

```ts
  // Exchanges every status between two players in ONE step. Built from
  // primitives instead, the sequence could trip the one-C4 invariant that
  // SET_C4 enforces by clearing other holders as it lands.
  | { type: 'SWAP_STATUSES'; playerId: string; otherPlayerId: string }
```

- [ ] **Step 5: Resolve it**

In `src/game/events/eventResolver.ts`, add a case:

```ts
    case 'SWAP_STATUSES': {
      const first = state.players.find((player) => player.id === event.playerId);
      const second = state.players.find((player) => player.id === event.otherPlayerId);
      if (!first || !second) return state;

      // Everything a status can be. Adding a new one means adding it here —
      // which is the point of doing this in a single event rather than a
      // sequence of primitives that could each be forgotten.
      const swap = (player: Player, from: Player): Player => ({
        ...player,
        wall: from.wall,
        deathMark: from.deathMark,
        c4Fuse: from.c4Fuse,
      });

      return {
        ...state,
        players: state.players.map((player) => {
          if (player.id === first.id) return swap(player, second);
          if (player.id === second.id) return swap(player, first);
          return player;
        }),
      };
    }
```

- [ ] **Step 6: Write the ability**

Create `src/game/abilities/fateSwap.ts`:

```ts
/**
 * 🔄 Fate Swap — PROJECT_SPEC.md §12
 *
 * Everything the selected player is carrying trades places with everything
 * another living player is carrying. Walls, marks and live charges all move.
 *
 * Guardrail checklist (DEVELOPMENT_ROADMAP.md §8, Guardrail 6):
 *
 *   eligibility   at least one status exists somewhere on the board
 *   weight        config/abilityWeights.ts
 *   target rules  a random living player who is not the selected one
 *   resolution    a single SWAP_STATUSES event
 *   Wall          moved, not spent
 *   phases        Chaos through Final Four
 *   edge cases    a swap of nothing is possible but rare, and is narrated
 *
 * Promoted from post-MVP, replacing Steal Shield. Both are two-player Fates —
 * the category playtesting showed produces every reaction — but this one is
 * valence-neutral, which is why it is also the honest home for moving a live
 * charge. "Steal the C4" as its own Fate would be a name that is sometimes a
 * gain and sometimes suicide.
 *
 * WHY THE PARTNER IS CHOSEN, NOT SPUN FOR
 *
 * The engine tracks one pending target spin at a time, and Hunter, Duel and
 * Gale already use it. A fourth would lengthen rounds and shrink what Double
 * Fate can pair.
 */

import type { AbilityDefinition } from '../types/ability';
import type { GameEvent } from '../events/eventTypes';
import type { Player } from '../types/player';
import { randomItem } from '../../utils/random';

function hasStatus(player: Player): boolean {
  return player.wall > 0 || player.deathMark || player.c4Fuse !== undefined;
}

function sameStatuses(a: Player, b: Player): boolean {
  return a.wall === b.wall && a.deathMark === b.deathMark && a.c4Fuse === b.c4Fuse;
}

/**
 * Living players other than the selected one, preferring those who would
 * actually change hands.
 *
 * Availability is board-level — the Fate is chosen before the player is known
 * in a dual spin — so it cannot guarantee the pair differs. Preferring a
 * partner who differs makes a swap of nothing rare rather than impossible.
 */
function partnersFor(players: readonly Player[], selectedId: string): Player[] {
  const others = players.filter((player) => player.status === 'alive' && player.id !== selectedId);
  const selected = players.find((player) => player.id === selectedId);
  if (!selected) return others;

  const different = others.filter((player) => !sameStatuses(player, selected));
  return different.length > 0 ? different : others;
}

export const fateSwapAbility: AbilityDefinition = {
  id: 'fate_swap',
  name: 'Fate Swap',
  icon: '🔄',
  category: 'chaos',

  isAvailable: (context) => context.alivePlayers.some(hasStatus),

  resolve: (context, selectedPlayerId): GameEvent[] => {
    const selected = context.state.players.find((player) => player.id === selectedPlayerId);
    const partner = randomItem(partnersFor(context.state.players, selectedPlayerId));

    if (!selected || !partner) {
      return [{ type: 'SHOW_MESSAGE', message: '🔄 Nobody to trade with.' }];
    }

    const message = sameStatuses(selected, partner)
      ? `🔄 ${selected.name} and ${partner.name} trade fates — and nothing changes`
      : `🔄 ${selected.name} and ${partner.name} trade fates`;

    return [
      { type: 'SHOW_MESSAGE', message },
      { type: 'SWAP_STATUSES', playerId: selectedPlayerId, otherPlayerId: partner.id },
    ];
  },

  // The partner is rolled at resolution, so it cannot be named here without
  // spoiling it. What the selected player is putting on the table is already
  // visible on the wheel, so saying that is safe.
  describeStakes: (context, selectedPlayerId) => {
    const selected = context.state.players.find((player) => player.id === selectedPlayerId);
    if (!selected) return null;

    const carried: string[] = [];
    if (selected.wall > 0) carried.push('🧱 Wall');
    if (selected.deathMark) carried.push('💀 Death Mark');
    if (selected.c4Fuse !== undefined) carried.push('🧨 C4');

    return carried.length === 0
      ? `${selected.name} has nothing to give — and takes whatever the other has.`
      : `${selected.name} gives up ${carried.join(' + ')} for whatever comes back.`;
  },
};
```

- [ ] **Step 7: Register it**

`abilities/index.ts` — import and add to `ABILITIES`.

`abilityWeights.ts` — add:

```ts
  fate_swap: { chaos: 8, danger: 7, bloodbath: 5, final_four: 4, sudden_death: 0 },
```

`defaultConfig.ts` — change `fate_swap` to `{ enabled: true, weights: {} }`.

- [ ] **Step 8: Run the suite**

Run: `npm run test:run`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: Fate Swap — statuses trade places between two players"
```

---

### Task 14: Purify

**Files:**
- Create: `src/game/abilities/purify.ts`
- Modify: `src/game/abilities/index.ts`, `src/game/config/abilityWeights.ts`, `src/game/config/defaultConfig.ts`
- Test: `src/game/engine/gameEngine.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
describe('Purify', () => {
  it('is unavailable with no Death Mark on the board', () => {
    let state = startGame(['A', 'B', 'C', 'D']);
    state = { ...state, sessionAbilityIds: [...state.sessionAbilityIds, 'purify'] };

    expect(getAvailableAbilities(state).map((a) => a.id)).not.toContain('purify');

    state = withStatus(state, 'C', { deathMark: true });
    expect(getAvailableAbilities(state).map((a) => a.id)).toContain('purify');
  });

  it('clears a mark from whoever is carrying it', () => {
    const state = withStatus(startGame(['A', 'B', 'C', 'D']), 'C', { deathMark: true });
    const after = playRound(state, 'A', 'purify');

    expect(playerOf(after, 'C').deathMark).toBe(false);
  });

  it('cleanses the selected player when they are the marked one', () => {
    const state = withStatus(startGame(['A', 'B', 'C', 'D']), 'A', { deathMark: true });
    const after = playRound(state, 'A', 'purify');

    expect(playerOf(after, 'A').deathMark).toBe(false);
  });

  it('cannot touch a live C4', () => {
    let state = withStatus(startGame(['A', 'B', 'C', 'D']), 'B', { c4Fuse: 3 });
    state = withStatus(state, 'C', { deathMark: true });

    const after = playRound(state, 'A', 'purify');

    expect(playerOf(after, 'B').c4Fuse).toBe(3);
    expect(playerOf(after, 'C').deathMark).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run`
Expected: FAIL — no `purify` ability.

- [ ] **Step 3: Write the ability**

Create `src/game/abilities/purify.ts`:

```ts
/**
 * ✨ Purify
 *
 * Lifts a Death Mark off whoever is carrying one.
 *
 * Guardrail checklist (DEVELOPMENT_ROADMAP.md §8, Guardrail 6):
 *
 *   eligibility   at least one living player is marked
 *   weight        config/abilityWeights.ts
 *   target rules  a random marked living player
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
 * board it always lands — and when the selected player IS the marked one, they
 * cleanse themselves, which is the best version of it.
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
```

- [ ] **Step 4: Register it**

`abilities/index.ts` — import and add to `ABILITIES`.

`abilityWeights.ts` — add:

```ts
  purify: { chaos: 7, danger: 6, bloodbath: 4, final_four: 3, sudden_death: 0 },
```

`defaultConfig.ts` — add `purify: { enabled: true, weights: {} },`.

- [ ] **Step 5: Run the suite**

Run: `npm run test:run`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: Purify — lifts a Death Mark off the board"
```

---

### Task 15: Final weights, measurement, and documentation

**Files:**
- Modify: `src/game/config/abilityWeights.ts`, `PROJECT_SPEC.md`, `PROJECT_STATUS.md`, `docs/superpowers/specs/2026-08-14-ability-expansion-design.md`
- Create: `src/game/engine/balance.test.ts`

- [ ] **Step 1: Confirm the final table**

`src/game/config/abilityWeights.ts` should now hold exactly thirteen entries and no others:

```ts
export const ABILITY_WEIGHTS: Record<string, PhaseWeights> = {
  // Mandatory — always in the pool.
  eliminate: { chaos: 18, danger: 24, bloodbath: 30, final_four: 34, sudden_death: 50 },
  wall: { chaos: 12, danger: 10, bloodbath: 8, final_four: 8, sudden_death: 12 },
  death_mark: { chaos: 10, danger: 12, bloodbath: 12, final_four: 8, sudden_death: 0 },
  hunter: { chaos: 14, danger: 15, bloodbath: 16, final_four: 18, sudden_death: 20 },
  duel: { chaos: 12, danger: 14, bloodbath: 15, final_four: 16, sudden_death: 0 },

  // Optional — four of these eight are drawn per session.
  safe: { chaos: 5, danger: 3, bloodbath: 2, final_four: 2, sudden_death: 0 },
  revive: { chaos: 6, danger: 4, bloodbath: 2, final_four: 0, sudden_death: 0 },
  double_fate: { chaos: 8, danger: 8, bloodbath: 7, final_four: 6, sudden_death: 0 },
  c4: { chaos: 8, danger: 10, bloodbath: 10, final_four: 0, sudden_death: 0 },
  demolition: { chaos: 6, danger: 7, bloodbath: 8, final_four: 6, sudden_death: 6 },
  gale: { chaos: 6, danger: 8, bloodbath: 10, final_four: 10, sudden_death: 12 },
  fate_swap: { chaos: 8, danger: 7, bloodbath: 5, final_four: 4, sudden_death: 0 },
  purify: { chaos: 7, danger: 6, bloodbath: 4, final_four: 3, sudden_death: 0 },
};
```

The Task 1 test asserts every registered ability has a weight for every phase, so a missing entry fails the suite rather than silently excluding a Fate.

- [ ] **Step 2: Write the measurement**

Create `src/game/engine/balance.test.ts`:

```ts
/**
 * Measurement, not assertion.
 *
 * Wave 1 and Wave 2 were both decided by numbers rather than opinion, and this
 * phase makes two claims that need the same treatment: that Gale's whiff rate
 * is tolerable, and that a 5-round C4 fuse is escapable often enough. The only
 * hard assertions here are the ones that would be bugs rather than balance —
 * every game must reach a valid end, and no fuse may go negative.
 */

import { describe, expect, it } from 'vitest';

import type { GameState } from '../types/game';
import { createInitialGameState } from './gameEngine';
import { gameReducer } from './reducer';
import { getAlivePlayers, canSpinPlayerWheel, selectRandomEligiblePlayer } from './selectors';
import { buildGameContext, selectWeightedAbility } from '../abilities';
import { selectionReplacesFate } from '../statuses/statusTriggers';

const GAMES = 200;
const PLAYERS = 12;

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
  let guard = 0;
  while (guard < 200) {
    guard += 1;
    if (next.pendingTargetSpin !== null) {
      const pool = getAlivePlayers(next).filter(
        (candidate) => !next.pendingTargetSpin?.excludePlayerIds.includes(candidate.id),
      );
      const target = pool[Math.floor(pool.length / 2)];
      if (!target) break;
      next = gameReducer(next, { type: 'START_TARGET_SPIN', playerId: target.id });
      next = gameReducer(next, { type: 'PLAYER_SPIN_COMPLETE' });
      continue;
    }
    if (next.eventQueue.length > 0) {
      next = gameReducer(next, { type: 'CONTINUE_EVENTS' });
      continue;
    }
    break;
  }

  if (next.screenState === 'winner') return next;
  return gameReducer(next, { type: 'NEXT_ROUND' });
}

describe('balance measurement', () => {
  it('reaches a valid end in every game, and reports the numbers', () => {
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
    }

    console.info(`games ${GAMES}  finished ${finished}  stuck ${stuck}`);

    expect(stuck).toBe(0);
    expect(negativeFuse).toBe(0);
    expect(finished).toBe(GAMES);
  });
});
```

- [ ] **Step 2b: Add the counters**

`state.history` already records every beat as `{ round, event }`, so the four metrics are derivable without instrumenting the engine. Add to `src/game/engine/balance.test.ts`, above the `describe`:

```ts
/**
 * Fates that put a SECOND player on the board.
 *
 * Wave 1 measured this at 37.1% and treated it as the number that mattered —
 * two-player Fates were where every reaction came from. Declared as data here
 * rather than inferred from the events, because "involves someone else" is a
 * property of the Fate's design, not of any one resolution.
 */
const TWO_PLAYER_FATES = new Set([
  'hunter',
  'duel',
  'gale',
  'fate_swap',
  'purify',
  'demolition',
]);

/** Fates that can resolve without changing the board at all. */
const CAN_BE_INERT = new Set(['safe', 'gale']);

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
 * A Gale "roll that changed nothing" is a spin with no matching attack, which
 * is why hits are counted from ATTACK_PLAYER rather than from eliminations —
 * a Wall cannot save anyone from a piercing hit, so an attack IS a death, and
 * counting eliminations would miss nothing but reads less obviously.
 */
function tally(state: GameState, into: Tally): void {
  let galeSpinsThisGame = 0;
  let galeHitsThisGame = 0;

  for (const { event } of state.history) {
    switch (event.type) {
      case 'ABILITY_SELECTED':
        into.rolls += 1;
        if (TWO_PLAYER_FATES.has(event.abilityId)) into.twoPlayerRolls += 1;
        if (event.abilityId === 'safe') into.inertRolls += 1;
        break;

      case 'REQUEST_PLAYER_SPIN':
        if (event.purpose === 'gale') galeSpinsThisGame += 1;
        break;

      case 'ATTACK_PLAYER':
        if (event.source === 'gale') galeHitsThisGame += 1;
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

  into.galeSpins += galeSpinsThisGame;
  into.galeHits += galeHitsThisGame;
  // Every Gale that found open ground changed nothing, exactly like a Safe.
  into.inertRolls += galeSpinsThisGame - galeHitsThisGame;
}
```

Import `C4_FUSE` in this file:

```ts
import { C4_FUSE } from '../statuses/c4Trigger';
```

Then, inside the existing `it(...)`, declare `const totals = emptyTally();` before the game loop, call `tally(state, totals);` once each game has ended, and replace the single `console.info` with:

```ts
    const pct = (part: number, whole: number): string =>
      whole === 0 ? 'n/a' : `${((part / whole) * 100).toFixed(1)}%`;

    console.info(`games ${GAMES}  finished ${finished}  stuck ${stuck}`);
    console.info(`rolls ${totals.rolls}`);
    console.info(`  changed nothing   ${pct(totals.inertRolls, totals.rolls)}  (Wave 1: 3.3%)`);
    console.info(`  second player     ${pct(totals.twoPlayerRolls, totals.rolls)}  (Wave 1: 37.1%)`);
    console.info(`gale spins ${totals.galeSpins}  hits ${totals.galeHits}`);
    console.info(`  whiff rate        ${pct(totals.galeSpins - totals.galeHits, totals.galeSpins)}`);
    console.info(`c4 planted ${totals.c4Planted}  detonated ${totals.c4Detonated}`);
    console.info(
      `  ended without blast ${pct(totals.c4Planted - totals.c4Detonated, totals.c4Planted)}`,
    );
    console.info(
      `  caught per blast    ${
        totals.c4Detonated === 0 ? 'n/a' : (totals.c4Caught / totals.c4Detonated).toFixed(2)
      }`,
    );
```

`CAN_BE_INERT` documents which Fates the inert count can come from; the counting itself is explicit above, so it is a reference rather than a lookup.

**"Ended without blast" merges defused with died-with-holder on purpose.** Splitting them would mean matching `CLEAR_C4` against the message that preceded it, and a metric that breaks when someone rewords a string is worse than a coarser one that cannot. If the split turns out to matter, give the trigger two distinct events rather than parsing prose.

- [ ] **Step 3: Record the numbers and decide on Gale**

Run: `npm run test:run`

Compare against the design doc's baselines:

| Metric | Baseline | Action if missed |
|---|---|---|
| Gale whiff rate | measured, not predicted | above ~85%, drop Gale's weight by a third |
| Rolls that change nothing | 3.3% (Wave 1) | above 8%, drop Gale's weight |
| Rolls involving a second player | 37.1% (Wave 1) | below 30%, raise Fate Swap |
| C4 defused vs detonated | ~35% defused at 12 alive | far below, raise `C4_FUSE` |
| Valid winner, no stuck states | 200/200 | anything else is a bug, not a balance question |

Apply any weight change, re-run, and record both the before and after numbers.

- [ ] **Step 4: Update PROJECT_SPEC.md**

1. **§11.2** — Shield becomes Wall; note that a Wall is also what Gale kills you with.
2. **§12** — replace Bomb with C4: plant, tick on selection, defuse by selection, blast radius of the two wheel-adjacent neighbours, and the dedupe rule.
3. **§14** — `Player.shield` → `Player.wall`, `bombFuse` → `c4Fuse`.
4. **§18** — the event vocabulary changes: `ADD_WALL`, `REMOVE_WALL`, `WALL_BLOCK`, `SET_C4`, `CLEAR_C4`, `SWAP_STATUSES`.
5. Add the four new Fates to the ability list with their eligibility and resolution rules; remove Close Call and Steal Shield.

- [ ] **Step 5: Update PROJECT_STATUS.md**

- Current Phase → `Enh. Phase 3 — Ability Expansion COMPLETE`
- A section covering 3a and 3b, with the measured numbers from Step 3
- Move "Double Fate can waste half a roll" out of Known Issues — removing Close Call closed it
- Add to Next Tasks: Gale's whiff rate and C4's fuse are both live questions only a real session answers; the eight-statuses-on-three-rims problem returns the moment Bodyguard or Lucky Charm is built
- Record `SAVE_VERSION` 3

- [ ] **Step 6: Correct the spec**

In `docs/superpowers/specs/2026-08-14-ability-expansion-design.md`, change "Ticks down at the end of each round" to "Ticks down on each Main Wheel selection", and add a sentence noting this is the same cadence and keeps the countdown inside the trigger registry.

- [ ] **Step 7: Full verification gate**

Run: `npm run build && npm run lint && npx prettier --check . && npm run test:run`
Expected: all four clean.

- [ ] **Step 8: Commit and push**

```bash
git add -A
git commit -m "feat: Enhancement Phase 3b — thirteen Fates, Walls, C4"
git push origin main
```

---

## Notes for whoever executes this

**Do not give the two wheels different durations.** Both are 7800ms and it is load-bearing — with an absolute `CRAWL_MS`, a shorter wheel gives its tail a larger share of the throw and far less time to shed speed into it. Unrelated to this phase, easy to break by accident.

**Run the tests after every task, not at the end.** The wall rename alone touches 30 files; a break found three tasks later is a bisect.

**If a browser harness is used for anything here, read the "Browser-harness pitfalls" section of `PROJECT_STATUS.md` first.** Query-string imports duplicate modules and defeat `setRandomSource`, which has already produced one confident but completely wrong result in this project.

**`playRound(state, name, abilityId)` bypasses the session pool deliberately.** It dispatches an ability id straight to the reducer, and the reducer does not re-check the draw. That is correct — the pool governs what the wheel may select, not what the engine can be told to resolve — and it is what lets a test exercise a Fate that was not drawn.
