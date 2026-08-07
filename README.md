# KOF — King of Fate

A host-controlled, arcade-styled elimination party game built around two wheels:
**Who gets selected?** (Main Wheel) and **What fate happens to them?** (Fate Wheel).

**Live:** https://kof-ten.vercel.app/

Current status: **Pass 1 — MVP. Phases 0–1 complete; Phase 2 next.**
The Main Wheel works end to end: enter players, start, spin, land on a result.
There is no Fate Wheel and no abilities yet — that is Phase 2. See
`PROJECT_STATUS.md`.

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
│   ├── PlayerSetup/
│   └── GameScreen/
├── game/
│   ├── engine/   reducer, selectors, pure engine primitives
│   ├── phases/   phase thresholds + resolver
│   ├── events/   game event vocabulary
│   ├── types/    Player, GameState, AbilityDefinition
│   └── config/   default game configuration
├── hooks/        React bindings for the engine
├── styles/       baseline CSS (arcade theme is Phase 7)
└── utils/        centralised randomness, ids
```

`src/game/abilities/`, `src/effects/`, `src/audio/` and `src/storage/` are named in
the spec's target structure but are not created yet — they arrive with the phases
that need them.
