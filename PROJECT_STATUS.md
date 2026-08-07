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
Phase 3 — Core Fate Ability System    (PARTIALLY PRE-BUILT, see Next Tasks)

Phase 2 — Core Two-Wheel Game Loop    COMPLETE
Phase 1 — Main Wheel Vertical Slice   COMPLETE
Phase 0 — Project Foundation          COMPLETE
```

# Phase Status

```text
Phase 2 COMPLETE — all exit criteria met and verified against the live build.
Phase 3 NOT STARTED, but several of its deliverables already exist (below).
```

# Live Deployment

```text
https://kof-ten.vercel.app/
```

Publicly reachable, no Vercel Deployment Protection.
Auto-deploys from `main` on push (live ~15s after push).

# Current Objective

The game is playable end to end with four abilities. Next is Phase 3: finish the
ability system (status display, sequenced event queue) and confirm the
extensibility guarantee before the advanced abilities land in Phase 4.

---

# Repository

```text
GitHub   https://github.com/JayJayJay96/KOF
Branch   main
```

---

# Completed Before This Session

**Phase 0 — Project Foundation.** React 19 + TypeScript + Vite 8; core types;
pure reducer; phase resolver on the spec §10 thresholds; centralised randomness;
git + Vercel live.

**Phase 1 — Main Wheel Vertical Slice.** Reusable Canvas `<Wheel>` with
deterministic landing and adaptive labels; real Setup screen; game shell with a
single state-aware action; `spinning_player` locks host input.

---

# Completed This Session

## Phase 2 — Core Two-Wheel Game Loop

### Ability system (data-driven)

- `src/game/abilities/` — `eliminate`, `shield`, `safe`, `again`, each an
  `AbilityDefinition`. No ability logic anywhere else.
- `abilities/index.ts` — registry. Filters by `isAvailable`, config `enabled`
  and non-zero weight; picks with `selectWeightedItem`. Availability is
  recomputed before every Fate spin (PROJECT_SPEC.md §9).
- Weight resolution prefers `config.abilities[id].weights[phase]`, falling back
  to the ability's own `getWeight`. This makes the config's §10 tables live data
  rather than documentation, ready for host tuning in Enhancement Phase 5.

### Shared attack flow

- `src/game/engine/attack.ts` — `attackPlayer()`. Shield-versus-attack is
  implemented exactly once (AGENTS.md §7.7).
- **Pulled forward from Phase 3 deliberately.** Phase 2 ships Eliminate and
  Shield in the same pool, and a Shield that does not block is not a working
  ability. Hunter, Duel and Death Mark must call this rather than reimplement it.

### Event resolution

- `src/game/events/eventResolver.ts` — the only place an event changes state.
  Handles `ADD_SHIELD` (capped at the MVP max of 1), `SHIELD_BLOCK`,
  `ELIMINATE_PLAYER`, `REVIVE_PLAYER`, `ADD/REMOVE_DEATH_MARK`,
  `REQUEST_FATE_SPIN`. Abilities emit; they never mutate.
- New event `REQUEST_FATE_SPIN`, a sibling of the spec's `REQUEST_PLAYER_SPIN`.
  It is how Again hands control back to the host without the reducer
  special-casing an ability id.

### Flow

- `START_FATE_SPIN` / `FATE_SPIN_COMPLETE` / `RESOLVE_FATE`, mirroring the Main
  Wheel's spin/complete pair.
- `NEXT_ROUND` now requires `screenState === 'resolving'`, so the Fate step
  cannot be skipped.
- `getRevealedAbilityId` hides the chosen Fate while the wheel turns.

### UI

- `components/FateWheel/FateWheel.tsx` — reuses `<Wheel>` unchanged. Shows
  `🔒 Waiting` and is dimmed until a player is selected (PROJECT_SPEC.md §9).
- `GameScreen` rebuilt around one contextual action:
  `Spin Player → Spin Fate → Resolve → Next Round`, plus `New Game` on win.
- Roster shows 🛡 / 💀 status badges.
- Two-wheel layout: Main dominant, Fate secondary at ~43% of its diameter.

### Rendering fixes

- Wheel containers used `align-items: center`, which made the canvas height its
  own input — the canvas could never grow past its initial size. Now `stretch`.
- Label sizing ignored radial width, so every Fate label collapsed to an
  ellipsis on the smaller wheel. Labels now shrink to fit before truncating.

---

# In Progress

Nothing. Phase 2 is closed and nothing was left half-written.

---

# Next Tasks

**Phase 3 — Core Fate Ability System.** Several Phase 3 deliverables were built
during Phase 2 because Phase 2 could not be honestly completed without them.
Already done: the ability registry, all four core abilities, and the shared
attack abstraction.

Remaining for Phase 3:

1. **Status display.** Badges exist in the roster; decide whether a dedicated
   status panel is needed and whether eliminated players get their own section.
2. **Sequenced event queue.** `eventResolver` applies events immediately. Phase 3
   wants the queue that paces them — message → pause → effect → next — so that
   Hunter's multi-step flow in Phase 4 has somewhere to live.
3. **Verify the extensibility guarantee** stated in the Phase 3 exit criteria:
   adding an ability must not require editing the Wheel. Adding a fifth ability
   as a smoke test is the cheapest proof.
4. **Automated tests.** The engine is pure and now has real rules worth pinning:
   Shield blocks exactly one attack, Again does not consume a round, weighted
   selection respects phase weights.

Then **Phase 4** adds Death Mark, Hunter, Revive and Duel — one at a time, each
reusing `attackPlayer`.

---

# Known Issues / Blockers

No blockers.

Non-blocking:

- **No automated tests.** Verification so far is driven through the browser
  against real modules (see below). Roadmap places unit tests in Enhancement
  Phase 0, but the rules are now substantial enough that earlier is defensible.
- **No persistence.** Refresh resets the game. localStorage is Phase 6C.
- **Temporary dev control** — a `dev`-tagged "Reset to setup" button in the game
  screen. Reset becomes a real host feature in Phase 6D.
- **Fate Wheel segments are equal-sized** while selection is weighted. See
  decision 4 below — this is a deliberate, recorded deviation from
  PROJECT_SPEC.md §16's recommendation.
- **Game length at 20 players.** Simulation gives a mean of 54 rounds and a
  worst case of 111. At roughly four host actions and ~8s of animation per
  round, a 20-player game runs long. Balance data for Phase 8, not a bug.

---

# Important Decisions Made This Session

1. **Abilities are data from day one.** The roadmap sequences the registry into
   Phase 3, but AGENTS.md §7.6 is a permanent guardrail and implementing four
   abilities as a switch statement first would have meant writing code purely to
   delete it. Registry built now; Phase 3 keeps the rest of its scope.
2. **The shared attack flow moved to Phase 2.** Justified by AGENTS.md §5 —
   Eliminate plus Shield in one pool is an architectural dead end without it,
   and §7.7 requires Shield to exist in exactly one place.
3. **Again emits an event rather than being special-cased.** `REQUEST_FATE_SPIN`
   keeps the reducer ignorant of individual abilities. Without it, resolution
   would need `if (abilityId === 'again')`, which is the switch statement
   §7.6 forbids.
4. **Fate Wheel segments are equal-sized, weights hidden.** PROJECT_SPEC.md §16
   recommends visible segment size matching probability, but §47 lists this as
   open question 10, and weighted arcs would complicate the deterministic
   landing verified in Phase 1. Enhancement Phase 1 already owns "smoother
   weighted segment layout". **Flagged for a product decision** — the current
   display does not communicate that Eliminate is far likelier than Shield.
5. **`NEXT_ROUND` requires a resolved Fate.** Previously it was reachable from
   `player_selected`, which would have let a host skip the Fate step entirely.
6. **Config weights beat ability weights.** Keeps §10's tables as the single
   tuning surface and stops the two sources drifting apart.
7. **Shield cap enforced in the event resolver, not in the Shield ability.**
   Every future source of Shield inherits the MVP max of 1 automatically.

---

# Verification Performed

- `npm run build` (`tsc -b && vite build`) — **passes**, 38 modules, no type errors.
- `npm run lint` (oxlint) — **clean**.
- `npx prettier --check` — **all files conform**.

## Engine rules — exercised against the real modules

Driven through Vite's dev module graph, so the actual reducer, registry and
event resolver ran. No production code was modified for testing.

| Rule | Result |
|---|---|
| Shield grants one charge | PASS |
| Shield stack capped at 1 | PASS |
| Shield blocks Eliminate → `ATTACK_PLAYER`, `SHIELD_BLOCK`, survives, charge spent | PASS |
| Unshielded Eliminate → `ELIMINATE_PLAYER`, `eliminatedAtRound` stamped | PASS |
| Again keeps the player, clears the ability, does not consume a round | PASS |
| Again chains repeatedly | PASS |
| Safe is harmless, still logged, still ends the round | PASS |
| Fate cannot spin before a player is selected | PASS |
| Main Wheel cannot spin while a Fate is unresolved | PASS |
| Round cannot advance before the Fate resolves | PASS |
| Duplicate `RESOLVE_FATE` is a no-op | PASS |
| Fate pool is exactly the four starter abilities | PASS |

## Full-game simulation

200 games (40 each at 2, 5, 8, 12 and 20 players) using the real registry and
weighted selection:

- **every game reached a valid winner** — exactly one player alive, `winnerId` set;
- no deadlocks, including Again chains;
- no player left holding a stale Shield.

Mean rounds: 1.4 (n=2), 6.4 (n=5), 13.3 (n=8), 23.0 (n=12), 54.2 (n=20).

## Against the live deployment (https://kof-ten.vercel.app/)

Verified after confirming the deployed asset hash matched the local build.

- Full round through the real buttons: label sequence
  `Spin Player → Spin Fate → Resolve → Next Round`.
- One observed round rolled Again and correctly returned to `Spin Fate` instead
  of ending the round.
- **Both wheels land on the engine's choice** — checked by sampling the canvas
  under the pointer and confirming the highlighted fill, where the highlight is
  derived from the engine's `selectedId`.
- Fate result hidden while the Fate Wheel spins; Fate Wheel dimmed and locked
  until a player is selected; burst clicks produce one spin.
- Main 510px / Fate 220px, no page overflow, no console errors.

Note: a first live probe reported the Fate Wheel as not landed. That was a
measurement artifact — the sample point hit label text near the rim on the
smaller wheel. Re-probing at mid-radius confirmed correct landing on all rounds.

## Phase 2 exit criteria — all met

| Criterion | Result |
|---|---|
| Complete round: select player → select fate → resolve → update state → next round | PASS |
| All four starter abilities work | PASS |
| Host-controlled pauses, no auto-chaining | PASS |
| Input locking prevents conflicting actions | PASS |

---

# Files / Areas Changed

```text
src/game/abilities/eliminate.ts        (new)
src/game/abilities/shield.ts           (new)
src/game/abilities/safe.ts             (new)
src/game/abilities/again.ts            (new)
src/game/abilities/index.ts            (new, registry)
src/game/engine/attack.ts              (new, shared attack flow)
src/game/events/eventResolver.ts       (new)
src/components/FateWheel/FateWheel.tsx (new)

