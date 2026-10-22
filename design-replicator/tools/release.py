#!/usr/bin/env python3
"""Kuruluma hazir surum paketi uretir.  python tools/release.py

Yapilanlar:
  1. manifest.json'daki tum dosya referanslarinin var oldugunu dogrular
  2. Tum .js dosyalarinda (vendor haric) `node --check` soz dizimi denetimi
  3. Veri setini dogrular (node tools/validate-dataset.mjs)
  4. release/design-replicator-<surum>.zip  (yalnizca calisma zamani dosyalari; kok dizinde manifest.json)
     release/design-replicator-<surum>-source.zip (tools/ dahil)
  5. SHA256SUMS.txt + RELEASE-NOTES-<surum>.md
"""
import argparse, hashlib, json, os, re, subprocess, sys, zipfile
from urllib.parse import urlparse
from urllib.request import urlopen

parser = argparse.ArgumentParser(description='Build a development ZIP or verify and build an operator-configured store ZIP.')
parser.add_argument('--store', action='store_true')
parser.add_argument('--service-url', default='')
parser.add_argument('--privacy-url', default='')
parser.add_argument('--support-email', default='')
parser.add_argument('--publisher', default='')
args = parser.parse_args()
if args.service_url:
    u = urlparse(args.service_url)
    if u.scheme != 'https' or not u.hostname or u.username or u.password or u.query or u.fragment or u.path not in ('', '/'):
        parser.error('--service-url must be an HTTPS origin without credentials, path, query or fragment')
    args.service_url = args.service_url.rstrip('/')
if args.store:
    privacy = urlparse(args.privacy_url)
    if not args.service_url or privacy.scheme != 'https' or not privacy.hostname or privacy.username or privacy.password or not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', args.support_email) or not args.publisher.strip():
        parser.error('Store packaging requires --service-url, --privacy-url, --support-email and --publisher')
    try:
        with urlopen(args.service_url + '/v1/catalog', timeout=20) as response:
            catalog = json.loads(response.read(100000))
        if catalog.get('mode') != 'production' or not catalog.get('billing') or not any(catalog.get('providers', {}).values()):
            parser.error('Production billing and at least one AI provider must be ready')
    except Exception as error:
        parser.error('Service readiness could not be verified: ' + type(error).__name__)

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'release')

RUNTIME_DIRS = ['popup', 'options', 'studio', 'sandbox', 'content', 'lib', 'templates', 'vendor', 'icons', 'dataset', 'pro']
RUNTIME_FILES = ['manifest.json', 'background.js', 'LICENSE']
EXTRA = {}
SKIP = re.compile(r'(^|/)(\.git|node_modules|__pycache__|release)(/|$)|\.map$')


def die(msg):
    print('HATA:', msg)
    sys.exit(1)


def walk(rel):
    base = os.path.join(ROOT, rel)
    for d, _, files in os.walk(base):
        for f in files:
            p = os.path.relpath(os.path.join(d, f), ROOT).replace(os.sep, '/')
            if not SKIP.search(p):
                yield p


manifest = json.load(open(os.path.join(ROOT, 'manifest.json'), encoding='utf-8'))
version = manifest['version']

# 1) manifest referanslari
refs = set()
for k in ('service_worker',):
    refs.add(manifest.get('background', {}).get(k))
refs.add(manifest.get('options_page'))
refs.add(manifest.get('action', {}).get('default_popup'))
refs.update(manifest.get('icons', {}).values())
refs.update(manifest.get('action', {}).get('default_icon', {}).values())
refs.update(manifest.get('sandbox', {}).get('pages', []))
missing = [r for r in refs if r and not os.path.exists(os.path.join(ROOT, r))]
if missing:
    die('manifest dosyalari eksik: %s' % missing)
print('manifest referanslari tamam (%d)' % len([r for r in refs if r]))

# HTML icindeki yerel script/css referanslari
for html in [p for d in RUNTIME_DIRS for p in walk(d) if p.endswith('.html') and not p.startswith('vendor/')]:
    txt = open(os.path.join(ROOT, html), encoding='utf-8').read()
    for m in re.finditer(r'(?:src|href)="([^"#?]+)"', txt):
        t = m.group(1)
        if t.startswith(('http', 'data:', '{{')):
            continue
        path = os.path.normpath(os.path.join(os.path.dirname(os.path.join(ROOT, html)), t))
        if not os.path.exists(path):
            die('%s -> eksik dosya %s' % (html, t))
