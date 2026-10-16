#!/usr/bin/env python3
"""Bundle the exact web UI into one offline preview. No external fonts or scripts.
The Android build continues to use separate CSP-self assets; this preview uses
SHA-256 CSP hashes for its inlined build output. It is NOT an APK.
"""
from pathlib import Path
import re, hashlib, base64
ROOT=Path(__file__).resolve().parents[1]
A=ROOT/'app/src/main/assets/www'
OUT=ROOT/'preview';OUT.mkdir(exist_ok=True)
def csp_hash(text):
    return "'sha256-"+base64.b64encode(hashlib.sha256(text.encode()).digest()).decode()+"'"
css=(A/'styles.css').read_text()
scripts=[(A/name).read_text() for name in ['catalog-data.js','core.js','storage.js','i18n.js','ui.js']]
html=(A/'index.html').read_text()
html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>', '',html)
html=re.sub(r'<script[^>]+src=[^>]*></script>', '',html)
html=re.sub(r'<link[^>]*stylesheet[^>]*>', '',html)
csp="default-src 'none'; script-src "+' '.join(csp_hash(s) for s in scripts)+"; style-src "+csp_hash(css)+"; img-src data:; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none';"
html=html.replace('<head>','<head>\n<meta http-equiv="Content-Security-Policy" content="'+csp+'">')
html=html.replace('</head>','<style>'+css+'</style>\n</head>')
html=html.replace('</body>','\n'.join('<script>'+script+'</script>' for script in scripts)+'\n</body>')
html=html.replace('<title>Lädle · HomenS.AI</title>','<title>Lädle · Browser-Vorschau · HomenS.AI</title>')
(OUT/'Laedle-preview.html').write_text(html,encoding='utf-8')
print(OUT/'Laedle-preview.html')
