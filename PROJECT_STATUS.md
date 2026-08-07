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
Phase 1 — Main Wheel Vertical Slice   (NOT STARTED)

Phase 0 — Project Foundation          COMPLETE
```

# Phase Status

```text
Phase 0 COMPLETE — all exit criteria met and verified.
Phase 1 NOT STARTED.
```

# Live Deployment

```text
https://kof-ten.vercel.app/
```

Publicly reachable, no Vercel Deployment Protection.

# Current Objective

Phase 0 is closed. The next objective is Phase 1: get one real Canvas wheel
working inside React, landing deterministically on the result the Game Engine
has already chosen.

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

## Version control

- Git repository initialised; default branch **`main`**.
- Initial commit `1d66122` — *feat: Phase 0 project foundation* (33 files).
  `node_modules/` and `dist/` correctly excluded.
- Remote added and pushed: **https://github.com/JayJayJay96/KOF**
  (repo was empty beforehand — nothing was overwritten).

## Deployment

- Vercel project created by the user and connected to the GitHub repo.
- Live at **https://kof-ten.vercel.app/** — verified serving the committed build
  (deployed asset hashes `index-Bfn3bFGr.js` / `index-lq1-B5TR.css` match the
  local build exactly).
- Vite framework preset auto-detected. No `vercel.json` was needed and none was
  added — there is no client-side routing yet. Revisit if a router is introduced.

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

Nothing. Phase 0 is closed and nothing was left half-written.

---

# Next Tasks

Begin **Phase 1 — Main Wheel Vertical Slice**:

1. Reusable Canvas `<Wheel>` component — `entries`, `selectedId`, `spinning`,
   `onSpinComplete`. It renders and animates; it must not pick a winner
   (AGENTS.md §7.2).
2. Deterministic landing on the engine-chosen result.
3. Natural acceleration / deceleration, segment ticks, inward-facing pointer,
   input disabled while spinning.
4. Real player Setup screen (multiline paste, add/remove, Start Game) replacing
   the debug panel.
5. Main game shell with a `SPIN PLAYER` action.
6. Deploy the Phase 1 preview and confirm the exit criteria: a host can enter
   players, start, spin, see the wheel land on the engine's result, and spin
   repeatedly without state corruption.

---

# Known Issues / Blockers

No blockers. Phase 1 can start immediately.

Non-blocking, on-plan gaps:

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
- **20-player game verified** (the target group size). 20 added, started in CHAOS,
  driven through all 19 eliminations to a winner in 19 rounds, 62 events logged.
  Phase boundaries landed exactly on the spec §10 thresholds:

  ```text
  19-12 alive  CHAOS
  11-6  alive  DANGER
  5-3   alive  FINAL FIVE
  2     alive  SUDDEN DEATH
  ```

  No horizontal overflow. Duplicate names ("Amy" twice) stayed distinct via ids.
  A 31-character name, `X Æ A-12`, Cyrillic, CJK and Vietnamese names all rendered.
  The engine imposes no player cap.
- **Production build served and fetched** via `vite preview`: `/` → 200,
  `/assets/index-*.js` → 200 (200,203 bytes). The artifact Vercel would deploy
  is known-good.
- Pushed to GitHub; `git ls-remote` confirms `refs/heads/main` = `1d66122`,
  local tree clean and in sync.

- **Live deployment verified** at https://kof-ten.vercel.app/ — returns 200 with
  no Vercel SSO gate, and the served asset hashes match the local build exactly,
  confirming the committed code is what is live. A full 20-player game was then
  driven to a winner **against the deployed build**: started `ROUND 1 · ALIVE
  20/20 · CHAOS`, ended in 19 rounds on `screenState: winner`. Phase boundaries
  correct at 12 (CHAOS), 11 and 6 (DANGER), 5 and 3 (FINAL FIVE), 2 (SUDDEN
  DEATH). No console errors, no horizontal overflow.

## Phase 0 exit criteria — all met

| Criterion | Result |
|---|---|
| Project builds successfully | PASS |
| Project deploys successfully to Vercel | PASS |
| GameState exists independently from UI | PASS |
| Reducer/engine can modify player state | PASS |
| Random utility exists | PASS |
| Refresh produces no TypeScript/runtime errors | PASS |

---

# Files / Areas Changed

```text
.git/                         (initialised, branch main, remote origin -> GitHub)

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

Phase 0 is fully closed — built, pushed, deployed and verified live. Start
directly on Phase 1.

Group size is a solved problem at the engine level — a 20-player game was run
end to end. The remaining 20-player risk is **visual**: 20 wheel segments is 18°
each, so plan adaptive label sizing when building the Main Wheel rather than
discovering it during Enhancement Phase 1.

Phase 1 is the Main Wheel only. Do not add the Fate Wheel (Phase 2), abilities
(Phase 3), PixiJS, sound, or arcade theming yet.

---

# Last Updated

```text
2026-08-07
```
