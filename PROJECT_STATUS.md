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
Phase 7 — MVP Arcade Presentation       (NOT STARTED)

Phase 6 — Host Safety & Persistence     COMPLETE
Phase 5 — Game Phases & Endgame         COMPLETE
Phase 4 — Advanced MVP Fate Abilities   COMPLETE
Phase 3 — Core Fate Ability System      COMPLETE
Phase 2 — Core Two-Wheel Game Loop      COMPLETE
Phase 1 — Main Wheel Vertical Slice     COMPLETE
Phase 0 — Project Foundation            COMPLETE
```

# Phase Status

```text
Phase 6 COMPLETE — the host can now recover from an accidental action,
a browser refresh, or a mistaken roster.
Phase 7 NOT STARTED.
```

# Live Deployment

```text
https://kof-ten.vercel.app/
```

Publicly reachable, no Vercel Deployment Protection.
Auto-deploys from `main` on push (live ~15s after push).

# Current Objective

The game is complete and survivable. Next is Phase 7: the arcade presentation
pass — theme, effect registry, and the first real audio system.

---

# Repository

```text
GitHub   https://github.com/JayJayJay96/KOF
Branch   main
```

---

# Completed Before This Session

**Phase 0–2.** React 19 + TypeScript + Vite 8; pure reducer; reusable Canvas
wheel with deterministic landing; ability registry; shared attack flow; the
full `WHO → WHAT FATE` loop.

**Phase 3.** Event queue that suspends on blocking events; status panel.

**Phase 4.** All eight MVP Fates, including Death Mark as a status trigger and
Hunter/Duel as multi-step target-spin abilities.

**Phase 5.** Phase transition overlay, Sudden Death atmosphere, winner screen.

---

# Completed This Session

## Phase 6 — Host Safety & Persistence

### 6A — Event history

- `game/events/eventLog.ts` turns raw events into readable lines and groups
  them by round, newest first. Flow-control events (`WAIT_FOR_HOST`, the spin
  requests, `ATTACK_PLAYER`) are dropped — they are mechanism, not story.
- `components/EventLog/` renders it. It lives inside the Host Panel rather than
  the main screen, which already shows the current narration line and has no
  vertical space to spare at 1280×720.

### 6B — Undo

- `game/engine/undo.ts` wraps `gameReducer` without modifying it.
- **Snapshots, not replay.** Abilities have called randomness during `resolve`
  since Phase 4, so replaying an action log would produce a *different* game.
- **Wheel completions are not checkpoints**, so undoing after a spin returns to
  before the spin rather than into a frozen animation.
- Rejected transitions return the same state reference, which the wrapper uses
  to avoid burning an undo slot on a no-op.
- Stack bounded at `UNDO_LIMIT = 40`.

### 6C — Save / resume

- `storage/gameStorage.ts`, key `kof.save.v1`, envelope
  `{ saveVersion, savedAt (ISO 8601 UTC), state }`.
- `saveVersion` ships from the first commit, as Enhancement Phase 0 requires.
- A save with an unexpected version, unparseable JSON, or a structurally wrong
  state is **discarded**, not loaded into the engine.
- All localStorage access is wrapped: it throws in private browsing and on
  quota, and a game must never be lost because saving failed.
- Autosave on every change once a game is under way; setup is not saved.
- `components/ResumePrompt/` offers RESUME / NEW GAME. Resuming is never
  automatic.

### 6D — Host Panel

- `components/HostPanel/`, toggled with **Ctrl+Shift+H**, plus a dim `HOST`
  handle so it is discoverable without the shortcut.
- Undo, Reset to setup, Fullscreen, Save now, Clear save, roster add/remove,
  and the event history.
- **Replaces the temporary `dev` strip** that had been on the game screen since
  Phase 1.

### Engine change

- Roster edits are now legal in `idle` as well as `setup`, so a late joiner can
  be added between rounds. `idle` is the only safe in-game moment: no wheel is
  turning, no ability is suspended, and `currentPlayerId` is already cleared.
  Adding or removing mid-game re-derives the phase.

---

# In Progress

Nothing. Phase 6 is closed and nothing was left half-written.

---

# Next Tasks

**Phase 7 — MVP Arcade Presentation.** The first phase where the product stops
looking like an engineering prototype.

1. **Arcade visual theme** — dark background, bold angled panels, strong
   typography, high contrast. The `data-phase` hook added in Phase 5 is where
   per-phase atmosphere should expand.
2. **Effect registry** — map events to effects (flash, shake, K.O. overlay,
   shield burst, skull pulse). Events already exist and are already emitted;
   this is a subscriber, not new engine work.
3. **Audio system** — `audio/audioManager.ts` and `soundRegistry.ts`. Wheel
   tick, wheel stop, Fate impact, Shield block, KO, phase transition, winner.
   **The wheel already exposes an `onTick` callback with no listener** — that is
   the intended hook for tick audio.
4. **Source legally usable audio assets** (spec §26). This is the real blocker
   for item 3, not the code.

---

# Known Issues / Blockers

No blockers.

Non-blocking:

- **No automated tests.** Still the largest gap. Phase 6's undo and storage
  logic were verified through the harness, but this is exactly the kind of
  state-integrity code that regression tests protect. Roadmap schedules them in
  Enhancement Phase 0.
- **No audio at all.** Phase 7, and gated on sourcing legally usable assets.
- **"Clear save" during a live game is re-saved on the next action.** This is
  intended — the game is still in progress, so autosave writes again. It only
  stays cleared once the host resets to setup or stops playing. Worth knowing
  before someone reports it as a bug.
- **Fate Wheel segments are equal-sized** while selection is weighted. Open
  product decision from Phase 2.
- **Duel has no VS scene.** Enhancement Phase 4 owns it.
- **Host panel has no audio controls**, unlike the roadmap's 6D list — there is
  no audio system for them to control yet.

---

# Important Decisions Made This Session

1. **Undo stores snapshots, not an action log.** Since Phase 4 abilities call
   randomness during `resolve`, replaying actions would produce a different
   game. `GameState` is plain and serialisable, so snapshots are cheap and
   exact. This was flagged in the Phase 5 handoff and held up.
2. **Wheel completions are not undo checkpoints.** Undo should reverse a *host
   action*, and the state a completion consumes (`spinning_*`) is not somewhere
   the host can safely be returned to, since no animation would be running.
3. **Undo lives outside the reducer.** Keeping it as a wrapper means the reducer
   remains a plain state machine and undo cannot corrupt game rules.
4. **Corrupt or wrong-version saves are discarded, not repaired.** Guessing at a
   malformed save would fail later and less obviously. This is also where
   migrations will go when `saveVersion` increments.
5. **Resume is offered, never automatic.** Reopening the tab to start a fresh
   game is at least as common as wanting the old one back.
6. **Roster edits are restricted to `idle`.** Allowing them mid-round would
   strand a half-resolved round — a removed player could be the current target
   of a suspended Hunter. The engine enforces this; the panel just hides the
   controls.
7. **No audio controls in the host panel**, despite the roadmap listing them for
   6D. A volume slider with nothing to control is worse than its absence.

---

# Verification Performed

- `npm run build` (`tsc -b && vite build`) — **passes**, 55 modules, no type errors.
- `npm run lint` (oxlint) — **clean**.
- `npx prettier --check` — **all files conform**.
- No orphaned CSS from the removed dev strip.

## Undo — exercised against the real module

| Behaviour | Result |
|---|---|
| Undo reverses an elimination (5 alive → 6) | PASS |
| Undo across a spin returns to `idle`, never mid-animation | PASS |
| Rejected actions do not consume an undo slot | PASS |
| Undo on an empty stack is a safe no-op | PASS |
| Multi-step undo walks back several rounds | PASS |
| Stack bounded at 40 entries | PASS |
| `RESTORE` clears the past | PASS |

## Storage — exercised against the real module

| Behaviour | Result |
|---|---|
| Empty storage loads as null | PASS |
| Round-trips round, phase, screenState, roster, statuses, history | PASS |
| Unicode names survive (`Jason\|Amy\|小明\|Zoë 🎯`) | PASS |
| `savedAt` is ISO 8601 | PASS |
| Envelope carries `saveVersion: 1` | PASS |
| Wrong `saveVersion` rejected **and cleared** | PASS |
| Unparseable JSON rejected and cleared | PASS |
| Structurally invalid state rejected | PASS |
| A resumed state is still playable | PASS |

## Event log and roster rules

Log output reads correctly, e.g. Round 01 → `Game started — 4 players`,
`⚑ FINAL FIVE`, `🎡 Jason selected`, `🛡 Jason gains a Shield`. Flow-control
events are hidden; an unknown player id degrades to "Unknown" rather than
crashing. Roster add/remove works at `idle`, is rejected mid-round, and
re-derives the phase.

## Full-game regression through the undo wrapper

150 games (30 each at 2, 5, 8, 12, 20 players) played entirely through
`historyReducer`:

- **every game reached a valid winner**, zero stuck states;
- undo depth stayed bounded at 40;
- unwinding every game completely left a valid state.

## Against the live deployment (https://kof-ten.vercel.app/)

Asset hash matched the local build.

- Host handle present, dev strip gone, Ctrl+Shift+H opens and closes the panel.
- Starting a game writes a `saveVersion: 1` save; setup does not.
- **A real browser reload showed the resume prompt**, and Resume restored the
  full roster including `小明` and `Zoë 🎯`, the round, and the event history.
- Panel roster add/remove works, and Undo reverses both.
- Save now / Clear save report back and match localStorage.
- No page overflow, no console errors.

## Phase 6 exit criteria

The host can recover from an accidental action (undo), a browser refresh
(save/resume), and a roster mistake (host panel) without restarting the
session. **PASS.**

---

# Files / Areas Changed

```text
src/game/engine/undo.ts                          (new)
src/storage/gameStorage.ts                       (new)
src/game/events/eventLog.ts                      (new)
src/components/EventLog/EventLog.tsx             (new)
src/components/HostPanel/HostPanel.tsx           (new)
src/components/ResumePrompt/ResumePrompt.tsx     (new)

