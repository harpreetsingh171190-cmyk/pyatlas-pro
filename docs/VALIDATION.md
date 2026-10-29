# Version 8 validation

Validated locally on 2026-10-29. English-only UI and previous professional tools
remain available. No public release, PyPI publication or deployment was performed.

## Evidence

- **65 JavaScript unit tests** and **16 Python tests** pass. Visual coverage adds
  real-data aggregation, date replacement/validation, media limits, rejection of
  remote/SVG payloads, escaped previews and complete-backup media validation.
- Ruff and strict mypy pass for the application and development Python scripts.
- Original browser regression and v6/v7 integration suites pass, including
  encrypted backup/restore, project CRUD, comparisons, dependency checks and PWA
  offline/cache-scope behavior.
- v8 browser checks pass: five charts/data tables, three application/workflow
  diagrams, project blueprints, self-contained SVG export, one snapshot per day,
  official documentation image decoding/provenance, illustrated fallback labels,
  raster normalization, persisted screenshots and card thumbnails.
- Screenshot/history sections survive complete encrypted backup and restore.
  Gallery/charts work after offline reload with zero external requests. A line
  graph is verified with two synthetic dated snapshots in the test profile;
  these test records are not shipped as user data.
- Axe WCAG A/AA checks find no violations in visual/gallery dialogs in light and
  dark themes. Earlier professional dialogs also pass. Width checks cover 390,
  768 and 1440 px. Rendered charts/backup diagram were visually inspected.
- MkDocs strict build passes. Current source/wheel builds include the visual
  JavaScript, bundled image metadata and full upstream image licenses.

See `reports/v8-browser.json` and earlier browser reports. Lighthouse HTML/JSON
reports and `reports/lighthouse-summary.json` record local mobile-simulation
measurements; scores vary by hardware and hosting.

## Limits

The only bundled third-party documentation images are FastAPI's actual Swagger
UI screenshot and Matplotlib's plot output, retrieved from official sites.
Other project cards are explicitly labelled original illustrations, not real UI
screenshots. Per-project architectures are suggested category-based blueprints,
not independently verified implementation diagrams. Project images can be
uploaded locally by the user, subject to browser quota and documented caps.

Automated axe testing does not replace a manual screen-reader audit. Physical
mobile/desktop install prompts and Docker were not exercised here. PyPI/OSV/
GitHub test responses are mocked; arbitrary live package resolution is not
certified. Complete-backup storage rollback is best-effort; keep downloaded
backups until restored data is checked.
