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
    console.log('Loading Shade Nail Spa booking...');
    await page.goto('https://my-business-102000-107381.square.site/', { 
      waitUntil: 'networkidle', 
      timeout: 60000 
    });
    
    console.log('Page loaded, URL:', page.url());
    await page.waitForTimeout(3000);
    
    // Step 1: Scroll to find and click "Peppermint Pedi"
    console.log('Looking for Peppermint Pedi...');
    
    // Scroll down to services section
    await page.evaluate(() => { window.scrollTo(0, 800); });
    await page.waitForTimeout(2000);
    
    // Find and click Peppermint Pedi
    const peppermintPedi = await page.locator('text="Peppermint Pedi"').first();
    const isVisible = await peppermintPedi.isVisible().catch(() => false);
    
    if (isVisible) {
      console.log('Found Peppermint Pedi, clicking...');
      await peppermintPedi.click();
      await page.waitForTimeout(4000);
    } else {
      console.log('Peppermint Pedi not found with text selector, trying other methods...');
      
      // Try to find by partial text or button containing it
      const buttons = await page.locator('button, div[role="button"]').all();
      for (const btn of buttons) {
        const text = await btn.textContent().catch(() => '');
        if (text.toLowerCase().includes('peppermint pedi')) {
          console.log('Found via text scan:', text.slice(0, 50));
          await btn.click();
          await page.waitForTimeout(4000);
          break;
        }
      }
    }
    
    // Step 2: Check if we're on calendar/date selection page
    console.log('Current URL after click:', page.url());
    await page.waitForTimeout(5000);
    
    // Step 3: Look for calendar or date selection
    console.log('Looking for calendar...');
    
    // Take screenshot to see current state
    await page.screenshot({ path: '/workspace/openclaw/logs/shade_step2.png', fullPage: true });
    
    // Try to find calendar elements
    const calendarElements = await page.locator('[data-testid*="calendar"], .calendar, [class*="calendar"], [role="grid"]').all();
    console.log('Calendar-like elements found:', calendarElements.length);
    
    // Look for month/year display
    const monthYearText = await page.locator('text=/April|May|March|2026/i').first().textContent().catch(() => '');
    console.log('Month/year found:', monthYearText);
    
    // Step 4: Try to navigate to April 2026 and select 29th
    // Look for "Next" or arrow buttons to advance months
    const nextButtons = await page.locator('button:has-text(">"), button[aria-label*="next"], [data-testid*="next"]').all();
    console.log('Navigation buttons found:', nextButtons.length);
    
    // Try clicking date 29 if visible
    const dateButtons = await page.locator('button').all();
    const dateOptions = [];
    
    for (const btn of dateButtons.slice(0, 50)) {
      const text = await btn.textContent().catch(() => '');
      const trimmed = text.trim();
      if (trimmed === '29' || trimmed.includes('29')) {
        dateOptions.push({ text: trimmed, clickable: await btn.isEnabled().catch(() => false) });
        // Try clicking if we think this is the right 29
        if (trimmed === '29') {
          console.log('Clicking date 29...');
          await btn.click();
          await page.waitForTimeout(3000);
          break;
        }
      }
    }
    
    console.log('Date 29 options:', dateOptions.slice(0, 5));
    
    // Step 5: Look for time slots
    console.log('Looking for time slots...');
    await page.waitForTimeout(3000);
    
    const allButtons = await page.locator('button').all();
    const timeSlots = [];
    
    for (const btn of allButtons.slice(0, 40)) {
      const text = await btn.textContent().catch(() => '');
      const trimmed = text.trim();
      
      // Look for time patterns (5:00 PM, 6:00 PM, etc.)
      if (trimmed.match(/\d{1,2}:\d{2}/) && (trimmed.includes('PM') || trimmed.includes('AM'))) {
        timeSlots.push(trimmed);
      }
    }
    
    // Filter for early evening (5 PM - 7 PM)
    const eveningSlots = timeSlots.filter(t => {
      const hour = parseInt(t.match(/(\d{1,2}):/)[1]);
      const isPM = t.includes('PM');
      return isPM && hour >= 5 && hour <= 7;
    });
    
    console.log('All time slots:', timeSlots.slice(0, 20));
    console.log('Early evening slots (5-7 PM):', eveningSlots);
    
    // Save results
    const results = {
      service: 'Peppermint Pedi',
      targetDate: '2026-04-29',
      currentUrl: page.url(),
      monthYear: monthYearText,
      allTimeSlots: timeSlots,
      eveningSlots: eveningSlots,
      timestamp: new Date().toISOString()
    };
    
    await fs.promises.writeFile('/workspace/openclaw/logs/shade_availability.json', JSON.stringify(results, null, 2));
    
    await page.screenshot({ path: '/workspace/openclaw/logs/shade_final.png', fullPage: true });
    
    console.log('\n=== Final Results ===');
    console.log('Service: Peppermint Pedi');
    console.log('Target date: April 29, 2026');
    console.log('Early evening availability (5-7 PM):', eveningSlots.length > 0 ? eveningSlots : 'None found');
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/shade_error_final.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
