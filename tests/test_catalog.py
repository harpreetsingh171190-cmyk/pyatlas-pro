import base64
import csv
import hashlib
import io
import json
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from pyatlas.builder import build
from pyatlas.catalog import load_catalog, search, to_csv


class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.data = load_catalog()
        self.rows = self.data['entries']

    def test_import_integrity(self):
        self.assertEqual(len(self.rows), 529)
        self.assertEqual(len({r['category'] for r in self.rows}), 74)
        self.assertEqual(len({r['id'] for r in self.rows}), 529)

    def test_search_multiword_case_and_category(self):
        result = search(self.rows, 'FRAMEWORK web', 'Web Frameworks')
        self.assertTrue(result)
        self.assertTrue(all(r['category'] == 'Web Frameworks' for r in result))
        self.assertEqual(search(self.rows, 'zzzz-no-project'), [])

    def test_sort_is_stable(self):
        self.assertEqual(search(self.rows), search(list(reversed(self.rows))))
        with self.assertRaises(ValueError): search(self.rows, sort='stars')

    def test_csv_roundtrip_and_formulas(self):
        row = dict(self.rows[0], description=' \t=1+1', name='a,"quoted"\nname')
        parsed = list(csv.DictReader(io.StringIO(to_csv([row]))))[0]
        self.assertEqual(parsed['name'], row['name'])
        self.assertEqual(parsed['description'], "' \t=1+1")

    def test_schema_rejects_duplicate_and_unsafe_url(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'bad.json'
            for row in [dict(self.rows[0], url='javascript:alert(1)'),dict(self.rows[0], name='')]:
                path.write_text(json.dumps(dict(self.data,entries=[row])))
                with self.assertRaises(ValueError): load_catalog(path)
            path.write_text(json.dumps(dict(self.data,entries=[self.rows[0]]*2)))
            with self.assertRaises(ValueError): load_catalog(path)

    def test_build_is_standalone_and_escapes_script_data(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'source.json'
            payload=dict(self.data,entries=[dict(self.rows[0],description='</script><script>alert(1)</script>')])
            path.write_text(json.dumps(payload))
            html=build(Path(d)/'site',path).read_text()
            self.assertNotIn('__PYATLAS_DATA__',html)
            self.assertNotIn('/* PYATLAS_',html)
            self.assertNotIn('</script><script>alert(1)',html)
            self.assertIn('\\u003c/script',html)
            self.assertNotIn('<script src=',html)
            self.assertIn('<html lang="en">',html)
            self.assertNotIn('id="language"',html)
            self.assertNotIn('PyAtlasI18n',html)
            self.assertNotIn('data:font/',html)
            self.assertNotIn('<link rel="stylesheet"',html)

    def test_csp_hashes_match_inline_code(self):
        with tempfile.TemporaryDirectory() as d:
            raw=build(Path(d)/'site').read_bytes()
        self.assertNotIn(b'\r',raw)
        html=raw.decode('utf-8')
        policy=re.search(r'Content-Security-Policy" content="([^"]+)"',html).group(1)
        self.assertNotIn('unsafe-inline',policy)
        self.assertNotIn('PYATLAS_CSP',html)
        for tag,directive in (('script','script-src'),('style','style-src')):
            body=re.search(rf'<{tag}>(.*?)</{tag}>',html,re.S).group(1)
            digest="'sha256-"+base64.b64encode(hashlib.sha256(body.encode()).digest()).decode()+"'"
            self.assertIn(directive+' '+digest,policy)

    def test_pwa_assets_and_versioned_cache(self):
        with tempfile.TemporaryDirectory() as d:
            folder = Path(d)
            build(folder)
            manifest = json.loads((folder / 'manifest.webmanifest').read_text())
            self.assertEqual(manifest['display'], 'standalone')
            self.assertEqual({i['sizes'] for i in manifest['icons']}, {'192x192', '512x512'})
            for icon in manifest['icons']:
                self.assertTrue((folder / icon['src']).read_bytes().startswith(b'\x89PNG'))
            worker = (folder / 'sw.js').read_bytes()
            self.assertNotIn(b'__SHELL_HASH__', worker)
            build(folder)
            self.assertEqual((folder / 'sw.js').read_bytes(), worker)
            payload = dict(self.data, entries=[dict(self.rows[0], description='Changed catalogue')])
            source = folder / 'changed.json'
            source.write_text(json.dumps(payload))
            build(folder, source)
            self.assertNotEqual((folder / 'sw.js').read_bytes(), worker)

    def test_cli_export_json(self):
        result=subprocess.run([sys.executable,'-m','pyatlas','search','django','--format','json'],capture_output=True,text=True,check=True)
        self.assertTrue(json.loads(result.stdout))

    def test_cli_non_utf8_stdout(self):
        env=dict(__import__('os').environ,PYTHONIOENCODING='cp1252')
        result=subprocess.run([sys.executable,'-m','pyatlas','search','--format','json'],capture_output=True,env=env)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertTrue(json.loads(result.stdout.decode('utf-8')))

    def test_cli_limit_and_stats(self):
        result = subprocess.run(
            [sys.executable, '-m', 'pyatlas', 'search', '--format', 'json', '--limit', '3'],
            capture_output=True, text=True, encoding='utf-8', check=True)
        self.assertEqual(len(json.loads(result.stdout)),3)
        proc = subprocess.run(
            [sys.executable, '-m', 'pyatlas', 'stats'],
            capture_output=True, text=True, encoding='utf-8', check=True)
        stats = json.loads(proc.stdout)
        self.assertEqual(stats['entries'],529)
        self.assertLessEqual(stats['unique_urls'],529)
        self.assertEqual(len(stats['top_categories']),10)
        self.assertNotEqual(subprocess.run([sys.executable,'-m','pyatlas','search','--limit','-1'],capture_output=True).returncode,0)

    def test_cli_invalid_port(self):
        result=subprocess.run([sys.executable,'-m','pyatlas','serve','--port','70000'],capture_output=True,text=True)
        self.assertEqual(result.returncode,2)
        self.assertIn('Port must',result.stderr)


if __name__ == '__main__': unittest.main()
