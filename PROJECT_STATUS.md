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
Phase 6 — Host Safety & Persistence     (NOT STARTED)

Phase 5 — Game Phases & Endgame         COMPLETE
Phase 4 — Advanced MVP Fate Abilities   COMPLETE
Phase 3 — Core Fate Ability System      COMPLETE
Phase 2 — Core Two-Wheel Game Loop      COMPLETE
Phase 1 — Main Wheel Vertical Slice     COMPLETE
Phase 0 — Project Foundation            COMPLETE
```

# Phase Status

```text
Phase 5 COMPLETE — the game is now technically complete: a normal player
list reaches one winner with no manual state editing.
Phase 6 NOT STARTED.
```

# Live Deployment

```text
https://kof-ten.vercel.app/
```

Publicly reachable, no Vercel Deployment Protection.
Auto-deploys from `main` on push (live ~15s after push).

# Current Objective

Per the roadmap, Phase 5 is the first point where the product is technically a
complete game. Next is Phase 6: make it survivable during a real streamed
session — event history, undo, localStorage save/resume, and a host panel.

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

**Phase 1.** Reusable Canvas `<Wheel>` with deterministic landing; Setup screen.

**Phase 2.** Fate Wheel; four starter abilities as data; ability registry;
shared attack flow; full `WHO → WHAT FATE` loop.

**Phase 3.** Event queue that suspends on blocking events; status panel.

**Phase 4.** All eight MVP Fates — Death Mark as a status trigger, Hunter and
Duel as multi-step target-spin abilities, Revive with backward phase movement.

---

# Completed This Session

## Phase 5 — Game Phases & Endgame

**No reducer changes.** The engine side of phases was already built and verified
in earlier phases: the phase resolver, phase-specific pools, backward
recalculation after Revive, and winner detection. This phase was presentation.

### Phase transitions

- `hooks/usePhaseAnnouncement.ts` — notices `phase` moving and produces a
  transient title. The engine already emits `PHASE_CHANGED`, so the hook only
  observes; it owns no game state.
- `components/PhaseAnnouncement/` — full-screen overlay using the spec §10
  wording (`⚠ DANGER MODE ⚠`, `🔥 FINAL FIVE 🔥`, `☠ SUDDEN DEATH ☠`).
- Auto-dismisses after ~1.9s rather than waiting for a host click: a phase
  change is a reveal, not a decision (spec §7).
- `pointer-events: none`, so it can never swallow a host click.

### Sudden Death and phase atmosphere

- A `data-phase` attribute on the root drives the accent colour per phase, so
  **no component branches on phase**. Sudden Death additionally darkens the
  field with a red vignette.
- Accents escalate: Chaos `#ffb020` → Danger `#ff9d3d` → Final Five `#ff6b3d`
  → Sudden Death `#ff4d4d`.

### Winner screen

- `components/WinnerScreen/` — the spec §5C overlay: `KING OF FATE`, the name,
  `WINNER`, confetti, and the New Game action. Replaces the previous one-line
  winner text.
- Confetti offsets are derived from the piece index, not `Math.random`.
- The **no-survivors** case (everyone eliminated) renders `NO SURVIVORS` rather
  than assuming a winner exists.

---

# In Progress

Nothing. Phase 5 is closed and nothing was left half-written.

---

# Next Tasks

**Phase 6 — Host Safety & Persistence.** The goal is recovering from mistakes
during a live streamed session.

1. **6A — Event history UI.** The data already exists: `state.history` records
   every event with its round, and `SHOW_MESSAGE` narration is already written
   by the abilities. This is a rendering task, not an engine one.
2. **6B — Undo.** Snapshot `GameState` before each mutating action and restore
   the most recent. The reducer returns new state objects throughout, so
   snapshots are cheap. Note that abilities now use randomness during `resolve`,
   so undo must be snapshot-based — replaying actions would produce a different
   outcome unless the random source is seeded.
