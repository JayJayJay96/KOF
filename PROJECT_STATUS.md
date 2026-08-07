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
Phase 2 — Core Two-Wheel Game Loop    (NOT STARTED)

Phase 1 — Main Wheel Vertical Slice   COMPLETE
Phase 0 — Project Foundation          COMPLETE
```

# Phase Status

```text
Phase 1 COMPLETE — all exit criteria met and verified against the live build.
Phase 2 NOT STARTED.
```

# Live Deployment

```text
https://kof-ten.vercel.app/
```

Publicly reachable, no Vercel Deployment Protection.
Auto-deploys from `main` on push (observed live ~15s after push).

# Current Objective

Phase 1 is closed. Next is Phase 2: add the Fate Wheel and the defining
WHO → WHAT FATE loop, using only the four starter abilities
(Eliminate, Shield, Safe, Again).

---

# Repository

```text
GitHub   https://github.com/JayJayJay96/KOF
Branch   main
```

---

# Completed Before This Session

**Phase 0 — Project Foundation (complete).** React 19 + TypeScript + Vite 8
scaffold; core types (`Player`, `GameState`, `GamePhase`, `GameScreenState`,
`AbilityDefinition`, `GameEvent`, `GameConfig`); pure reducer; engine
primitives with phase recalculation and winner detection; phase resolver on the
spec §10 thresholds; centralised randomness with a swappable source; spec §10
weight tables recorded as data. Git initialised and pushed; Vercel connected
and verified live.

---

# Completed This Session

## Phase 1 — Main Wheel Vertical Slice

### Reusable Canvas wheel

- `components/Wheel/wheelGeometry.ts` — pure maths, no canvas or React:
  `resolveTargetRotation`, `segmentAtPointer`, `spinProgress`,
  `resolveLabelFontSize`. Separated so landing behaviour is reasonable about
  and unit-testable without rendering.
- `components/Wheel/Wheel.tsx` — the renderer. Props are exactly the roadmap's
  API: `entries`, `selectedId`, `spinning`, `onSpinComplete` (plus optional
  `onTick`, `spinDurationMs`, `minTurns`, `maxSize`).
- Deterministic landing. `spinProgress` is solved so total normalised travel is
  exactly 1, and the target angle is derived before the animation starts — the
  wheel stops *on* the result, never merely near it.
- Easing accelerates then decelerates (C1-continuous piecewise: constant
  acceleration, then quartic velocity decay).
- Tick feedback on every segment boundary crossing, exposed as a visual pointer
  nudge plus an `onTick` callback. Deliberately not wired to audio — the audio
  system is Phase 7.
- Adaptive label sizing by segment count, ellipsis truncation, and left-half
  labels flipped so every name reads left-to-right.
- Device-pixel-ratio aware; honours `prefers-reduced-motion` by jumping
  straight to the result.

### Game flow

- New engine actions `START_PLAYER_SPIN` and `PLAYER_SPIN_COMPLETE`, giving the
  `spinning_player` state real meaning: the engine decides first, the wheel
  animates, then the result is revealed.
- `getRevealedPlayer` selector hides the already-decided result while the wheel
  is turning.
- `isAnimating` selector; all host controls lock during animation.
- `NEXT_ROUND` now only fires from `player_selected` / `fate_selected`.

### UI

- `components/PlayerSetup/PlayerSetup.tsx` — real Setup screen: multiline
  paste, per-row remove, numbered roster, Ctrl/Cmd+Enter to add, Start Game
  gated on `MIN_PLAYERS_TO_START`.
- `components/GameScreen/GameScreen.tsx` — main shell: round / alive / phase
  stats, wheel, result readout, one state-aware primary action
  (Spin Player ↔ Next Round), roster with elimination styling.
- `components/MainWheel/MainWheel.tsx` — thin players-to-entries adapter.
- `DebugPanel` deleted, as the roadmap intended.

---

# In Progress

Nothing. Phase 1 is closed and nothing was left half-written.

---

# Next Tasks

Begin **Phase 2 — Core Two-Wheel Game Loop**:

1. Build the Fate Wheel from the same `<Wheel>` component, rendered smaller
   than the Main Wheel and visibly inactive until a player is selected.
2. Implement the four starter abilities only: Eliminate, Shield, Safe, Again.
   Do **not** add Hunter / Duel / Revive / Death Mark yet (Phase 4).
3. Wire the full state flow through `spinning_fate` → `fate_selected` →
   `resolving` → round complete, mirroring the spin/complete pair already used
   by the Main Wheel.
4. Keep every step host-triggered — no auto-chaining (PROJECT_SPEC.md §7).
5. Extend input locking to the Fate Wheel: it must not spin before a player
   exists, and the Main Wheel must not spin while a Fate is unresolved.
6. Delete the temporary dev strip in `GameScreen.tsx` once Eliminate exists as
   a real Fate.

---

# Known Issues / Blockers

No blockers. Phase 2 can start immediately.

Non-blocking, on-plan gaps:

- **No automated tests.** The roadmap places unit tests in Enhancement Phase 0.
  `wheelGeometry.ts` and the reducer are pure and were written to be testable;
  `resolveTargetRotation` / `spinProgress` are the highest-value first targets.
- **No persistence.** A refresh resets the game. localStorage is Phase 6C.
- **Temporary dev strip** in the game screen (Eliminate selected / Reset to
  setup), marked `dev` in the UI. It exists only so player removal can be
  exercised before abilities exist. Remove in Phase 2.
- **Wheel is 329px at 1280x720** versus 587px at 1920x1080. It fits without
  scrolling at both, but the smaller size is close to the readability floor for
  a compressed stream. Revisit in Enhancement Phase 1 if playtesting shows it.

---

# Important Decisions Made This Session

1. **The wheel never decides anything.** `START_PLAYER_SPIN` records the
   engine's choice immediately and the wheel interpolates toward it
   (PROJECT_SPEC.md §8, AGENTS.md §7.2). The UI suppresses the name until the
   animation ends, so the spin is still a surprise.
2. **Landed highlight keys off `selectedId`, not pointer position.** If the
   rotation maths ever disagreed with the engine, the highlight would visibly
   sit away from the pointer instead of silently agreeing with itself. This is
   what made automated landing verification possible.
3. **Layout is measured, not guessed.** A first attempt clamped the wheel with a
   hardcoded chrome allowance and pushed the action button off a 720p screen.
   Replaced with a flex column where the wheel container has `min-height: 0`, so
   the canvas sizes itself from the space actually left over.
4. **`spinProgress` solves for exact arrival** rather than easing toward the
   target approximately, because "close enough" on a wheel means landing on the
   wrong name.
5. **Tick feedback is visual only.** The roadmap lists tick feedback in Phase 1
   but audio in Phase 7. Implemented as a pointer nudge plus an `onTick` hook so
   Phase 7 can attach sound without touching the wheel (AGENTS.md §5).
6. **`SELECT_PLAYER` kept alongside the spin pair** as the instant, no-animation
   path — useful for tests and for the "skip animation" option in Enhancement
   Phase 2.
7. **Left-half labels are flipped.** Standard radial text renders upside down on
   one side; unreadable names on a streamed screen contradict PROJECT_SPEC.md
   §21.
8. **A temporary dev strip replaced the debug panel** rather than keeping the
   panel. Phase 1 has no abilities, so without an eliminate control the wheel's
   dynamic removal requirement could not be exercised at all.
9. **`filterAlive(players)` added** so React can memoise on `state.players`
   alone. Memoising on the whole state produced a new array every dispatch,
   which would restart the spin animation mid-flight.

---

# Verification Performed

- `npm run build` (`tsc -b && vite build`) — **passes**, 30 modules, no type errors.
- `npm run lint` (oxlint) — **clean**.
- `npx prettier --check` — **all files conform**.

## Against the live deployment (https://kof-ten.vercel.app/)

Verified after confirming the deployed asset hash matched the local build.

- 20-player game created through the real Setup screen (paste → add → start).
- Three spins, each asserting four properties simultaneously:

  | Property | Result |
  |---|---|
  | Wheel lands on the engine-selected segment | PASS |
  | Result stays hidden while spinning | PASS |
  | Controls locked during the spin | PASS |
  | Winner is a real alive player | PASS |

  Landing was checked by sampling the canvas pixel directly under the pointer
  and confirming it is the highlighted fill — and the highlight is derived from
  `selectedId`, so this proves rotation and engine agree.
- **Burst clicking verified**: double and triple clicks on Spin Player produce
  exactly one spin (identical 3.6–3.8s duration, button disabled immediately).
- **Dynamic removal verified**: eliminating the selected player drops alive
  12 → 11, strikes them out in the roster, removes their segment, and the next
  spin still lands correctly on a living player.
- **Layout verified at both target resolutions**: 1280×720 → 329px wheel,
  1920×1080 → 587px wheel. No horizontal or vertical page overflow at either;
  the primary action button is on-screen in both.
- No console errors at any point.

## Phase 1 exit criteria — all met

| Criterion | Result |
|---|---|
| Host can enter players | PASS |
| Host can start the game | PASS |
| Host can spin the Main Wheel | PASS |
| Wheel lands on the Game Engine result | PASS |
| Repeated spins with no state corruption | PASS |
| Working preview deployed | PASS |

---

# Files / Areas Changed

```text
src/components/Wheel/Wheel.tsx              (new)
src/components/Wheel/wheelGeometry.ts       (new)
src/components/MainWheel/MainWheel.tsx      (new)
src/components/PlayerSetup/PlayerSetup.tsx  (new)
src/components/GameScreen/GameScreen.tsx    (new)
src/components/DebugPanel/                  (deleted)

