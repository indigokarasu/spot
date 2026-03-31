const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles'
  });

  // Hide automation
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  });

  const page = await context.newPage();

  try {
    // Go directly to Acuity Scheduling
    console.log('Navigating to Acuity Scheduling...');
    await page.goto('https://raksa.as.me/', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Loaded Acuity Scheduling');

    await page.screenshot({ path: '/workspace/openclaw/logs/acuity_start.png', fullPage: true });
    console.log('Initial screenshot saved');

    // Save initial HTML
    const initialHtml = await page.content();
    await fs.promises.writeFile('/workspace/openclaw/logs/acuity_initial.html', initialHtml);

    // Look for provider selection - try various selectors
    console.log('\n=== Looking for Providers ===');

    // Try to find "Anya" or any staff/provider elements
    const staffSelectors = [
      '[class*="staff"]',
      '[class*="provider"]',
      '[data-testid*="staff"]',
      '.staff-item',
      '.provider-item',
      'button:has-text("Anya")',
      'text=/Anya/i'
    ];

    let anyaFound = false;
    for (const selector of staffSelectors) {
      const elements = await page.locator(selector).all();
      console.log(`Selector "${selector}": found ${elements.length} elements`);

      for (const el of elements) {
        const text = await el.textContent().catch(() => '');
        if (text.toLowerCase().includes('anya')) {
          console.log('  Found Anya:', text.slice(0, 100));
          anyaFound = true;
          await el.click();
          await page.waitForTimeout(2000);
          break;
        }
      }
      if (anyaFound) break;
    }

    // If we haven't found Anya, look for any clickable staff/provider names
    if (!anyaFound) {
      console.log('Trying to find any staff/provider buttons...');
      const allButtons = await page.locator('button, [role="button"], a').all();
      const staffNames = [];

      for (const btn of allButtons) {
        const text = await btn.textContent().catch(() => '');
        const cleanText = text.trim();
        if (cleanText.length > 0 && cleanText.length < 50) {
          staffNames.push(cleanText);
        }
      }

      console.log('All clickable elements:', staffNames.slice(0, 30));
    }

    // Look for service selection
    console.log('\n=== Looking for Services ===');
    const serviceSelectors = [
      '[class*="service"]',
      '[class*="treatment"]',
      '[data-testid*="service"]',
      '.service-item',
      'text=/Thai Aroma/i',
      'text=/90 min/i'
    ];

    let thaiAromaFound = false;
    for (const selector of serviceSelectors) {
      const elements = await page.locator(selector).all();
      if (elements.length > 0) {
        console.log(`Selector "${selector}": found ${elements.length} elements`);
        for (const el of elements.slice(0, 5)) {
          const text = await el.textContent().catch(() => '');
          console.log('  -', text.slice(0, 100));
          if (text.toLowerCase().includes('thai aroma')) {
            thaiAromaFound = true;
          }
        }
      }
    }

    // Save final state
    await page.screenshot({ path: '/workspace/openclaw/logs/acuity_final.png', fullPage: true });
    const finalHtml = await page.content();
    await fs.promises.writeFile('/workspace/openclaw/logs/acuity_final.html', finalHtml);

    console.log('\n=== Summary ===');
    console.log('Anya found:', anyaFound);
    console.log('Thai Aroma found:', thaiAromaFound);
    console.log('Screenshots and HTML saved to /workspace/openclaw/logs/');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
