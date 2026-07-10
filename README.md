# EDUOTAGA

An open-source virtual laboratory platform. Students run interactive
physics, chemistry, biology, electronics, mechanical, and mathematics
experiments in the browser and on mobile — free, no installation beyond
the app itself.

- **Website** — Next.js (App Router) + TypeScript + Tailwind CSS
- **Mobile** — Expo (React Native) + Expo Router + TypeScript
- **Backend** — Next.js Route Handlers only, backed by JSON files (no database)
- **Monorepo** — npm workspaces + Turborepo

See [`docs/architecture.md`](docs/architecture.md) for how the pieces fit
together, and [`docs/adding-experiments.md`](docs/adding-experiments.md)
for how to add a new experiment.

## Project structure

```
apps/
  web/       Next.js website + API
  mobile/    Expo Router mobile app
packages/
  types/       Shared TypeScript contracts
  constants/   Shared constants (categories, API routes, config)
  utils/       Shared axios client + formatting/search helpers
  ui/          Shared design tokens + web components
docs/        Architecture, API reference, roadmap
```

## Getting started

Requires Node 20.19+ (the mobile app's Expo SDK wants Node 22.13+ — see
note below) and npm 10+.

```bash
npm install
```

### Website

```bash
npm run dev:web       # http://localhost:3000
```

### Mobile

```bash
cp apps/mobile/.env.example apps/mobile/.env   # point EXPO_PUBLIC_API_URL at the web app
npm run dev:mobile
```

The mobile app has no backend of its own — it calls the same Next.js API
as the website. Run the website first (or point `EXPO_PUBLIC_API_URL` at a
deployed instance) before testing mobile screens that fetch data.

### Everything at once

```bash
npm run dev            # runs every app's dev script via Turborepo
npm run build           # builds every app
npm run lint             # lints every workspace
npm run typecheck        # typechecks every workspace
```

## Adding content

No database — content lives in `apps/web/data/*.json`, and experiment
simulations live in `apps/web/public/experiments/<category>/<slug>/`.
Adding a new experiment never requires touching frontend code; see
[`docs/adding-experiments.md`](docs/adding-experiments.md).

## Deployment (zero-cost to start)

- **Web**: Vercel free tier (Next.js is a first-class target).
- **Mobile**: Expo's free tier for development (`expo start`) and EAS
  Build's free plan for store builds.

## Node version note

This repo was scaffolded with Node 20.19.4 installed. Expo SDK 57 lists
Node 22.13+ as its minimum — the web app works fine on Node 20, but if you
hit Metro/Expo CLI issues, upgrade Node before filing a bug.

## Contributing

This is an open-source project — issues and PRs welcome. Keep changes
scoped to one package/app where possible, and update the relevant doc in
`docs/` alongside any architectural change.
