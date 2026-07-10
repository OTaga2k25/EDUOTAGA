# API reference

All routes live in `apps/web/app/api/` and are implemented with Next.js
Route Handlers. Every response is JSON, shaped as:

```ts
{ success: true, data: T } | { success: false, error: { message: string; code?: string } }
```

## `GET /api/subjects`

Query params: `categoryId?` (one of the six category ids).
Returns `SubjectWithCount[]`.

## `GET /api/subjects/[slug]`

Returns a single `SubjectWithCount`, or a `404` error envelope.

## `GET /api/experiments`

Query params: `subjectId?`, `categoryId?`, `difficulty?`
(`beginner` | `intermediate` | `advanced`).
Returns `ExperimentSummary[]`.

## `GET /api/experiments/[slug]`

Returns a fully hydrated `ExperimentDetail`:

```json
{
  "success": true,
  "data": {
    "title": "Verifying Ohm's Law",
    "subject": { "id": "electricity-magnetism", "slug": "electricity-magnetism", "name": "Electricity & Magnetism" },
    "theory": "...",
    "procedure": [ ... ],
    "observation": "...",
    "simulationUrl": "/experiments/physics/ohms-law/index.html",
    "simulationAvailable": false,
    "videos": [ ... ],
    "downloads": [ ... ],
    "quiz": [ ... ]
  }
}
```

## `GET /api/theory/[slug]`

Lighter-weight variant of the experiment detail, for screens that only
need the written content: `{ slug, title, theory, procedure, observation }`.

## `GET /api/videos`

Query params: `experimentId?`. Returns `Video[]`.

## `GET /api/search`

Query params: `q` (required). Returns `SearchResultItem[]` — a merged,
scored list across experiments, subjects, and videos. See
`apps/web/services/search-service.ts` for the scoring rules.

## Consuming the API

Both apps go through `@eduotaga/utils`' `createApiClient()` /
`unwrap()` helpers and `@eduotaga/constants`' `API_ROUTES` so the path
strings and the success/error envelope are only defined once. See
`apps/web/hooks/` and `apps/mobile/services/api.ts` for the concrete
usage.
