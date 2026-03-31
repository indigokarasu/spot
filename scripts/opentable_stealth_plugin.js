const { chromium } = require('playwright');
const { chromium: stealthChromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');

/**
 * OpenTable with stealth plugin
 */

(async () => {
  // Apply stealth plugin
  stealthChromium.use(stealth());
  
  const browser = await stealthChromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920,1080'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles'
  });

  const page = await context.newPage();

  // Capture all requests
  const requests = [];
  page.on('request', req => {
    requests.push({
      url: req.url().substring(0, 100),
      method: req.method(),
      time: Date.now()
    });
  });

  try {
    console.log('=== OpenTable with Playwright Stealth ===\n');
    
    await page.goto('https://www.opentable.com/r/atelier-crenn', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    
    await page.waitForTimeout(8000);
    
    console.log('URL:', page.url());
    console.log('Title:', await page.title());
    
    const info = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      hasAccessDenied: document.body.innerText.includes('Access Denied'),
      hasBooking: document.body.innerText.includes('Book') || document.body.innerText.includes('Reserve'),
      textSample: document.body.innerText.substring(0, 500)
    }));
    
    console.log('\nPage Info:');
    console.log('  Access Denied:', info.hasAccessDenied);
    console.log('  Has booking:', info.hasBooking);
    console.log('  Text:', info.textSample.substring(0, 200));
    
    if (!info.hasAccessDenied) {
      // Look for booking interface
      const buttons = await page.evaluate(() => 
        Array.from(document.querySelectorAll('button, a[role="button"]'))
          .filter(b => /book|reserve|availability|find.*table/i.test(b.textContent))
          .map(b => ({
            text: b.textContent?.trim().substring(0, 40),
            dataTestId: b.getAttribute('data-testid')
          }))
      );
      
      console.log('\nBooking buttons:', buttons.length);
      buttons.forEach((b, i) => console.log(`  [${i}] "${b.text}"`));
    }
    
    console.log('\nRequests captured:', requests.length);
    requests.slice(0, 10).forEach(r => console.log(`  ${r.method} ${r.url}`));
    
    await page.screenshot({ path: '/workspace/openclaw/logs/opentable_stealth_result.png' });
    
    await fs.promises.writeFile(
      '/workspace/openclaw/logs/opentable_stealth_info.json',
      JSON.stringify({ info, requests: requests.slice(0, 20) }, null, 2)
    );
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
