import { validateUrl } from './services/urlService.js';
import { parseUserAgent, getGeoInfo } from './services/geoService.js';
import dotenv from 'dotenv';

dotenv.config();
process.env.BASE_URL = 'http://my-shortener.com';

console.log('=== STARTING URL SHORTENER COMPONENT VERIFICATION ===');

// 1. Validate URLs
console.log('\n[Test 1] URL Validation service:');
const urls = [
  { url: 'http://google.com', expected: true },
  { url: 'https://github.com/trending', expected: true },
  { url: 'https://localhost:8080/path?q=1', expected: true },
  { url: 'google.com', expected: false },
  { url: 'ftp://google.com', expected: false },
  { url: 'http://', expected: false }
];

urls.forEach(item => {
  const result = validateUrl(item.url);
  const status = result === item.expected ? 'PASSED' : 'FAILED';
  console.log(`  - URL: "${item.url}" -> Valid: ${result} (Expected: ${item.expected}) [${status}]`);
});

// 2. Parse User Agents
console.log('\n[Test 2] User Agent parser service:');
const uas = [
  {
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
    expDevice: 'Mobile',
    expBrowser: 'Safari'
  },
  {
    ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    expDevice: 'Desktop',
    expBrowser: 'Chrome'
  },
  {
    ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    expDevice: 'Desktop',
    expBrowser: 'Bot/Crawler'
  }
];

uas.forEach(item => {
  const result = parseUserAgent(item.ua);
  const match = result.device === item.expDevice && result.browser === item.expBrowser;
  const status = match ? '✅ PASSED' : '❌ FAILED';
  console.log(`  - UA: "${item.ua.substring(0, 50)}..."`);
  console.log(`    Device: "${result.device}" (Expected: "${item.expDevice}"), Browser: "${result.browser}" (Expected: "${item.expBrowser}") [${status}]`);
});

// 3. Geolocation IP lookup
console.log('\n[Test 3] Geolocation Lookup service (Async non-blocking):');
const ips = ['127.0.0.1', '8.8.8.8'];

for (const ip of ips) {
  try {
    const geo = await getGeoInfo(ip);
    console.log(`  - IP: "${ip}" -> Country: "${geo.country}", City: "${geo.city}" `);
  } catch (error) {
    console.log(`  - IP: "${ip}" -> Failed to fetch geo: ${error.message} `);
  }
}

console.log('\n=== COMPONENT VERIFICATION END ===');
process.exit(0);
