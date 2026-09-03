"""Yerel geliştirme sunucusu: doğru MIME türleriyle statik dosya sunar (Windows'ta .js text/plain sorununu aşar)."""
import http.server, mimetypes, sys

mimetypes.add_type('application/javascript', '.js')
mimetypes.add_type('application/manifest+json', '.webmanifest')
mimetypes.add_type('image/svg+xml', '.svg')


class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'application/javascript', '.mjs': 'application/javascript',
                      '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml'}

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
http.server.ThreadingHTTPServer(('127.0.0.1', port), H).serve_forever()
