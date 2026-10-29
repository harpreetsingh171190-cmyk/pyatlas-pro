"""Reproduce the bundled catalogue from the preserved upstream README.

Run from the project root: python tools/import_catalog.py
Only the supplied snapshot is parsed. This tool does not verify external claims.
"""
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    source = (ROOT / 'docs' / 'UPSTREAM-CATALOG.md').read_text(encoding='utf-8')
    rows = []
    counts: Counter[str] = Counter()
    category = None
    group = ''
    for line in source.splitlines():
        if line == '## Resources':
            break
        if line.startswith('### '):
            category, group = line[4:].strip(), ''
            continue
        if not category:
            continue
        match = re.match(r'\s*- \[([^\]]+)\]\((https?://[^\s)]+)\) - (.+)', line)
        if match:
            name, url, description = match.groups()
            key = '|'.join((category, group, name, url))
            counts[key] += 1
            identity = hashlib.sha256((key + '|' + str(counts[key])).encode()).hexdigest()[:16]
            rows.append(dict(id=identity, name=name, url=url, description=description, category=category, group=group))
        elif re.match(r'^- [^\[]', line):
            group = line[2:].strip()
    payload = dict(schema_version=1, source='https://github.com/vinta/awesome-python',
                   source_commit='91e199ced625716e7e7e421fb1750206226e2bcf',
                   snapshot_date='2026-10-28', license='CC-BY-4.0', entries=rows)
    path = ROOT / 'pyatlas' / 'data' / 'catalog.json'
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Imported {len(rows)} entries to {path}')


if __name__ == '__main__':
    main()
