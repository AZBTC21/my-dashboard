// Tailwind script already in HTML

// Clock
function updateClock() {
  const clock = document.getElementById('clock');
  clock.innerHTML = `
    Local: <span class="text-emerald-400">${new Date().toLocaleTimeString('en-US')}</span><br>
    UTC: <span class="text-sky-400">${new Date().toLocaleTimeString('en-US', {timeZone: 'UTC'})}</span><br>
    NY: <span class="text-amber-400">${new Date().toLocaleTimeString('en-US', {timeZone: 'America/New_York'})}</span>
  `;
}
setInterval(updateClock, 1000);
updateClock();

// Weather (Change coordinates to your city)
async function getWeather() {
  const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&current_weather=true');
  const data = await res.json();
  document.getElementById('weather').innerHTML = `
    ${data.current_weather.temperature}°C<br>
    <span class="text-sm">Feels like ${data.current_weather.temperature}°C</span>
  `;
}
getWeather();

// Markets
async function getMarkets() {
  const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd');
  const data = await res.json();
  const markets = document.getElementById('markets');
  markets.innerHTML = `
    <div>BTC: <span class="text-yellow-400">$${data.bitcoin.usd.toLocaleString()}</span></div>
    <div>ETH: <span class="text-blue-400">$${data.ethereum.usd.toLocaleString()}</span></div>
    <div>SOL: <span class="text-purple-400">$${data.solana.usd.toLocaleString()}</span></div>
  `;
}
getMarkets();

// Bitcoin Chart
let btcChart;
async function loadBtcChart() {
  const res = await fetch('https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=usd&days=7');
  const data = await res.json();
  
  const prices = data.prices.map(p => p[1]);
  const labels = data.prices.map((_, i) => new Date(Date.now() - (6-i)*86400000).toLocaleDateString('en-US', {weekday:'short'}));

  if (btcChart) btcChart.destroy();
  btcChart = new Chart(document.getElementById('btcChart'), {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Bitcoin Price (USD)',
        data: prices,
        borderColor: '#f59e0b',
        tension: 0.3
      }]
    },
    options: { plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#333' } } } }
  });
}
loadBtcChart();

// News
async function getNews() {
  const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml');
  const data = await res.json();
  const newsDiv = document.getElementById('news');
  newsDiv.innerHTML = data.items.slice(0, 6).map(item => `
    <a href="${item.link}" target="_blank" class="block hover:bg-zinc-800 p-3 rounded-xl transition">
      ${item.title}
    </a>
  `).join('');
}
getNews();