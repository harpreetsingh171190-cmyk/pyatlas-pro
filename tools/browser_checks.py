"""Feature-level browser checks for the built dashboard (Playwright for Python, optional dev tool).

Usage: python tools/browser_checks.py   (needs: pip install playwright && playwright install chromium)
Fails on any assertion, console error or page error. Uses file:// and a fresh browser profile each time.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Any

from playwright.sync_api import Page, sync_playwright

PAGE = (Path(__file__).resolve().parents[1] / 'dist' / 'index.html').as_uri()


def main() -> int:
    problems: list[str] = []
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('PYATLAS_BROWSER_EXECUTABLE'))

        def fresh(url: str = PAGE, **options: Any) -> Page:
            ctx = browser.new_context(viewport={'width': 1440, 'height': 900}, **options)
            page = ctx.new_page()
            page.on('console', lambda m: problems.append(f'console {m.type}: {m.text}') if m.type in ('error', 'warning') else None)
            page.on('pageerror', lambda e: problems.append(f'pageerror: {e}'))
            page.goto(url)
            page.wait_for_selector('.card')
            return page

        # 1. system dark mode is respected, stored choice wins
        page = fresh(color_scheme='dark')
        assert page.evaluate("document.body.classList.contains('dark')"), 'dark system preference ignored'
        page.click('#theme')
        assert not page.evaluate("document.body.classList.contains('dark')")
        page.reload(); page.wait_for_selector('.card')
        assert not page.evaluate("document.body.classList.contains('dark')"), 'stored light choice not kept'
        page.context.close()

        # 2. shareable view link restores filters; URL follows the view; bad hashes are ignored
        page = fresh(PAGE + '#q=django&sort=category')
        assert page.input_value('#query') == 'django' and page.input_value('#sort') == 'category'
        assert page.locator('.card h3').count() > 0
        page.fill('#query', 'flask')
        assert 'q=flask' in page.evaluate('location.hash'), page.evaluate('location.hash')
        page.evaluate("location.hash = '#sort=evil&status=%3Cb%3E&q=pandas'")
        page.wait_for_function("document.getElementById('query').value === 'pandas'")
        assert page.input_value('#sort') == 'name'
        page.click('.skip', force=True) if False else None
        page.context.close()

        # 3. duplicate listings are flagged on cards (django appears in two categories)
        page = fresh()
        page.fill('#query', 'django')
        assert page.locator('.card .tag', has_text='Also in').count() > 0, 'duplicate badge missing'
        page.context.close()

        # 4. tags: add through the editor, filter via chip and via the select
        page = fresh()
        page.fill('#query', 'flask')
        page.locator('.card .details-button').first.click()
        page.fill('#edit-tags', 'web, learning')
        page.click('#project-form button[type=submit]')
        page.fill('#query', '')
        page.wait_for_selector('.card .tag-button')
        page.select_option('#tag-filter', 'learning')
        assert page.locator('.card').count() == 1, page.locator('.card').count()
        page.select_option('#tag-filter', '')
        page.locator('.tag-button', has_text='web').first.click()
        assert page.input_value('#tag-filter') == 'web' and 'tag=web' in page.evaluate('location.hash')
        page.context.close()

        # 5. duplicate URL warning when adding a custom project, then explicit second save
        page = fresh()
        page.click('#add-project')
        page.fill('#edit-name', 'My Django copy'); page.fill('#edit-url', 'https://www.github.com/django/django/')
        page.fill('#edit-category', 'My stack'); page.fill('#edit-description', 'Personal bookmark')
        page.click('#project-form button[type=submit]')
        assert 'already listed' in (page.text_content('#editor-error') or ''), page.text_content('#editor-error')
        page.click('#project-form button[type=submit]')
        page.fill('#query', 'My Django copy')
        assert page.locator('.card h3', has_text='My Django copy').count() == 1
        page.context.close()

        # 6. Share view falls back without throwing when the clipboard is unavailable
        page = fresh()
        page.on('dialog', lambda d: d.dismiss())
        page.click('#copy-link')
        page.wait_for_timeout(300)
        page.context.close()
        browser.close()
    for line in problems:
        print('PROBLEM', line)
    print('browser checks passed' if not problems else 'browser checks finished with problems')
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
