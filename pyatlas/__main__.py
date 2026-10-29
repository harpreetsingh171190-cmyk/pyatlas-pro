"""Command line entry point: python -m pyatlas --help."""
from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import TemporaryDirectory

from . import __version__
from .builder import build
from .catalog import load_catalog, search, to_csv


def main(argv: list[str] | None = None) -> int:
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, 'reconfigure'):
            stream.reconfigure(encoding='utf-8', errors='replace')
    parser = argparse.ArgumentParser(prog='pyatlas', description='PyAtlas Pro — explore the Python ecosystem offline')
    parser.add_argument('--version', action='version', version=__version__)
    commands = parser.add_subparsers(dest='command', required=True)
    commands.add_parser('validate', help='Validate the bundled catalogue')
    commands.add_parser('stats', help='Show catalogue statistics')
    find = commands.add_parser('search', help='Search all words across catalogue fields')
    find.add_argument('query', nargs='?', default='')
    find.add_argument('--category', default='')
    find.add_argument('--sort', choices=['name', 'category'], default='name')
    find.add_argument('--format', choices=['text', 'json', 'csv'], default='text')
    find.add_argument('--limit', type=int, default=0, help='Return at most N results (0 = all)')
    compile_page = commands.add_parser('build', help='Build a standalone offline dashboard')
    compile_page.add_argument('--output', type=Path, default=Path('dist'))
    serve = commands.add_parser('serve', help='Run a local dashboard on loopback only')
    serve.add_argument('--port', type=int, default=8765)
    check = commands.add_parser('inspect', help='Validate requirements; optionally resolve and scan with explicit network access')
    check.add_argument('--requirements', type=Path, required=True)
    check.add_argument('--online', action='store_true', help='Allow pip/PyPI and OSV requests; uses binary-only dry-run')
    check.add_argument('--output', type=Path)
    args = parser.parse_args(argv)
    try:
        data = load_catalog()
        if args.command == 'inspect':
            from .inspector import inspect
            result = inspect(args.requirements, args.online)
            text = json.dumps(result, ensure_ascii=False, indent=2)
            if args.output:
                args.output.write_text(text + '\n', encoding='utf-8')
            else:
                print(text)
            if result.get('resolverStatus') == 'error' or any(p['scanStatus'] != 'complete' for p in result['packages']):
                return 2
            return 1 if any(p['vulnerabilities'] for p in result['packages']) else 0
        if args.command in ('stats', 'validate'):
            report = {'version': __version__, 'entries': len(data['entries']),
                      'categories': len({r['category'] for r in data['entries']}),
                      'snapshot_date': data['snapshot_date'], 'valid': True}
            if args.command == 'stats':
                report['unique_urls'] = len({r['url'] for r in data['entries']})
                report['top_categories'] = Counter(r['category'] for r in data['entries']).most_common(10)
            print(json.dumps(report, indent=2))
        elif args.command == 'search':
            if args.limit < 0:
                raise ValueError('Limit must be zero or greater')
            rows = search(data['entries'], args.query, args.category, args.sort)
            if args.limit:
                rows = rows[:args.limit]
            if args.format == 'json': print(json.dumps(rows, ensure_ascii=False, indent=2))
            elif args.format == 'csv': print(to_csv(rows), end='')
            else:
                for row in rows:
                    print(f"{row['name']} [{row['category']}]\n  {row['description']}\n  {row['url']}")
                print(f'{len(rows)} result(s)')
        elif args.command == 'build':
            print(build(args.output).resolve())
        else:
            if not 0 <= args.port <= 65535:
                raise ValueError('Port must be between 0 and 65535')
            with TemporaryDirectory(prefix='pyatlas-') as directory:
                build(Path(directory))
                handler = partial(SimpleHTTPRequestHandler, directory=directory)
                with ThreadingHTTPServer(('127.0.0.1', args.port), handler) as server:
                    print(f'PyAtlas Pro: http://127.0.0.1:{server.server_port} — Ctrl+C to stop', flush=True)
                    try: server.serve_forever()
                    except KeyboardInterrupt: pass
        return 0
    except (ValueError, OSError) as error:
        parser.exit(2, f'pyatlas: {error}\n')


if __name__ == '__main__':
    raise SystemExit(main())
