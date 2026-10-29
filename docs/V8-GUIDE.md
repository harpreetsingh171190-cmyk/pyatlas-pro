# Visual dashboard, diagrams and project images

Version 8 adds offline SVG charts, graph exports, architecture/workflow diagrams
and project galleries. The UI remains English-only and no chart library/CDN,
remote image fetch, tracking pixel or background request is added.

## Charts and graphs

Open **Charts & Diagrams**. Charts cover the full local workspace, independent
of the directory's current filters:

- Top ten catalogue categories: project counts as horizontal bars.
- Workspace status: donut chart with labelled counts and totals.
- Built-in/custom learning path completion: completed versus total steps.
- Personal weighted comparison: up to eight fully assessed projects, on the
  fixed 0–5 rating scale. These are personal judgments, not quality benchmarks.
- Recorded checklist progress: a date-scaled line graph of actual local snapshots.

Every chart provides a data table and a **Download SVG** button. Export visual
data as JSON for analysis elsewhere. Use **Refresh charts** after changing work.
Missing assessments or progress produce explicit empty states rather than
made-up metrics.

Click **Record today's progress** to keep one local snapshot per calendar date.
A second click on the same date replaces it. Up to 90 dates are retained. A line
requires two dates with checklist tasks; dates with no tasks remain in the table
without inventing a completion percentage. Nothing records history automatically
or transmits it. Device/browser time determines the date.

## Architecture and workflow diagrams

The dashboard includes:

1. Actual PyAtlas application architecture: catalogue, browser workspace, local
   data, service worker, shell cache and optional public APIs.
2. Suggested project workflow: discover, compare, verify dependencies, generate,
   test and publish manually. This does not claim any deployment occurred.
3. Actual encrypted backup flow, including preview, explicit restore and rollback.

Diagrams use native SVG with labelled nodes/arrows and a text connection table.
They export as self-contained SVGs without external styles or scripts.

Each project's gallery also shows a **suggested architecture** based on its
catalogue category. These are planning blueprints, explicitly labelled as
illustrative; they are not verified architectures of third-party projects.

## Project images and screenshots

Every project card now includes an image and **Images & diagrams** button.
The gallery selector can switch between catalogue and custom projects.

Two attributed official documentation assets are bundled for offline use:

- **FastAPI:** its Swagger UI documentation screenshot, from the official docs.
- **Matplotlib:** its official simple-plot example output, labelled as output,
  not an application UI screenshot.

These are documentation illustrations, not captures of your installed version.
Source links, retrieval date and license details are visible in the gallery.
Full upstream license texts are in `pyatlas/assets/third-party-visual-licenses.txt`.
No third-party endorsement or independently captured screenshot is implied.

Other projects have clearly labelled **illustrated project previews**, not fake
product screenshots. They use the real catalogue name/category in original SVG
artwork. Project names are escaped before inclusion in SVG.

### Add your own screenshots

Choose a project, enter a descriptive caption and select a PNG, JPEG or WebP.
The browser decodes/resizes the image locally and re-encodes it as JPEG, removing
embedded metadata and making transparency white. The upload does not leave the
browser. Original files are limited to 8 MB and 8192 pixels per dimension;
normalized images are at most 1200 pixels per dimension and 500,000 data-URL
characters. Up to 20 images and 3 MB of encoded image data are allowed.

Uploaded screenshots survive reloads, replace the card's illustrated thumbnail,
and can be removed individually. Local storage quota still applies; a failed
save reports an error and keeps the preceding saved gallery. Keep original
files for full-resolution work. Displayed screenshots are not sent to GitHub,
PyPI, OSV, or any analytics endpoint.

## Backup and privacy

The `visuals:v1` key holds uploaded images and recorded history, under the normal
`pyatlas-pro:` prefix. It is included in **Complete Backup**, encrypted together
with the rest of the app state. Restore validates media before any replacement.
The older workspace-only backup does not include visual media; use Complete
Backup when moving screenshots/history to another browser or device.

The complete payload's 8 MB limit remains in force. Clearing site data removes
local media/history too. Existing complete backups without this optional section
remain valid; restoring one removes visual state absent from that backup, as
with other covered optional settings.
