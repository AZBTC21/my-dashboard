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

// Sports Scores
const SPORTS_LEAGUES = [
  {
    key: 'NFL',
    label: 'NFL',
    api: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
    standingsUrl: 'https://www.espn.com/nfl/standings',
    favorite: 'NE'
  },
  {
    key: 'NBA',
    label: 'NBA',
    api: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
    standingsUrl: 'https://www.espn.com/nba/standings',
    favorite: 'LAL'
  },
  {
    key: 'MLB',
    label: 'MLB',
    api: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
    standingsUrl: 'https://www.espn.com/mlb/standings',
    favorite: 'LAD'
  }
];
const SPORTS_REFRESH_MS = 180000;

function updateSportsLastUpdated() {
  const lastUpdated = new Date();
  document.getElementById('sportsLastUpdated').textContent = `Updated ${lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function getStatusBadge(statusType = {}) {
  const state = statusType.state;
  if (state === 'in') {
    return '<span class="sports-badge sports-badge-live">Live</span>';
  }
  if (state === 'post') {
    return '<span class="sports-badge sports-badge-final">Final</span>';
  }
  return '<span class="sports-badge sports-badge-scheduled">Scheduled</span>';
}

function getEventLink(event) {
  const link = (event.links || []).find((l) => {
    const rel = Array.isArray(l.rel) ? l.rel : [l.rel];
    return rel.includes('event') || rel.includes('desktop') || rel.includes('summary');
  });
  return link?.href || event.link || 'https://www.espn.com';
}

function formatSportsEvent(event) {
  const comp = event.competitions?.[0] || {};
  const away = comp.competitors?.find((c) => c.homeAway === 'away') || {};
  const home = comp.competitors?.find((c) => c.homeAway === 'home') || {};
  const statusType = comp.status?.type || {};
  const badge = getStatusBadge(statusType);
  const timeString = statusType.state === 'pre'
    ? new Date(event.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : comp.status?.displayClock || statusType.description || 'Scheduled';
  const eventUrl = getEventLink(event);

  return `
    <a href="${eventUrl}" target="_blank" class="block p-3 rounded-2xl border border-zinc-800 hover:border-sky-500 hover:bg-zinc-900 transition">
      <div class="flex items-center justify-between gap-3">
        <span class="text-xs uppercase tracking-[0.18em] text-zinc-500">${statusType.description || 'Scheduled'}</span>
        <span class="text-xs text-zinc-400">${timeString}</span>
      </div>
      <div class="mt-3 grid gap-3 text-sm">
        <div class="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3">
          <img src="${away.team?.logo || ''}" alt="${away.team?.abbreviation || 'AWY'}" class="team-logo" />
          <div class="text-zinc-300 font-semibold">${away.team?.abbreviation || away.team?.displayName || 'Away'}</div>
          <div class="text-right text-white font-semibold">${away.score ?? '-'}</div>
        </div>
        <div class="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3">
          <img src="${home.team?.logo || ''}" alt="${home.team?.abbreviation || 'HME'}" class="team-logo" />
          <div class="text-zinc-300 font-semibold">${home.team?.abbreviation || home.team?.displayName || 'Home'}</div>
          <div class="text-right text-white font-semibold">${home.score ?? '-'}</div>
        </div>
      </div>
      <div class="mt-3 flex items-center justify-between">
        ${badge}
        <span class="text-xs text-zinc-500">${event.name || ''}</span>
      </div>
    </a>
  `;
}

function getFavoriteMatchup(league, events) {
  if (!league.favorite) return '<div class="text-sm text-zinc-500">No favorite team configured.</div>';

  const favoriteEvent = events
    .filter((event) => {
      const competitors = event.competitions?.[0]?.competitors || [];
      return competitors.some((c) => c.team?.abbreviation === league.favorite);
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  if (!favoriteEvent) {
    return `<div class="text-sm text-zinc-500">No upcoming or recent games for ${league.favorite} found.</div>`;
  }

  const comp = favoriteEvent.competitions?.[0] || {};
  const away = comp.competitors?.find((c) => c.homeAway === 'away') || {};
  const home = comp.competitors?.find((c) => c.homeAway === 'home') || {};
  const statusType = comp.status?.type || {};
  const timeString = statusType.state === 'pre'
    ? new Date(favoriteEvent.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : comp.status?.displayClock || statusType.description || 'Scheduled';

  return `
    <div class="rounded-2xl border border-zinc-800 bg-zinc-950 p-3">
      <div class="text-sm text-zinc-400 mb-3">${favoriteEvent.name}</div>
      <div class="grid gap-2 text-sm">
        <div class="grid grid-cols-[2.25rem_1fr_auto] items-center gap-3">
          <img src="${away.team?.logo || ''}" alt="${away.team?.abbreviation}" class="team-logo" />
          <div class="text-zinc-300">${away.team?.abbreviation || away.team?.displayName || 'Away'}</div>
          <div class="text-right text-white font-semibold">${away.score ?? '-'}</div>
        </div>
        <div class="grid grid-cols-[2.25rem_1fr_auto] items-center gap-3">
          <img src="${home.team?.logo || ''}" alt="${home.team?.abbreviation}" class="team-logo" />
          <div class="text-zinc-300">${home.team?.abbreviation || home.team?.displayName || 'Home'}</div>
          <div class="text-right text-white font-semibold">${home.score ?? '-'}</div>
        </div>
      </div>
      <div class="mt-3 flex items-center justify-between text-xs text-zinc-400">
        <span>${timeString}</span>
        ${getStatusBadge(statusType)}
      </div>
    </div>
  `;
}

function renderLeaguePanel(league, events, error) {
  if (error) {
    return `<div class="text-red-400 text-sm">Unable to load ${league.label} scores.</div>`;
  }

  if (!events.length) {
    return `<div class="text-sm text-zinc-500">No games are available right now for ${league.label}.</div>`;
  }

  const sortedEvents = events.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
  const upcomingCount = sortedEvents.length;

  return `
    <div class="section standings-card">
      <div class="text-sm text-zinc-400 mb-2">League Standings</div>
      <a href="${league.standingsUrl}" target="_blank" class="text-sky-400 hover:text-white">View full ${league.label} standings on ESPN</a>
    </div>
    <div class="section standings-card">
      <div class="text-sm text-zinc-400 mb-2">Favorite team next matchup</div>
      ${getFavoriteMatchup(league, sortedEvents)}
    </div>
    <div class="section">
      <div class="text-sm text-zinc-400 mb-3">Showing up to 8 recent/upcoming ${league.label} games (${upcomingCount} total)</div>
      <div class="space-y-3">
        ${sortedEvents.slice(0, 8).map(formatSportsEvent).join('')}
      </div>
    </div>
  `;
}

function setLeagueTab(key) {
  SPORTS_LEAGUES.forEach((league) => {
    document.getElementById(`sports${league.key}`).classList.toggle('hidden', league.key !== key);
    document.getElementById(`sportsTab${league.key}`).classList.toggle('sports-tab-active', league.key === key);
  });
}

async function getSportsScores() {
  const statusText = document.getElementById('sportsStatusText');
  statusText.textContent = 'Loading league data...';
  SPORTS_LEAGUES.forEach((league) => {
    document.getElementById(`sports${league.key}`).innerHTML = `<div class="text-zinc-500">Loading ${league.label}...</div>`;
  });

  await Promise.all(SPORTS_LEAGUES.map(async (league) => {
    try {
      const res = await fetch(league.api);
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      document.getElementById(`sports${league.key}`).innerHTML = renderLeaguePanel(league, data.events || []);
    } catch (error) {
      document.getElementById(`sports${league.key}`).innerHTML = `<div class="text-red-400 text-sm">Unable to load ${league.label} scores.</div>`;
    }
  }));

  updateSportsLastUpdated();
  statusText.textContent = 'Showing latest scores and standings.';
}

setLeagueTab('NFL');
document.getElementById('sportsTabNFL').addEventListener('click', () => setLeagueTab('NFL'));
document.getElementById('sportsTabNBA').addEventListener('click', () => setLeagueTab('NBA'));
document.getElementById('sportsTabMLB').addEventListener('click', () => setLeagueTab('MLB'));

getSportsScores();

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

// Regular refresh every 3 minutes for frequently-changing panels
setInterval(() => {
  getWeather();
  getMarkets();
  loadBtcChart();
  getNews();
  getSportsScores();
}, SPORTS_REFRESH_MS);
