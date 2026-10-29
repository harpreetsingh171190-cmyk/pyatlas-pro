# v6 feature guide

## Installable and offline

The builder produces `index.html`, `manifest.webmanifest`, a service worker,
and 192/512 pixel PNG icons. All app scripts, translations, styles and catalogue
remain embedded in the HTML: no CDN, analytics, remote fonts or runtime packages.
On HTTPS or loopback, the worker precaches this shell. The service worker never
caches GitHub responses. Opening the HTML directly still works offline without
service-worker support. Installation prompts depend on the browser; iOS users
can use Share → Add to Home Screen. Initial installation requires a successful
visit to the hosted app. PWA installation is supported where the browser supports it;
external project pages and live GitHub refresh inherently require internet access.

Caches are content-versioned and scoped to the installation path. Existing tabs
continue using their current version; close all app windows and reopen to activate
a waiting update. Local workspace data is preserved. Browser data clearing also
removes bookmarks, learning progress, metadata snapshots and usage counts: export
backups separately. The workspace backup format remains schema 4; learning and
usage have dedicated exports to avoid silently changing existing backup semantics.

## Optional GitHub checks

Each GitHub project has a **Check GitHub now** button. Nothing calls GitHub until
that button is clicked. One click sends anonymous repository and latest-commit
requests directly to `api.github.com`; GitHub receives the normal network request
and IP address, but no workspace notes, query text, or local usage counters.
No tokens, scheduled polling, startup refresh, remote image loads or link previews.

Responses show stars, latest commit date, SPDX license, archived/disabled status
and the check date. A recent commit means within 365 days; older commits are
labelled **No commit in 12 months**, never “dead”. This heuristic is not a quality
or abandonment verdict. A cached result is explicitly labelled and remains
available offline. Non-GitHub URLs do not offer this button. Rate limits, network
failures, empty repositories and missing licenses are surfaced without fake data.
Requests time out after 12 seconds per endpoint; retry manually when needed.

## Stack Builder

Use bulk checkboxes on cards (unlimited, separate from the three-item comparison),
then open Stack Builder. Common tools have curated name suggestions, including
PyTorch → torch. Verify these names before use. For unknown names the field is
blank; enter a verified pip package name or leave blank to exclude it. The draft
omits blanks, validates names, and deduplicates normalized package identities.

Download `requirements.txt` or a valid TOML `[project]` draft. The builder does not
install or resolve packages, infer versions, guarantee compatibility, or audit
licenses. Review the draft before using pip. Names, URLs and options are never
interpolated into executable commands.

## English-only interface and search

The application interface and supplied documentation are English-only. There is
no language selector, translation runtime, or bundled Indic font. A previously
saved language preference cannot change the interface. Existing workspace data,
bookmarks, learning progress and personal notes are preserved. User-entered
content remains unchanged rather than being automatically translated.

Search supports exact quoted phrases and exact negative exclusions. Unquoted
words of at least four characters allow one typo (two for eight or more
characters), including adjacent transpositions. Short tokens remain exact.
Press `/` outside input fields to focus search. Press Ctrl+K or Cmd+K to open the
command palette; type to filter, ArrowDown/ArrowUp to move, Enter to run, Escape to
close. Tab navigation and native dialogs preserve keyboard access.

## Guided learning

Data Science and Web Development each provide 30 ordered days. Each tool has
three steps: explore documentation, build an example, review/practise. The paths
are suggested practice plans, not certified courses or a promise of mastery.
A matching catalogue item opens its existing workspace. If no matching entry
exists the guide says so. Check days off; progress is local and survives reloads.
Export/import learning progress separately. Import validates day numbers and
merges completed days without removing existing progress.

## Private usage insights

Usage counting is OFF by default. Opt in to record aggregate counts of searches,
project visits, workspace saves, stack downloads, GitHub checks and learning-step
changes. No queries, project IDs, timestamps or notes are recorded. Counts never
leave the browser automatically. Export them locally or clear them. This panel
is separate from the existing workspace/project statistics.

## Quality tools

`npm run test:v6` runs HTTP/PWA integration checks and axe WCAG 2 A/AA checks in
English light/dark themes. `npm run audit:lighthouse` starts a
local server and saves Lighthouse performance, accessibility, best-practice and
SEO reports. Scores depend on the machine; consult actual reports rather than
assuming 100. Lighthouse's former PWA category is not used; dedicated browser
tests verify manifest, worker control, caching, offline reload and scoped hosting.
