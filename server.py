import json
from http.server import BaseHTTPRequestHandler, HTTPServer
from urllib.parse import urlparse, parse_qs, quote
import urllib.request
import ssl
import time
import os
import sqlite3
import urllib.error

YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3/search'
# Read API key from env var if set, otherwise fall back to the constant below.
API_KEY = os.environ.get('YOUTUBE_API_KEY', 'AIzaSyCPlVJDQ-2L4DmVxH3kp_aLTpK3jYrMH3M')  # Replace with your YouTube Data API key or set YOUTUBE_API_KEY env var

# Fallback demo videos used when the API is rate-limited or fails
DEMO_VIDEOS = [
    {
        'title': 'Sample Video: Getting Started',
        'link': 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        'thumbnail': 'https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg',
        'channelTitle': 'Demo Channel',
        'publishedAt': '2025-01-01T00:00:00Z'
    },
    {
        'title': 'Sample Video: Tips & Tricks',
        'link': 'https://www.youtube.com/watch?v=9bZkp7q19f0',
        'thumbnail': 'https://i.ytimg.com/vi/9bZkp7q19f0/mqdefault.jpg',
        'channelTitle': 'Demo Channel',
        'publishedAt': '2025-02-01T00:00:00Z'
    },
    {
        'title': 'Sample Video: Deep Dive',
        'link': 'https://www.youtube.com/watch?v=3JZ_D3ELwOQ',
        'thumbnail': 'https://i.ytimg.com/vi/3JZ_D3ELwOQ/mqdefault.jpg',
        'channelTitle': 'Demo Channel',
        'publishedAt': '2025-03-01T00:00:00Z'
    }
]

# Simple in-memory cache to reduce YouTube API calls
CACHE = {}
# seconds
CACHE_TTL = 3600  # 1 hour

# Persistent cache DB
DB_FILE = os.path.join(os.path.dirname(__file__), 'yt_cache.db')


def init_db():
    conn = sqlite3.connect(DB_FILE)
    try:
        conn.execute('''CREATE TABLE IF NOT EXISTS cache (
            topic TEXT PRIMARY KEY,
            ts INTEGER,
            data TEXT
        )''')
        conn.commit()
    finally:
        conn.close()


def get_cached_persistent(topic):
    # check in-memory first
    entry = CACHE.get(topic)
    if entry and time.time() - entry.get('ts', 0) < CACHE_TTL:
        return entry.get('videos')
    # fallback to sqlite
    try:
        conn = sqlite3.connect(DB_FILE)
        cur = conn.cursor()
        cur.execute('SELECT ts, data FROM cache WHERE topic = ?', (topic,))
        row = cur.fetchone()
        conn.close()
        if not row:
            return None
        ts, data = row
        if time.time() - ts < CACHE_TTL:
            videos = json.loads(data)
            CACHE[topic] = {'ts': ts, 'videos': videos}
            return videos
    except Exception as e:
        print('Cache read error:', e)
    return None


def set_cached_persistent(topic, videos):
    try:
        ts = int(time.time())
        CACHE[topic] = {'ts': ts, 'videos': videos}
        conn = sqlite3.connect(DB_FILE)
        cur = conn.cursor()
        cur.execute('REPLACE INTO cache(topic, ts, data) VALUES(?,?,?)', (topic, ts, json.dumps(videos)))
        conn.commit()
        conn.close()
    except Exception as e:
        print('Cache write error:', e)


init_db()


