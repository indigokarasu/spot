const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Square Booking - Final Version with Visual Confirmation
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

  const page = await context.newPage();

  try {
    console.log('=== Square Booking Flow ===');
    
    // Step 1: Load booking page
    await page.goto('https://square.site/book/L6SV5MCXN00CB/shade-nail-spa-san-francisco-ca', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    await page.waitForTimeout(3000);
    console.log('✓ Loaded booking page');
    
    // Step 2: Click "Let's go"
    const letsGoBtn = await page.locator('text="Let\'s go"').first();
    if (await letsGoBtn.isVisible().catch(() => false)) {
      await letsGoBtn.click();
      console.log('✓ Clicked Let\'s go');
    }
    await page.waitForTimeout(3000);
    
    // Step 3: Select Peppermint Pedi
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(1000);
    
    const peppermintBtn = await page.locator('text="Peppermint Pedi"').first();
    if (await peppermintBtn.isVisible().catch(() => false)) {
      await peppermintBtn.click();
      console.log('✓ Selected Peppermint Pedi');
    }
    await page.waitForTimeout(4000);
    
    // Step 4: Continue past staff selection
    const continueBtn = await page.locator('button:has-text("Continue")').first();
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
      console.log('✓ Continued past staff');
    }
    await page.waitForTimeout(4000);
    
    // Step 5: Navigate to April (currently on March)
    console.log('Checking calendar...');
    const pageText = await page.locator('body').textContent();
    
    // Look for the calendar
    if (pageText.includes('March 2026')) {
      console.log('On March 2026, need to advance to April');
      
      // Find and click next month button (right arrow)
      const nextBtn = await page.locator('button[aria-label*="Next month"], button:has-text("")').nth(1);
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
        console.log('✓ Advanced to April');
        await page.waitForTimeout(3000);
      }
    }
    
    // Step 6: Click April 29
    console.log('Looking for April 29...');
    await page.screenshot({ path: '/workspace/openclaw/logs/calendar_before_click.png' });
    
    // Look for the date 29 button in the April calendar
    const date29 = await page.locator('[role="gridcell"] button:has-text("29"), button:has-text("29"), text="29"').first();
    
    if (await date29.isVisible().catch(() => false)) {
      const enabled = await date29.isEnabled().catch(() => false);
      console.log('Date 29 visible, enabled:', enabled);
      
      if (enabled) {
        await date29.click();
        console.log('✓ Selected April 29');
        await page.waitForTimeout(5000);
      } else {
        console.log('Date 29 is disabled (not available)');
      }
    } else {
      console.log('Date 29 not found on calendar');
    }
    
    // Step 7: Extract time slots
    console.log('Looking for time slots...');
    await page.screenshot({ path: '/workspace/openclaw/logs/time_slots.png' });
    
    const timeElements = await page.locator('button').all();
    const timeSlots = [];
    
    for (const el of timeElements.slice(0, 25)) {
      const text = await el.textContent().catch(() => '');
      const trimmed = text.trim();
      
      // Match time format "5:00 PM", "6:30 PM"
      if (trimmed.match(/^\d{1,2}:\d{2}\s*(AM|PM)$/i)) {
        timeSlots.push(trimmed);
      }
    }
    
    // Filter for evening (5-7 PM)
    const eveningSlots = timeSlots.filter(t => {
      const match = t.match(/(\d{1,2}):\d{2}\s*(PM)/i);
      if (match) {
        const hour = parseInt(match[1]);
        return hour >= 5 && hour <= 7;
      }
      return false;
    });
    
    // Results
    console.log('\n=== RESULTS ===');
    console.log('Service: Peppermint Pedi at Shade Nail Spa');
    console.log('Target Date: April 29, 2026');
    console.log('Total slots:', timeSlots.length);
    console.log('Evening slots (5-7 PM):', eveningSlots.length > 0 ? eveningSlots.join(', ') : 'None available');
    
    // Save
    const results = {
      service: 'Peppermint Pedi',
      location: 'Shade Nail Spa',
      date: 'April 29, 2026',
      allSlots: timeSlots,
      eveningSlots: eveningSlots,
      count: timeSlots.length
    };
    
    await fs.promises.writeFile('/workspace/openclaw/logs/final_results.json', JSON.stringify(results, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/error.png' });
  } finally {
    await browser.close();
  }
})();
