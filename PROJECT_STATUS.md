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
Phase 4 — Advanced MVP Fate Abilities   (NOT STARTED)

Phase 3 — Core Fate Ability System      COMPLETE
Phase 2 — Core Two-Wheel Game Loop      COMPLETE
Phase 1 — Main Wheel Vertical Slice     COMPLETE
Phase 0 — Project Foundation            COMPLETE
```

# Phase Status

```text
Phase 3 COMPLETE — all exit criteria met and verified against the live build.
Phase 4 NOT STARTED.
```

# Live Deployment

```text
https://kof-ten.vercel.app/
```

Publicly reachable, no Vercel Deployment Protection.
Auto-deploys from `main` on push (live ~15s after push).

# Current Objective

The ability system is complete and extensible, and the event queue can suspend
mid-ability. Next is Phase 4: add Death Mark, Hunter, Revive and Duel, one at a
time, each reusing the shared attack flow.

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

**Phase 1.** Reusable Canvas `<Wheel>` with deterministic landing and adaptive
labels; Setup screen; single state-aware action button.

**Phase 2.** Fate Wheel reusing the same renderer; the four starter abilities as
data; ability registry; shared attack flow; `eventResolver`; full
`WHO → WHAT FATE` loop with host-controlled pauses.

---

# Completed This Session

## Phase 3 — Core Fate Ability System

### Event queue

- `src/game/events/eventQueue.ts` — sequencing, pausing, host hand-offs.
  `eventResolver` now answers only *what one event does to state*; the queue
  answers *in what order, and where resolution stops*.
- `GameState.eventQueue` holds events produced but not yet applied. Draining
  applies them one at a time and **suspends on a blocking event**.
- Blocking events: `WAIT_FOR_HOST`, `REQUEST_FATE_SPIN`, `REQUEST_PLAYER_SPIN`.
- `CONTINUE_EVENTS` action resumes a suspended resolution; the game screen shows
  a **Continue** button whenever the queue is paused.
- `NEXT_ROUND` now also refuses to advance while events remain queued, so a
  round cannot end with an ability half-applied.

This is the piece Phase 4 depends on. Hunter must stop after the hunter is
named, wait for a target spin, then resolve its attack. Without a queue that can
suspend mid-ability, that flow would have to be special-cased in the reducer.

### Status display

- `src/components/StatusPanel/StatusPanel.tsx` — alive players with 🛡 / 💀
  badges, eliminated players in their own section with the round they went out.
  Replaces the inline roster chips. Pure projection of `GameState`.

---

# In Progress

Nothing. Phase 3 is closed and nothing was left half-written.

---

# Next Tasks

**Phase 4 — Advanced MVP Fate Abilities.** One ability at a time, tested before
starting the next (DEVELOPMENT_ROADMAP.md Phase 4).

1. **4A — Death Mark (💀).** Persistent status. On the marked player's next Main
   Wheel selection: do not spin Fate, activate the mark, attack, clear the mark.
   Shield blocks it. Needs a check at player-selection time, not at Fate time —
   this is the first ability that intercepts the normal round flow.
2. **4B — Hunter (🎯).** Emit `REQUEST_PLAYER_SPIN`, suspend, host spins for a
   target, then attack. **Requires giving `REQUEST_PLAYER_SPIN` a handler** —
   it currently blocks with no behaviour. Target must exclude the hunter;
   `selectRandomEligiblePlayer` already accepts an exclusion list.
3. **4C — Revive (❤️).** `isAvailable` returns false when nobody is eliminated.
   `REVIVE_PLAYER` is already implemented in `eventResolver`, including
   `revivedCount` and clearing status. Phase must recalculate afterwards —
   `applyPhaseAndWinner` already handles moving backward.
4. **4D — Duel (⚔).** Opponent excludes the initiator; 50/50; loser is attacked.
   Two-entry wheel is acceptable for MVP.

Each must resolve elimination through `attackPlayer()`.

---

# Known Issues / Blockers

No blockers.

Non-blocking:

- **`REQUEST_PLAYER_SPIN` has no handler.** It blocks the queue but does
  nothing else, so an ability emitting it today would stall rather than
  silently skip its attack. Deliberate — Phase 4B implements it.
- **No automated tests.** Verification is driven through the browser against
  the real modules (below). The roadmap schedules tests in Enhancement Phase 0
  and no test framework was added, per the dependency rule. The engine is pure
  and the harness has been effective, but this is the biggest outstanding gap.
- **No persistence.** Refresh resets the game. localStorage is Phase 6C.
- **Temporary dev control** — `dev`-tagged "Reset to setup" button. Reset
  becomes a real host feature in Phase 6D.
- **Fate Wheel segments are equal-sized** while selection is weighted. Still an
  open product decision — see Phase 2 decision 4. The wheel does not communicate
  that Eliminate is far likelier than Shield.
- **Game length at 20 players** — mean 49 rounds, worst case 92. Balance data
  for Phase 8.

---

# Important Decisions Made This Session

1. **Queue suspends rather than schedules.** The roadmap asks for architectural
   separation, not animation choreography, so the queue is a state machine with
   no timers. Timing and pacing belong to Enhancement Phase 2.
2. **Blocking events are a set, not per-ability logic.** Any ability can suspend
   resolution by emitting a blocking event; the reducer never learns which
   ability is running. This is what keeps AGENTS.md §7.6 intact as abilities get
   more complex.
3. **`REQUEST_PLAYER_SPIN` blocks with no handler.** The alternative — leaving it
   non-blocking — would let a future Hunter silently skip its own attack. A
   visible stall is the safer failure mode, and Phase 4 fills it in.
4. **`NEXT_ROUND` requires an empty queue.** Otherwise a host could end a round
   mid-ability and strand half-applied effects.
5. **No test framework added.** The roadmap places unit tests in Enhancement
   Phase 0, and AGENTS.md §17 asks whether a dependency belongs in the current
   phase. Verification instead runs the real modules through Vite's dev module
   graph. Flagged above as the main gap — worth revisiting before Phase 4 adds
   four interacting abilities.
6. **Status panel replaced the roster chips** rather than sitting alongside them,
   to avoid two competing player lists on a screen where vertical space is
   already the binding constraint.

---

# Verification Performed

- `npm run build` (`tsc -b && vite build`) — **passes**, 40 modules, no type errors.
- `npm run lint` (oxlint) — **clean**.
- `npx prettier --check` — **all files conform**.

## Event queue — exercised against the real modules

| Behaviour | Result |
|---|---|
| Drain applies events up to a blocking event | PASS |
| Suspends on `WAIT_FOR_HOST`, remainder preserved | PASS |
| `CONTINUE_EVENTS` resumes and completes the drain | PASS |
| Stops at the **first** blocker, not the last | PASS |
| `NEXT_ROUND` blocked while the queue is paused | PASS |
| `CONTINUE_EVENTS` on an empty queue is a no-op | PASS |
| History records every consumed event in resolution order | PASS |
| Again still routes through the queue | PASS |

## Extensibility guarantee (Phase 3 exit criterion)

A brand-new ability was registered at runtime — a definition plus a registry
entry, mirroring exactly what a real ability requires:

- appeared in the Fate pool automatically;
- resolved through the engine;
- suspended at its own `WAIT_FOR_HOST` and applied on Continue;
- honoured its `isAvailable` rule (hidden below 3 alive players);
- **no component, wheel or reducer file was involved.**

## Weighted selection

20,000 draws in Chaos phase against expected weights:

| Ability | Expected | Observed |
|---|---|---|
| Eliminate | 38.5% | 38.7% |
| Shield | 23.1% | 23.5% |
| Safe | 23.1% | 22.6% |
| Again | 15.4% | 15.1% |

## Full-game simulation (regression after the queue change)

200 games (40 each at 2, 5, 8, 12, 20 players): **every game reached a valid
winner**, no deadlocks, and **every queue was empty at game end**.

## Against the live deployment (https://kof-ten.vercel.app/)

Verified after confirming the deployed asset hash matched the local build.

- Rounds played through the real buttons; status panel shows `Alive 5` / `Out 1`.
- Shield badge confirmed rendering on a live player chip (`小明🛡`).
- Main 517px / Fate 220px, no page overflow, no console errors.

## Phase 3 exit criteria — all met

| Criterion | Result |
|---|---|
| Adding an ability does not require editing the Wheel | PASS |
| All abilities resolve through the Game Engine | PASS |
| Shield blocks Eliminate | PASS |
| Again loops back to Fate selection | PASS |
| Status display reflects GameState | PASS |

---

# Files / Areas Changed

```text
src/game/events/eventQueue.ts             (new)
src/components/StatusPanel/StatusPanel.tsx (new)