def fetch_url(url):
    # Exponential backoff with Retry-After handling
    backoff = 1
    attempts = 4
    for i in range(attempts):
        try:
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            with urllib.request.urlopen(url, timeout=15, context=ctx) as response:
                return json.loads(response.read().decode('utf-8'))
        except urllib.error.HTTPError as e:
            code = getattr(e, 'code', None)
            headers = getattr(e, 'headers', {}) or {}
            retry_after = headers.get('Retry-After') or headers.get('retry-after')
            print(f'HTTPError {code} for {url}')
            if code == 429:
                if retry_after:
                    try:
                        wait = int(retry_after)
                    except Exception:
                        wait = backoff
                    print(f'Retry-After header present, sleeping {wait}s')
                    time.sleep(wait)
                    backoff = min(backoff * 2, 60)
                    continue
                else:
                    time.sleep(backoff)
                    backoff = min(backoff * 2, 60)
                    continue
            else:
                try:
                    body = e.read().decode('utf-8')
                    print('HTTPError body:', body[:200])
                except Exception:
                    pass
                return None
        except Exception as e:
            print('Fetch error', e)
            time.sleep(backoff)
            backoff = min(backoff * 2, 60)
            continue
    return None

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
            max_results = int(query.get('max', ['5'])[0])
        except Exception:
            max_results = 5
        if max_results < 1: max_results = 1
        if max_results > 20: max_results = 20
        result = {'topics': []}

        for topic in topics:
            topic = topic.strip()
            if not topic:
                continue
            # Serve from persistent-backed cache when possible
            cached = get_cached_persistent(topic)
            if cached:
                print(f"Serving cached videos for topic '{topic}'")
                result['topics'].append({'topic': topic, 'videos': cached})
                continue

            videos = []
            is_playlist = False
            try:
                if topic.lower().startswith('channel:'):
                    channel_id = topic.split(':', 1)[1].strip()
                    # fetch uploads playlist id for channel
                    channels_url = f"https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id={quote(channel_id)}&key={API_KEY}"
                    ch_data = fetch_url(channels_url)
                    uploads_id = None
                    if ch_data:
                        items = ch_data.get('items', [])
                        if items and items[0].get('contentDetails', {}).get('relatedPlaylists', {}).get('uploads'):
                            uploads_id = items[0]['contentDetails']['relatedPlaylists']['uploads']
                    # Fallback: derive uploads playlist id by replacing UC.. with UU..
                    if not uploads_id and channel_id.startswith('UC'):
                        uploads_id = 'UU' + channel_id[2:]
                    if uploads_id:
                        search_url = f"https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId={quote(uploads_id)}&maxResults={max_results}&key={API_KEY}"
                        is_playlist = True
                    else:
                        # fallback to channel search
                        search_url = f"{YOUTUBE_API_BASE}?part=snippet&type=video&channelId={quote(channel_id)}&order=date&maxResults={max_results}&key={API_KEY}"
                else:
                    search_url = f"{YOUTUBE_API_BASE}?part=snippet&type=video&maxResults={max_results}&q={quote(topic)}&key={API_KEY}"

                data = fetch_url(search_url)
                # If playlist fetch failed, fall back to channel search
                if not data and is_playlist:
                    try:
                        channel_search = f"{YOUTUBE_API_BASE}?part=snippet&type=video&channelId={quote(channel_id)}&order=date&maxResults={max_results}&key={API_KEY}"
                        print('Falling back to channel search for', channel_id)
                        data = fetch_url(channel_search)
                        is_playlist = False
                    except Exception:
                        data = None
                if data:
                    items = data.get('items', [])
                    if is_playlist:
                        for item in items:
                            snip = item.get('snippet', {})
                            video_id = (snip.get('resourceId') or {}).get('videoId')
                            if not video_id:
                                continue
                            videos.append({
                                'title': snip.get('title', ''),
                                'link': f"https://www.youtube.com/watch?v={video_id}",
                                'thumbnail': (snip.get('thumbnails', {}) or {}).get('medium', {}).get('url', ''),
                                'channelTitle': snip.get('channelTitle', ''),
                                'publishedAt': snip.get('publishedAt', '')
                            })
                    else:
                        for item in items:
                            vid = (item.get('id') or {}).get('videoId') or (item.get('snippet') or {}).get('resourceId', {}).get('videoId')
                            if not vid:
                                continue
                            snip = item.get('snippet', {})
                            videos.append({
                                'title': snip.get('title', ''),
                                'link': f"https://www.youtube.com/watch?v={vid}",
                                'thumbnail': (snip.get('thumbnails', {}) or {}).get('medium', {}).get('url', ''),
                                'channelTitle': snip.get('channelTitle', ''),
                                'publishedAt': snip.get('publishedAt', '')
                            })
            except Exception as e:
                print(f"Error processing YouTube data for topic '{topic}':", repr(e))
                videos = []

            # If API returns no videos (e.g., rate-limited), use demo fallback
            if not videos:
                demo = []
                for i in range(min(max_results, len(DEMO_VIDEOS))):
                    demo.append(DEMO_VIDEOS[i])
                videos = demo

            # persist the results
            try:
                set_cached_persistent(topic, videos)
            except Exception:
                pass

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
