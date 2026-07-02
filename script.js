// Tailwind script already in HTML

// Clock
function updateClock() {
  const clock = document.getElementById('clock');
  clock.innerHTML = `
    Arizona: <span class="text-emerald-400">${new Date().toLocaleTimeString('en-US', { timeZone: 'America/Phoenix' })}</span><br>
    Denver: <span class="text-sky-400">${new Date().toLocaleTimeString('en-US', { timeZone: 'America/Denver' })}</span><br>
    Los Angeles: <span class="text-amber-400">${new Date().toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles' })}</span><br>
    Malaysia: <span class="text-fuchsia-400">${new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kuala_Lumpur' })}</span><br>
    Amsterdam: <span class="text-cyan-400">${new Date().toLocaleTimeString('en-US', { timeZone: 'Europe/Amsterdam' })}</span>
  `;
}
setInterval(updateClock, 1000);
updateClock();

// Weather for Chandler, Arizona
async function getWeather() {
  const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=33.3062&longitude=-111.8413&current_weather=true');
  const data = await res.json();
  const tempC = data.current_weather.temperature;
  const tempF = Math.round((tempC * 9) / 5 + 32);
  document.getElementById('weather').innerHTML = `
    Chandler, AZ: <span class="text-sky-300">${tempF}°F</span><br>
    <span class="text-sm">Feels like ${tempF}°F</span>
  `;
}
getWeather();

// Markets
async function getMarkets() {
  const markets = document.getElementById('markets');
  let marketHtml = '';

  const btcRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
  const btcData = await btcRes.json();
  marketHtml += `<div>BTC: <span class="text-yellow-400">$${btcData.bitcoin.usd.toLocaleString()}</span></div>`;

  try {
    const res = await fetch('https://api.twelvedata.com/quote?symbol=AAPL&apikey=demo');
    const data = await res.json();
    const price = data.close ?? data.price ?? data['previous_close'];
    if (price != null) {
      marketHtml += `<div>AAPL: <span class="text-emerald-300">$${Number(price).toFixed(2)}</span></div>`;
    } else {
      marketHtml += `<div>AAPL: <span class="text-red-400">N/A</span></div>`;
    }
  } catch (err) {
    marketHtml += `<div>AAPL: <span class="text-red-400">N/A</span></div>`;
  }

  markets.innerHTML = marketHtml;
}
getMarkets();

// Bitcoin Chart
let btcChart;
async function loadBtcChart() {
  const now = Math.floor(Date.now() / 1000);
  const oneDayAgo = now - 86400;
  const res = await fetch(`https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=${oneDayAgo}&to=${now}`);
  const data = await res.json();
  const prices = data.prices.map(p => p[1]);
  const labels = data.prices.map(p => new Date(p[0]).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));

  if (btcChart) btcChart.destroy();
  btcChart = new Chart(document.getElementById('btcChart'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Bitcoin Price (USD)',
        data: prices,
        borderColor: '#f59e0b',
        tension: 0.3,
        pointRadius: 0,
        borderWidth: 2
      }]
    },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { maxTicksLimit: 8 }, grid: { display: false } },
        y: { grid: { color: '#333' } }
      }
    }
  });
}
loadBtcChart();

// News
function formatNewsItem(item) {
  const time = item.pubDate ? new Date(item.pubDate).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
  return `
    <a href="${item.link}" target="_blank" class="block hover:bg-zinc-800 p-3 rounded-xl transition">
      <div class="text-sm font-semibold">${item.title}</div>
      <div class="text-xs text-zinc-500 mt-1">${time}</div>
    </a>
  `;
}

function parseRssXml(xmlText) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'application/xml');
  if (xml.querySelector('parsererror')) {
    throw new Error('Invalid RSS XML');
  }

  return Array.from(xml.querySelectorAll('item')).map(item => {
    const titleNode = item.querySelector('title');
    const linkNode = item.querySelector('link');
    const pubDateNode = item.querySelector('pubDate');
    return {
      title: titleNode ? titleNode.textContent.trim() : 'Untitled',
      link: linkNode ? linkNode.textContent.trim() : '#',
      pubDate: pubDateNode ? pubDateNode.textContent.trim() : ''
    };
  });
}

