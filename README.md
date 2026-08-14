# VentureBuilt

A browser-based business simulation. Start with a few hundred dollars and a beat-up starter kit; build a service company through pricing strategy, hiring, equipment, marketing, reputation, and cash-flow management. Runs entirely client-side — no backend, no accounts.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build -> dist/
npm run preview  # serve the production build locally
npm run simtest  # headless simulation/balance tests (no browser)
```

## Play notes

- **⏸ / 1× / 2× / 4×** in the top bar control the clock; **+1 day** steps one day at a time.
- Saves live in `localStorage`, autosave on every action + every few sim days. **Finances → Save management** has Export/Import (JSON file) and New game.
- Offline progress is simulated (auto-accepting jobs to your capacity) and capped at 7 days.
- **Ctrl+Shift+D** opens the hidden developer menu (cash, time skip, spawns, unlocks, sim internals).
- Tooltips: hover any stat that isn't obvious.

## Deploy to GitHub Pages

1. Push this repo to GitHub with default branch `main`.
2. Repo **Settings → Pages → Source: GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) builds and deploys on every push to `main`.

`vite.config.ts` uses `base: "./"`, so the build works under any repo path with no config changes.

## Docs

- `GAME_DESIGN.md` — core loop, formulas, balance, progression, future ideas.
- `ARCHITECTURE.md` — how the code is organized and how to extend it safely.

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · Recharts · Zustand. No paid APIs, no external services.
