# Contributing to PyAtlas Pro

Use Python 3.10+ and a modern browser. The application has no runtime dependencies.

1. Modify source files under `pyatlas/`, not the generated HTML.
2. Catalogue rows require unique stable IDs and string values for `name`, `url`, `description`, `category`, `group`; only `group` may be empty. Use HTTP(S) URLs with no embedded credentials.
3. Retain all attribution and document any independently verified content changes with their evidence and date. Do not invent adoption rankings or imply that imported descriptions were reverified.
4. Install dev tools with `python -m pip install ".[dev]"` and run `ruff check .` and `mypy`.
4. Run `python -m unittest discover -s tests -v` and `python -m pyatlas validate`.
5. Run `python -m pyatlas build --output dist` and commit the regenerated `dist/index.html` (CI checks it is current). Optionally run `python tools/browser_checks.py` and `python tools/capture_screenshots.py` for a browser smoke check and fresh screenshots. Check search, category filters, bookmark persistence, comparison, CSV/JSON downloads, mobile layout and keyboard focus in a browser.
6. Open a pull request with the behavior changed and checks completed. Do not submit secrets or machine-specific paths.

For packaging, run `python -m pip wheel --no-deps --wheel-dir wheelhouse .`. The configured CI matrix is a future execution path; locally recorded results are in `docs/VALIDATION.md`.
