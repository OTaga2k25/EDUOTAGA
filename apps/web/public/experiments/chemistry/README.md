# Chemistry experiments

Each experiment lives in its own folder here, named after its `slug` in
`apps/web/data/experiments.json`:

```
chemistry/
  <experiment-slug>/
    index.html   # simulation entry point (loaded in an iframe / WebView)
    style.css
    script.js
    assets/
      images/
      models/
```

To add a new experiment, see `docs/adding-experiments.md` — it only takes
a new folder here plus one JSON entry, no frontend code changes.
