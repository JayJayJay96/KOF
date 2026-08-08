# KOF — King of Fate

A host-controlled, arcade-styled elimination party game built around two wheels:
**Who gets selected?** (Main Wheel) and **What fate happens to them?** (Fate Wheel).

**Live:** https://kof-ten.vercel.app/

Current status: **Pass 1 — MVP feature-complete. Phase 8 (playtesting) next.**
Enter players, then `Spin Player → Spin Fate → Resolve → Next Round` until one
winner remains — with impact effects, sound, phase transitions and a winner
screen along the way.

All eight MVP Fates work — Eliminate, Shield, Safe, Again, Death Mark, Hunter,
Revive, Duel — alongside undo, save/resume and the host panel.

Every MVP feature is built, so **the next step is playing real games**, not
writing more code. See `PROJECT_STATUS.md`.

**Host panel:** `Ctrl+Shift+H` — undo, roster edits, save controls, event history.

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
├── audio/        synthesised cues + event-to-sound map
├── effects/      impact layer + event-to-effect map
├── hooks/        React bindings for the engine
├── storage/      localStorage save/resume, versioned
├── styles/       arcade theme
└── utils/        centralised randomness, ids
```

All audio is generated at runtime from oscillators — there are no sound assets,
so every cue is original and nothing needs licensing.

Undo lives in `game/engine/undo.ts` as a wrapper *around* the reducer. It stores
snapshots rather than replaying actions, because abilities use randomness during
resolution and a replayed log would produce a different game.

**Effects and audio are subscribers, not engine code.** They react to events the
reducer already emits, so adding a sound or an effect means adding one registry
entry in `audio/soundRegistry.ts` or `effects/effectRegistry.ts` — never a
change to `src/game/`.

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