src/app/App.tsx                             (screen routing)
src/game/engine/reducer.ts                  (spin actions, NEXT_ROUND guard)
src/game/engine/selectors.ts                (isAnimating, getRevealedPlayer, filterAlive)
src/hooks/useGame.ts                        (spin/complete pair)
src/styles/globals.css                      (flex layout, wheel, setup, game screen)

PROJECT_STATUS.md
```

Commit: `6a582a5` — *feat: Phase 1 main wheel vertical slice*

---

# Notes for Next Agent

Architecture boundaries are holding. Keep them:

- `src/game/` decides outcomes. Components render and dispatch, nothing more.
- Randomness goes through `src/utils/random.ts`. No `Math.random()` elsewhere.
- The reducer is pure. Pick the result first, then dispatch the chosen id.

**Reuse `<Wheel>` for the Fate Wheel.** It is already player-agnostic — it takes
`{ id, label }` entries and knows nothing about players or abilities. Build a
`FateWheel` adapter mirroring `MainWheel`; do not fork the component.

**Mirror the spin/complete action pair** for Fate
(`START_FATE_SPIN` / `FATE_SPIN_COMPLETE`). The Main Wheel's flow is the
template, including hiding the result until the animation ends.

When abilities arrive, the reducer's `eliminatePlayer` is the raw primitive.
The shared attack abstraction that consumes Shield first belongs in Phase 3 and
must wrap it — do not scatter Shield checks per ability (AGENTS.md §7.7).

Phase 2 is four abilities only. No Hunter, Duel, Revive or Death Mark; no
PixiJS, sound, or arcade theming.

---

# Last Updated

```text
2026-08-07
```
