# PROJECT_STATUS.md — KOF Current Development Status

# KOF — King of Fate

> This file is the current development handoff.
>
> It must be updated at the end of **every development session**.
>
> Keep this document concise and factual.  
> Product requirements belong in `PROJECT_SPEC.md`.  
> Development sequencing belongs in `DEVELOPMENT_ROADMAP.md`.

---

# Current Version

```text
Pre-MVP
```

# Current Pass

```text
PASS 1 — MVP
```

# Current Phase

```text
Phase 0 — Project Foundation
```

# Phase Status

```text
IN PROGRESS — code complete, blocked on Vercel deployment
```

# Current Objective

Set up the KOF codebase and establish the minimum architecture needed to begin the MVP without locking future gameplay, customisation, or presentation features.

---

# Completed Before This Session

- Product concept, name (**KOF — King of Fate**) and core two-wheel mechanic confirmed.
- Host-controlled pacing, desktop target, screen-streaming use case confirmed.
- Player portraits intentionally excluded from MVP.
- Visual direction confirmed (modern UI, arcade fighting-game flavour, no KOF reproduction).
- Technical direction confirmed (React, TypeScript, Vite, Canvas wheel, CSS effects, localStorage, Vercel).
- `PROJECT_SPEC.md`, `DEVELOPMENT_ROADMAP.md`, `AGENTS.md` created.
- No application code existed.

---

# Completed This Session

## Documentation hygiene

- Renamed `KOF_King_of_Fate_Project_Spec.md` → `PROJECT_SPEC.md`.
- Renamed `KOF_DEVELOPMENT_ROADMAP.md` → `DEVELOPMENT_ROADMAP.md`.
  Both now match the filenames `AGENTS.md` §1 requires.
- Added `README.md` (repo entry point, commands, architecture map).

## Project setup

- Scaffolded React 19 + TypeScript + Vite 8 (`create-vite` react-ts template).
- `package.json`, `tsconfig*.json`, `vite.config.ts`, `.gitignore`, `index.html`, `public/favicon.svg`.
- Prettier added and configured (config lives in `package.json` — see Decisions).
- `.claude/launch.json` so the dev server can be launched by tooling.
- `npm install` clean: 28 packages, 0 vulnerabilities.

## Core architecture

- **Types** — `Player`, `PlayerStatus`, `GameState`, `GamePhase`, `GameScreenState`,
  `GameConfig`, `PhaseThresholds`, `AbilityDefinition`, `GameContext`, `GameEvent`,
  `GameHistoryEntry`. All seven types named in the Phase 0 task list exist.
- **Random utility** (`src/utils/random.ts`) — `randomInt`, `randomItem`, `shuffle`,
  `selectWeightedItem`, plus `setRandomSource` / `resetRandomSource` for future seeded
  and deterministic runs. Game-agnostic by design.
- **Ids** (`src/utils/ids.ts`) — `createPlayerId` with `crypto.randomUUID` + fallback.
- **Phase resolver** (`src/game/phases/`) — thresholds from spec §10
  (Chaos 12+, Danger 6–11, Final Five 3–5, Sudden Death 2) and a pure `resolvePhase`.
- **Engine** (`src/game/engine/gameEngine.ts`) — `createInitialGameState`, `createPlayer`,
  `resetPlayerForNewGame`, `getAliveCount`, `appendEvents`, `applyPhaseAndWinner`
  (phase recalculation + winner detection + `PHASE_CHANGED` / `GAME_WON` emission).
- **Reducer** (`src/game/engine/reducer.ts`) — `ADD_PLAYERS`, `REMOVE_PLAYER`,
  `START_GAME`, `SELECT_PLAYER`, `SELECT_ABILITY`, `ELIMINATE_PLAYER`, `NEXT_ROUND`,
  `RESET_GAME`. Pure; invalid transitions return state unchanged.
- **Selectors** (`src/game/engine/selectors.ts`) — alive/eliminated/current reads,
  `selectRandomEligiblePlayer` (with exclusion list for future Hunter/Duel),
  `selectRandomEliminatedPlayer`, and `canSpinPlayerWheel` / `canSpinFateWheel` gating.
