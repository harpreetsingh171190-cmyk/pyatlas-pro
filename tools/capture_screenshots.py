"""Capture README screenshots and run a CSP/console smoke check with Playwright (Python).

Optional developer tool; the application itself has no runtime dependencies.
Usage: python tools/capture_screenshots.py   (needs: pip install playwright && playwright install chromium)
Screenshots show a built-in sample workspace, not real personal data.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'screenshots'
PAGE = (ROOT / 'dist' / 'index.html').as_uri()
KEY = 'pyatlas-pro:workspace:v4'


def sample_workspace() -> str:
    rows = json.loads((ROOT / 'pyatlas' / 'data' / 'catalog.json').read_text(encoding='utf-8'))['entries']
    pick = {}
    for name in ('Django', 'FastAPI', 'Flask', 'pandas', 'NumPy', 'Requests', 'pytest', 'Celery'):
        match = next((r for r in rows if r['name'].lower() == name.lower()), None)
        if match:
            pick[name] = match['id']
    plan = [('Django', 'In use', 5, 'High', '2026-11-05'), ('FastAPI', 'Evaluating', 4, 'High', '2026-11-12'),
            ('Flask', 'Learning', 3, 'Normal', ''), ('pandas', 'In use', 5, 'Normal', ''),
            ('NumPy', 'Learning', 4, 'Low', ''), ('Requests', 'In use', 4, 'Normal', ''),
            ('pytest', 'Evaluating', 5, 'High', '2026-11-20'), ('Celery', 'Unreviewed', 0, 'Low', '')]
    metadata, bookmarks = {}, []
    for index, (name, status, rating, priority, due) in enumerate(plan):
        if name not in pick:
            continue
        bookmarks.append(pick[name])
        metadata[pick[name]] = {'notes': '', 'tags': ['sample'], 'collections': ['My next stack'] if index < 4 else [],
                                'status': status, 'rating': rating, 'priority': priority, 'dueDate': due,
                                'tasks': [{'id': f'task-sample-{index:03d}-a', 'text': 'Read the quick start', 'done': index % 2 == 0},
                                          {'id': f'task-sample-{index:03d}-b', 'text': 'Build a small prototype', 'done': False}]}
    return json.dumps({'schema_version': 4, 'custom': [], 'bookmarks': bookmarks, 'metadata': metadata, 'savedSearches': []})


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    problems: list[str] = []
    state = sample_workspace()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        def page_for(width: int, height: int, dark: bool = False) -> Page:
            ctx = browser.new_context(viewport={'width': width, 'height': height}, device_scale_factor=1)
            theme = "localStorage.setItem('pyatlas-pro:theme','dark');" if dark else ''
            ctx.add_init_script(f"try{{localStorage.setItem({KEY!r},{state!r});" + theme + "}catch(e){}")
            page = ctx.new_page()
            page.on('console', lambda m: problems.append(f'console {m.type}: {m.text}') if m.type in ('error', 'warning') else None)
            page.on('pageerror', lambda e: problems.append(f'pageerror: {e}'))
            page.goto(PAGE)
            page.wait_for_selector('.card')
            if width > 700:
                page.select_option('#sort', 'rating')
                page.evaluate("document.getElementById('workspace-tools').open = false")
                page.evaluate("document.querySelector('.workspace-heading').scrollIntoView()")
            return page
        page = page_for(1440, 900)
        assert page.locator('.card').count() > 0
        page.screenshot(path=str(OUT / 'dashboard-light.png'))
        page.evaluate("document.getElementById('workspace-tools').open = true")
        page.click('#board-toggle'); page.wait_for_selector('.board-column')
        page.evaluate("document.getElementById('workspace-tools').open = false")
        page.evaluate("document.querySelector('.workspace-heading').scrollIntoView()")
        page.screenshot(path=str(OUT / 'workflow-board.png'))
        page.click('#analytics-open'); page.wait_for_selector('#analytics[open]')
        page.screenshot(path=str(OUT / 'insights.png'))
        page.close()
        page = page_for(1440, 900, dark=True)
        page.screenshot(path=str(OUT / 'dashboard-dark.png')); page.close()
        page = page_for(390, 844)
        page.screenshot(path=str(OUT / 'mobile.png')); page.close()
        browser.close()
    for line in problems:
        print('PROBLEM', line)
    print('screenshots:', ', '.join(sorted(f.name for f in OUT.glob('*.png'))))
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
