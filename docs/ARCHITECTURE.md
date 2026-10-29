# Version 8 visual layer

`visual-core.js` derives chart data from validated workspace/learning/comparison
state, validates screenshot/history payloads and defines qualified diagram
models. `visual-ui.js` renders accessible native SVG plus data tables and uses
local raster decoding/canvas re-encoding for screenshot uploads. External SVG
uploads and remote image URLs are not accepted. The gallery has an aggregate
3 MB limit, while the overall complete backup remains limited to 8 MB.

The builder embeds `visual-assets.json` as escaped application/json, alongside
existing catalogue data, so official documentation assets need no runtime fetch.
They are distributed with source/license metadata. CSP hashes and service-worker
cache digest cover the generated HTML including all embedded visual resources.

Complete-backup validation recognizes the optional `visuals:v1` key and validates
it before storage mutation. The Node validator loads the visual module lazily;
the browser validator uses the initialized global module. Default history is
empty and only explicit daily snapshot actions add dates.

See [the visual guide](V8-GUIDE.md).

---

# Version 7 professional layer

`professional-core.js` contains data validation, conservative Python metadata
checks, weighted ranking, safe starter-file generation, CRC32/ZIP serialization
and transactional storage replacement with rollback. `professional-ui.js` owns
explicit network actions and the new native dialogs. No external JavaScript
library is required by the application at runtime.

The workspace bridge exposes validated in-memory workspace state, active view,
selection and current learning/usage snapshots so complete backups also capture
session data when storage is full. Unsaved custom-path drafts are excluded until
Save is chosen. Complete backup envelopes use separate AES-GCM authenticated
data from the original workspace-only backup format; both remain supported.

The CSP additionally permits `https://pypi.org` and `https://api.osv.dev`, while
retaining exact hashes for inline code/styles. Calls occur only in explicit
handlers. `inspector.py` provides optional Python registry parsing, binary-only
pip dry-run resolution and transitive OSV queries when `--online` is supplied.
Its reports are importable into the same browser audit panel. Browser-only
metadata checks never claim to perform transitive resolution.

New local keys: `custompaths:v1`, `comparison:v1`, `audits:v1`, `results-layout`
and complete-backup `view:v1`, all under `pyatlas-pro:`. Workspace schema 4 remains
unchanged. Learning exports use a separate schema 2 wrapper; original schema 1
progress imports remain accepted.

See [professional tools](V7-GUIDE.md), [validation](VALIDATION.md), and the earlier
architecture notes below.

---

# v6 architecture additions

The existing catalogue/workspace layers below are preserved. The builder now
also embeds `features-core.js` and `features-ui.js`. The interface is English-only. Feature core contains testable pure functions; feature UI integrates with
a deliberately small workspace bridge (entries, bulk selection, editor, export,
notices). Existing workspace schema 4 remains compatible.

Generated PWA sidecars are `manifest.webmanifest`, `sw.js`, and two PNG icons.
The cache identity hashes all shell bytes and URL-encodes the registration scope
with a delimiter, so root-scope updates cannot purge nested app caches. GitHub
responses never enter the shell cache. The CSP hashes inline app code/styles,
allows same-origin workers/manifest, and click-triggered
connections to api.github.com. New external scripts and unsafe inline code stay
blocked.

Local storage namespaces: `learning:v1`, `github:v1`, and
`usage:v1` (feature keys also use the `pyatlas-pro:` prefix). No automatic network
sync. Learning/counter exports are independent of existing workspace backups.
See [v6 guide](V6-GUIDE.md) and [validation](VALIDATION.md).

---

# Architecture

The source of truth is `pyatlas/data/catalog.json` with schema version 1 and six string fields per row. Source provenance is stored at the top level. `catalog.py` validates fields, URLs and unique IDs, implements all-word search and stable sorting, and exports safe CSV.

`builder.py` reads the HTML shell, CSS and JavaScript, validates the catalogue and embeds everything into one HTML document. HTML-sensitive JSON characters are escaped before script embedding. Builds are deterministic for the same source bytes.

The browser filters the in-memory catalogue, renders descriptions with `textContent`, keeps bookmarks in browser localStorage, and tracks a three-item comparison set in memory. Rendering happens in batches of 48; exports cover the entire current filtered list. No server-side state or API is required. Both interfaces use all-word search. Browser search additionally includes personal notes, tags and collections; the CLI operates only on the bundled catalogue. Locale-specific sort order can differ.

The CLI uses the same validation and build modules. Local serving first generates into a temporary directory and serves only that directory on loopback; it cannot browse the original source tree through the configured document root. `TemporaryDirectory` cleans up after the process exits normally. The Python package includes its JSON and UI assets via setuptools package-data.

No metrics API, database, cloud sync, account system or production hosting service is included. Standard-library tests protect parsing, search, export, script embedding and CLI failure behavior. The CI definition adds cross-platform coverage when run on GitHub.

## Version 2 personal workspace

`assets/workspace.js` is a dependency-free shared validation module, exposed to the browser as `PyAtlasCore` and exported for Node tests. Workspace schema 2 includes custom projects, bookmarks and per-project metadata: notes, tags, collection names, workflow status and rating. IDs separate bundled entries from custom entries. All imported values are reconstructed from allowed fields with size and type limits; URLs reject non-HTTP(S) schemes and credentials. Metadata remains text rather than HTML.

The UI stores the entire workspace under `pyatlas-pro:workspace:v2`, migrating version-1 bookmarks on first load at the same browser origin. A failed storage write keeps the current session data and displays a backup instruction. Backups omit theme preference. Imports validate before preview, and require the Merge workspace action. Merge deduplicates custom IDs and bookmarks, keeps unrelated metadata, and uses incoming fields for matching IDs. Collections are named memberships on project metadata rather than separate empty folders. Ratings and workflow status are personal assessments.

