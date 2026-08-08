# KOF — King of Fate

A host-controlled, arcade-styled elimination party game built around two wheels:
**Who gets selected?** (Main Wheel) and **What fate happens to them?** (Fate Wheel).

**Live:** https://kof-ten.vercel.app/

Current status: **Pass 1 — MVP. Phases 0–4 complete; Phase 5 next.**
The game is playable start to finish: enter players, then
`Spin Player → Spin Fate → Resolve → Next Round` until one winner remains.

All eight MVP Fates work — Eliminate, Shield, Safe, Again, Death Mark, Hunter,
Revive, Duel. Phase transitions, the Sudden Death treatment and the Winner
screen still need their presentation (Phase 5). See `PROJECT_STATUS.md`.

## Documentation

Read these in order. They are the source of truth, in this authority order:

| File | Answers |
|---|---|
| `PROJECT_SPEC.md` | What the product is, gameplay rules, MVP scope |
| `DEVELOPMENT_ROADMAP.md` | When features get built, phase order, exit criteria |
| `AGENTS.md` | How development work must be performed |
| `PROJECT_STATUS.md` | Where development currently stands |

## Stack

React 19 · TypeScript · Vite · Canvas (planned, Phase 1) · CSS effects · localStorage (Phase 6) · Vercel

## Commands

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run lint
```

```bash
npm run format
```

## Architecture

Game rules live in `src/game/` and are independent of rendering (AGENTS.md §7):

```text
src/
├── app/          App root, screen routing
├── components/   React UI (renders state, decides nothing)
│   ├── Wheel/    reusable Canvas wheel + pure geometry
│   ├── MainWheel/ players-to-entries adapter
│   ├── FateWheel/ abilities-to-entries adapter
│   ├── PlayerSetup/
│   └── GameScreen/
├── game/
│   ├── abilities/ one file per Fate + the registry
│   ├── engine/   reducer, selectors, shared attack flow
│   ├── phases/   phase thresholds + resolver
│   ├── events/   event vocabulary + the only place events change state
│   ├── types/    Player, GameState, AbilityDefinition
│   └── config/   default game configuration
├── hooks/        React bindings for the engine
├── styles/       baseline CSS (arcade theme is Phase 7)
└── utils/        centralised randomness, ids
```

`src/effects/`, `src/audio/` and `src/storage/` are named in the spec's target
structure but are not created yet — they arrive with the phases that need them.

### Adding a Fate

Write an `AbilityDefinition` in `src/game/abilities/`, then add it to `ABILITIES`
in `src/game/abilities/index.ts`. That is the whole change — no component, wheel
or reducer edit. Anything that causes elimination must go through
`attackPlayer()` in `src/game/engine/attack.ts` so Shield keeps working.

Abilities return events; they never mutate state. `events/eventResolver.ts` owns
what an event does, `events/eventQueue.ts` owns ordering. A multi-step ability
suspends by emitting a blocking event (`WAIT_FOR_HOST`, `REQUEST_FATE_SPIN`,
`REQUEST_PLAYER_SPIN`) and resumes when the host continues.

There are three extension points, none of which requires touching the reducer:

| To add | Where |
|---|---|
| A Fate | `game/abilities/` + one line in `ABILITIES` |
| A Fate that picks a target | the same, plus a `resolveTargetSpin` hook |
| A persistent status | `game/statuses/` + one line in `SELECTION_TRIGGERS` |
