from pathlib import Path
import hashlib,json,re,subprocess,sys
import yaml
root=Path.cwd(); b=root/'.spec/prds/harness-eval-framework'; sc=root/'.spec/scenarios'
baseline=json.loads(Path(__file__).with_name('baseline.json').read_text())
checks=[]
def check(name,condition,detail=''):
 checks.append({'check':name,'pass':bool(condition),'detail':detail})
def tracked_text(p):
 return subprocess.check_output(['git','show',baseline['head']+':'+str(p.relative_to(root))],text=True)
test=b/'10-e2e-testing-criteria.md'
rows=re.findall(r'^\| (T-[A-Z]+-\d+) \| (.*?) \| (AC-\d+) \| (.*?) \|',test.read_text(),re.M)
old=re.findall(r'^\| (T-[A-Z]+-\d+) \|',tracked_text(test),re.M)
check('Stable unique 65 criterion IDs',len(rows)==65 and len({r[0] for r in rows})==65 and [r[0] for r in rows]==old)
for group,file in [('GRD','04-uc-grd.md'),('REL','05-uc-rel.md'),('RPT','06-uc-rpt.md'),('RUN','07-uc-run.md')]:
 ac=[x.removesuffix('.') for x in re.findall(r'^- ☐ (.+)$',(b/file).read_text(),re.M)]
 ts=[r[1] for r in rows if r[0].startswith('T-'+group+'-')]
 check('Source/table criterion agreement '+group,ac==ts, f'{len(ac)} source / {len(ts)} table')
scenario_paths=sorted(sc.rglob('*.scenario.md'));ids=[];oldids=[]
for p in scenario_paths:
 ids+=re.findall(r'^flow_id: (.+)$',p.read_text(),re.M)
 exists=subprocess.run(['git','cat-file','-e',baseline['head']+':'+str(p.relative_to(root))],capture_output=True).returncode==0
 if exists:oldids+=re.findall(r'^flow_id: (.+)$',tracked_text(p),re.M)
check('77 unique scenario IDs; original 68 preserved',len(ids)==77 and len(set(ids))==77 and len(oldids)==68 and set(oldids).issubset(ids),f'{len(ids)} current / {len(oldids)} original')
matrix=(sc/'coverage-matrix.md').read_text()
check('Every scenario appears in coverage matrix',all(i in matrix for i in ids))
check('16 use cases retain coverage rows',len(re.findall(r'^\| UC-',matrix,re.M))==16)
links=[]
for p in list(b.rglob('*.md'))+[sc/'coverage-matrix.md']+scenario_paths:
 for target in re.findall(r'\]\(([^)]+)\)',p.read_text()):
  if '://' in target or target.startswith('#'):continue
  dest=target.split('#')[0].strip('<>')
  if dest and not (p.parent/dest).exists():links.append(str(p.relative_to(root))+': '+target)
check('All local document links resolve',not links,'; '.join(links))
meta=[]
for p in b.rglob('*.md'):
 s=p.read_text()
 if 'prd_version:' in s and 'prd_version: 1.0.1' not in s:meta.append(str(p))
check('PRD metadata consistently 1.0.1',not meta,'; '.join(meta))
rem=(b/'11-remediation.md').read_text()
check('All 17 finding/change pairs mapped',all(f'F-{i:03} / CHG-{i:03}' in rem for i in range(1,18)))
check('Process gate remains T-RUN-010',next(r[3] for r in rows if r[0]=='T-RUN-010')=='[process-gate]')
check('Test type counts',sum(r[3]=='[e2e-automated]' for r in rows)==60 and sum(r[3]=='[build-gate]' for r in rows)==3 and sum(r[3]=='[human-gate]' for r in rows)==1)
changed=[]
for path,digest in baseline['preserved'].items():
 p=root/path
 if not p.is_file() or hashlib.sha256(p.read_bytes()).hexdigest()!=digest:changed.append(path)
check('Original review and unrelated WIP bytes preserved',not changed,f'{len(baseline["preserved"])} files; changed={changed}')
if '--precommit' in sys.argv:
 check('HEAD and main unchanged during editing/review',subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()==baseline['head'] and subprocess.check_output(['git','rev-parse','main'],text=True).strip()==baseline['main'])
else:
 check('Original reviewed commit remains an ancestor',subprocess.run(['git','merge-base','--is-ancestor',baseline['head'],'HEAD']).returncode==0)
parsed=0
for p in list(b.rglob('*.md'))+scenario_paths:
 body=p.read_text()
 if body.startswith('---\n'):
  yaml.safe_load(body.split('---',2)[1]);parsed+=1
check('YAML frontmatter parses',parsed==99,f'{parsed} documents')
diff=subprocess.run(['git','diff','--check'],capture_output=True,text=True)
check('git diff --check',diff.returncode==0,diff.stdout+diff.stderr)
print(json.dumps({'checks':checks,'passed':sum(c['pass'] for c in checks),'total':len(checks)},indent=2))
sys.exit(0 if all(c['pass'] for c in checks) else 1)
