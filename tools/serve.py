#!/usr/bin/env python3
"""Serve only packaged web assets on loopback. No remote access or uploads."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse
p = argparse.ArgumentParser()
p.add_argument('--port', type=int, default=8765)
args = p.parse_args()
root = Path(__file__).resolve().parents[1] / 'app/src/main/assets/www'
print(f'Lädle browser preview: http://127.0.0.1:{args.port}', flush=True)
ThreadingHTTPServer(('127.0.0.1', args.port), partial(SimpleHTTPRequestHandler, directory=str(root))).serve_forever()
