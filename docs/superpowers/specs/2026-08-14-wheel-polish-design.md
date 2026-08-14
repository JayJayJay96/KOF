# Enhancement Phase 1 — Wheel Polish

**Date:** 2026-08-14
**Status:** approved, not yet implemented
**Roadmap:** `DEVELOPMENT_ROADMAP.md` → Enhancement Phase 1

## Goal

Take both wheels from "functional" to signature. The wheel is the product — it is
what a viewer looks at for nine seconds of every round — and it currently reads
as competent and neutral.

Scope is **presentation only**. No game rule, weight, or outcome changes.

## Decisions

| Question | Decision |
|---|---|
| Slice sizing | Equal slices, no weight indicator |
| Visual direction | Arcade fighter select screen |
| Segment treatment | Gutter cells, plus a bright edge on the landed slice only |
| Label orientation | Radial (fixed by constraint, not taste) |
| Motion | Wind-up before launch; impact flash on landing |
| Typography | Arcade styling from system fonts — no webfont |
| Pointer | Heavier, more mechanical |
| Phase skin | Gutter and rim tint only; slice fills constant |
| Audio | Wind-up whoosh, stop thud, tick pitch ramp |
| Crawl length | +1s, and expressed in absolute ms rather than a fraction |

### Explicitly rejected

- **Proportional slice sizing.** Considered at length: it would make rarity
  visible, since a 3% Fate landing would look like the miracle it is. Rejected
  because the wheel is a slot machine, not a probability display — *"its never
  fair haha"*. This closes the project's oldest open question, open since Phase 2,
  as deliberate rather than unresolved. It also keeps Phase 1 free of any change
  to the landing maths.
- **A weight indicator on equal slices.** Follows from the above. No footnote.
- **Wheel recoil on stop.** A real wheel rocks back, but if the wheel overshoots
  and eases back, the pointer briefly sits in the *next* slice — the crowd sees
  it land on B and then "become" A. In a game where the engine picks the winner
  before the wheel moves, that reads as the game changing its mind.
- **Pointer settle.** The safe version of recoil (wheel stops exact, pointer
  flicks) was offered and declined. Not built.
- **State glow.** Declined. It would also have competed with the status rims.
- **A display webfont.** KOF ships zero binary assets — every sound is
  synthesised at runtime specifically to avoid files. A webfont would be the
  first asset, and on a canvas an unloaded font means labels draw in the fallback
  and then visibly jump.

## Constraints

### Colour is already a status channel

The wheel paints gold for the landed slice, and rim bands in purple (Death Mark),
light blue (Shield) and orange (Bomb). Any new colour must leave those four
legible. This is why a permanent neon rim and a full per-phase reskin were both
rejected — each collides with the Bomb marker.

### Labels must stay radial

Upright labels read better while spinning, but at 20 players they collide near
the hub. Radial is the only option that survives a full lobby.

### Gutters must not move logical boundaries

Gutters are drawn *inside* each slice. `segmentAtPointer` and
`resolveTargetRotation` are untouched, so the landing behaviour verified in
Phase 8 keeps working and the pointer can never sit in a gap.

### The wind-up makes the spin non-monotonic

The wheel rotates backward before launching. `spinProgress` therefore stops being
monotonic — a property currently asserted. Two consequences:

- The monotonicity assertion becomes "monotonic after the wind-up completes".
- The tick detector fires on backward boundary crossings. **These ticks play.** A
  wheel clicking as it is pulled back is correct, not a bug.

## Timing

The host approved the current feel — *"this speed is just nice"* — then asked for
one more second on the tail specifically, to stretch the moment where the pointer
creeps toward a boundary.

### The crawl becomes absolute, not fractional

`CRAWL_TIME` is currently a fraction (0.34), so the two wheels get different tails
— 2.3s on the Main Wheel, 1.8s on the Fate Wheel. Adding "one second" to a
fraction adds a different amount to each.

The crawl is a wall-clock experience, so it becomes `CRAWL_MS`, absolute. Every
wheel then gets an identical greasy tail regardless of its total duration.

| | Before | After |
|---|---|---|
| Crawl, both wheels | 2.3s / 1.8s | **3.3s** |
| Main Wheel total | 6800ms | **7800ms** |
| Fate Wheel total | 5200ms | **6200ms** |
| Fate stagger | 3000ms | 3000ms |
| Fast phase, wind-up included | 4500ms | 4500ms |
| Gap between reveals | 1.4s | 1.4s |
| Round | 8.2s | **9.2s** |

The extra second goes entirely into the tail. `CRAWL_DISTANCE` stays at 8.5% of
travel, so the same boundaries are crossed, each about 20% slower — the feeling
stretched rather than multiplied.

The wind-up costs 350ms and is carved **out of the acceleration phase**, not added
on top. Acceleration is currently 12% of the spin — 816ms on the Main Wheel — so
a 350ms wind-up leaves ~466ms of forward acceleration. Total fast-phase wall clock
is therefore unchanged at 4500ms; only its composition changes.

### Clamp required

`CRAWL_MS` as a fraction of a short spin can exceed the available time. With
`ACCEL_TIME` at 0.12, a crawl fraction above 0.88 drives `DECEL_TIME` negative and
the velocity solve breaks.

**The fraction is clamped to 0.60.** That leaves at least 0.28 of the spin for
deceleration at any duration, well clear of the failure point. At the clamp a
spin is 5500ms or shorter, and it still gets a 3.3s tail — proportionally more
crawl than the default, which is the right behaviour: a short spin should lose
blur, not tension.

This matters because `config.animationSpeed` is intended to shorten spins.

## Where the work lands

- **`wheelGeometry.ts`** — `spinProgress` gains a wind-up phase; crawl switches
  to `CRAWL_MS` with a clamped fraction; exact endpoints and `CRAWL_DISTANCE`
  preserved.
- **`Wheel.tsx`** — gutter rendering, landed-slice edge, impact flash, pointer
  shape, uppercase and tracked labels. Gains a `theme` prop carrying colours.
  Stays domain-agnostic (AGENTS.md §7.2) — it learns nothing about phases.
- **`MainWheel` / `FateWheel`** — map `phase` to a tint and pass it down, the
  same adapter pattern already used for `WheelMarker`.
- **`GameScreen.tsx`** — passes `state.phase` to both wheels, and the new
  durations.
- **`audioManager` / `soundRegistry`** — wind-up and stop cues, both synthesised.
  `onTick` changes from `() => void` to `(progress: number) => void` so tick
  pitch can bend with the slowdown.
- **`gameEngine.test.ts`** — geometry assertions updated for the wind-up; new
  tests for crawl clamping and for `segmentAtPointer` being unaffected by
  gutters.

## Success criteria

1. Landing still resolves to the engine's chosen segment for every offset and
   segment count — the Phase 8 sweep re-run, unchanged.
2. `spinProgress` still ends at exactly 1, and the crawl still covers exactly
   `CRAWL_DISTANCE`.
3. Crawl measures ~3.3s of wall clock on both wheels.
4. A short `spinDurationMs` clamps rather than producing negative deceleration.
5. Bomb, Shield and Death Mark rim colours remain distinguishable against the new
   gutters and tints, at 1280×720.
6. No horizontal or vertical overflow at 1280×720 or 1920×1080, 20 players.
7. Zero binary assets added.
