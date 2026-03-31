const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Square Booking - Step 2: Date/Time Selection
 * Continue from service-selected URL
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
    // Start from service-selected URL
    const serviceUrl = 'https://book.squareup.com/appointments/zhyuoylr81g79j/location/L6SV5MCXN00CB/services/XA4S2WKU7HYBHTWNKCPBIBDJ';
    console.log('Loading service page...');
    
    await page.goto(serviceUrl, {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    console.log('Loaded service page');
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: '/workspace/openclaw/logs/square_step2_start.png', fullPage: true });
    
    // Step 2: Look for date selection
    console.log('Looking for date/calendar selection...');
    
    const pageText = await page.locator('body').textContent();
    console.log('Page contains "date":', pageText.toLowerCase().includes('date'));
    console.log('Page contains "calendar":', pageText.toLowerCase().includes('calendar'));
    console.log('Page contains "April":', pageText.includes('April'));
    
    // Try to find and click "Continue" or date selection
    const continueBtn = await page.locator('button:has-text("Continue"), text="Continue"').first();
    if (await continueBtn.isVisible().catch(() => false)) {
      console.log('Found Continue button, clicking...');
      await continueBtn.click();
      await page.waitForTimeout(5000);
    }
    
    // Look for calendar
    console.log('Looking for calendar...');
    await page.waitForTimeout(3000);
    
    // Try to find month navigation
    const currentMonth = await page.locator('text=/March|April|May/i').first().textContent().catch(() => '');
    console.log('Current month shown:', currentMonth);
    
    // Navigate to April if needed
    const nextBtn = await page.locator('button:has(">"), [aria-label*="next"], button[aria-label*="Next"]').first();
    if (await nextBtn.isVisible().catch(() => false)) {
      // Check if we're on March and need to advance to April
      if (currentMonth.toLowerCase().includes('march')) {
        console.log('Advancing to April...');
        await nextBtn.click();
        await page.waitForTimeout(3000);
      }
    }
    
    // Find and click April 29
    console.log('Looking for April 29...');
    const date29 = await page.locator('button:has-text("29"), [role="button"]:has-text("29"), text="29"').first();
    
    if (await date29.isVisible().catch(() => false)) {
      const isEnabled = await date29.isEnabled().catch(() => false);
      console.log('Found date 29, enabled:', isEnabled);
      
      if (isEnabled) {
        console.log('Clicking April 29...');
        await date29.click();
        await page.waitForTimeout(5000);
      } else {
        console.log('Date 29 not enabled (likely unavailable)');
      }
    } else {
      console.log('Date 29 not found on current view');
    }
    
    // Step 3: Look for time slots
    console.log('Looking for time slots...');
    await page.waitForTimeout(3000);
    
    const timeButtons = await page.locator('button').all();
    const timeSlots = [];
    
    for (const btn of timeButtons.slice(0, 30)) {
      const text = await btn.textContent().catch(() => '');
      const trimmed = text.trim();
      
      // Look for time patterns
      const timeMatch = trimmed.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const period = timeMatch[3].toUpperCase();
        
        if (period === 'PM' && hour !== 12) hour += 12;
        
        timeSlots.push({
          text: trimmed,
          hour: hour,
          isEvening: hour >= 17 && hour <= 19  // 5-7 PM
        });
      }
    }
    
    console.log('\n=== Time Slots Found ===');
    console.log('Total slots:', timeSlots.length);
    console.log('All slots:', timeSlots.map(s => s.text));
    
    const eveningSlots = timeSlots.filter(s => s.isEvening);
    console.log('\nEvening slots (5-7 PM):', eveningSlots.map(s => s.text));
    
    // Save results
    const results = {
      service: 'Peppermint Pedi',
      targetDate: '2026-04-29',
      currentMonth: currentMonth,
      allTimeSlots: timeSlots,
      eveningSlots: eveningSlots,
      url: page.url(),
      timestamp: new Date().toISOString()
    };
    
    await fs.promises.writeFile('/workspace/openclaw/logs/square_final_results.json', JSON.stringify(results, null, 2));
    await page.screenshot({ path: '/workspace/openclaw/logs/square_step2_final.png', fullPage: true });
    
    console.log('\n=== FINAL RESULTS ===');
    console.log('Service: Peppermint Pedi at Shade Nail Spa');
    console.log('Target: April 29, 2026');
    console.log('Evening availability (5-7 PM):', eveningSlots.length > 0 ? eveningSlots.map(s => s.text) : 'Not available or not loaded');
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/square_step2_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
