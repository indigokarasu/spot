const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  const page = await context.newPage();

  try {
    // Navigate to Shade Nail Spa booking
    console.log('Loading Shade Nail Spa booking...');
    await page.goto('https://my-business-102000-107381.square.site/', { 
      waitUntil: 'networkidle', 
      timeout: 45000 
    });
    
    await page.waitForTimeout(4000);
    console.log('Page loaded');
    
    // Step 1: Click on "Peppermint Pedi"
    console.log('Looking for Peppermint Pedi...');
    const peppermintButton = await page.locator('button:has-text("Peppermint Pedi"), text="Peppermint Pedi"').first();
    
    if (await peppermintButton.isVisible().catch(() => false)) {
      console.log('Found Peppermint Pedi, clicking...');
      await peppermintButton.click();
      await page.waitForTimeout(3000);
    } else {
      console.log('Peppermint Pedi button not visible, trying scroll...');
      // Scroll to find it
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(1000);
      
      // Try again
      const btn = await page.locator('text="Peppermint Pedi"').first();
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await page.waitForTimeout(3000);
      }
    }
    
    // Step 2: Look for date picker and navigate to April 29, 2026
    console.log('Looking for date picker...');
    await page.waitForTimeout(3000);
    
    // Try to find and click a date field or calendar
    const dateField = await page.locator('input[type="date"], [data-testid*="date"], .date-picker').first();
    if (await dateField.isVisible().catch(() => false)) {
      console.log('Found date picker, setting to April 29, 2026...');
      await dateField.fill('2026-04-29');
      await page.waitForTimeout(3000);
    } else {
      console.log('No standard date picker found, looking for calendar...');
      // Look for calendar navigation
      const calendarNext = await page.locator('button:has-text(">"), [aria-label*="next"], .next-month').first();
      if (await calendarNext.isVisible().catch(() => false)) {
        // Navigate to April 2026 (current is March 2026)
        console.log('Clicking next month...');
        await calendarNext.click();
        await page.waitForTimeout(2000);
      }
    }
    
    // Step 3: Look for April 29 and click it
    console.log('Looking for April 29...');
    const date29 = await page.locator('text="29", button:has-text("29"), [data-date*="29"]').first();
    if (await date29.isVisible().catch(() => false)) {
      console.log('Found April 29, clicking...');
      await date29.click();
      await page.waitForTimeout(3000);
    }
    
    // Step 4: Look for time slots
    console.log('Looking for time slots...');
    await page.waitForTimeout(3000);
    
    const timeButtons = await page.locator('button').all();
    const eveningTimes = [];
    
    for (const btn of timeButtons) {
      const text = await btn.textContent().catch(() => '');
      const trimmed = text.trim();
      
      // Look for evening times (5:00 PM - 7:00 PM)
      if (trimmed.match(/5:\d{2}/) || trimmed.match(/6:\d{2}/) || trimmed.match(/7:\d{2}/)) {
        if (trimmed.includes('PM') || trimmed.includes('pm')) {
          eveningTimes.push(trimmed);
        }
      }
    }
    
    console.log('Evening time slots found:', eveningTimes);
    
    // Save results
    const results = {
      service: 'Peppermint Pedi',
      targetDate: '2026-04-29',
      url: page.url(),
      eveningAvailability: eveningTimes,
      timestamp: new Date().toISOString()
    };
    
    await fs.promises.writeFile('/workspace/openclaw/logs/shade_april29.json', JSON.stringify(results, null, 2));
    
    // Screenshot
    await page.screenshot({ path: '/workspace/openclaw/logs/shade_april29.png', fullPage: true });
    
    console.log('\n=== Results ===');
    console.log('Target: April 29, 2026');
    console.log('Early evening slots (5-7 PM):', eveningTimes);
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/shade_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
