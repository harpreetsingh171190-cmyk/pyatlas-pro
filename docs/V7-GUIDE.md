# Professional tools in version 7

All interface text remains English. No account, telemetry service, remote script,
or automatic online scan has been added. Existing schema-4 workspace backups
remain usable through the original Import control.

## Project Starter Generator

1. Select projects using the bulk checkboxes.
2. Open **Project Starter**. Known catalogue tools suggest curated pip names.
   Unknown mappings are listed explicitly rather than guessed.
3. Enter a lowercase project slug, and review the requirements. Browser forms
   accept package names or exact normalized version pins, one per line.
4. Download the ZIP. It includes `src/`, a command-line entry point, a pytest
   test, `pyproject.toml`, `requirements.txt`, README, Dockerfile and CI workflow.

Generation is local and works offline. It does not install packages, vendor
third-party source, resolve compatibility, pick your project's license, or
publish a repository. CI runs tests on Python 3.10, 3.12 and 3.14. Dependencies
must support those versions or the generated matrix must be adjusted. The
Docker example uses Python 3.12. The generated pytest test checks observable CLI
behavior. Project slugs reject path traversal, shell syntax and Python keywords.

## Compatibility, security and license checks

**Check offline** validates names and catches ambiguous/conflicting exact pins.
It never contacts an index and never claims that transitive dependencies resolve.

**Check PyPI + OSV online** is an explicit network action. It sends the listed
public package names/versions to PyPI and OSV, never notes, paths, comparisons,
backups or usage counters. PyPI supplies the exact release metadata and license
expression/string. OSV supplies known advisories, with pagination and withdrawn
records handled. Names without pins check the latest version, not packages
installed on your computer. Each result records its version, check time, scope,
license metadata, Python requirement, yanked state, advisories and scan status.

Requires-Python checks support common numeric specifiers, wildcard exclusions
and compatible-release clauses. Unsupported syntax returns **Unknown**, not a
compatibility verdict. A two-part target such as 3.12 means 3.12.0; enter the
actual patch version where relevant. This metadata check does not establish
wheel/platform availability or compatibility between dependencies.

Failures, timeouts or incomplete pagination remain explicit errors. Cancel
interrupts the current scan and retains the previous cached report. Cached
reports stay available offline, with their date and source. Empty findings do
not prove safety. License strings and review hints are not a legal determination
that a stack is suitable for commercial use or redistribution.

### Full transitive dependency resolution

From the extracted PyAtlas project, install its optional audit extra:

```sh
python -m pip install ".[audit]"
python -m pyatlas inspect --requirements requirements.txt --online --output audit.json
```

Run that command with the interpreter and OS you intend to use. This invokes
pip's resolver with `--dry-run --ignore-installed --only-binary=:all:` and an
isolated temporary target. It downloads wheel metadata/files as necessary but
installs no packages and does not run source-build hooks. A package without a
suitable wheel fails explicitly rather than falling back to source builds.
Transitive packages selected by pip are then queried against OSV. Resolution
has a 180-second timeout; each advisory request has a 20-second timeout.

Without `--online`, only requirement syntax is validated; no pip subprocess or
network request runs. The CLI accepts normal registry version ranges, extras
and environment markers through PyPA packaging, but rejects direct URLs, local
projects and pip option directives. It uses the running interpreter's environment,
not a simulated cross-platform environment. Import `audit.json` back into the
browser to view/export the resolver report offline.

CLI exit codes: **0** for successful checks without reported advisories (or
explicit offline syntax-only mode), **1** for reported advisories, **2** for
invalid input, resolver failure or incomplete advisory checks. Read the report's
scope/status before using exit codes in automation.

## Custom Learning Path Editor

Open **Learning paths → Create / edit custom paths**. Give the path a title,
add up to 120 steps, optionally link each step to a catalogue/custom project,
mark completion, and reorder with Move up / Move down. Completion follows the
step's stable ID, not its current row number. Save explicitly; unsaved drafts
are not part of backups. Up to 50 custom paths are supported.

Saved paths appear beside the two built-in plans. Progress can be checked there
and survives reloads. Export learning progress now includes built-in progress
and custom paths in schema 2. Imports also accept old schema-1 built-in progress.
Matching custom path IDs use imported step order/content while preserving
completed state for matching step IDs. Deleted project links do not delete a
learning step. Custom project data itself travels in workspace/complete backups.

## Complete Encrypted Backup

Use **Complete Backup**, enter and confirm a password of at least 12 characters,
and download one encrypted file. It captures the validated in-memory workspace,
bookmarks, custom paths and their completion, built-in progress, theme, current
filters/sort/view, layout, cached GitHub snapshots, usage settings/counters,
personal comparison assessments and latest saved audit.

The envelope uses Web Crypto AES-256-GCM with random salt/nonce and
PBKDF2-SHA256 (600,000 iterations). Its authenticated context is separate from
old workspace-only encrypted backups, so envelopes cannot simply be relabelled.
The complete plaintext payload is limited to 8 MB. Passwords are not stored;
there is no recovery service. Local browser storage remains unencrypted.

To restore, select the complete encrypted file, enter its password, and click
**Unlock and preview**. Validation finishes before enabling **Restore all data
and reload**. That final button replaces covered application data and removes
covered settings absent from the backup. Unrelated websites/app keys are left
alone. Storage failures trigger rollback to the preceding values; rollback
failures produce an explicit warning. Keep the source backup until verified.
There is no cross-device or cloud sync. Browser quota/clearing still applies.

## Advanced Comparison

Select 2–8 projects using bulk checkboxes, or use the existing comparison
selection when the bulk selection is empty. Open **Advanced Comparison**.
Assign weights of 0–10 to Suitability, Documentation, License fit and Maintenance
confidence. Rate each project 0–5 and add your decision notes.

These are personal assessments, not scraped quality claims. Zero is a real
rating; a blank is unassessed. Projects are unranked until every positively
weighted criterion is rated. If all weights are zero, all remain unranked.
The score is the weighted mean on a 0–5 scale. Assessments persist locally and
are included in complete backups. Export a JSON report containing criteria,
weights, scores, notes, links and an explicit personal-assessment label.

## Official technical references

- [pip dry-run and installation report](https://pip.pypa.io/en/stable/cli/pip_install/)
- [PyPI JSON API](https://docs.pypi.org/api/json/)
- [OSV query API](https://google.github.io/osv.dev/post-v1-query/)
- [Python license expressions](https://packaging.python.org/en/latest/specifications/license-expression/)
