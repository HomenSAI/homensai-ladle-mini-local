#!/usr/bin/env python3
"""Offline source checks. These do not compile or run Android classes."""
from pathlib import Path
import json, re, sqlite3, subprocess, tempfile, xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
A=ROOT/'app/src/main/assets/www'
REPORTS=ROOT/'reports';REPORTS.mkdir(exist_ok=True)
results=[]

def check(name,condition):
    if not condition: raise AssertionError(name)
    results.append(name);print('PASS',name,flush=True)

for path in ROOT.glob('app/src/**/*.xml'):
    ET.parse(path)
    check('XML parses: '+str(path.relative_to(ROOT)),True)
manifest=ET.parse(ROOT/'app/src/main/AndroidManifest.xml').getroot()
check('manifest requests no Android permissions',not manifest.findall('uses-permission'))
app=manifest.find('application');ns='{http://schemas.android.com/apk/res/android}'
check('automatic Android backup disabled',app.get(ns+'allowBackup')=='false')
check('cleartext network disabled',app.get(ns+'usesCleartextTraffic')=='false')
html=(A/'index.html').read_text(encoding='utf-8')
check('CSP blocks inline/external execution',"default-src 'none'" in html and "script-src 'self'" in html and 'unsafe-inline' not in html and 'unsafe-eval' not in html)
check('all HTML script resources are local',all(not re.match(r'^[a-z]+:',x) for x in re.findall(r'<script[^>]+src="([^"]+)"',html)))
check('no font files are bundled',not [x for x in ROOT.rglob('*') if x.suffix.lower() in ('.ttf','.otf','.woff','.woff2')])
check('four complete skins in CSS',all(f'data-skin={skin}' in (A/'styles.css').read_text(encoding='utf-8') for skin in ('dark','paper','compact')))
translations=json.loads((A/'i18n.js').read_text(encoding='utf-8').split('window.LadleI18n = ',1)[1].rstrip().rstrip(';'))
keys=set(translations['de'])
check('German, Russian and English translation key parity',set(translations)=={'de','ru','en'} and all(set(t)==keys for t in translations.values()))
check('all translations are nonempty',all(isinstance(s,str) and s.strip() for t in translations.values() for s in t.values()))
mini_translations=json.loads((ROOT/'tools/i18n_mini.json').read_text(encoding='utf-8'))
check('mini UI translations have complete EN/DE/RU values',
      bool(mini_translations) and all(isinstance(row,list) and len(row)==3 and
          all(isinstance(s,str) and s.strip() for s in row) for row in mini_translations.values()))
# EN: Load the shipped catalog through Node to validate the exact runtime data without a duplicate parser.
# DE: Den ausgelieferten Katalog über Node laden, damit die Laufzeitdaten ohne zweiten Parser geprüft werden.
# RU: Загрузить каталог через Node, чтобы проверить реальные данные приложения без второго парсера.
catalog_text=subprocess.run(
    ['node','-e',"process.stdout.write(JSON.stringify(require('./app/src/main/assets/www/catalog-data.js')) )"],
    cwd=ROOT,capture_output=True,text=True,encoding='utf-8',check=True).stdout
catalog=json.loads(catalog_text)
catalog_rows=[*catalog['categories'].values(),*(item['names'] for item in catalog['templates'])]
check('built-in catalog names have complete EN/DE/RU translations',
      bool(catalog_rows) and all(set(row)=={'de','en','ru'} and
          all(isinstance(s,str) and s.strip() for s in row.values()) for row in catalog_rows))
ui=(A/'ui.js').read_text(encoding='utf-8')
check('literal UI translation references exist',set(re.findall(r"\bt\('([^']+)'\s*[,)]",ui))<=keys)
for path in A.glob('*.js'):
    subprocess.run(['node','--check',str(path)],check=True,capture_output=True,text=True)
    check('JavaScript syntax: '+path.name,True)

css=(A/'styles.css').read_text(encoding='utf-8')
base=dict(re.findall(r'--([\w-]+):\s*(#[0-9a-fA-F]{6})',re.search(r':root\s*\{(.*?)\}',css,re.S).group(1)))
def lum(c):
    rgb=[int(c[i:i+2],16)/255 for i in (1,3,5)]
    r,g,b=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb]
    return .2126*r+.7152*g+.0722*b

