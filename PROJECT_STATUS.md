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
Phase 5 — Game Phases & Endgame        (LARGELY PRE-BUILT, see Next Tasks)

Phase 4 — Advanced MVP Fate Abilities  COMPLETE
Phase 3 — Core Fate Ability System     COMPLETE
Phase 2 — Core Two-Wheel Game Loop     COMPLETE
Phase 1 — Main Wheel Vertical Slice    COMPLETE
Phase 0 — Project Foundation           COMPLETE
```

# Phase Status

```text
Phase 4 COMPLETE — all exit criteria met and verified against the live build.
Phase 5 NOT STARTED, but most of its engine work already exists (below).
```

# Live Deployment

```text
https://kof-ten.vercel.app/
```

Publicly reachable, no Vercel Deployment Protection.
Auto-deploys from `main` on push (live ~15s after push).

# Current Objective

All eight MVP Fates work and a full game can be played to a winner. Next is
Phase 5, which is mostly presentation: the phase-transition overlay, the Sudden
Death treatment and the Winner screen. The engine side of phases already works.

---

# Repository

```text
GitHub   https://github.com/JayJayJay96/KOF
Branch   main
```

---

# Completed Before This Session

**Phase 0.** React 19 + TypeScript + Vite 8; core types; pure reducer; phase
resolver; centralised randomness; git + Vercel live.

**Phase 1.** Reusable Canvas `<Wheel>` with deterministic landing; Setup screen;
single state-aware action button.

**Phase 2.** Fate Wheel reusing the same renderer; four starter abilities as
data; ability registry; shared attack flow; full `WHO → WHAT FATE` loop.

**Phase 3.** Event queue that suspends on blocking events; `CONTINUE_EVENTS`
and the Continue button; status panel with badges and an eliminated section.

---

# Completed This Session

## Phase 4 — Advanced MVP Fate Abilities

All eight MVP Fates now exist. Every elimination routes through
`attackPlayer()`, so Shield works against all of them without any of them
knowing Shield exists.

### 4A — Death Mark 💀

- `abilities/deathMark.ts` applies the mark.
- `statuses/deathMarkTrigger.ts` + `statuses/statusTriggers.ts` handle
  **activation**, which fires on the marked player's next Main Wheel selection
  and replaces that round's Fate entirely.
- Death Mark does not fit the Fate-pool pattern, so rather than branch the
  reducer on an ability id it is registered as a **status trigger**. The reducer
  asks the registry whether anything fires on selection. Bomb (post-MVP) has a
  home now.
- The full lifecycle required by AGENTS.md §7.8 is documented in the trigger file.

### 4B — Hunter 🎯 and 4D — Duel ⚔

- First multi-step abilities. They emit `REQUEST_PLAYER_SPIN` to suspend the
  queue; the engine hands the chosen target back through a new optional
  `resolveTargetSpin` hook on `AbilityDefinition`.
- `excludePlayerIds` travels **on the event**, so "Hunter cannot target itself"
  and "a Duel opponent is not the initiator" stay properties of those abilities
  rather than rules in the reducer.
- New `START_TARGET_SPIN` action; the Main Wheel renders the restricted pool
  during a target spin, so it visibly cannot land on an excluded player.
- Duel resolves a 50/50 and attacks the loser. No dedicated duel wheel or VS
  scene — Enhancement Phase 4 owns that.

### 4C — Revive ❤️

- Unavailable when nobody is eliminated; weight 0 in Final Five and Sudden Death.
- Revived players return alive, no Shield, no Death Mark, `revivedCount`
  incremented. Phase recalculates and may move **backward** (spec §38).

### Presentation

- New readout line shows the latest `SHOW_MESSAGE`, which is how Hunter, Duel and
  Death Mark narrate themselves without the UI knowing they exist.
- Fate Wheel enlarged and its labels no longer carry icons — see decision 5.

---

# In Progress

Nothing. Phase 4 is closed and nothing was left half-written.

---

# Next Tasks

**Phase 5 — Game Phases & Endgame.** Much of the engine work is already done and
verified: the phase resolver, phase-specific Fate pools, backward recalculation
after Revive, and winner detection. What remains is mostly presentation.

1. **Phase transition overlay** — `PHASE_CHANGED` is already emitted and logged.
   Show `⚠ DANGER MODE ⚠` style full-screen titles when it fires. The event
   exists; nothing renders it yet.
2. **Sudden Death treatment** — the reduced pool already works (verified:
   Eliminate / Shield / Again / Hunter only). Needs the dedicated presentation.
3. **Winner screen** — currently a single line of text plus a New Game button.
   Spec §5C wants an overlay, confetti and a victory sound.
4. Confirm the Phase 5 exit criterion: a normal player list reaches one winner
   with no manual state editing. Already true in simulation; confirm in the UI.

---

# Known Issues / Blockers

No blockers.

Non-blocking:

- **No automated tests.** Still the largest gap. Verification runs the real
  modules through Vite's dev module graph, which has caught genuine bugs, but
  eight interacting abilities plus statuses and the queue is a lot of surface to
  re-verify by hand each session. Roadmap schedules tests in Enhancement Phase 0.
- **No persistence.** Refresh resets the game. localStorage is Phase 6C.
- **Temporary dev control** — `dev`-tagged "Reset to setup" button. Becomes a
  real host feature in Phase 6D.
- **Fate Wheel segments are equal-sized** while selection is weighted. Open
  product decision from Phase 2; the wheel still does not communicate that
  Eliminate is far likelier than Safe.
- **Fate labels at 1280×720** shrink to about 13px with eight abilities (about
  17px at larger viewports). Readable, but it is the tightest text on screen.
  Enhancement Phase 1 owns wheel typography.
- **Duel has no VS scene** and no duel wheel — the outcome is announced in the
  readout. Deliberate for MVP; Enhancement Phase 4 owns it.

---

# Important Decisions Made This Session

1. **Death Mark is a status trigger, not a Fate.** Its activation replaces a
   round's Fate rather than being one. A reducer branch on ability id would have
   broken AGENTS.md §7.6; a small trigger registry keeps the rule as data and
   gives post-MVP Bomb somewhere to live.
2. **Target spins are a generic mechanism.** `REQUEST_PLAYER_SPIN` +
   `resolveTargetSpin` serve both Hunter and Duel, and the reducer never learns
   which ability is suspended. Any future targeting ability reuses it.
3. **Exclusions travel on the event.** Keeping `excludePlayerIds` as ability data
   means the two-player forced-target edge case (spec §38) needs no special case
   — the pool simply contains one candidate.
4. **`pendingTargetSpin` is held until `NEXT_ROUND`.** It carries the exclusion
   list the Main Wheel renders from. Clearing it on completion made the wheel's
   entries change the instant the target landed, jumping the highlight.
5. **Fate Wheel labels dropped their icons and the wheel grew.** With eight
   entries the icon glyph cost pushed "Death Mark" to the 10px floor, which
   fails spec §21 on a compressed stream. Name-only lifts the smallest label to
   about 17px. Icons still appear in the readout at full size.
6. **Abilities may use randomness inside `resolve` — this reverses a Phase 0
   decision.** Revive and Duel need a random choice at resolution time. The
   alternatives were threading ability-specific roll payloads through a generic
   action, or teaching the reducer which abilities need which rolls. Determinism
   is preserved by `setRandomSource`, which already exists for seeded runs, so
   the original replayability argument still holds. Wheel results are still
   decided before animation, because that is a rendering requirement.

---

# Verification Performed

- `npm run build` (`tsc -b && vite build`) — **passes**, 46 modules, no type errors.
- `npm run lint` (oxlint) — **clean**.
- `npx prettier --check` — **all files conform**.

## Ability rules — exercised against the real modules

### Death Mark

| Behaviour | Result |
|---|---|
| Mark applied and persists across rounds | PASS |
| Selecting a *different* player does not trigger it | PASS |
| Selecting the marked player skips the Fate Wheel | PASS |
| Activation suspends at `WAIT_FOR_HOST` | PASS |
| Mark consumed on activation | PASS |
| Shield + Mark: both consumed, player survives (spec §38) | PASS |

### Hunter

| Behaviour | Result |
|---|---|
| Suspends into `special_event` with a pending target spin | PASS |
| Exclusion list contains the hunter | PASS |
| Target pool and Main Wheel both exclude the hunter | PASS |
| `START_TARGET_SPIN` on an excluded player is rejected | PASS |
| Hunter survives its own roll; target is attacked | PASS |
| Two players alive → target forced to the other player | PASS |

### Revive

| Behaviour | Result |
|---|---|
| Hidden when nobody is eliminated | PASS |
| Appears in Chaos once someone is out | PASS |
| Returns alive, no Shield, no Mark, `revivedCount` incremented | PASS |
| Reviving the same player twice → `revivedCount` 2 | PASS |
| Phase moves backward: Final Five (5) → Danger (6) | PASS |

### Duel

| Behaviour | Result |
|---|---|
| Suspends for an opponent spin | PASS |
| Opponent pool excludes the initiator | PASS |
| Exactly one participant loses | PASS |
| Loser is always one of the two duellists | PASS |

### Phase pools (spec §10)

Sudden Death collapses to exactly Eliminate / Shield / Again / Hunter. Chaos,
Danger and Final Five carry the full pool minus zero-weight entries. Revive is
correctly absent from Final Five and Sudden Death.

## Full-game simulation

200 games (40 each at 2, 5, 8, 12, 20 players) with all eight abilities live:

- **every game reached a valid winner**;
- **zero stuck states** — no empty ability pool, no empty target pool, no run
  hit the step cap;
- every queue empty at game end;
- all eight abilities exercised across the runs.

Mean rounds: 1.3 (n=2), 5.5 (n=5), 11.3 (n=8), 18.9 (n=12), 46.3 (n=20).

## Against the live deployment (https://kof-ten.vercel.app/)

Verified after confirming the deployed asset hash matched the local build.

- Full Hunter flow through the real buttons:
  `Spin Player → Spin Fate → Resolve → Spin Target → Continue → Next Round`,
  narrating "小明 becomes the Hunter" then "小明 hunts Bob".
- Main Wheel visibly dropped the hunter from its entries during the target spin.
- Death Mark applied and narrated; Shield badge rendered on a live player chip.
- All eight Fate labels legible at 1280×720.
- No page overflow, no console errors.

## Phase 4 exit criteria — all met

| Criterion | Result |
|---|---|
| All eight MVP abilities function | PASS |
| Death Mark activates exactly once, on next selection | PASS |
| Hunter cannot target itself | PASS |
| Duel cannot select the same player twice | PASS |
| Revive cannot appear when nobody is eliminated | PASS |
| Shield blocks attacks from every source | PASS |

---

# Files / Areas Changed

```text
src/game/abilities/deathMark.ts        (new)
src/game/abilities/hunter.ts           (new)
src/game/abilities/revive.ts           (new)
src/game/abilities/duel.ts             (new)
src/game/statuses/statusTriggers.ts    (new)
src/game/statuses/deathMarkTrigger.ts  (new)

