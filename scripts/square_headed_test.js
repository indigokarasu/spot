const { chromium } = require('playwright');

/**
 * Test with headed browser and extra stealth
 */

(async () => {
  const browser = await chromium.launch({
    headless: false,  // Try headed mode
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles'
  });

  const page = await context.newPage();

  try {
    console.log('=== Testing Headed Browser ===\n');
    
    // Intercept network requests to see what's happening
    await page.route('**/*', route => {
      const url = route.request().url();
      if (url.includes('square') || url.includes('availability')) {
        console.log('Network:', url.substring(0, 100));
      }
      route.continue();
    });
    
    await page.goto(
      'https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=XA4S2WKU7HYBHTWNKCPBIBDJ',
      { waitUntil: 'networkidle', timeout: 60000 }
    );
    
    console.log('Page loaded, selecting staff...');
    await page.locator('[aria-label="Any staff"]').first().click({ timeout: 10000 });
    await page.waitForTimeout(2000);
    
    await page.mouse.click(960, 1040);
    await page.waitForTimeout(2000);
    
    await page.mouse.click(1280, 317);
    await page.waitForTimeout(5000);
    
    // Navigate to April
    const text = await page.locator('body').textContent();
    if (text.includes('Mar') && !text.includes('Apr')) {
      await page.mouse.click(1400, 200);
      await page.waitForTimeout(4000);
    }
    
    // Check April 29 with extra detail
    const date29 = await page.evaluate(() => {
      const btn = document.querySelector('market-button[data-testid="date-29"]');
      if (!btn) return { found: false };
      
      // Check computed styles
      const style = window.getComputedStyle(btn);
      
      return {
        found: true,
        disabled: btn.disabled,
        ariaDisabled: btn.getAttribute('aria-disabled'),
        text: btn.textContent?.trim(),
        opacity: style.opacity,
        cursor: style.cursor,
        backgroundColor: style.backgroundColor,
        className: btn.className
      };
    });
    
    console.log('April 29 status:', date29);
    
    // Get screenshot
    await page.screenshot({ 
      path: '/workspace/openclaw/logs/headed_browser_test.png',
      fullPage: true 
    });
    
    console.log('\nScreenshot saved');
    console.log('Browser will close in 5 seconds...');
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
