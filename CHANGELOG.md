# 8.0.1

- Fixed: the online dependency audit failed for every package in browsers without `AbortSignal.any` (Chrome < 116, Safari < 17.4, Firefox < 124); the GitHub refresh had the same problem with `AbortSignal.timeout` in older browsers. Both now use compatible helpers.
- Fixed: `pyatlas inspect` rejected requirement lines with inline `# comments`, which pip accepts.
- Fixed: stale "Version 5" wording in the README; added Python 3.11, 3.13 and 3.14 classifiers; refreshed package description.
- Added regression tests for both fixes.

# 8.0.0

- Add five data-driven chart/graph panels, equivalent tables, SVG and JSON exports.
- Add architecture, project workflow, backup workflow and qualified per-project planning diagrams.
- Add project galleries and local raster screenshot upload/resize/removal with complete-backup integration.
- Bundle attributed FastAPI documentation screenshot and Matplotlib example output for offline use.
- Add labelled project illustrations without pretending they are real product screenshots.
- Retain English-only UI, privacy boundaries and previous professional features.

# 7.0.0

- Generate valid source ZIPs from verified dependency names/pins with src-layout CLI, pytest, Docker and CI.
- Check direct package Requires-Python metadata and query PyPI/OSV explicitly; cache reports offline.
- Add optional `inspect` CLI for real binary-only pip dry-run resolution and transitive advisory scans.
- Create/edit/reorder custom paths with stable completed-step identities and portable progress.
- Encrypt/validate/preview/restore all app data in one context-separated complete backup, with rollback on storage failure.
- Persist personal weighted comparisons and export decision reports.
- Keep English-only UI and existing workspace backup compatibility.

# 6.1.0

- Keep only the English interface and documentation.
- Remove the language selector, translation runtime, Indic font assets and font licenses.
- Ignore legacy language preferences without changing any existing workspace data.
- Update regression coverage for English-only behavior and rebuild PWA/release artifacts.

# 6.0.0

- Installable PWA with versioned scoped cache and local icons.
- Explicit-button GitHub stars, latest commit, license and cautious activity badges.
- Bulk-selection dependency drafts with curated package names and safe validation.
- Bundled Punjabi/Hindi interface, typo tolerance and Ctrl/Cmd+K commands.
- Two 30-day learning paths with local progress and portable exports.
- Opt-in local aggregate usage counters, no telemetry.
- Axe/Playwright checks, Lighthouse reports, Docker and MkDocs site.
- Tag-validated release artifacts and configurable PyPI OIDC publishing.
- Existing workspace schema 4 and original attribution preserved.

# Changelog

## 5.3.1 — 2026-10-29

- Wrapped four Python lines that exceeded the 140-character ruff limit (E501); behaviour unchanged.
- Added a real private vulnerability/conduct reporting route to SECURITY.md and CODE_OF_CONDUCT.md.
- Author metadata set to Harpreet Singh.

## 5.3.0 — 2026-10-29

- Added shareable view links (URL hash) with strict validation of every parameter, plus a Share view button.
- Added tag filter, clickable tags and a `tag` field in saved searches (older saved searches still load).
- Added cross-category duplicate-URL badges and a confirm-to-add warning for custom projects.
- First-visit theme now follows the system colour scheme; added reduced-motion and print styles.
- Added `tools/browser_checks.py` (Chromium feature checks) and three Node model tests; browser CI job now runs the new checks.
- Existing suites unchanged and passing (Python 11, Node 47 tests).

## 5.2.0 — 2026-10-29

- Added a hash-based Content-Security-Policy to every built page (no `unsafe-inline`, no network, no forms, no objects) plus a regression test that recomputes the hashes.
- Builder now writes bytes with LF endings so the hashes hold on Windows.
- Added GitHub Pages deployment workflow and a CI check that the committed `dist/index.html` is up to date.
- Added README screenshots and `tools/capture_screenshots.py`, which also fails on browser console errors.
- Added page icon, theme colour and no-referrer meta tags.

## 5.1.0 — 2026-10-29

- Added typed-package marker (`py.typed`), PyPI-style classifiers/keywords and a `dev` extra with ruff and mypy configuration.
- Added `pyatlas search --limit N`; `pyatlas stats` now reports unique URLs and the ten largest categories.
- Added lint/type-check CI job, workflow concurrency and timeouts, Dependabot, issue and pull-request templates, `.editorconfig`, Makefile and a code of conduct.
- Tightened type annotations in the Python package.
- Note: ruff and mypy configuration was added but could not be executed in the authoring environment; run them once and fix any findings.

## 5.0.1 — 2026-10-29

- Fixed CLI failure when stdout is not UTF-8 (e.g. redirected output on Windows).
- Dark theme now loads even when the saved workspace cannot be read.
- Raised backup PBKDF2-SHA256 iterations to 600,000; older backups (100,000–1,000,000) still import.
- Bulk collection updates now explain the 30-collection limit instead of a generic error.
- Corrected outdated README wording.

## 5.0.0 — 2026-10-29

- Added password-protected encrypted backup files and local unlock/restore.
- Added an actionable full-workspace Focus view for pending tasks and deadlines.
- Added iCalendar deadline export with stable UIDs, escaped text and UTF-8 folding.
- Added import impact counts before applying matching entries.
- Kept schema-4 compatibility and added explicit portable-backup size limits.
- Added fourteen model/crypto tests including Unicode and large-file roundtrips, wrong-password/ciphertext rejection and calendar boundaries.
- Extended real Chromium integration coverage for encryption, restore, Focus and calendar export.

## 4.0.0 — 2026-10-29

- Added per-project priority, target deadlines and task checklists.
- Added overdue/upcoming filters and priority/deadline/rating sorts.
- Added browser phrase search, exclusions and checklist text search.
- Added Markdown progress reports with optional private notes.
- Added compact mobile layout and collapsible workspace tools.
- Migrated workspace schema to 4 with version-2/3 backup compatibility.
- Added eleven model tests and an actual Chromium integration suite.
- Added pinned optional browser test tooling and CI browser job.

## 3.0.0 — 2026-10-29

- Added a filtered workflow board with accessible status transitions.
- Added multi-project status/collection updates and full-match selection.
- Added session Undo/Redo for workspace changes, up to 20 prior states.
- Added validated named saved searches, included in portable backups.
- Added full-workspace insights with status and category counts.
- Migrated workspace schema to 3 with schema-2 import compatibility.
- Added nine further regression tests for migration, bulk operations, saved searches and analytics.

## 2.0.0 — 2026-10-29

- Added custom project creation, editing and deletion with safe URL validation.
- Added private notes, tags, collections, workflow statuses and personal ratings.
- Added composable workspace filters, metadata search and card/list views.
- Added validated, previewed workspace backup merge and version-1 bookmark migration.
- Extended comparison with status, rating and collections.
- Added nine Node regression tests for workspace validation, safe merge and malformed imports.
- Updated privacy guidance, packaging and Punjabi instructions.

## 1.0.0 — 2026-10-29

- Introduced PyAtlas Pro branding and an independently written application.
- Imported 529 attributed catalogue entries across 74 categories into JSON.
- Added offline search, category navigation, local bookmarks, comparison and exports.
- Added dark mode, mobile layouts, keyboard search, text-safe rendering and CSV safeguards.
- Added a Python 3.10+ CLI, portable HTML builder and isolated loopback preview server.
- Added Windows/Unix launchers, packaging metadata, regression tests, CI and Punjabi instructions.
- Preserved upstream attribution and separated application and content licences.
