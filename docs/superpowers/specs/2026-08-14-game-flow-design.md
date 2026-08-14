# Enhancement Phase 2 — Game Flow Polish

**Date:** 2026-08-14
**Status:** approved and implemented
**Roadmap:** `DEVELOPMENT_ROADMAP.md` → Enhancement Phase 2

## Goal

One click per round.

> *"basically i click a spin, everything happens there and done, then i click
> again for the next round to start spinning"*

The host clicks Spin. The Fate resolving, the beats inside a multi-step Fate, the
target spin and the round closing all follow on timers. The game comes to rest at
`idle`, ready for the next click.

This turns the host from an operator into a commentator. Before it, a plain round
cost three clicks and a Hunter round five — 120 to 160 clicks across a full game,
with a hand on the mouse throughout.

## The buttons are not removed

Every action button stays, and each still dispatches exactly what its timer is
about to dispatch. Three things fall out of that:

- **Click-to-skip is free.** Pressing a button does now what the timer would do
  in a moment.
- **Control is returned, not taken.** When the room is still reacting, do
  nothing. When nothing happened, press on.
- **Nothing can strand the game.** If a timer somehow never fires, the button is
  still sitting there.

While a timer is armed the button carries a progress fill. Without it, a button
counting down looks identical to one waiting for input — the host either presses
it needlessly or wonders whether anything is happening at all.

## Holds

Sized to replace the time a host was already spending pressing the button, so a
plain round lands about where it did, just hands-free.

| Beat | Hold |
|---|---|
| Player landed → Fate spin *(sequential fallback only)* | 900ms |
| Fate revealed → resolve | 1600ms |
| Target requested → target spin | 1200ms |
| Mid-resolution beat → continue | 2200ms |
| Outcome → round closes | 2400ms |

`nextRound` is deliberately the longest: it is sized to host the ~2s outcome
animation the host plans to add later.

Resulting rounds: plain ~14.8s, Hunter/Duel ~24.5s.

## Target re-spins skip the pull

A pull-back is the wheel being *loaded*. Within a round it is already loaded, so
hauling it back a second time is a beat that never happened — and hearing the
1.5s ratchet twice inside twenty seconds dulls it.

`createSpinProfile` therefore treats a pull distance of zero as a pull time of
zero. Without that rule, a spin asked to skip its wind-up would still sit
motionless for 1.5s, which reads as a hang rather than a saving.

## Correctness

`resolveAutoAdvance(state)` is pure and derived entirely from state, and the
effect that runs it is keyed on that state. Any change cancels the pending timer
and schedules afresh. That is what makes the three dangerous cases safe:

- **Undo mid-hold.** The undo rewrites state, the cleanup clears the timer, and
  the restored state schedules its own.
- **The winner screen.** `resolveAutoAdvance` returns null at `winner`, so
  nothing can roll past the end of a game.
- **The resume prompt.** No auto-advance while a saved game awaits a decision.

The reducer is untouched. It still rejects invalid transitions, so even a stray
timer cannot corrupt a round — and the engine tests needed no changes, because
they drive the reducer directly.

## Rejected

- **A separate fast-forward / skip-animation mode.** Click-to-skip already covers
  the holds, and the only thing left to shorten is the spin itself — which is the
  product. Revisit if the host ever reaches for it.
- **Keeping the Resolve click.** The 3s reveal gap and the situation line already
  give the room its reaction window during the crawl; Resolve asked the host to
  confirm something everyone had finished reacting to.
- **Keeping a click on the target spin.** Considered, since Hunter and Duel are
  the most dramatic Fates and a deliberate spin for the victim is part of why
  they land. Rejected for consistency: one click per round, always.

## Verified

Three consecutive rounds driven with one click each, every one settling back to
`Spin Player` unattended:

```text
plain    Spinning… → Resolve → Next Round → Spin Player
hunter   Spinning… → Resolve → Spin Target → Continue → Next Round → Spin Player
```

Armed fill observed with hold values of 1600ms, 1200ms and 2200ms, and never
present while resting at `Spin Player` — which is the host's click, and must not
look automatic.
