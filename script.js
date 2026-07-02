// 1. Multi Timezones
function updateClock() {
  const options = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
  document.getElementById('clock').innerHTML = `
    <strong>Local:</strong> ${new Date().toLocaleTimeString('en-US', options)}<br>
    <strong>UTC:</strong> ${new Date().toLocaleTimeString('en-US', { ...options, timeZone: 'UTC' })}<br>
    <strong>New York:</strong> ${new Date().toLocaleTimeString('en-US', { ...options, timeZone: 'America/New_York' })}
  `;
}
setInterval(updateClock, 1000);
updateClock();

// 2. Weather (Free - Open-Meteo)
async function getWeather() {
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&current_weather=true'); // Change coords to yours
    const data = await res.json();
    document.getElementById('weather').innerHTML = `
      <strong>NYC:</strong> ${data.current_weather.temperature}°C, ${data.current_weather.weathercode}
    `;
  } catch(e) { console.error(e); }
}
getWeather();

// 3. Crypto & Stocks (Free - CoinGecko)
async function getMarkets() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd');
    const data = await res.json();
    document.getElementById('markets').innerHTML = `
      BTC: $${data.bitcoin.usd}<br>
      ETH: $${data.ethereum.usd}
    `;
  } catch(e) { console.error(e); }
}
getMarkets();

// 4. News (RSS via free proxy)
async function getNews() {
  try {
    const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https://rss.nytimes.com/services/xml/rss/nyt/World.xml');
    const data = await res.json();
    let html = '';
    data.items.slice(0,5).forEach(item => {
      html += `<p><a href="${item.link}" target="_blank">${item.title}</a></p>`;
    });
    document.getElementById('news').innerHTML = html;
  } catch(e) { console.error(e); }
}
getNews();