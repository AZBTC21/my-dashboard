import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs, quote
import urllib.request
import ssl

YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3/search'
API_KEY = 'AIzaSyCPlVJDQ-2L4DmVxH3kp_aLTpK3jYrMH3M'  # Replace with your YouTube Data API key

class Handler(BaseHTTPRequestHandler):
    def _set_headers(self, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path != '/youtube':
            self._set_headers(404)
            self.wfile.write(json.dumps({'error': 'Not found'}).encode('utf-8'))
            return

        query = parse_qs(parsed.query)
        topics_str = query.get('topics', [''])[0]
        topics = topics_str.split('|') if topics_str else []
        try:
            max_results = int(query.get('max', ['20'])[0])
        except Exception:
            max_results = 20
        if max_results < 1: max_results = 1
        if max_results > 50: max_results = 50
        result = {'topics': []}

        for topic in topics:
            topic = topic.strip()
            if not topic:
                continue
            search_url = f"{YOUTUBE_API_BASE}?part=snippet&type=video&maxResults={max_results}&q={quote(topic)}&key={API_KEY}"
            try:
                # Create an unverified SSL context for environments missing CA certs (local dev only)
                ctx = ssl.create_default_context()
                ctx.check_hostname = False
                ctx.verify_mode = ssl.CERT_NONE
                with urllib.request.urlopen(search_url, timeout=15, context=ctx) as response:
                    data = json.loads(response.read().decode('utf-8'))
                    videos = [
                        {
                            'title': item['snippet']['title'],
                            'link': f"https://www.youtube.com/watch?v={item['id']['videoId']}",
                            'thumbnail': item['snippet']['thumbnails']['medium']['url'],
                            'channelTitle': item['snippet']['channelTitle'],
                            'publishedAt': item['snippet']['publishedAt']
                        }
                        for item in data.get('items', [])
                        if item.get('id', {}).get('videoId')
                    ]
            except Exception:
                videos = []

            result['topics'].append({'topic': topic, 'videos': videos})

        self._set_headers()
        self.wfile.write(json.dumps(result).encode('utf-8'))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    port = 8000
    print(f'Starting server on http://localhost:{port}')
    HTTPServer(('0.0.0.0', port), Handler).serve_forever()