const YOUTUBE_TOPICS = [
  'retirement planning',
  'M365 CoPilot',
  'M365 dashboard claude',
  'VS Code',
  'GitHub',
  'GitHub Copilot',
  'Windsurf AI',
  'NFL news'
];

function formatYoutubeVideo(video) {
  const time = video.publishedAt ? new Date(video.publishedAt).toLocaleString('en-US', { month: 'short', day: 'numeric' }) : '';
  return `
    <a href="${video.link}" target="_blank" class="group block rounded-2xl border border-zinc-800 bg-zinc-950 p-3 transition hover:border-sky-500 w-72 flex-shrink-0">
      <img src="${video.thumbnail}" alt="${video.title}" class="mb-3 h-36 w-full rounded-xl object-cover" />
      <div class="text-sm font-semibold group-hover:text-sky-300">${video.title}</div>
      <div class="text-xs text-zinc-500 mt-1">${video.channelTitle} · ${time}</div>
    </a>
  `;
}

async function getYoutubeVideos() {
  const container = document.getElementById('youtubeVideos');
  container.innerHTML = '<div class="text-zinc-500">Loading videos...</div>';

  try {
    const topicsParam = YOUTUBE_TOPICS.map(encodeURIComponent).join('|');
    // request up to 20 videos per topic
    const res = await fetch(`http://localhost:8000/youtube?topics=${topicsParam}&max=20`);
    if (!res.ok) throw new Error('Video API failed');
    const data = await res.json();
    if (!data.topics?.length) throw new Error('No video topics');

    container.innerHTML = data.topics.map(topic => `
      <div class="bg-zinc-950 rounded-2xl p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-semibold">${topic.topic}</h3>
          <div class="flex items-center space-x-2">
            <button class="yt-prev px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700">◀</button>
            <button class="yt-next px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700">▶</button>
          </div>
        </div>
        <div class="relative">
          <div class="youtube-viewport no-scrollbar overflow-x-auto" style="scroll-behavior:smooth;">
            <div class="youtube-track flex gap-4">${topic.videos.map(formatYoutubeVideo).join('')}</div>
          </div>
        </div>
      </div>
    `).join('');

    // Setup carousel controls
    document.querySelectorAll('#youtubeVideos > div').forEach(section => {
      const prev = section.querySelector('.yt-prev');
      const next = section.querySelector('.yt-next');
      const viewport = section.querySelector('.youtube-viewport');
      if (!viewport) return;
      prev.addEventListener('click', () => {
        viewport.scrollBy({ left: -viewport.clientWidth, behavior: 'smooth' });
      });
      next.addEventListener('click', () => {
        viewport.scrollBy({ left: viewport.clientWidth, behavior: 'smooth' });
      });
    });
  } catch (err) {
    container.innerHTML = '<div class="text-red-400">Unable to load YouTube videos. Run the local backend with a YouTube API key.</div>';
  }
}

async function fetchNews(rssUrl, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = '<div class="text-zinc-500">Loading...</div>';

  try {
    const res = await fetch(rssUrl);
    if (!res.ok) throw new Error('Fetch failed');
    const text = await res.text();
    const items = parseRssXml(text);
    if (!items.length) throw new Error('No items');
    container.innerHTML = items.slice(0, 6).map(formatNewsItem).join('');
  } catch (err) {
    try {
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`);
      const data = await res.json();
      const items = data.items || [];
      if (!items.length) throw new Error('No items');
      container.innerHTML = items.slice(0, 6).map(formatNewsItem).join('');
    } catch (fallbackErr) {
      container.innerHTML = '<div class="text-red-400">Unable to load news.</div>';
    }
  }
}

async function getNews() {
  await Promise.all([
    fetchNews('https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml', 'news'),
    fetchNews('https://www.espn.com/espn/rss/news', 'sportsNews'),
    fetchNews('https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', 'businessNews'),
    fetchNews('https://news.google.com/rss/search?q=AI', 'aiNews')
  ]);
}
getNews();

getYoutubeVideos();

setInterval(() => {
  getWeather();
  getMarkets();
  loadBtcChart();
  getNews();
  getYoutubeVideos();
}, 60000);
