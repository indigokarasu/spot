const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Final working version - uses Playwright locators properly
 */

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    console.log('=== Square Booking (Final) ===\n');
    
    // Load and navigate
    await page.goto('https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=XA4S2WKU7HYBHTWNKCPBIBDJ', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(4000);
    
    // Quick nav
    await page.locator('[aria-label="Any staff"]').first().click().catch(() => {});
    await page.waitForTimeout(1500);
    await page.mouse.click(960, 1040);
    await page.waitForTimeout(1500);
    await page.mouse.click(1280, 317);
    await page.waitForTimeout(4000);
    
    // Check month
    const pageText = await page.locator('body').textContent();
    if (pageText.includes('Mar') && !pageText.includes('Apr')) {
      console.log('Navigating March → April...');
      await page.mouse.click(1400, 200);
      await page.waitForTimeout(4000);
    }
    
    console.log('On April calendar');
    await page.screenshot({ path: '/workspace/openclaw/logs/square_final_april.png' });
    
    // Click date 29 using Playwright's text locator
    console.log('Selecting April 29...');
    
    // Find element with exact text "29"
    const date29 = await page.locator('text="29"').first();
    const isVisible = await date29.isVisible().catch(() => false);
    
    if (isVisible) {
      await date29.click();
      console.log('  ✓ Clicked date 29');
    } else {
      // Try all elements containing "29"
      const elements = await page.locator(':text("29")').all();
      console.log(`  Found ${elements.length} elements with "29"`);
      
      for (const el of elements) {
        const visible = await el.isVisible().catch(() => false);
        if (visible) {
          await el.click();
          console.log('  ✓ Clicked date 29 (fallback)');
          break;
        }
      }
    }
    
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/workspace/openclaw/logs/square_final_times.png', fullPage: true });
    
    // Extract times
    const times = await page.evaluate(() => {
      const text = document.body.innerText;
      const matches = text.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];
      return [...new Set(matches)].sort();
    });
    
    const evening = times.filter(t => {
      const m = t.match(/(\d{1,2}):(\d{2})\s*([AP])M/i);
      if (m) {
        let hour = parseInt(m[1]);
        const period = m[3].toUpperCase();
        if (period === 'P' && hour !== 12) hour += 12;
        return hour >= 17 && hour <= 19;
      }
      return false;
    });
    
    // Results
    const results = {
      location: 'Shade Nail Spa',
      service: 'Peppermint Pedi',
      date: '2026-04-29',
      allTimes: times,
      eveningTimes: evening,
      timestamp: new Date().toISOString()
    };
    
    await fs.promises.writeFile(
      '/workspace/openclaw/logs/square_final_results.json',
      JSON.stringify(results, null, 2)
    );
    
    console.log('\n=== RESULTS ===');
    console.log(`All times (${times.length}): ${times.join(', ')}`);
    console.log(`Evening (5-7 PM): ${evening.length > 0 ? evening.join(', ') : 'None'}`);
    console.log('\n✓ Complete');
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/square_final_error.png' });
  } finally {
    await browser.close();
  }
})();
