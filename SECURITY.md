# Security and privacy

The dashboard renders catalogue descriptions as text, accepts only HTTP(S) project URLs through the validated build pipeline, and escapes JSON before embedding it in HTML. New-tab links use `noopener noreferrer`. CSV output neutralizes spreadsheet formula prefixes. No telemetry, authentication tokens or remote scripts are bundled. Since 5.2 each built page also embeds a Content-Security-Policy meta tag that lists SHA-256 hashes of its single inline script and style, with `default-src 'none'`, no `unsafe-inline`, connections restricted to the same origin and api.github.com, no form submission and no plugins. Edit the page only through the build pipeline; manual edits to the inline code invalidate the hashes and the browser will refuse to run it. Meta-tag policies cannot set `frame-ancestors`; if you host the page, add that header at the server.

`serve` binds only to `127.0.0.1`, using a dedicated temporary directory containing the generated dashboard. Do not adapt this development server into a public multi-user service without suitable hosting and access controls.

Browser custom projects, notes, tags, collections, ratings, statuses, bookmarks and theme preferences remain in localStorage. Project links open external sites. Ordinary catalogue exports omit personal metadata; ordinary workspace backups include private notes and bookmarks and are not encrypted. The separate Secure backup action encrypts its downloaded file. Do not store secrets in notes. Backups are validated with schema, item, field-length and URL restrictions before an explicit merge action. Source catalogue files should pass `load_catalog` before distributing a dashboard.

Report reproducible vulnerabilities privately: use GitHub's **Report a vulnerability** button (Security tab) on the repository, or contact the maintainer, Harpreet Singh, through https://github.com/harpreetsingh171190-cmyk. Include affected release, steps and impact. Do not include credentials or personal data in a public issue.

Version 4 reports omit private notes by default, but include task text, ratings, collections, status, priority and deadlines. Report export shows an explicit private-notes opt-in. Treat reports and backups as personal data. Markdown/HTML in user report fields is escaped. Checklist data and planning fields are validated before saving or importing; deadlines do not create scheduled tasks or notifications.

View links (5.3) contain only the search text, category, sort and filter values you chose; every value is validated against fixed lists or length limits before use and unknown values fall back to defaults. They never include notes, tasks, ratings, bookmarks or backups, but a shared link does reveal the search words and tag or collection names in it.

Version 5 Secure backup uses browser Web Crypto AES-256-GCM and PBKDF2-SHA256 with fresh random salt/nonce values per file. Passwords must be 12–1024 characters and are never sent to a server or persisted by this application. There is no password reset for downloaded encrypted files. Browser memory, localStorage, ordinary backups, calendar exports and reports remain plaintext. Strong, unique passwords matter; this implementation has regression coverage but no independent security audit is claimed.

Encrypted imports reject unsupported algorithms, excessive derivation parameters, malformed encodings and size violations before applying data. Incorrect passwords and authentication failures do not merge a workspace. Decrypted data is then schema-validated and requires the same explicit merge action as a plain backup. Calendar exports omit notes and tasks, but still include project identity and metadata. Calendar downloads do not create remote events themselves.


Version 6 adds a service worker and manifest restricted to same-origin installation.
The shell cache is scoped and content-versioned. GitHub API requests occur only
from a user-clicked button, omit credentials and referrer, and carry no workspace
content. Cached snapshots contain only public repository metadata. Local usage
counters are opt-in, contain only aggregate numbers and never transmit. Learning
progress, usage preferences, and snapshots live in localStorage and have their
own export controls where appropriate. Clearing site data removes them. PWA
caching requires a successful initial HTTPS/localhost visit; external websites
and GitHub refresh still require internet. Package drafts are validated names,
not a dependency resolver, installer, compatibility check or license audit.

Version 6.1 removes translation code and embedded Indic fonts. The interface is
English-only; old language preferences are ignored without changing user data.


Version 7 allows explicit PyPI and OSV API requests in the CSP alongside the
existing GitHub endpoint. These requests carry public package names/versions,
not workspace content. Scans are not automatic. Source ZIP generation is local
and validates filenames/module names. Browser checks do not execute packages.
The optional CLI accepts registry-only requirements and permits network only
with --online. It uses pip binary-only dry-run resolution, never an sdist build
or package installation. Complete backups use a distinct authenticated context,
validate all sections before replacement and attempt storage rollback on failure.
Comparison scores are personal, and vulnerability/license metadata is not a
security guarantee or legal compatibility decision.


Version 8 image uploads are local raster PNG/JPEG/WebP only, re-encoded as JPEG
without their original metadata. Remote image URLs and uploaded SVGs are not
accepted. Names in generated SVG previews are XML-escaped; chart/diagram text
uses native text nodes. Uploaded gallery/history data has strict count/size/type
limits, is not transmitted, and participates in complete-backup validation.
Bundled official documentation images have explicit provenance and licenses.
