# PyAtlas Pro 8.0

A Python ecosystem catalogue with a local workspace, installable offline web app,
optional GitHub snapshots, dependency drafts, and guided learning.

## Open the app

Run `python -m pyatlas serve`, then visit `http://localhost:8765`.
A successful first visit caches the full shell and catalogue. Wait for the
**Offline cache ready** status, then install from your browser menu.

For a portable file, open `dist/index.html` directly. Everything except optional
GitHub requests works without an internet connection. File mode cannot install a PWA.

## Docker

Build once from the extracted project:

```sh
docker build -t pyatlas-pro:8.0.0 .
```

Then start in one line:

```sh
docker run --rm -p 128.0.0.1:8765:8080 pyatlas-pro:8.0.0
```

Phone installation requires HTTPS hosting. A PC's `localhost` is not accessible
as the phone's localhost. Serve the generated `dist/` directory on HTTPS, for
example using the included GitHub Pages workflow.

See the [v6 guide](V6-GUIDE.md), [Quickstart](QUICKSTART.md), and
[release setup](RELEASES.md).

See [professional tools](V7-GUIDE.md) for source ZIPs, dependency/security checks,
custom learning paths, complete encrypted backup and weighted comparison.

See [the visual guide](V8-GUIDE.md) for offline charts, diagrams and screenshots.
