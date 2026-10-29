import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from pyatlas.inspector import inspect, parse_requirements, query_osv


class InspectorTests(unittest.TestCase):
    def test_registry_requirements_only(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'requirements.txt'
            p.write_text('numpy>=1.26,<3\nrequests==2.32.0\n')
            self.assertEqual(len(parse_requirements(p)), 2)
            for line in ['-r secrets.txt', 'x @ https://example.com/x.whl', './local-project']:
                p.write_text(line)
                with self.assertRaises(ValueError):
                    parse_requirements(p)

    def test_offline_inspection_never_calls_network_or_pip(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'requirements.txt'
            p.write_text('numpy>=1.26\n')
            with patch('pyatlas.inspector.urlopen') as network, patch('pyatlas.inspector.subprocess.run') as pip:
                result = inspect(p)
                self.assertEqual(result['resolverStatus'], 'not-run-offline')
                network.assert_not_called()
                pip.assert_not_called()

    def test_resolver_uses_binary_only_dry_run_and_scans_transitive_packages(self):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / 'requirements.txt'
            p.write_text('example-package==1.0\n')

            def fake_run(command, **kwargs):
                self.assertIn('--dry-run', command)
                self.assertIn('--only-binary=:all:', command)
                self.assertNotIn('shell', kwargs)
                target = Path(command[command.index('--report') + 1])
                target.write_text(json.dumps({'install': [
                    {'metadata': {'name': 'example-package', 'version': '1.0', 'license_expression': 'MIT'}},
                    {'metadata': {'name': 'example-dependency', 'version': '2.0'}},
                ]}))
                from subprocess import CompletedProcess
                return CompletedProcess(command, 0, '', '')

            with patch('pyatlas.inspector.subprocess.run', side_effect=fake_run), patch(
                'pyatlas.inspector.query_osv', side_effect=[[], ValueError('Service unavailable')]
            ):
                result = inspect(p, online=True)
            self.assertEqual(result['resolverStatus'], 'resolved')
            self.assertEqual(result['packages'][0]['scanStatus'], 'complete')
            self.assertEqual(result['packages'][1]['scanStatus'], 'error')
            self.assertEqual(result['packages'][1]['license'], 'Unknown')

    def test_osv_pagination_and_withdrawn_advisories(self):
        from io import BytesIO
        pages = [BytesIO(json.dumps({'vulns': [{'id': 'TEST-1'}, {'id': 'OLD', 'withdrawn': '2020'}],
                                    'next_page_token': 'page2'}).encode()),
                 BytesIO(json.dumps({'vulns': [{'id': 'TEST-2'}]}).encode())]
        with patch('pyatlas.inspector.urlopen', side_effect=pages) as request:
            result = query_osv('example', '1.0')
            self.assertEqual([v['id'] for v in result], ['TEST-1', 'TEST-2'])
            body = json.loads(request.call_args_list[1].args[0].data)
            self.assertEqual(body['page_token'], 'page2')

    def test_inline_comments_are_ignored(self):
        with tempfile.TemporaryDirectory() as d:
            path = Path(d) / 'requirements.txt'
            path.write_text('requests==2.32.0  # pinned\n  # full-line comment\nflask>=3 #latest\n', encoding='utf-8')
            self.assertEqual(parse_requirements(path), ['requests==2.32.0', 'flask>=3'])
