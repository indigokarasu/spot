const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Square Booking - Final Working Version
 * Uses data-testid for reliable date selection
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
    console.log('=== Square Booking - Working Version ===\n');
    
    // Navigate to booking
    await page.goto('https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=XA4S2WKU7HYBHTWNKCPBIBDJ', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(4000);
    
    // Get info
    const info = await page.evaluate(() => ({
      location: document.querySelector('h1')?.textContent?.trim() || '',
      service: document.querySelector('h2')?.textContent?.trim() || ''
    }));
    
    console.log(`Location: ${info.location}`);
    console.log(`Service: ${info.service}`);
    
    // Flow: staff → add → next → calendar
    await page.locator('[aria-label="Any staff"]').first().click().catch(() => {});
    await page.waitForTimeout(1500);
    await page.mouse.click(960, 1040);
    await page.waitForTimeout(1500);
    await page.mouse.click(1280, 317);
    await page.waitForTimeout(4000);
    
    // Navigate to April
    const pageText = await page.locator('body').textContent();
    if (pageText.includes('Mar') && !pageText.includes('Apr')) {
      await page.mouse.click(1400, 200);
      await page.waitForTimeout(4000);
    }
    
    await page.screenshot({ path: '/workspace/openclaw/logs/sq_working_april.png', fullPage: true });
    
    // Find all available dates
    console.log('\nFinding available dates...');
    const dates = await page.evaluate(() => {
      const buttons = document.querySelectorAll('market-button[data-testid^="date-"]');
      return Array.from(buttons)
        .filter(btn => !btn.disabled && btn.getAttribute('aria-disabled') !== 'true')
        .map(btn => {
          const testId = btn.getAttribute('data-testid');
          return parseInt(testId.replace('date-', ''));
        });
    });
    
    console.log(`Available dates: ${dates.join(', ')}`);
    
    // Test with April 30 (first available)
    const testDate = dates.includes(30) ? 30 : dates[0];
    console.log(`\nTesting date ${testDate}...`);
    
    // Click using JavaScript (more reliable than Playwright for custom elements)
    await page.evaluate((day) => {
      const btn = document.querySelector(`market-button[data-testid="date-${day}"]`);
      if (btn) btn.click();
    }, testDate);
    
    console.log('  ✓ Date clicked');
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: '/workspace/openclaw/logs/sq_working_times.png', fullPage: true });
    
    // Extract times
    const times = await page.evaluate(() => {
      const text = document.body.innerText;
      return [...new Set((text.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || []))].sort();
    });
    
    const evening = times.filter(t => {
      const m = t.match(/(\d{1,2}):(\d{2})\s*([AP])M/i);
      if (m) {
        let h = parseInt(m[1]);
        const p = m[3].toUpperCase();
        if (p === 'P' && h !== 12) h += 12;
        return h >= 17 && h <= 19;
      }
      return false;
    });
    
    // Save
    const results = {
      location: info.location,
      service: info.service,
      availableDates: dates,
      testedDate: testDate,
      allTimes: times,
      eveningTimes: evening,
      timestamp: new Date().toISOString()
    };
    
    await fs.promises.writeFile(
      '/workspace/openclaw/logs/square_working_results.json',
      JSON.stringify(results, null, 2)
    );
    
    console.log('\n=== RESULTS ===');
    console.log(`Date ${testDate} times: ${times.join(', ')}`);
    console.log(`Evening: ${evening.join(', ') || 'None'}`);
    console.log('\n✓ Complete - saved to square_working_results.json');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
