# Release and publishing setup

The supplied workflow runs on tags `v*`. It validates that the tag exactly
matches the version in `pyatlas/__init__.py` and the installed package metadata,
builds wheel + source distribution + complete web bundle, runs unit tests, then
creates a GitHub Release. PyPI uses OIDC trusted publishing without a stored token.

## One-time owner configuration

1. Commit the project to your GitHub repository and allow Actions to run.
2. Own or register the `pyatlas-pro` project name on PyPI. If it belongs to someone
   else, choose an available name in `pyproject.toml` before releasing.
3. Configure a PyPI trusted publisher using your actual GitHub owner/repository,
   workflow filename `release.yml`, and environment `pypi`.
4. Create the GitHub environment `pypi` and configure any owner-required branch/tag
   protection. Set repository variable `PYPI_PUBLISH_ENABLED` to `true` once ready.
5. For GitHub Pages, select GitHub Actions as the deployment source. The existing
   Pages workflow builds the app plus MkDocs under `/docs/`.

For a release, bump Python and npm versions together, regenerate `dist/`, then
commit and push a matching tag, for example `v8.0.1`. A mismatched tag fails before
publishing. PyPI publishing is automatically invoked only after the one-time setup
and opt-in variable; otherwise GitHub Release still runs and PyPI is skipped.
No release has been published by preparing this archive.

## Local release rehearsal

```sh
python -m unittest discover -s tests -v
npm test
npm run test:v6
python -m pyatlas build --output dist
python -m build --outdir release-dist
python -m mkdocs build --strict
```

The wheel includes all PWA assets, so an installed package can build the same
installable app. The ZIP's `wheelhouse/` contains the matching current wheel.

References: [PyPI trusted publishing](https://docs.pypi.org/trusted-publishers/using-a-publisher/),
[GitHub Actions packaging guide](https://packaging.python.org/en/latest/guides/publishing-package-distribution-releases-using-github-actions-ci-cd-workflows/).
