const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Square Booking Extractor - Clean Session Approach
 * Use incognito/private browsing to avoid session conflicts
 */

(async () => {
  // Launch with clean context
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--incognito',
      '--disable-extensions',
      '--disable-plugins'
    ]
  });

  // Create completely isolated context
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/123.0.0.0',
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles',
    // Clear all storage
    storageState: { cookies: [], origins: [] }
  });

  const page = await context.newPage();

  try {
    console.log('Loading Square booking with clean session...');
    
    // Try the public booking URL with no-cache
    await page.goto('https://square.site/book/L6SV5MCXN00CB/shade-nail-spa-san-francisco-ca', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    console.log('Loaded, URL:', page.url());
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: '/workspace/openclaw/logs/square_clean_start.png', fullPage: true });
    
    // Check page content
    const pageText = await page.locator('body').textContent();
    
    // If we see "Let's go" button, click it to start booking
    if (pageText.includes("Let's go") || pageText.includes("Book now")) {
      console.log('Found start button, clicking...');
      const startBtn = await page.locator('text="Let\'s go", button:has-text("Let\'s go")').first();
      if (await startBtn.isVisible().catch(() => false)) {
        await startBtn.click();
        await page.waitForTimeout(5000);
      }
    }
    
    // Now look for services
    console.log('Looking for services...');
    await page.waitForTimeout(3000);
    
    // Scroll to load services
    await page.evaluate(() => { window.scrollTo(0, 600); });
    await page.waitForTimeout(2000);
    
    // Get all text content to find Peppermint Pedi
    const bodyText = await page.locator('body').textContent();
    const hasService = bodyText.toLowerCase().includes('peppermint pedi');
    console.log('Peppermint Pedi on page:', hasService);
    
    // Try to find and click using multiple strategies
    const strategies = [
      // Direct text match
      { selector: 'text="Peppermint Pedi"', name: 'exact-text' },
      // Case insensitive
      { selector: 'text=/Peppermint Pedi/i', name: 'case-insensitive' },
      // Button containing
      { selector: 'button:has-text("Peppermint")', name: 'button-text' },
      // Div with text
      { selector: 'div:has-text("Peppermint Pedi")', name: 'div-text' },
      // Role button
      { selector: '[role="button"]:has-text("Peppermint")', name: 'role-button' },
      // Any element with this text
      { selector: '*:has-text("Peppermint Pedi")', name: 'any-element' }
    ];
    
    let clicked = false;
    for (const { selector, name } of strategies) {
      try {
        const el = await page.locator(selector).first();
        const visible = await el.isVisible().catch(() => false);
        const enabled = await el.isEnabled().catch(() => false);
        
        console.log(`Strategy ${name}: visible=${visible}, enabled=${enabled}`);
        
        if (visible && enabled) {
          console.log(`Clicking with ${name}...`);
          await el.click({ force: true });
          clicked = true;
          await page.waitForTimeout(5000);
          break;
        }
      } catch (e) {
        console.log(`Strategy ${name} failed: ${e.message.slice(0, 50)}`);
      }
    }
    
    console.log('Clicked:', clicked);
    console.log('URL after click:', page.url());
    
    await page.screenshot({ path: '/workspace/openclaw/logs/square_clean_after.png', fullPage: true });
    
    // Check for date/calendar page
    const afterText = await page.locator('body').textContent();
    if (afterText.includes('Select a date') || afterText.includes('calendar') || afterText.includes('April')) {
      console.log('Appears to be on date selection page');
    }
    
    // Save results
    const results = {
      initialUrl: 'https://square.site/book/L6SV5MCXN00CB/shade-nail-spa-san-francisco-ca',
      finalUrl: page.url(),
      hasPepmintPedi: hasService,
      clicked: clicked,
      strategies: strategies.map(s => s.name),
      timestamp: new Date().toISOString()
    };
    
    await fs.promises.writeFile('/workspace/openclaw/logs/square_clean_results.json', JSON.stringify(results, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/square_clean_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
