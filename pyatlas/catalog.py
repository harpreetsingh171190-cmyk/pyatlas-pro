"""Validated catalogue loading, deterministic search and portable exports."""
from __future__ import annotations

import csv
import io
import json
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

DATA_PATH = Path(__file__).parent / 'data' / 'catalog.json'
FIELDS = ('id', 'name', 'url', 'description', 'category', 'group')


def load_catalog(path: Path = DATA_PATH) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding='utf-8'))
    if not isinstance(payload, dict) or payload.get('schema_version') != 1 or not isinstance(payload.get('entries'), list):
        raise ValueError('Unsupported catalogue schema')
    seen = set()
    for row in payload['entries']:
        if not isinstance(row, dict) or any(not isinstance(row.get(k), str) for k in FIELDS):
            raise ValueError('Every entry must contain six string fields')
        if not all(row[k].strip() for k in FIELDS if k != 'group'):
            raise ValueError('Required fields must not be empty')
        url = urlsplit(row['url'])
        if url.scheme not in ('https', 'http') or not url.netloc or url.username or url.password:
            raise ValueError('Unsafe project URL')
        if row['id'] in seen:
            raise ValueError('Duplicate entry ID')
        seen.add(row['id'])
    return payload


def search(entries: list[dict[str, Any]], query: str = '', category: str = '', sort: str = 'name') -> list[dict[str, Any]]:
    terms = query.casefold().split()
    result = [r for r in entries if (not category or r['category'] == category)
              and all(t in ' '.join(r[k] for k in ('name', 'description', 'category', 'group')).casefold()
                      for t in terms)]
    if sort not in ('name', 'category'):
        raise ValueError('Sort must be name or category')
    return sorted(result, key=lambda r: (r[sort].casefold(), r['name'].casefold(), r['id']))


def to_csv(entries: list[dict[str, Any]]) -> str:
    """Escape spreadsheet formula prefixes, including hidden leading whitespace."""
    stream = io.StringIO(newline='')
    writer = csv.DictWriter(stream, fieldnames=FIELDS)
    writer.writeheader()
    for row in entries:
        writer.writerow({k: ("'" + row[k] if row[k].lstrip().startswith(('=', '+', '-', '@')) else row[k])
                         for k in FIELDS})
    return stream.getvalue()