def contrast(a,b):
    aa,bb=sorted((lum(a),lum(b)))
    return (bb+.05)/(aa+.05)
contrast_rows=[]
for skin in ('light','dark','paper','compact'):
    colors=dict(base)
    if skin!='light':
        body=re.search(r':root\[data-skin='+skin+r'\]\s*\{(.*?)\}',css,re.S).group(1)
        colors.update(dict(re.findall(r'--([\w-]+):\s*(#[0-9a-fA-F]{6})',body)))
    ratios={token:round(contrast(colors[token],colors['surface']),2) for token in ('text','muted','accent','ok','warn','bad')}
    ratios['button']=round(contrast(colors['on-accent'],colors['accent']),2)
    check('text/button token contrast >=4.5:1: '+skin,all(v>=4.5 for v in ratios.values()))
    contrast_rows.append({'skin':skin,**ratios})

# Execute the same SQL schema in desktop SQLite. This is schema/transaction behaviour,
# not execution of Android AppDatabase.java; native integration tests are separate.
with tempfile.TemporaryDirectory() as temp:
    db=sqlite3.connect(str(Path(temp)/'test.db'))
    db.executescript((ROOT/'app/src/main/assets/store.sql').read_text(encoding='utf-8'))
    db.execute('INSERT INTO state VALUES(1,1,?,1)',('{"test":1}',));db.commit()
    check('SQL schema creates a readable snapshot',db.execute('SELECT revision FROM state').fetchone()[0]==1)
    for sql in ["INSERT INTO state VALUES(2,1,'{}',1)","UPDATE state SET revision=0 WHERE id=1"]:
        rejected=False
        try: db.execute(sql);db.commit()
        except sqlite3.IntegrityError: db.rollback();rejected=True
        check('SQL rejects invalid singleton/revision: '+sql,rejected)
    db.execute('BEGIN IMMEDIATE');db.execute('UPDATE state SET revision=2');db.rollback()
    check('SQL rollback preserves prior revision',db.execute('SELECT revision FROM state').fetchone()[0]==1)
    for n in range(1,11): db.execute('INSERT INTO history VALUES(?,?,?)',(n,'{}',n))
    db.execute('DELETE FROM history WHERE revision NOT IN (SELECT revision FROM history ORDER BY revision DESC LIMIT 5)');db.commit()
    check('history retention SQL preserves only newest five',db.execute('SELECT revision FROM history ORDER BY revision').fetchall()==[(6,),(7,),(8,),(9,),(10,)])
    db.close()
    classes=Path(temp)/'classes';classes.mkdir()
    sources=[ROOT/'app/src/main/java/com/homensai/laedle/AssetPolicy.java',ROOT/'tests/AssetPolicyTest.java']
    subprocess.run(['javac','--release','17','-d',str(classes),*[str(s) for s in sources]],check=True)
    origin=subprocess.run(['java','-cp',str(classes),'AssetPolicyTest'],capture_output=True,text=True,check=True)
    print(origin.stdout.strip())
    check('JVM exact-origin/path suite',True)
    subprocess.run(['javac','-d',str(classes),str(ROOT/'tools/ParseJava.java')],check=True)
    java_sources=list(ROOT.glob('app/src/**/*.java'))
    parse=subprocess.run(['java','-cp',str(classes),'ParseJava',*[str(s) for s in java_sources]],check=True,capture_output=True,text=True)
    print(parse.stdout.strip());check('Java syntax-only parse (no Android API resolution)',True)

report={'checksPassed':len(results),'checks':results,'contrast':contrast_rows,
        'assetPolicyOutput':origin.stdout.strip(),'javaParseOutput':parse.stdout.strip(),
        'notCovered':['APK build','Android API type checking','Android SQLite implementation','native WebView/SAF','WCAG full audit']}
(REPORTS/'source-checks.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'\n{len(results)} source/schema checks passed. Android build/device tests NOT executed.')