src/hooks/useGame.ts                  (undo, autosave, resume)
src/game/engine/reducer.ts            (roster edits legal at idle)
src/components/GameScreen/GameScreen.tsx (dev strip removed)
src/app/App.tsx                       (host panel, resume prompt, footer)
src/styles/globals.css                (host panel, event log, resume prompt)

PROJECT_STATUS.md
README.md
```

Commit: `d48c64b` — *feat: Phase 6 host safety and persistence*

---

# Notes for Next Agent

Architecture boundaries are holding. Keep them:

- `src/game/` decides outcomes. Components render and dispatch, nothing more.
- Randomness goes through `src/utils/random.ts`.
- Abilities emit events. Only `eventResolver.ts` changes state; only
  `eventQueue.ts` decides ordering.
- Every elimination goes through `attackPlayer()`.
- **Undo wraps the reducer from outside.** Do not move it inside, and do not
  add an action log — randomness in `resolve` makes replay unsound.

Phase 7 should be almost entirely additive. Events are already emitted for
everything worth reacting to, so the effect registry and audio manager are
**subscribers**, not engine changes. If Phase 7 seems to need a reducer change,
the missing piece is probably an event type.

Two hooks already exist and are waiting for Phase 7:

- `<Wheel onTick>` — fires on every segment boundary, currently unused. This is
  where tick audio belongs.
- `data-phase` on the root — where per-phase atmosphere expands.

**Audio is gated on assets, not code** (spec §26 requires legally usable
sources). Sort the assets before writing the audio manager, or it will be
written against nothing.

If any localStorage schema change is needed, bump `SAVE_VERSION` and add a
migration in `loadGame` — the rejection path is already there.

Tests remain the biggest gap.

---

# Last Updated

```text
2026-08-08
```
