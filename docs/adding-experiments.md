# Adding a new experiment

Adding an experiment never requires touching frontend code on either app.
It takes exactly two steps:

## 1. Add the simulation folder

Create a folder under `apps/web/public/experiments/<categoryId>/<slug>/`,
where `categoryId` is one of `physics`, `chemistry`, `biology`,
`electronics`, `mechanical`, `mathematics`:

```
apps/web/public/experiments/physics/pendulum-motion/
  index.html
  style.css
  script.js
  assets/
    images/
    models/
```

`index.html` is the simulation's entry point — it's what gets embedded in
an `<iframe>` on the website and in a `WebView` on mobile. Keep the
simulation self-contained (no calls back into the Next.js app); it only
needs to run inside its own frame.

## 2. Add one JSON entry

Add a matching object to `apps/web/data/experiments.json`:

```json
{
  "id": "pendulum-motion",
  "slug": "pendulum-motion",
  "title": "Simple Pendulum Motion",
  "subjectId": "electricity-magnetism",
  "categoryId": "physics",
  "difficulty": "beginner",
  "summary": "One sentence describing the experiment.",
  "theory": "Explanatory text. Use **double asterisks** for emphasis.",
  "procedure": [
    { "order": 1, "title": "Step title", "description": "What to do." }
  ],
  "observation": "What students should observe / record.",
  "simulationEntry": "index.html",
  "videoIds": [],
  "downloads": [],
  "quiz": [],
  "tags": ["pendulum", "oscillation"],
  "estimatedDurationMinutes": 20,
  "createdAt": "2026-01-01T00:00:00.000Z",
  "updatedAt": "2026-01-01T00:00:00.000Z"
}
```

- `subjectId` must match an existing entry in `apps/web/data/subjects.json`
  (add one there first if this is a genuinely new subject).
- `simulationEntry` is the filename inside the folder from step 1 — almost
  always `index.html`.
- To attach videos, add entries to `apps/web/data/videos.json` with a
  matching `experimentId`, then reference their `id`s in `videoIds`.
- `downloads[].path` is resolved relative to the same experiment folder
  (e.g. `"assets/worksheet.pdf"`).

That's it. `GET /api/experiments`, `GET /api/experiments/<slug>`,
`GET /api/theory/<slug>`, and search all pick up the new entry
automatically, on both the website and the mobile app, because both read
through the same service layer — see
[`docs/architecture.md`](./architecture.md).

## Checking your work

- `npm run dev:web` and visit `/experiments/<slug>` — the Simulation tab
  should load your `index.html`. If it shows "Simulation coming soon"
  instead, double-check the folder path matches `categoryId`/`slug`
  exactly.
- `GET http://localhost:3000/api/experiments/<slug>` should return your
  new entry with `simulationAvailable: true`.
