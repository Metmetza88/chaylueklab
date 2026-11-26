#!/usr/bin/env python3
"""Prepare an isolated Vercel preview from a commit in the existing repository.
No cloud mutation, credentials, Git repository creation or production deployment.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
STATIC_BUILD = """import { mkdir, copyFile, cp, rm } from 'node:fs/promises';
await rm('_public', { recursive: true, force: true });
await mkdir('_public/assets', { recursive: true });
await copyFile('embroidery-studio.html', '_public/index.html');
await copyFile('embroidery-studio.html', '_public/embroidery-studio.html');
await copyFile('source-version.json', '_public/release.json');
await cp('assets/embroidery', '_public/assets/embroidery', { recursive: true });
console.log('Built isolated WORAMET embroidery preview');
"""


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--ref', default='HEAD')
    args = parser.parse_args()
    target = args.output.resolve()
    if target == ROOT or ROOT in target.parents:
        parser.error('Output must be outside the repository to preserve the main site')
    commit = git('rev-parse', '--verify', '--end-of-options', args.ref + '^{commit}').decode().strip()
    paths = ['embroidery-studio.html', 'api/embroidery.py', 'embroidery/engine.py',
             'embroidery/__init__.py', 'requirements.txt', '.python-version', 'embroidery/LICENSES.md']
    tracked = git('ls-tree', '-r', '--name-only', commit).decode().splitlines()
    paths.extend(p for p in tracked if p.startswith(('assets/embroidery/', 'embroidery/licenses/')))
    target.mkdir(parents=True, exist_ok=True)
    if any(target.iterdir()) and not (target / 'deployment-plan.json').is_file():
        parser.error('Non-empty output must contain a previous deployment-plan.json')
    for name in paths:
        destination = target / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(git('show', commit + ':' + name))
    (target / 'build.mjs').write_text(STATIC_BUILD, encoding='utf-8')
    (target / '.vercelignore').write_text(
        '_public\n.vercel\n.git\n.venv*\n__pycache__\n*.pyc\ndeployment-plan.json\nverification-results.json\n',
        encoding='utf-8')
    version = {'repository': 'Metmetza88/chaylueklab',
               'branch': 'feature/woramet-dojo-mvp-20261113', 'commit': commit,
               'module': 'woramet-embroidery', 'environment': 'preview'}
    (target / 'source-version.json').write_text(json.dumps(version, indent=2) + '\n', encoding='utf-8')
    config = {'$schema': 'https://openapi.vercel.sh/vercel.json', 'framework': None,
              'installCommand': '', 'buildCommand': 'node build.mjs', 'outputDirectory': '_public',
              'functions': {'api/embroidery.py': {'maxDuration': 30, 'includeFiles': 'embroidery/**',
                                                 'excludeFiles': 'embroidery/licenses/**'}}}
    (target / 'vercel.json').write_text(json.dumps(config, indent=2) + '\n', encoding='utf-8')
    paths += ['build.mjs', 'vercel.json', '.vercelignore', 'source-version.json']
    plan = {'status': 'prepared_not_deployed', 'project': 'chailueklab_ai_vercel_ready',
            'project_id': 'prj_zz7DosOYL0IZ4XYN7INZm3vwpzla',
            'team_id': 'team_kA0EAug4JrrTT6ZIc54RXcmL', 'team_slug': 'waramatw2546-4532',
            **version, 'changes_git_connection': False, 'deployment_source': 'isolated_upload', 'production_deployment_authorized': False,
            'files': {p: hashlib.sha256((target / p).read_bytes()).hexdigest() for p in paths}}
    (target / 'deployment-plan.json').write_text(json.dumps(plan, indent=2) + '\n', encoding='utf-8')
    print(f'Prepared {len(paths)} source files from {commit} in {target}; no cloud changes')


if __name__ == '__main__':
    main()