src/game/engine/reducer.ts             (fate spin/complete/resolve, NEXT_ROUND guard)
src/game/engine/selectors.ts           (canResolveFate, getRevealedAbilityId)
src/game/events/eventTypes.ts          (REQUEST_FATE_SPIN)
src/hooks/useGame.ts                   (spinFate, completeFateSpin, resolveFate)
src/components/GameScreen/GameScreen.tsx (two wheels, contextual action)
src/components/Wheel/Wheel.tsx         (label fitting)
src/app/App.tsx                        (ability wiring)
src/styles/globals.css                 (two-wheel layout, fate wheel)

PROJECT_STATUS.md
```

Commit: `8e034a3` — *feat: Phase 2 core two-wheel game loop*

---

# Notes for Next Agent

Architecture boundaries are holding. Keep them:

- `src/game/` decides outcomes. Components render and dispatch, nothing more.
- Randomness goes through `src/utils/random.ts`.
- The reducer is pure. Pick the result first, then dispatch the chosen id.
- **Abilities emit events. Only `eventResolver.ts` changes state.** If you find
  yourself adding an ability id check to the reducer, add an event instead.

**Adding an ability is now a two-file change**: write the `AbilityDefinition`,
add it to `ABILITIES` in `abilities/index.ts`. Nothing else. If a new ability
seems to need a component change, that is a design smell worth stopping on.

**Every elimination must go through `attackPlayer`.** Hunter, Duel, Death Mark
and Double Kill all apply elimination pressure, and Shield must keep working
against all of them without any of them knowing Shield exists.

The `<Wheel>` component is used by both wheels and knows nothing about players
or abilities. Keep it that way — Phase 4's Duel wheel should be a third adapter,
not a fork.

Phase 3 before Phase 4. Do not start Hunter/Duel/Revive/Death Mark until the
event queue can sequence multi-step abilities — Hunter needs a target spin in
the middle of its resolution, and that is exactly what the queue is for.

---

# Last Updated

```text
2026-08-07
```
