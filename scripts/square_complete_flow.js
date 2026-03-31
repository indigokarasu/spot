const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Square Booking - Complete Flow
 * Go from start to finish in one session
 */

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--incognito']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  const page = await context.newPage();
  const results = { steps: [], availability: [] };

  try {
    // Step 1: Load booking start page
    console.log('Step 1: Loading booking page...');
    await page.goto('https://square.site/book/L6SV5MCXN00CB/shade-nail-spa-san-francisco-ca', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: '/workspace/openclaw/logs/square_flow_1_start.png', fullPage: true });
    results.steps.push({ step: 1, status: 'loaded', url: page.url() });
    
    // Step 2: Click "Let's go" to start booking
    console.log('Step 2: Clicking "Let\'s go"...');
    const letsGoBtn = await page.locator('text="Let\'s go"').first();
    if (await letsGoBtn.isVisible().catch(() => false)) {
      await letsGoBtn.click();
      await page.waitForTimeout(5000);
    }
    
    await page.screenshot({ path: '/workspace/openclaw/logs/square_flow_2_after_start.png', fullPage: true });
    results.steps.push({ step: 2, status: 'clicked_start', url: page.url() });
    
    // Step 3: Find and click "Peppermint Pedi"
    console.log('Step 3: Looking for Peppermint Pedi...');
    await page.evaluate(() => { window.scrollTo(0, 800); });
    await page.waitForTimeout(2000);
    
    const peppermint = await page.locator('text="Peppermint Pedi"').first();
    if (await peppermint.isVisible().catch(() => false)) {
      console.log('Found Peppermint Pedi, clicking...');
      await peppermint.click();
      await page.waitForTimeout(5000);
    }
    
    await page.screenshot({ path: '/workspace/openclaw/logs/square_flow_3_after_service.png', fullPage: true });
    results.steps.push({ step: 3, status: 'service_selected', url: page.url() });
    
    // Step 4: Look for Continue or date selection
    console.log('Step 4: Looking for date/calendar...');
    
    const continueBtn = await page.locator('text="Continue"').first();
    if (await continueBtn.isVisible().catch(() => false)) {
      console.log('Clicking Continue...');
      await continueBtn.click();
      await page.waitForTimeout(5000);
    }
    
    await page.screenshot({ path: '/workspace/openclaw/logs/square_flow_4_date_page.png', fullPage: true });
    results.steps.push({ step: 4, status: 'on_date_page', url: page.url() });
    
    // Step 5: Check current month and navigate to April 2026
    console.log('Step 5: Checking calendar...');
    const bodyText = await page.locator('body').textContent();
    
    // Look for month navigation
    const hasApril = bodyText.includes('April 2026');
    console.log('Has April 2026:', hasApril);
    
    if (!hasApril) {
      // Try to find next month button
      const nextBtn = await page.locator('button:has(">"), [aria-label*="next"]').first();
      if (await nextBtn.isVisible().catch(() => false)) {
        console.log('Clicking next month...');
        await nextBtn.click();
        await page.waitForTimeout(3000);
      }
    }
    
    await page.screenshot({ path: '/workspace/openclaw/logs/square_flow_5_april.png', fullPage: true });
    
    // Step 6: Click April 29
    console.log('Step 6: Looking for April 29...');
    const date29 = await page.locator('button:has-text("29")').first();
    const isEnabled = await date29.isEnabled().catch(() => false);
    
    console.log('Date 29 visible:', await date29.isVisible().catch(() => false));
    console.log('Date 29 enabled:', isEnabled);
    
    if (isEnabled) {
      console.log('Clicking April 29...');
      await date29.click();
      await page.waitForTimeout(5000);
    } else {
      console.log('April 29 not available');
    }
    
    await page.screenshot({ path: '/workspace/openclaw/logs/square_flow_6_times.png', fullPage: true });
    results.steps.push({ step: 6, status: 'date_selected', url: page.url() });
    
    // Step 7: Extract time slots
    console.log('Step 7: Extracting time slots...');
    
    const allButtons = await page.locator('button').all();
    const timeSlots = [];
    
    for (const btn of allButtons.slice(0, 40)) {
      const text = await btn.textContent().catch(() => '');
      const trimmed = text.trim();
      
      // Parse times like "5:00 PM", "6:30 PM"
      const match = trimmed.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (match) {
        let hour = parseInt(match[1]);
        const period = match[3].toUpperCase();
        
        if (period === 'PM' && hour !== 12) hour += 12;
        
        timeSlots.push({
          text: trimmed,
          hour: hour,
          isEvening: hour >= 17 && hour <= 19  // 5-7 PM
        });
      }
    }
    
    const eveningSlots = timeSlots.filter(s => s.isEvening);
    
    console.log('\n=== Results ===');
    console.log('All time slots:', timeSlots.length);
    console.log('Evening slots (5-7 PM):', eveningSlots.map(s => s.text));
    
    results.availability = {
      allSlots: timeSlots,
      eveningSlots: eveningSlots
    };
    
    await fs.promises.writeFile('/workspace/openclaw/logs/square_flow_results.json', JSON.stringify(results, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
    results.error = error.message;
    await fs.promises.writeFile('/workspace/openclaw/logs/square_flow_results.json', JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }
})();
