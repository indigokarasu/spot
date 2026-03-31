const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Phase 1: Discovery - OpenTable / Atelier Crenn (Retry with different args)
 */

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-http2',  // Try disabling HTTP/2
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  // Capture API calls
  const apiCalls = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('api') || url.includes('graphql') || url.includes('availability') || url.includes('booking')) {
      apiCalls.push({
        url: url.substring(0, 150),
        method: req.method(),
        time: Date.now()
      });
    }
  });

  const results = {
    phase: 'discovery',
    attempts: []
  };

  try {
    console.log('=== Phase 1: Discovery - OpenTable (v2) ===\n');
    
    // Try with http first
    console.log('Attempt 1: HTTP...');
    try {
      await page.goto('http://www.opentable.com/r/atelier-crenn', {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      results.attempts.push({ method: 'http', success: true, url: page.url() });
    } catch (e) {
      results.attempts.push({ method: 'http', success: false, error: e.message });
      
      console.log('Attempt 2: HTTPS with waitUntil load...');
      try {
        await page.goto('https://www.opentable.com/r/atelier-crenn', {
          waitUntil: 'load',
          timeout: 60000
        });
        results.attempts.push({ method: 'https_load', success: true, url: page.url() });
      } catch (e2) {
        results.attempts.push({ method: 'https_load', success: false, error: e2.message });
        
        console.log('Attempt 3: HTTPS with minimal wait...');
        await page.goto('https://www.opentable.com/r/atelier-crenn', {
          waitUntil: 'commit',
          timeout: 30000
        });
        await page.waitForTimeout(10000);
        results.attempts.push({ method: 'https_commit', success: true, url: page.url() });
      }
    }
    
    console.log('  Final URL:', page.url());
    
    // Continue with analysis...
    await page.waitForTimeout(5000);
    
    console.log('\nCapturing page state...');
    const fingerprint = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      textSample: document.body.innerText.substring(0, 500)
    }));
    
    results.fingerprint = fingerprint;
    console.log('  Title:', fingerprint.title);
    console.log('  Text preview:', fingerprint.textSample.substring(0, 200));
    
    await page.screenshot({ path: '/workspace/openclaw/logs/opentable_v2_page.png' });
    
    // Check for booking elements
    const bookingInfo = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a[role="button"]'))
        .filter(b => /book|reserve|find.*table|availability/i.test(b.textContent))
        .map(b => ({
          text: b.textContent?.trim().substring(0, 50),
          tag: b.tagName,
          href: b.getAttribute('href'),
          dataTestId: b.getAttribute('data-testid')
        }));
      
      return { buttons };
    });
    
    results.bookingInfo = bookingInfo;
    console.log('\nBooking buttons:', bookingInfo.buttons.length);
    bookingInfo.buttons.forEach((b, i) => console.log(`  [${i}] ${b.text}`));
    
    // API calls
    results.apiCalls = apiCalls;
    console.log('\nAPI calls:', apiCalls.length);
    
    await fs.promises.writeFile(
      '/workspace/openclaw/logs/opentable_discovery_v2.json',
      JSON.stringify(results, null, 2)
    );
    
    console.log('\nResults saved');
    
  } catch (error) {
    console.error('Error:', error.message);
    results.finalError = error.message;
    await fs.promises.writeFile(
      '/workspace/openclaw/logs/opentable_discovery_v2.json',
      JSON.stringify(results, null, 2)
    );
  } finally {
    await browser.close();
  }
})();