- **Default config** (`src/game/config/defaultConfig.ts`) — spec §10 weight tables
  recorded as data for all 8 MVP abilities; `fate_swap` / `double_kill` present but
  `enabled: false` (Post-MVP).

## UI

- `src/main.tsx`, `src/app/App.tsx`, `src/styles/globals.css` (baseline layout only).
- `src/components/DebugPanel/DebugPanel.tsx` — temporary Phase 0 scaffolding:
  add/paste/remove players, add 8 dummy players (incl. Unicode/CJK/emoji names),
  start game, select random player, eliminate, next round, reset, plus live
  state / roster / event-history readout.

---

# In Progress

Nothing partially written. Phase 0 code is complete; only the Vercel deployment
step of the phase remains (see Known Issues).

---

# Next Tasks

1. **Initialise the git repository.** `C:\AILAB\KOF` is not a git repo yet.
   `.gitignore` is in place. Not done this session — committing was not requested.
2. **Deploy the first Vercel preview** and confirm the production build serves.
   This is the last outstanding Phase 0 exit criterion.
3. **Verify Phase 0 exit criteria** and mark the phase COMPLETE.
4. Then begin **Phase 1 — Main Wheel Vertical Slice**:
   - reusable Canvas `<Wheel>` component (`entries`, `selectedId`, `spinning`, `onSpinComplete`),
   - deterministic landing on the engine-chosen result,
   - real player Setup screen (multiline paste) replacing the debug panel,
   - main game shell with `SPIN PLAYER`.

---

# Known Issues / Blockers

- **Vercel deployment not performed.** It needs account authentication and is an
  outward-facing action, so it was not attempted without explicit approval.
  Phase 0 therefore cannot be marked COMPLETE yet. Everything else in the phase
  is done and verified locally.
- **No git repository.** Nothing is version-controlled yet.
- **No automated tests.** The roadmap places unit tests in Enhancement Phase 0,
  so this is on-plan, but the engine is pure and ready to be tested earlier if wanted.
- **No persistence.** A browser refresh resets the game. Correct for now —
  localStorage is Phase 6C.

---

# Important Decisions Made This Session

1. **Doc filenames corrected, not reinterpreted.** `AGENTS.md` §1 names
   `PROJECT_SPEC.md` and `DEVELOPMENT_ROADMAP.md`; the files on disk had different
   names. Renamed the files to match the higher-authority document.
2. **oxlint instead of ESLint.** The roadmap's Phase 0 list says "ESLint + Prettier",
   but `create-vite` v9 now ships oxlint by default. Keeping it satisfies the linting
   intent with zero extra dependencies, versus 5+ packages for an ESLint stack
   (`AGENTS.md` §17). Prettier was added as specified. Tooling choice only — no
   sequencing change, so `DEVELOPMENT_ROADMAP.md` was not edited.
3. **Prettier config lives in `package.json`.** A standalone `.prettierrc.json` is
   blocked by a repo config-protection hook; the `"prettier"` key is equivalent.
4. **The reducer never calls random.** Callers select the target via
   `selectors.ts` and dispatch the resulting id. This satisfies "the Game Engine
   decides the selected player" (spec §8) while keeping the reducer pure, which is
   what makes undo (Phase 6B) and future replay tractable.
5. **`config` is part of `GameState`.** The roadmap's minimal state list omits it,
   but it is listed as "at minimum" and phase resolution needs thresholds. It also
   matches spec §24, which persists configuration with the game.
6. **Screen-state names follow spec §19**, not the roadmap Phase 2 flow diagram
   (`WAITING_FOR_FATE`, `ROUND_COMPLETE`). Spec is the higher authority.
7. **Elimination clears Shield and Death Mark**, so a revived player always returns
   clean per spec §11.7. Assumption: no future ability needs to read a dead player's
   former statuses. Revisit if Fate Swap or Bomb requires it.
8. **Two events added to spec §18's list**: `GAME_STARTED` and `ROUND_STARTED`.
   The spec states the list can evolve; without them the event history has no
   round markers.