src/game/types/game.ts                    (eventQueue in GameState)
src/game/events/eventResolver.ts          (per-event rules only; queue split out)
src/game/engine/gameEngine.ts             (initial eventQueue)
src/game/engine/reducer.ts                (CONTINUE_EVENTS, queue-based resolve)
src/game/engine/selectors.ts              (canContinueEvents, stricter canAdvanceRound)
src/components/GameScreen/GameScreen.tsx  (Continue action, StatusPanel)
src/app/App.tsx                           (eliminated players, footer)
src/styles/globals.css                    (status panel replaces roster chips)

PROJECT_STATUS.md
```

Commit: `b56b8c8` — *feat: Phase 3 event queue and status display*

---

# Notes for Next Agent

Architecture boundaries are holding. Keep them:

- `src/game/` decides outcomes. Components render and dispatch, nothing more.
- Randomness goes through `src/utils/random.ts`.
- The reducer is pure. Pick the result first, then dispatch the chosen id.
- Abilities emit events. Only `eventResolver.ts` changes state, and only
  `eventQueue.ts` decides ordering.

**Adding an ability is a two-file change** — definition plus a line in
`ABILITIES`. This was proven this session, not assumed. If a new ability seems
to need a component change, stop and reconsider the design.

**Every elimination goes through `attackPlayer()`.** Death Mark, Hunter and Duel
all apply elimination pressure and Shield must keep working against all of them
without any of them knowing Shield exists.

**Multi-step abilities suspend the queue.** Emit a blocking event, let the host
resume. Do not add ability-specific branches to the reducer — if that seems
necessary, the missing piece is an event type, not a branch.

Death Mark (4A) is the odd one out: it triggers at **player selection**, not at
Fate resolution, so it needs a check in the player-selection path rather than an
entry in the Fate pool. Design that before writing it.

Consider adding a test framework before Phase 4. Four interacting abilities plus
Shield and the queue is where the browser harness starts being a weak substitute
for regression tests.

---

# Last Updated

```text
2026-08-08
```
