# VentureBuilt — Architecture

## Layers

```
src/config/    All tunable numbers & content. No logic.
  balance.ts     economy, quality, wages, finance, difficulty, offline caps
  content.ts     equipment tiers, marketing channels, upgrades, events, milestones, names

src/sim/       Pure simulation. No React, no DOM, no storage. Fully headless-testable.
  types.ts       GameState + every entity type (single source of truth)
  gen.ts         deterministic RNG (mulberry32, state serialized in save) + entity generators
  engine.ts      advanceDay(state) — the daily tick — plus quality/demand math and event effects
  actions.ts     everything the player can do (hire, buy, price, accept, loans, …), newGame(), offline sim

src/state/     store.ts — Zustand store: holds GameState, persistence (localStorage,
               versioned migrate()), the tick dispatcher, and `A.*` action wrappers for the UI.

src/ui/        React only. Reads GameState, calls A.* / store methods. Never mutates sim state directly.
  App.tsx        shell: clock interval, tabs, modals (event choices, offline summary), tutorial, debug menu
  bits.tsx       Card/Stat/Bar/Tip/Modal primitives
  tabs/          CoreTabs (Overview, Jobs, Team) · BizTabs (Marketing, Equipment, Upgrades, Finances)

scripts/simtest.ts   headless strategy + invariant + performance tests (npm run simtest)
```

## Data flow

1. UI clock (`setInterval`, period from `TIME.msPerDay[speed]`) calls `store.tick()`.
2. `tick`/`act` shallow-copy the root state object, mutate the draft via sim functions, persist, and `set()` — the new root reference triggers React re-render. **Rule: only sim functions mutate state, and only via `store.act(fn)` from the UI.**
3. All money movement goes through `earn()`/`spend()` in `engine.ts` — they update cash, lifetime/week/month aggregates and the daily stats row in one place. Never add to `s.cash` directly outside those (loans are the one audited exception).

## Determinism & saves

- RNG state (`rngState`) is part of `GameState`, so save/export/import reproduces the same future rolls.
- `SAVE_VERSION` in `actions.ts`; `migrate()` in `store.ts` is the upgrade hook — bump the version and add a transform there when the shape changes. Loads of newer-versioned saves are rejected rather than corrupted.
- Offline progress: `runOffline()` replays up to 7 capped days through `advanceDayAuto()` (real simulation with auto-accept, toasts silenced) — never an income multiplier.

## Performance model

- One tick per day, not per frame. Job list pruned past 400 entries, stats capped at 730 days, reviews at 60, history at 200. `simtest` asserts 3 simulated years < 5s (currently ~0.3s).

## How to extend safely

- **New tunable:** add to `config/`, read it in `engine.ts`/`actions.ts`. Don't inline numbers in sim code.
- **New upgrade:** add to `UPGRADES` in `content.ts`, then gate behavior with `hasUp(s, "id")` wherever it applies. The Upgrades tab renders it automatically (prereqs included).
- **New event:** add to `EVENTS`; effects go in `applyEvent()` in `engine.ts`. Add `choice` options to make it a decision modal — the UI and pause behavior are automatic.
- **New player action:** implement in `sim/actions.ts`, wrap in `A` in `store.ts`, call from UI.
- **New service/industry:** `SERVICES` in `balance.ts` + label in `content.ts`; generation, pricing UI and unlock flow are data-driven off that list (`minEquipTier` gates unlocks).
- **State shape change:** update `types.ts`, `newGame()`, and add a `migrate()` step. Run `npm run simtest` and `npm run build` before committing.