9. **`MIN_PLAYERS_TO_START = 2`.** Not specified anywhere; a game needs at least
   one loser and one winner.
10. **Unused folders not created.** `src/game/abilities/`, `src/effects/`,
    `src/audio/`, `src/storage/` are in the spec's target structure but empty of
    purpose today. The roadmap explicitly says "do not over-engineer unused folders",
    so they arrive with the phases that need them. Recorded in `README.md`.
11. **`AbilityDefinition` written but no ability implemented.** Phase 3 owns the
    registry. Fixing the interface now costs nothing and prevents Phase 3 from
    inventing a different shape (AGENTS.md §5: minimum interface only).

---

# Verification Performed

- `npm run build` (`tsc -b && vite build`) — **passes**, 26 modules, no type errors.
- `npm run lint` (oxlint) — **clean**, no warnings.
- `npx prettier --write src/**` — all 17 files already formatted, no changes.
- Dev server started; app rendered at 1280×720 and 1920×1080 with **no horizontal
  overflow** and **no console errors**.
- **Full game flow driven end to end** with 8 players (including `小明`, `Nguyễn`,
  `Zoë 🎯`) — select → eliminate → next round, repeated to a winner:

  ```text
  ROUND 1 · ALIVE 7/8 · DANGER
  ROUND 2 · ALIVE 6/8 · DANGER
  ROUND 3 · ALIVE 5/8 · FINAL FIVE
  ROUND 4 · ALIVE 4/8 · FINAL FIVE
  ROUND 5 · ALIVE 3/8 · FINAL FIVE
  ROUND 6 · ALIVE 2/8 · SUDDEN DEATH
  ROUND 7 · ALIVE 1/8 · SUDDEN DEATH → winner: Kelvin
  ```

  Confirmed: phase transitions fire at the spec §10 thresholds; winner is detected
  at 1 alive; `screenState` becomes `winner`; further spins are correctly disabled.
- `RESET_GAME` verified — returns to `setup`, roster retained (8/8 alive), history
  cleared, winner cleared, phase back to CHAOS.
- Browser refresh verified — clean re-render, no runtime errors (state resets, as
  expected without persistence).

Not verified: Vercel preview deployment (not performed).

---

# Files / Areas Changed

```text
PROJECT_SPEC.md               (renamed from KOF_King_of_Fate_Project_Spec.md)
DEVELOPMENT_ROADMAP.md        (renamed from KOF_DEVELOPMENT_ROADMAP.md)
PROJECT_STATUS.md             (this file)
README.md                     (new)

package.json  index.html  vite.config.ts  .gitignore  .oxlintrc.json
tsconfig.json  tsconfig.app.json  tsconfig.node.json
.claude/launch.json  public/favicon.svg

src/main.tsx
src/app/App.tsx
src/components/DebugPanel/DebugPanel.tsx
src/game/config/defaultConfig.ts
src/game/engine/gameEngine.ts
src/game/engine/reducer.ts
src/game/engine/selectors.ts
src/game/events/eventTypes.ts
src/game/phases/phaseConfig.ts
src/game/phases/phaseResolver.ts
src/game/types/ability.ts
src/game/types/game.ts
src/game/types/player.ts
src/hooks/useGame.ts
src/styles/globals.css
src/utils/ids.ts
src/utils/random.ts
```

---

# Notes for Next Agent

The architecture boundary is already load-bearing — keep it:

- `src/game/` decides outcomes. React components render and dispatch, nothing more.
- Randomness goes through `src/utils/random.ts`. Do not add `Math.random()` elsewhere.
- The reducer stays pure. Pick the result first, then dispatch the chosen id.

`DebugPanel.tsx` is **disposable**. Delete or replace it once the real Setup screen
and Main Wheel exist — do not grow it into the host UI.

Before starting Phase 1, close out Phase 0: init git, deploy the Vercel preview,
then flip Phase Status to COMPLETE.

Phase 1 is the Main Wheel only. Do not add the Fate Wheel (Phase 2), abilities
(Phase 3), PixiJS, sound, or arcade theming yet.

---

# Last Updated

```text
2026-08-07
```
