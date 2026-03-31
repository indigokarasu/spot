const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Alternative approach: Use direct Square URLs and API interception
 */

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  // Intercept API calls
  const apiCalls = [];
  await context.route('**/*', async (route, request) => {
    const url = request.url();
    if (url.includes('square') && (url.includes('api') || url.includes('booking') || url.includes('appointment'))) {
      console.log('API call:', url.slice(0, 100));
      apiCalls.push(url);
    }
    route.continue();
  });

  const page = await context.newPage();

  try {
    // Try direct booking link from email
    console.log('Trying direct booking URL...');
    
    // The email shows this URL pattern
    await page.goto('https://app.squareup.com/appointments/book/start/L6SV5MCXN00CB', {
      waitUntil: 'networkidle',
      timeout: 45000
    });
    
    console.log('Loaded, URL:', page.url());
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: '/workspace/openclaw/logs/square_alt_start.png', fullPage: true });
    
    // Try to find and click Peppermint Pedi with exact matching
    console.log('Looking for service with exact match...');
    
    // Get all clickable elements
    const allElements = await page.locator('button, div[role="button"], a, [tabindex]').all();
    
    const matches = [];
    for (const el of allElements.slice(0, 50)) {
      const text = await el.textContent().catch(() => '');
      const lower = text.toLowerCase();
      
      if (lower.includes('peppermint') && lower.includes('pedi')) {
        const tagName = await el.evaluate(e => e.tagName).catch(() => 'unknown');
        const clickable = await el.isEnabled().catch(() => false);
        matches.push({ text: text.slice(0, 50), tagName, clickable });
        
        if (clickable) {
          console.log('Clicking:', text.slice(0, 50));
          await el.click();
          await page.waitForTimeout(5000);
          break;
        }
      }
    }
    
    console.log('Matches found:', matches);
    
    // Check what happened
    console.log('Current URL after click:', page.url());
    await page.screenshot({ path: '/workspace/openclaw/logs/square_alt_after.png', fullPage: true });
    
    // Try to look for date selection
    const bodyText = await page.locator('body').textContent();
    
    // Check if we're on a date selection page
    if (bodyText.includes('Select a date') || bodyText.includes('April') || bodyText.includes('2026')) {
      console.log('Appears to be on date selection page');
      
      // Look for April 29
      const dateElements = await page.locator('text="29", button:has-text("29"), div:has-text("29")').all();
      console.log('Found', dateElements.length, 'date 29 elements');
    }
    
    // Save results
    const results = {
      url: page.url(),
      apiCalls: apiCalls,
      serviceMatches: matches,
      timestamp: new Date().toISOString()
    };
    
    await fs.promises.writeFile('/workspace/openclaw/logs/square_alt_results.json', JSON.stringify(results, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/square_alt_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