src/game/abilities/index.ts            (registers all eight)
src/game/types/ability.ts              (resolveTargetSpin hook)
src/game/types/game.ts                 (pendingTargetSpin, targetPlayerId)
src/game/events/eventTypes.ts          (TARGET_SELECTED, excludePlayerIds)
src/game/events/eventQueue.ts          (REQUEST_PLAYER_SPIN handler)
src/game/engine/reducer.ts             (status triggers, target spin actions)
src/game/engine/selectors.ts           (target pool, wheel source, latest message)
src/game/engine/gameEngine.ts          (initial target-spin fields)
src/hooks/useGame.ts                   (spinTarget)
src/components/GameScreen/GameScreen.tsx (Spin Target, message line)
src/components/FateWheel/FateWheel.tsx (name-only labels)
src/app/App.tsx                        (spinTarget wiring, footer)
src/styles/globals.css                 (message line, larger Fate wheel)

PROJECT_STATUS.md
```

Commit: `d5fc4c3` — *feat: Phase 4 advanced MVP fate abilities*

---

# Notes for Next Agent

Architecture boundaries are holding. Keep them:

- `src/game/` decides outcomes. Components render and dispatch, nothing more.
- Randomness goes through `src/utils/random.ts` — that is now the *only*
  constraint on randomness, since abilities may call it during `resolve`.
- Abilities emit events. Only `eventResolver.ts` changes state; only
  `eventQueue.ts` decides ordering.
- **Every elimination goes through `attackPlayer()`.** Four abilities and one
  status trigger now depend on this being the single Shield checkpoint.

**Three extension points exist, and none requires touching the reducer:**

| To add | Where |
|---|---|
| A Fate | `abilities/` + one line in `ABILITIES` |
| A targeting Fate | the same, plus `resolveTargetSpin` |
| A persistent status | `statuses/` + one line in `SELECTION_TRIGGERS` |

Phase 5 is mostly presentation. `PHASE_CHANGED` and `GAME_WON` are already
emitted and logged — the work is rendering them, not producing them. Resist
re-plumbing the engine for it.

Only one status may fire per selection, by design. Two statuses triggering at
once would need an explicit interaction rule, and none exists — Bomb will have
to define one.

Tests remain the biggest gap. Phase 5 is a light engine phase, which makes it a
good moment to add Vitest before Phase 6 touches undo and persistence.

---

# Last Updated

```text
2026-08-08
```