print('HTML referanslari tamam')

# 2) soz dizimi
bad = 0
tmp = os.path.join(OUT, '_chk.mjs')
os.makedirs(OUT, exist_ok=True)
for d in RUNTIME_DIRS + ['.']:
    for p in (walk(d) if d != '.' else [f for f in RUNTIME_FILES if f.endswith('.js')]):
        if p.endswith('.js') and not p.startswith('vendor/') and p != 'dataset/components.json':
            data = open(os.path.join(ROOT, p), encoding='utf-8').read()
            open(tmp, 'w', encoding='utf-8').write(data)
            r = subprocess.run(['node', '--check', tmp], capture_output=True, text=True)
            if r.returncode:
                bad += 1
                print('SOZ DIZIMI', p, r.stderr.strip().splitlines()[:3])
os.remove(tmp)
if bad:
    die('%d dosyada soz dizimi hatasi' % bad)
print('soz dizimi denetimi tamam')

# 3) veri seti
r = subprocess.run(['node', os.path.join(ROOT, 'tools', 'validate-dataset.mjs')], capture_output=True, text=True)
print(r.stdout.strip().splitlines()[-1])
if r.returncode:
    die('veri seti dogrulamasi basarisiz\n' + r.stdout)

# 4) paketler
runtime = []
for f in RUNTIME_FILES:
    runtime.append((f, f))
for d in RUNTIME_DIRS:
    for p in sorted(walk(d)):
        runtime.append((p, p))
for src, dst in EXTRA.items():
    runtime.append((src, dst))

def build(name, files):
    path = os.path.join(OUT, name)
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for src, dst in files:
            if dst == 'lib/service-default.js' and args.service_url:
                z.writestr(dst, 'export const DEFAULT_PRO_SERVICE = ' + json.dumps(args.service_url) + ';\n')
            else:
                z.write(os.path.join(ROOT, src), dst)
        if args.store:
            z.writestr('pro/store-info.json', json.dumps({'publisher':args.publisher,'privacy':args.privacy_url,'support':args.support_email},ensure_ascii=False))
    return path

zip_rt = build('design-replicator-%s.zip' % version, runtime)
source = list(runtime) + [(p, p) for d in ['tools', 'server'] for p in sorted(walk(d)) if p not in EXTRA and not (os.path.basename(p).startswith('.env') and os.path.basename(p) != '.env.example') and '.sqlite' not in p] + [(p, p) for p in ['README.md', 'CHANGELOG.md', 'COMMERCIAL-SETUP.md', 'CHROMEWEBSTORE.md', 'STORE-LISTING.md', 'TESTING.md']]
zip_src = build('design-replicator-%s-source.zip' % version, source)

# 5) ozetler + notlar
lines = []
for p in (zip_rt, zip_src):
    h = hashlib.sha256(open(p, 'rb').read()).hexdigest()
    lines.append('%s  %s' % (h, os.path.basename(p)))
    print('%-45s %6.2f MB  sha256 %s...' % (os.path.basename(p), os.path.getsize(p) / 1e6, h[:12]))
open(os.path.join(OUT, 'SHA256SUMS.txt'), 'w').write('\n'.join(lines) + '\n')

changelog = open(os.path.join(ROOT, 'CHANGELOG.md'), encoding='utf-8').read()
m = re.search(r'## %s.*?(?=\n## |\Z)' % re.escape(version), changelog, re.S)
notes = '# Design Replicator %s\n\n%s\n\n## Kurulum\n1. `design-replicator-%s.zip` dosyasini kalici bir klasore cikarin\n2. `chrome://extensions` -> Gelistirici modu -> Paketlenmemis oge yukle -> klasoru secin\n3. Pro hizmetini kaynak paketteki COMMERCIAL-SETUP.md ile yapilandirin. Magaza yayini ve canli odeme henuz yapilmadi.\n\nDogrulama: `SHA256SUMS.txt`\n' % (version, (m.group(0) if m else ''), version)
open(os.path.join(OUT, 'RELEASE-NOTES-%s.md' % version), 'w', encoding='utf-8').write(notes)
print('release/ hazir:', ', '.join(sorted(os.listdir(OUT))))
