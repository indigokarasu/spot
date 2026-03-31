const { chromium } = require('playwright');
const fs = require('fs');
const https = require('https');

/**
 * Try mobile endpoint and simple HTTP request
 */

// Try simple HTTPS request first
function simpleRequest(url) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'www.opentable.com',
      path: '/r/atelier-crenn',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, data: data.substring(0, 500) }));
    });

    req.on('error', reject);
    req.setTimeout(30000);
    req.end();
  });
}

(async () => {
  const results = { attempts: [] };

  // Attempt 1: Simple mobile request
  console.log('Attempt 1: Mobile user agent via HTTPS...');
  try {
    const response = await simpleRequest('https://www.opentable.com/r/atelier-crenn');
    results.attempts.push({ method: 'https_mobile', response });
    console.log('  Status:', response.status);
    console.log('  Preview:', response.data.substring(0, 200));
  } catch (error) {
    results.attempts.push({ method: 'https_mobile', error: error.message });
    console.log('  Error:', error.message);
  }

  // Attempt 2: Playwright with mobile viewport
  console.log('\nAttempt 2: Playwright mobile viewport...');
  try {
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-http2']
    });

    const context = await browser.newContext({
      viewport: { width: 390, height: 844 }, // iPhone dimensions
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
      isMobile: true,
      hasTouch: true
    });

    const page = await context.newPage();
    
    await page.goto('https://www.opentable.com/r/atelier-crenn', {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    
    await page.waitForTimeout(5000);
    
    const info = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      hasAccessDenied: document.body.innerText.includes('Access Denied'),
      hasBooking: document.body.innerText.includes('Book') || document.body.innerText.includes('Reserve'),
      text: document.body.innerText.substring(0, 300)
    }));
    
    results.attempts.push({ method: 'playwright_mobile', info });
    console.log('  URL:', info.url);
    console.log('  Title:', info.title);
    console.log('  Access Denied:', info.hasAccessDenied);
    console.log('  Has booking:', info.hasBooking);
    
    await page.screenshot({ path: '/workspace/openclaw/logs/opentable_mobile.png' });
    
    await browser.close();
  } catch (error) {
    results.attempts.push({ method: 'playwright_mobile', error: error.message });
    console.log('  Error:', error.message);
  }

  // Attempt 3: Try m.opentable.com
  console.log('\nAttempt 3: Mobile subdomain...');
  try {
    const browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    
    await page.goto('https://m.opentable.com/r/atelier-crenn', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForTimeout(5000);
    
    const info = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      hasAccessDenied: document.body.innerText.includes('Access Denied'),
      text: document.body.innerText.substring(0, 300)
    }));
    
    results.attempts.push({ method: 'mobile_subdomain', info });
    console.log('  URL:', info.url);
    console.log('  Access Denied:', info.hasAccessDenied);
    
    await browser.close();
  } catch (error) {
    results.attempts.push({ method: 'mobile_subdomain', error: error.message });
    console.log('  Error:', error.message);
  }

  await fs.promises.writeFile(
    '/workspace/openclaw/logs/opentable_bypass_attempts.json',
    JSON.stringify(results, null, 2)
  );
  
  console.log('\nResults saved to opentable_bypass_attempts.json');
})();
