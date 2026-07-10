# Roadmap

Not implemented yet — listed here so scope is explicit and the data shapes
in [`packages/types/src/future.ts`](../packages/types/src/future.ts) are
agreed on ahead of time.

| Feature | Notes |
| --- | --- |
| Authentication | `User` type defined. Plan: Auth.js (NextAuth) or Clerk on the web app; mobile authenticates against the same Next.js API. |
| Admin dashboard | A `(admin)` route group in `apps/web/app`, gated by `User.role === 'admin'`, for editing `data/*.json` without hand-editing files. |
| Certificates | `Certificate` type defined. Issued on subject completion; rendered server-side (e.g. `@react-pdf/renderer` or an HTML→PDF route). |
| Bookmarks | `Bookmark` type defined. Needs persistence (see below) once auth exists. |
| Progress tracking | `ExperimentProgress` type defined, including quiz score. |
| Quiz | Already implemented client-side (`QuizBlock` / `QuizView`) as a knowledge check; persisting scores depends on auth + storage. |
| Leaderboards | `LeaderboardEntry` type defined. Depends on progress tracking. |
| Notifications | `Notification` type defined. Push via Expo Notifications on mobile, web push or email on the site. |
| Analytics | Plan: privacy-respecting, self-hosted-friendly option (e.g. Plausible/Umami) rather than a heavier vendor SDK, to keep the zero-cost story intact. |

## When JSON files stop being enough

`apps/web/lib/data.ts` is the only file that reads `data/*.json`. Moving to
a real database (Postgres via Prisma/Drizzle, or a managed service) means
rewriting the functions in that one file — every service, route handler,
and page keeps working unchanged. This was a deliberate design constraint,
not an accident — see [`docs/architecture.md`](./architecture.md).
