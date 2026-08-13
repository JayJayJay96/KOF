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
Pre-MVP — MVP feature-complete, in playtest iteration
```

# Current Pass

```text
PASS 1 — MVP  (all phases built; Phase 8 playtesting is the open gate)
```

# Current Phase

```text
Phase 8 — Full-Game Validation   (IN PROGRESS — host-led playtesting)

Fate rework Wave 1               COMPLETE
Phases 0-7                       COMPLETE
```

# Phase Status

```text
All MVP features exist and are deployed. The project is now in a
playtest-and-tune loop driven by the host, not a build loop.

Wave 1 of the Fate rework is shipped. Waves 2 and 3 are designed but
NOT started — see Next Tasks.
```

# Live Deployment

```text
https://kof-ten.vercel.app/
```

Publicly reachable, no Vercel Deployment Protection.
Auto-deploys from `main` on push (live ~15s after push).

# Current Objective

Play real games. Wave 1 changed the Fate pool substantially in one go; the
measurements prove it is no longer dead air, but not that it is *fun*. Wave 2
(Bomb) should wait until Wave 1 has been felt in a real session.

---

# Repository

```text
GitHub   https://github.com/JayJayJay96/KOF
Branch   main
```

---

# Completed Before This Session

**Phases 0–7.** React 19 + TypeScript + Vite 8; pure reducer; reusable Canvas
wheel with deterministic landing; ability registry; shared attack flow; event
queue that suspends on blocking events; all eight original MVP Fates; phase
transitions and winner screen; undo, versioned save/resume, host panel;
synthesised audio and the impact-effect layer.

---

# Completed This Session

Four commits, all deployed and verified live.

## `d7aaada` — first playtest pass

- **Wheel lands anywhere within a segment**, not dead centre. Engine still picks
  the winner; the wheel picks where inside it the pointer rests. Clamped to 0.78
  of the half-arc so it never lands ambiguously on a boundary.
- **Player spin flows into the Fate spin** — one click, not two. Contradicted
  PROJECT_SPEC.md §3, so the spec was amended rather than left to drift. Does
  not fire after Again, and cancels when a Death Mark intercepts.
- **Hunter bounty** — a successful hunt earns the hunter a Shield. A blocked
  hunt pays nothing; the reward tracks the kill, not the attempt.

## `b374d59` — wheel skip bug

The wheel honoured `prefers-reduced-motion` by **jumping straight to the
result**. On a machine with OS animation effects disabled (the host's setup)
that made the game look broken. Reduced motion should damp decoration, not
delete the mechanic — the spin IS the game. Decorative motion (pointer nudge,
shake, confetti, impact titles) still respects the media query via CSS.

## `da09a44` — greasy deceleration

The old quartic ease-out spent 94% of its travel in the first half of the
deceleration, so the wheel parked deep inside a segment almost immediately. No
boundary was ever genuinely in play.

Now three phases: wind up, bleed off, **crawl**. The final `CRAWL_TIME` (34% of
the spin) is reserved to cover `CRAWL_DISTANCE` (8.5% of travel). Velocity stays
continuous across both joins; peak speed is still solved so total travel is
exactly 1, so landing remains exact.

Durations: main wheel 4200 → **6800ms**, Fate 3200 → **5200ms**.

Measured at 8 players, final five tick gaps went from `124/152/188/264/552ms` to
`252/308/408/524/836ms`; ticks in the final third went from 1 to 3.

## `daa5bf9` — Fate rework Wave 1

Driven by measurement over 5,220 rolls: 19.4% of rolls changed nothing, and only
20.7% involved a second player — yet the two-player Fates were where every
reaction came from.

- **Again removed**, replaced by **Double Fate** (two Fates, order drawn).
- **Close Call** replaces most of Safe: shielded → Shield destroyed; unshielded →
  survives but marked. Always leaves something on the board.
- **Steal Shield** promoted from Post-MVP. No target spin needed.
- **Status rims on the wheel** — purple Death Mark, light blue Shield, concentric
  when both. Status uses the **rim**, the landed result uses the **fill**, so
  both read at once.
- Weights retuned across all four phases.
- `SAVE_VERSION` → 2 (a v1 save mid-round on `again` would strand the round).

| | Before | After |
|---|---|---|
| Rolls that change nothing | 19.4% | **3.3%** |
| Rolls involving a second player | 20.7% | **37.1%** |

180 games: all reached valid winners, zero stuck states, Shield cap never broken.

---

# In Progress

Nothing. Working tree clean, all work committed and deployed.

---

# Next Tasks

## Immediate — playtest Wave 1 (host-led, cannot be done by an agent)

The Fate pool changed a lot at once. The numbers prove it is not dead air; they
say nothing about whether it is fun. Specific things to watch:

- **Is Hunter dominant?** It is now 16.9% of rolls *and* pays a Shield bounty on
  a kill. Second-most-common Fate. If it feels oppressive, drop the bounty to
  later phases only, or make it one-off.
- **Does Close Call read as relief or as punishment?** It always costs something
  now.
- **Is Double Fate legible?** Two Fates resolving in sequence may be hard to
  follow on a stream.
- **Round length.** Animation per round is now ~12.9s (6.8 player + 0.9 beat +
  5.2 Fate), up from ~8.3s. At 20 players that is roughly 12 minutes of spinning
  per game. If it drags, the cheapest lever is shortening the **Fate** wheel — it
  has fewer segments so it earns less from a long tail.

## Wave 2 — Bomb (designed, not started)

A status that passes to a newly selected player each round and detonates after N
rounds. Highest anticipation-per-line-of-code available; the whole table tracks
it every round.

- Belongs in `game/statuses/` alongside `deathMarkTrigger.ts`.
- **Needs a round counter on the status**, which `statusTriggers.ts` does not
  support yet — that is the one real addition.
- **Rim colour is already free**: `WheelMarker` was built generic in Wave 1
  exactly so Bomb could plug in without touching `Wheel`.

## Wave 3 — Linked Fate + rebalance

Two players bound; one dies, the other takes a hit. Reuses the Hunter target-spin
machinery.

**Caution:** Bomb + Death Mark + Linked Fate simultaneously means players
tracking three overlapping timers. PROJECT_SPEC.md §45 requires the viewer
experience stay simple. Ship Bomb and *watch* before adding Linked Fate.

## Still outstanding from earlier phases

- **No automated tests.** The largest structural gap. Roadmap schedules them in
  Enhancement Phase 0. Verification is currently done by driving the real modules
  through Vite's dev module graph in the browser — effective, and it has caught
  real bugs, but it is re-done by hand every session.
- Phase 8's untested edge cases: very long names, duplicate names, rapid clicking
  during animation, browser resize mid-game, and a real streamed session.

---

# Known Issues / Blockers

No blockers.

- **Double Fate can waste half a roll.** Close Call (unshielded) and Death Mark
  both emit `ADD_DEATH_MARK`. `deathMark` is a boolean so it is harmless, but the
  pairing produces one effect from two Fates. Fixable by excluding
  effect-colliding pairs; deliberately left to see if it annoys in play.
- **"Clear save" during a live game is re-written by autosave** on the next
  action. Intended, but easy to mistake for a bug.
- **Fate Wheel segments are equal-sized** while selection is weighted. Open
  product decision since Phase 2 — the wheel does not communicate that Eliminate
  is far likelier than Safe.
- **No music.** `config.audio.music` exists but nothing plays a loop.
- **Duel has no VS scene.** Enhancement Phase 4 owns it.

---

# Important Decisions Made This Session

1. **Reduced motion damps decoration, never the mechanic.** The spin is the
   product; skipping it made the game look broken. Decorative motion still
   respects the media query.
2. **The crawl is reserved distance, not just slower easing.** Any ease-out
   concentrates travel early. Explicitly reserving a share of the *distance* for
   the final third is what puts a boundary genuinely in play.
3. **Wheel jitter is presentation, not game logic.** The engine still decides
   which entry wins; the wheel only decides where inside it to stop.
4. **`WheelMarker` is generic.** The wheel does not know what a Death Mark is —
   `MainWheel` maps domain status to colours. This is what let the Fate wheel
   reuse the component untouched, and it is why Bomb will be nearly free.
5. **Status on the rim, result in the fill.** Two independent visual channels, so
   "who is marked" and "who just won" never compete.
6. **Double Fate excludes target-spin Fates.** The engine tracks one pending
   target spin; two would overwrite each other and strand the first ability. A
   real limitation, documented in the spec rather than hidden.
7. **Eliminated players cannot be armed.** Added to `eventResolver` so Double
   Fate rolling Eliminate then Shield cannot leave armour on a corpse.
8. **Save version bumped rather than migrated.** Removing `again` made v1 saves
   unresumable; the rejection path built in Phase 6 exists for exactly this.

---

# Verification Performed

- `npm run build` — passes, 64 modules, no type errors.
- `npm run lint` (oxlint) — clean.
- `npx prettier --check` — all files conform.
- Orphaned `again.ts` deleted after confirming no importers.

Exercised against the real modules:

| Check | Result |
|---|---|
| Wheel lands in the correct segment for every offset, 2–20 segments | PASS |
| Landing offset never exceeds 0.78 of the half-arc | PASS |
| Easing monotonic, exact endpoints, velocity continuous at both joins | PASS |
| Spin animates under forced `prefers-reduced-motion` (46 rotation samples) | PASS |
| Close Call branches correctly on Shield | PASS |
| Steal Shield transfers, and hides when no Shield exists | PASS |
| Double Fate resolves two Fates, never recurses, never target-spins | PASS |
| Eliminated player cannot be given a Shield | PASS |
| Death Mark and Shield rims render, and coexist with the landed fill | PASS |
| Clean wheel renders no rims | PASS |
| 180 full games — valid winner, no stuck states, Shield cap held | PASS |

Live deployment verified after each commit by matching the deployed asset hash
against the local build.

---

# Notes for Next Agent

**The next step is playing, not building.** Wave 1 landed a lot of change at
once. Do not start Wave 2 until the host has played real games and said what
felt wrong.

Architecture boundaries have held for seven phases plus a rework. Keep them:

- `src/game/` decides outcomes. Components render and dispatch.
- Randomness goes through `src/utils/random.ts` — including inside `resolve`.
- Abilities emit events. Only `eventResolver.ts` changes state; only
  `eventQueue.ts` decides ordering.
- Every elimination goes through `attackPlayer()`.
- Undo wraps the reducer from outside; snapshots, never replay.
- Effects and audio are subscribers. Adding a cue means a registry entry.
- **`Wheel` knows nothing about players, abilities or statuses.** Adapters map
  domain state onto generic entries and markers.

Adding a Fate is still a two-file change: write the `AbilityDefinition`, add it
to `ABILITIES`. Wave 1 added three Fates without touching the reducer, the
wheels, or the event queue.

If a new mechanic seems to need an engine change, the missing piece is usually
an event type or a status trigger, not a branch.

---

# Last Updated

```text
2026-08-10
```