3. **6C — localStorage save/resume.** Persist players, round, phase, statuses,
   history, config and current state; offer `RESUME` / `NEW GAME` on reload.
   Add a `saveVersion` field now so old saves can be migrated later.
4. **6D — Host panel.** Collapsible, `Ctrl+Shift+H`. Absorbs the temporary
   `dev`-tagged "Reset to setup" button currently on the game screen.

---

# Known Issues / Blockers

No blockers.

Non-blocking:

- **No automated tests.** Still the largest gap, and it grew this session: the
  verification harness now has to cover eight abilities, a status trigger, the
  queue, and three overlays. Roadmap schedules tests in Enhancement Phase 0.
  Phase 6 touches undo and persistence, which are exactly the kind of
  state-integrity features tests protect.
- **No victory sound.** Spec §5C lists one, but the audio manager is Phase 7 and
  the repo has no legally usable audio asset (spec §26). Deliberate — see
  decision 4.
- **No persistence.** Refresh resets the game. Phase 6C.
- **Temporary dev control** — `dev`-tagged "Reset to setup" button. Phase 6D.
- **Fate Wheel segments are equal-sized** while selection is weighted. Open
  product decision from Phase 2.
- **Duel has no VS scene.** Enhancement Phase 4 owns it.

---

# Important Decisions Made This Session

1. **Phase transitions auto-dismiss.** Spec §7 reserves host clicks for actual
   choices; a phase change is a consequence, not a decision. Making the host
   click through it would add a click to every threshold crossing.
2. **Chaos has no announcement.** It is where games begin, so announcing it
   would fire an overlay before anything has happened. This also means a game
   that falls back to Chaos after a Revive transitions quietly — escalation is
   the dramatic beat, not de-escalation.
3. **Phase atmosphere is a CSS attribute, not component logic.** `data-phase` on
   the root keeps every component ignorant of phase, and gives Enhancement
   Phase 7E a single place to expand the per-phase treatment.
4. **No victory sound, deliberately.** Building a one-off `Audio()` call now
   would either be thrown away or become a shadow audio system that Phase 7 has
   to reconcile, and there is no legally usable asset in the repo to play
   (spec §26). Recorded as an intentional gap against the Phase 5C description.
5. **Confetti is deterministic.** Index-derived offsets keep stray `Math.random`
   out of the codebase (AGENTS.md §7.5) and make the celebration identical on
   any replay of the same game.

---

# Verification Performed

- `npm run build` (`tsc -b && vite build`) — **passes**, 49 modules, no type errors.
- `npm run lint` (oxlint) — **clean**.
- `npx prettier --check` — **all files conform**.
- No orphaned CSS left behind by the removed winner line.

## Phase announcement hook — exercised against the real module

| Behaviour | Result |
|---|---|
| First render of a live game does not announce | PASS |
| Chaos → Danger announces `⚠ DANGER MODE ⚠` | PASS |
| Danger → Final Five announces `🔥 FINAL FIVE 🔥` | PASS |
| Final Five → Sudden Death announces `☠ SUDDEN DEATH ☠` | PASS |
| Auto-dismisses after its duration | PASS |
| Backward move to Chaos stays silent | PASS |
| Re-rendering the same phase does not re-announce | PASS |
| Going inactive clears immediately | PASS |

## Overlays — rendered and inspected

| Behaviour | Result |
|---|---|
| Winner overlay shows KING OF FATE / name / WINNER | PASS |
| 48 confetti pieces, all at distinct horizontal offsets | PASS |
| New Game button fires its callback | PASS |
| `aria-modal="true"` on the winner dialog | PASS |
| No-survivors case renders `NO SURVIVORS`, no name, still offers New Game | PASS |
| Phase overlay renders nothing when there is no title | PASS |
| Phase overlay is `pointer-events: none`, `position: fixed`, `z-index: 40` | PASS |

## Phase atmosphere

Accent resolves correctly per phase (base `#ffb020`, Danger `#ff9d3d`, Final
Five `#ff6b3d`, Sudden Death `#ff4d4d`), and Sudden Death applies its vignette.

## Wiring

