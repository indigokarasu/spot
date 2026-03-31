const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Square Booking - Find available dates
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
    console.log('=== Square Booking - Find Available Dates ===\n');
    
    // Navigate
    await page.goto('https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=XA4S2WKU7HYBHTWNKCPBIBDJ', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(4000);
    
    await page.locator('[aria-label="Any staff"]').first().click().catch(() => {});
    await page.waitForTimeout(1500);
    await page.mouse.click(960, 1040);
    await page.waitForTimeout(1500);
    await page.mouse.click(1280, 317);
    await page.waitForTimeout(4000);
    
    // Check month
    const pageText = await page.locator('body').textContent();
    if (pageText.includes('Mar') && !pageText.includes('Apr')) {
      await page.mouse.click(1400, 200);
      await page.waitForTimeout(4000);
    }
    
    // Find available dates
    console.log('Finding available dates in April...');
    
    const availableDates = await page.evaluate(() => {
      const buttons = document.querySelectorAll('market-button[data-testid^="date-"]');
      const results = [];
      
      buttons.forEach(btn => {
        const testId = btn.getAttribute('data-testid');
        const day = testId?.replace('date-', '');
        const disabled = btn.disabled || btn.getAttribute('disabled');
        const ariaDisabled = btn.getAttribute('aria-disabled');
        
        if (day) {
          results.push({
            day: parseInt(day),
            available: !disabled && ariaDisabled !== 'true',
            disabled: disabled,
            ariaDisabled: ariaDisabled
          });
        }
      });
      
      return results;
    });
    
    console.log(`\nFound ${availableDates.length} date elements`);
    console.log('Available:', availableDates.filter(d => d.available).map(d => d.day));
    console.log('Not available:', availableDates.filter(d => !d.available).map(d => d.day));
    
    // Find first available date to test
    const firstAvailable = availableDates.find(d => d.available)?.day;
    
    if (firstAvailable) {
      console.log(`\nTesting with first available date: ${firstAvailable}`);
      
      // Click the available date using data-testid
      await page.locator(`market-button[data-testid="date-${firstAvailable}"]`).click();
      console.log(`  ✓ Clicked date ${firstAvailable}`);
      
      await page.waitForTimeout(5000);
      await page.screenshot({ path: '/workspace/openclaw/logs/square_available_date.png', fullPage: true });
      
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
      
      const results = {
        availableDates: availableDates.filter(d => d.available).map(d => d.day),
        testedDate: firstAvailable,
        allTimes: times,
        eveningTimes: evening,
        timestamp: new Date().toISOString()
      };
      
      await fs.promises.writeFile(
        '/workspace/openclaw/logs/square_available_results.json',
        JSON.stringify(results, null, 2)
      );
      
      console.log('\n=== RESULTS ===');
      console.log(`Available dates: ${results.availableDates.join(', ')}`);
      console.log(`\nTested date ${firstAvailable}:`);
      console.log(`  All times: ${times.join(', ')}`);
      console.log(`  Evening: ${evening.join(', ') || 'None'}`);
      
    } else {
      console.log('\nNo dates available in April');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