The Python CLI does not read browser localStorage and does not expose private workspace data. Catalogue exports omit personal metadata; workspace backups contain it. Card/list layout is a session preference. No encryption is supplied for localStorage or downloaded backups.

## Version 3 workflow and history

Workspace schema 3 adds up to 50 named saved searches with validated filter fields. `validate` accepts schema 2 and upgrades it without losing project metadata; `merge` combines saved searches by name with imported names taking precedence. The browser reads the v3 localStorage key first, falling back to the v2 workspace key and then v1 bookmarks when neither workspace is present. New changes write only the v3 key. Browser origin restrictions still apply.

`batch` applies immutable status and collection updates, validates the complete result and preserves existing notes, ratings and collections. `analytics` derives counts from the current catalogue plus custom entries, excluding orphan metadata and bookmarks from totals. Both are covered by Node regression tests. The workflow board uses the existing filtered and paginated result set, with accessible status dropdowns rather than drag-only interaction.

A central `commit` validator records up to 20 prior state snapshots before replacing workspace state. Undo and redo are session-only, trigger persistence, refresh navigation and remove selections that reference absent projects. Imports and destructive custom deletions pass through this same mechanism. Rendering, filter changes, layout and bulk selection are not history entries. Analytics and board contents are computed locally without network calls.

## Version 4 planning and reporting

Schema 4 adds validated per-project priority, an optional strict ISO calendar deadline and up to 50 uniquely identified checklist tasks. Schema 2 and 3 metadata migrate with Normal priority, no deadline and an empty checklist. Saved searches add priority/deadline filters with empty defaults for older backups. The v4 storage key falls back to v3 and v2 workspaces, then legacy v1 bookmarks. Imported data is validated and rebuilt from allowed fields.

The pure model supplies calendar-date validation, date buckets, phrase/exclusion search, deterministic planning sorts and Markdown report generation. The browser calculates today's date using its local calendar; date differences use normalized UTC midnights to avoid daylight-saving drift. Deadlines are independent of workflow status. Task checkboxes edit a dialog-local copy until the Save project action commits the workspace.

Reports cover the current filtered set without pagination limits, escape user Markdown/HTML, retain catalogue attribution and omit private notes unless requested. They include task text and other personal planning data, and are not importable backups. The CLI remains a bundled-catalogue tool; it does not read browser planning data.

Optional Playwright tooling is pinned in package-lock.json and isolated from Python/runtime dependencies. `tests/browser_smoke.cjs` checks real browser workflows and three responsive widths. Internal QA screenshots are not included in the release archive.

## Version 5.3 navigation and awareness

`workspace.js` gains pure `encodeView`/`decodeView` (URL-hash serialisation with allow-lists; a hash without `=` such as the skip link `#results` is ignored), `duplicates` (groups rows by a normalised URL key: lower-case host without `www.`, no trailing slash) and a tag field in `savedSearch`. `explorer.js` writes the hash from `render()` with `replaceState` (no history spam; accessed as `globalThis.history` because the undo stack uses the local name `history`) and applies a pasted hash on load and on `hashchange`. `tools/browser_checks.py` exercises theme, links, duplicates, tags and the share fallback in Chromium.

## Version 5.2 delivery hardening

`builder.py` computes SHA-256 hashes of the one inline script and one inline style after all substitutions and writes them into a Content-Security-Policy meta tag (`content_security_policy`). The file is written as bytes with LF endings so the hashes stay valid on Windows. A unit test recomputes the hashes from a fresh build, and CI rebuilds `dist/index.html` and fails if the committed copy differs. `.github/workflows/pages.yml` publishes the same build to GitHub Pages. `tools/capture_screenshots.py` drives Chromium through a sample workspace, fails on any console error or CSP violation and writes `docs/screenshots/`.

## Version 5 portable privacy and focus

The data schema remains 4. `productivity.js` adds pure import-impact analysis, focus derivation and RFC-style iCalendar generation. Focus excludes archived projects and includes pending tasks or overdue/upcoming deadlines across all entries, ignoring directory filters. Calendar events use stable entry IDs, date-only DTSTART, UTC DTSTAMP and transparent all-day events, with escaped text and 75-octet UTF-8 line folding. No alarms or network calendar API are used.

`vault.js` is a separate browser/Node-testable module using standard Web Crypto. Its version-1 envelope records AES-256-GCM, PBKDF2-SHA256, iteration count, salt, nonce and ciphertext. Fresh 16-byte salt and 12-byte nonce values are generated per backup. Keys are derived with 600,000 iterations; derivation imports are bounded to 100,000–1,000,000 iterations, and encoding/length checks happen before decryption. GCM authenticates ciphertext with a fixed format marker as additional data. Decoded workspace data is validated using the existing schema validator.

Plain backups use an 8 MB file limit; encrypted envelopes accept up to 16 MB with at most 8 MB decoded workspace data. Password fields are cleared on closing; encryption/decryption stays local. A dialog generation counter prevents a cancelled asynchronous operation from applying its result in a subsequently reopened dialog. Session plaintext and browser storage are not encrypted; this is file protection rather than a locked-at-rest application.

The browser importer detects envelope format, unlocks when needed, validates the workspace, shows a non-mutating impact preview and applies data only through the explicit merge action. Wrong-password and corrupt-file failures do not commit imported data. Focus completion passes through the existing central commit/undo mechanism.
