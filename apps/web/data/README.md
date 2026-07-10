# Content data (JSON, no database)

`categories.json`, `subjects.json`, `experiments.json`, and `videos.json` are
the single source of truth for site content. They're read server-side by
`lib/data.ts` — never fetched over HTTP from within the Next.js app itself.

- Video `url` fields are placeholders (`REPLACE_WITH_REAL_ID`) — swap in real
  YouTube/Vimeo IDs before shipping.
- `experiments[].simulationEntry` is a filename resolved against
  `public/experiments/<categoryId>/<slug>/`. See
  [`docs/adding-experiments.md`](../../../docs/adding-experiments.md).

When the platform outgrows flat files, this is the only layer that needs to
change — swap the `fs.readFile` calls in `lib/data.ts` for real queries and
every route handler, service, and page keeps working unmodified.
