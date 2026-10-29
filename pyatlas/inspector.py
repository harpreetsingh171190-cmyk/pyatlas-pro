"""Explicit online, binary-only dependency resolution and OSV advisory inspection."""
from __future__ import annotations

import json
import platform
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def parse_requirements(path: Path) -> list[str]:
    """Accept registry requirements, never URLs, local paths or pip option directives."""
    try:
        from packaging.requirements import InvalidRequirement, Requirement
    except ImportError as error:
        raise ValueError('Install optional audit tooling: python -m pip install ".[audit]"') from error
    if path.stat().st_size > 200_000:
        raise ValueError('Requirements file exceeds 200 KB')
    lines = []
    for raw in path.read_text(encoding='utf-8').splitlines():
        raw = re.split(r'(?:^|\s)#', raw, maxsplit=1)[0].strip()  # pip allows whitespace + '#' inline comments
        if not raw:
            continue
        try:
            req = Requirement(raw)
        except InvalidRequirement as error:
            raise ValueError(f'Invalid registry requirement: {raw[:120]}') from error
        if req.url:
            raise ValueError('Direct URLs and local projects are not supported by this inspector')
        lines.append(str(req))
    if not lines or len(lines) > 200:
        raise ValueError('Provide 1–200 registry requirements')
    return lines


def query_osv(name: str, version: str) -> list[dict[str, Any]]:
    """Query every OSV result page; an incomplete scan raises rather than claiming success."""
    findings: list[dict[str, Any]] = []
    token = None
    for _ in range(20):
        body: dict[str, Any] = {'package': {'name': name, 'ecosystem': 'PyPI'}, 'version': version}
        if token:
            body['page_token'] = token
        request = Request('https://api.osv.dev/v1/query', data=json.dumps(body).encode(),
                          headers={'Content-Type': 'application/json', 'User-Agent': 'PyAtlas-Pro-Inspector'}, method='POST')
        with urlopen(request, timeout=20) as response:
            raw = response.read(4 * 1024 * 1024 + 1)
        if len(raw) > 4 * 1024 * 1024:
            raise ValueError('OSV response exceeds 4 MB')
        value = json.loads(raw)
        for advisory in value.get('vulns', []):
            if advisory.get('withdrawn'):
                continue
            findings.append({'id': str(advisory['id']),
                             'summary': str(advisory.get('summary') or advisory.get('details', ''))[:2000],
                             'aliases': advisory.get('aliases', []), 'severity': advisory.get('severity', [])})
        token = value.get('next_page_token')
        if not token:
            return findings
    raise ValueError('OSV pagination limit reached; scan incomplete')


def inspect(path: Path, online: bool = False) -> dict[str, Any]:
    """Resolve for the running Python and host OS only. Never install or execute package build hooks."""
    requirements = parse_requirements(path)
    report: dict[str, Any] = {
        'schema': 1, 'kind': 'pyatlas-audit', 'source': 'pip binary-only dry-run + OSV',
        'checkedAt': datetime.now(timezone.utc).isoformat(), 'targetPython': platform.python_version(),
        'environment': {'platform': platform.system() + ' ' + platform.machine(), 'executable': sys.executable},
        'scope': 'Transitive resolution for this interpreter and host OS. Binary distributions only.',
        'requirements': requirements, 'resolverStatus': 'not-run-offline', 'packages': [],
    }
    if not online:
        report['message'] = 'Syntax validated only. Pass --online to allow pip/PyPI and OSV network requests.'
        return report
    with TemporaryDirectory(prefix='pyatlas-inspect-') as directory:
        root = Path(directory)
        req = root / 'requirements.txt'
        req.write_text('\n'.join(requirements) + '\n', encoding='utf-8')
        output = root / 'pip-report.json'
        # --isolated ignores user index settings and PIP_* environment variables.
        # --only-binary forbids sdist builds and their arbitrary build hooks.
        command = [sys.executable, '-m', 'pip', '--isolated', '--disable-pip-version-check', 'install',
                   '--dry-run', '--ignore-installed', '--only-binary=:all:', '--no-input',
                   '--index-url', 'https://pypi.org/simple', '--report', str(output),
                   '--target', str(root / 'target'), '--requirement', str(req)]
        try:
            result = subprocess.run(command, capture_output=True, text=True, encoding='utf-8',
                                    errors='replace', timeout=180, check=False)
        except subprocess.TimeoutExpired:
            report.update(resolverStatus='error', resolverError='Dependency resolver timed out after 180 seconds.')
            return report
        if result.returncode:
            report.update(resolverStatus='error', resolverError=(result.stderr or result.stdout)[-12000:])
            return report
        if output.stat().st_size > 16 * 1024 * 1024:
            raise ValueError('Resolver report exceeds 16 MB')
        resolved = json.loads(output.read_text(encoding='utf-8'))
    installs = resolved.get('install', [])
    if len(installs) > 500:
        raise ValueError('Resolved stack exceeds 500 packages')
    report['resolverStatus'] = 'resolved'
    for entry in installs:
        metadata = entry['metadata']
        name, version = str(metadata['name']), str(metadata['version'])
        license_text = str(metadata.get('license_expression') or metadata.get('license') or 'Unknown')[:10000]
        item: dict[str, Any] = {
            'name': name, 'version': version, 'license': license_text,
            'licenseReview': 'Verify the distribution license and obligations for your intended use; metadata is not legal advice.',
            'requiresPython': str(metadata.get('requires_python', '')),
            'pythonSupport': 'Selected by pip for the running interpreter',
            'vulnerabilities': [], 'scanStatus': 'error',
            'sha256': entry.get('download_info', {}).get('archive_info', {}).get('hashes', {}).get('sha256'),
        }
        try:
            item['vulnerabilities'] = query_osv(name, version)
            item['scanStatus'] = 'complete'
        except (HTTPError, URLError, TimeoutError, OSError, ValueError, KeyError) as error:
            item['error'] = str(error)[:2000]
        report['packages'].append(item)
    report['message'] = 'No reported advisories is not a guarantee of safety. Review incomplete scans and license metadata.'
    return report
