"""Read-only public source audit. Reports locations, never secret values."""
from pathlib import Path
import re,sys,hashlib,json
root=Path(sys.argv[1]).resolve()
patterns={
 'private key':r'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
 'provider credential':r'(?i)(?:sk-(?:ant-|proj-)?[A-Za-z0-9_-]{25,}|gh[pousr]_[A-Za-z0-9]{25,}|AIza[A-Za-z0-9_-]{30,}|AKIA[A-Z0-9]{16}|whsec_[A-Za-z0-9]{20,})',
 'assigned credential':r"""(?i)(?:api[_-]?key|secret|password|access[_-]?token)\s*[:=]\s*["']([^"'\s]{16,})["']""",
 'personal path':r'(?i)C:[/\\]Users[/\\][^/\\\s]+'
}
findings=[]; report=[]
for p in sorted(root.rglob('*')):
 if not p.is_file() or '.git' in p.parts or '.serena' in p.parts or '__pycache__' in p.parts: continue
 rel=p.relative_to(root).as_posix()
 if rel.startswith('release/'):continue
 b=p.read_bytes()
 report.append({'file':rel,'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()})
 if p.suffix in ('.png','.ttf'):continue
 try:t=b.decode('utf-8')
 except UnicodeDecodeError:findings.append((rel,'unreviewed binary'));continue
 if p.name.startswith('.env') and p.name!='.env.example':findings.append((rel,'environment file'))
 for name,pat in patterns.items():
  for m in re.finditer(pat,t):
   # This heuristic intentionally flags template values for human review.
   if rel == 'server/server.test.mjs' and name == 'assigned credential' and m.group(1) in ('correct-long-password','incorrect-password'):
    continue  # Reviewed test fixtures, not real account credentials.
   findings.append((rel,name,t[:m.start()].count('\n')+1))
print(json.dumps({'files':len(report),'total_bytes':sum(x['bytes'] for x in report),'findings':findings},indent=2))
if findings:sys.exit(1)
