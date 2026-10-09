#!/usr/bin/env python3
"""Zero-dependency HTTP server for the Brian Eno Aleatoric Soundscape web app."""

import base64
import http.server
import json
import os
import socketserver
import sys
import threading

PORT = int(os.environ.get('PORT', '8094'))
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
SELFTEST_EVENT = threading.Event()
GIF_1X1 = base64.b64decode(
    'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
)


SAVED_PATCHES_FILE = os.path.join(ROOT_DIR, 'saved-patches.json')
DEFAULT_PATCHES = {
    'version': 1,
    'patchOverrides': {},
    'customPresets': {},
    'customTrackPatterns': {},
    'activePresetId': None,
}


class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
  """Serves static assets from ROOT_DIR with no-cache headers."""

  def __init__(self, *args, **kwargs):
    super().__init__(*args, directory=ROOT_DIR, **kwargs)

  def end_headers(self):
    self.send_header(
        'Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0'
    )
    self.send_header('Pragma', 'no-cache')
    self.send_header('Expires', '0')
    self.send_header('Access-Control-Allow-Origin', '*')
    super().end_headers()

  def do_OPTIONS(self):
    self.send_response(204)
    self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    self.send_header('Access-Control-Allow-Headers', 'Content-Type')
    self.end_headers()

  def do_GET(self):
    if self.path.startswith('/api/health'):
      self.send_response(200)
      self.send_header('Content-Type', 'application/json')
      self.end_headers()
      self.wfile.write(
          json.dumps({'status': 'ok', 'app': 'eno_soundscape'}).encode('utf-8')
      )
      return
    if self.path.startswith('/api/patches'):
      self.send_response(200)
      self.send_header('Content-Type', 'application/json')
      self.end_headers()
      if os.path.exists(SAVED_PATCHES_FILE):
        try:
          with open(SAVED_PATCHES_FILE, 'rb') as f:
            data = f.read()
          json.loads(data.decode('utf-8'))
          self.wfile.write(data)
          return
        except Exception:
          pass
      self.wfile.write(json.dumps(DEFAULT_PATCHES).encode('utf-8'))
      return
    if self.path.startswith('/api/selftest-release'):
      SELFTEST_EVENT.set()
      self.send_response(200)
      self.send_header('Content-Type', 'application/json')
      self.end_headers()
      self.wfile.write(b'{"released":true}')
      return
    if self.path.startswith('/api/selftest-barrier'):
      SELFTEST_EVENT.wait(timeout=3.5)
      SELFTEST_EVENT.clear()
      self.send_response(200)
      self.send_header('Content-Type', 'image/gif')
      self.end_headers()
      self.wfile.write(GIF_1X1)
      return
    super().do_GET()

  def do_POST(self):
    if self.path.startswith('/api/patches'):
      content_length = int(self.headers.get('Content-Length', 0))
      body = self.rfile.read(content_length)
      try:
        data = json.loads(body.decode('utf-8'))
        if not isinstance(data, dict):
          raise ValueError('Payload must be a JSON object')
        tmp_file = SAVED_PATCHES_FILE + '.tmp'
        with open(tmp_file, 'w', encoding='utf-8') as f:
          json.dump(data, f, indent=2, sort_keys=True)
          f.write('\n')
        os.replace(tmp_file, SAVED_PATCHES_FILE)
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(
            json.dumps({'ok': True, 'saved': True}).encode('utf-8')
        )
        return
      except Exception as e:
        self.send_response(400)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(
            json.dumps({'ok': False, 'error': str(e)}).encode('utf-8')
        )
        return
    self.send_response(404)
    self.end_headers()

  def log_message(self, fmt, *args):
    sys.stderr.write(f'[eno_soundscape] {fmt % args}\n')


class DualStackTCPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
  address_family = socketserver.socket.AF_INET6
  allow_reuse_address = True
  daemon_threads = True

  def server_bind(self):
    self.socket.setsockopt(
        socketserver.socket.IPPROTO_IPV6, socketserver.socket.IPV6_V6ONLY, 0
    )
    super().server_bind()


if __name__ == '__main__':
  with DualStackTCPServer(('::', PORT), NoCacheHTTPRequestHandler) as httpd:
    print(f'Serving Eno Aleatoric Soundscape on http://[::]:{PORT}/', flush=True)
    httpd.serve_forever()