A real game was driven to `screenState: 'winner'` through the reducer, then
`GameScreen` was rendered with that state: the winner overlay appears with the
correct name, and the old inline winner line is gone.

## Full-game simulation (regression)

200 games (40 each at 2, 5, 8, 12, 20 players):

- **every game reached a valid winner** and emitted `GAME_WON`;
- **zero stuck states**;
- every game passed through Sudden Death;
- average phase changes per game: 1.0 (n=2) to 3.3 (n=20).

## Live deployment (https://kof-ten.vercel.app/)

Asset hash matched the local build. The deployed CSS contains
`phase-announcement`, `winner__confetti`, `confetti-fall`, `data-phase` and
`sudden_death`; the deployed JS contains `KING OF FATE`, `SUDDEN DEATH`,
`DANGER MODE`, `FINAL FIVE` and `NO SURVIVORS`.

**Limitation — read this before trusting the above.** The Browser pane could not
be displayed during this session, so the page never composited frames. That
blocked screenshots and stalled `requestAnimationFrame`, which the wheel spin
depends on. Consequently the overlays were verified by rendering the real
components and hook directly, and by driving the real reducer — **not** by
watching a phase transition or winner screen appear during an actual animated
playthrough. Everything asserted above was executed, but a human should eyeball
one full game before the Phase 8 validation pass.

## Phase 5 exit criteria

| Criterion | Result |
|---|---|
| Automatic phase resolver with the spec thresholds | PASS (Phase 2) |
| Phase-specific Fate pools | PASS (Phase 3) |
| Phase transition shown when a threshold is crossed | PASS |
| Sudden Death has a dedicated treatment and reduced pool | PASS |
| Winner state with overlay and confetti | PASS |
| Victory sound | DEFERRED to Phase 7 — see decision 4 |
| Normal player list reaches one winner with no manual editing | PASS |

---

# Files / Areas Changed

```text
src/hooks/usePhaseAnnouncement.ts                      (new)
src/components/PhaseAnnouncement/PhaseAnnouncement.tsx (new)
src/components/WinnerScreen/WinnerScreen.tsx           (new)

src/game/phases/phaseConfig.ts             (PHASE_ANNOUNCEMENTS)
src/components/GameScreen/GameScreen.tsx   (both overlays wired in)
src/app/App.tsx                            (data-phase, footer)
src/styles/globals.css                     (phase atmosphere, overlays, confetti)

PROJECT_STATUS.md
README.md
```

Commit: `afe0c0b` — *feat: Phase 5 phase transitions and winner screen*

---

# Notes for Next Agent

Architecture boundaries are holding. Keep them:

- `src/game/` decides outcomes. Components render and dispatch, nothing more.
- Randomness goes through `src/utils/random.ts`.
- Abilities emit events. Only `eventResolver.ts` changes state; only
  `eventQueue.ts` decides ordering.
- Every elimination goes through `attackPlayer()`.

Phase 5 needed **no engine changes at all** — a good sign the earlier phases put
the rules in the right place. Phase 6 is the opposite: undo and persistence are
squarely engine concerns.

**Undo must be snapshot-based, not action-replay.** Since Phase 4, abilities use
randomness during `resolve`, so replaying an action log would produce different
outcomes. `historyStack.push(deepClone(state))` before each mutating action is
what spec §23 describes, and it sidesteps the problem entirely.

**Add `saveVersion` to the persisted shape from the very first commit** of 6C.
Enhancement Phase 0 calls for it, and retrofitting a version onto saves that
already exist in users' browsers is far harder than starting with one.

`GameState` is already a plain serialisable object — no class instances, no
functions, no `Date` — so `JSON.stringify` is sufficient for both undo snapshots
and localStorage.

The temporary `dev`-tagged Reset button on the game screen should be absorbed
into the Phase 6D host panel and removed from the main screen.

Tests remain the biggest gap and Phase 6 is the riskiest phase to do without
them: undo and save/restore are exactly where silent state corruption hides.

---

# Last Updated

```text
2026-08-08
```
