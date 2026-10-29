"""Build a portable dashboard; never fetches network resources."""
from __future__ import annotations

import base64
import hashlib
import json
import re
import shutil
from pathlib import Path

from .catalog import load_catalog

ASSETS = Path(__file__).parent / 'assets'


def _hash(text: str) -> str:
    return "'sha256-" + base64.b64encode(hashlib.sha256(text.encode('utf-8')).digest()).decode('ascii') + "'"


def content_security_policy(page: str) -> str:
    """Hash-based policy: only the exact inline script and style in this page may run."""
    style = re.search(r'<style>(.*?)</style>', page, re.S)
    script = re.search(r'<script>(.*?)</script>', page, re.S)
    if not style or not script:
        raise ValueError('Dashboard template must contain one inline style and one inline script')
    return ("default-src 'none'; script-src " + _hash(script.group(1)) + "; style-src " + _hash(style.group(1))
            + "; connect-src 'self' https://api.github.com https://pypi.org https://api.osv.dev; worker-src 'self'; manifest-src 'self';"
            + " img-src 'self' data:; base-uri 'none'; form-action 'none'; object-src 'none'")


def build(destination: Path, catalog_path: Path | None = None) -> Path:
    payload = load_catalog(catalog_path) if catalog_path else load_catalog()
    # Escape script delimiters and HTML-sensitive data in the JSON script block.
    encoded = json.dumps(payload, ensure_ascii=True).replace('&', '\\u0026').replace('<', '\\u003c').replace('>', '\\u003e')
    page = (ASSETS / 'explorer.html').read_text(encoding='utf-8')
    styles = (ASSETS / 'explorer.css').read_text(encoding='utf-8')
    page = page.replace('/* PYATLAS_STYLE */', styles)
    scripts = ('workspace.js', 'productivity.js', 'vault.js', 'features-core.js', 'professional-core.js',
               'visual-core.js', 'explorer.js', 'features-ui.js', 'professional-ui.js', 'visual-ui.js')
    app = '\n'.join((ASSETS / name).read_text(encoding='utf-8') for name in scripts)
    page = page.replace('/* PYATLAS_APP */', app)
    page = page.replace('__PYATLAS_DATA__', encoded)
    visuals = (ASSETS / 'visual-assets.json').read_text(encoding='utf-8')
    visuals = visuals.replace('&', '\\u0026').replace('<', '\\u003c').replace('>', '\\u003e')
    page = page.replace('__PYATLAS_VISUAL_ASSETS__', visuals)
    policy = content_security_policy(page)
    page = page.replace('<!-- PYATLAS_CSP -->', '<meta http-equiv="Content-Security-Policy" content="' + policy + '">')
    destination.mkdir(parents=True, exist_ok=True)
    target = destination / 'index.html'
    # Write bytes so line endings never change after the CSP hashes were computed (matters on Windows).
    target.write_bytes(page.encode('utf-8'))
    for name in ('manifest.webmanifest', 'icon-192.png', 'icon-512.png'):
        shutil.copyfile(ASSETS / name, destination / name)
    # A content digest rolls the cache when any shell resource changes.
    digest = hashlib.sha256(target.read_bytes() + (ASSETS / 'manifest.webmanifest').read_bytes()
                            + (ASSETS / 'icon-192.png').read_bytes() + (ASSETS / 'icon-512.png').read_bytes()).hexdigest()[:16]
    worker = (ASSETS / 'sw.js').read_text(encoding='utf-8').replace('__SHELL_HASH__', digest)
    (destination / 'sw.js').write_bytes(worker.encode('utf-8'))
    return target
