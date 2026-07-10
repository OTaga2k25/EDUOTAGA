# Architecture

EDUOTAGA is an npm-workspaces monorepo with two apps that share a small set
of framework-agnostic packages.

```
apps/
  web/      Next.js (App Router) — website + JSON-backed API
  mobile/   Expo Router — native app, no backend of its own
packages/
  types/       Shared TypeScript contracts
  constants/   Shared constants (categories, API routes, config)
  utils/       Shared axios client + formatting/search helpers
  ui/          Shared design tokens (all platforms) + React DOM components (web only)
docs/       You are here
```

## Core principle: one backend, two frontends

There is exactly one source of truth for content and business logic: the
Next.js app in `apps/web`. It reads JSON files from `apps/web/data/` and
exposes them through Route Handlers under `apps/web/app/api/`.

- The **website** renders Server Components that call the data/service
  layer directly (no network hop) for fast, SEO-friendly pages, and uses
  the same Route Handlers from Client Components (search, etc.) via
  React Query.
- The **mobile app** has no backend of its own. It calls the exact same
  Route Handlers over HTTP (`EXPO_PUBLIC_API_URL`), using the shared
  `@eduotaga/utils` axios client and `@eduotaga/types` contracts.

This means a new field added to `ExperimentDetail` is available to both
apps the moment the type and the route handler are updated — no second
implementation to keep in sync.

## Layers inside `apps/web`

```
data/          Raw JSON content (categories, subjects, experiments, videos)
lib/data.ts    Filesystem readers — the ONLY place that touches data/*.json
services/      Business logic: joins, filtering, search scoring, URL building
app/api/       Route Handlers — thin, just call services/ and shape the response
app/           Pages (Server Components) — call services/ directly
components/    Presentational UI, grouped by feature
hooks/         React Query hooks for Client Components
providers/     QueryClientProvider, ThemeProvider (dark mode)
```

`lib/data.ts` is intentionally the single choke point for reading content.
Swapping flat files for a real database later means changing that one file
— every service, route, and page keeps working unmodified.

## Layers inside `apps/mobile`

```
app/            Expo Router routes (file-based, mirrors the site's URL structure)
components/     Native (View/Text) presentational components
hooks/          React Query hooks, wrapping services/api.ts
services/api.ts Typed axios calls against the Next.js API
providers/      QueryClientProvider
constants/      Theme resolved from @eduotaga/ui tokens
```

Per the "native everywhere except the simulation" rule:

- **Theory, procedure, observation, videos, search, and navigation** are
  fully native (`View`/`Text`/`FlatList`) — no WebView.
- **The simulation only** is loaded in a `react-native-webview` pointed at
  the same HTML/CSS/JS bundle the website embeds in an `<iframe>` — see
  "Experiments" below. The experiment's simulation URL always comes from
  the API (`ExperimentDetail.simulationUrl`), never hardcoded.

## Experiments: content vs. code

An experiment's interactive simulation is a static HTML/CSS/JS bundle under
`apps/web/public/experiments/<categoryId>/<slug>/`, described in
[`docs/adding-experiments.md`](./adding-experiments.md). Both apps embed
that same bundle — the website in an `<iframe>`, the mobile app in a
`WebView` — so a simulation is written exactly once.

`ExperimentDetail.simulationAvailable` is computed server-side by checking
whether that folder actually exists yet, so both UIs can show a graceful
"coming soon" state instead of a broken embed for experiments whose JSON
entry exists but whose simulation hasn't been built yet.

## Shared UI: what's actually shared

React Native and the DOM render fundamentally differently, so there is no
truly universal component library here without pulling in react-native-web
(out of scope for now). What *is* shared:

- `@eduotaga/ui` (root export) — plain design tokens (colors, spacing,
  radii, typography). Both `apps/web/app/globals.css` and
  `apps/mobile/constants/theme.ts` are built from these values.
- `@eduotaga/ui/web` — actual React DOM components (`Button`, `Card`,
  `Badge`, ...), used only by `apps/web`.
- `apps/mobile/components/` has its own native equivalents that consume
  the same tokens, so the two apps look related without sharing JSX.

## Zero-cost deployment

- **Web**: deploy `apps/web` to Vercel's free tier (Next.js is a first-class
  target; Route Handlers run as serverless functions).
- **Mobile**: distribute via Expo's free tier — `npx expo start` for
  development, EAS Build's free plan for store builds. Point
  `EXPO_PUBLIC_API_URL` at the deployed website.
- **Content**: JSON files and static experiment bundles ship inside the
  Next.js build — no database, no object storage required to start.

## Future-ready surfaces

`packages/types/src/future.ts` defines contracts for authentication,
progress tracking, bookmarks, certificates, and leaderboards. Nothing
implements them yet — they exist so the eventual data shape is agreed on
ahead of time, avoiding breaking changes when those features land.
