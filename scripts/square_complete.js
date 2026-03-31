const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Square Booking - Handle Cookie Consent + Complete Flow
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
    console.log('Starting fresh booking flow...');
    
    // Step 1: Load the booking start page
    await page.goto('https://square.site/book/L6SV5MCXN00CB/shade-nail-spa-san-francisco-ca', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    await page.waitForTimeout(5000);
    console.log('Step 1: Loaded booking start');
    
    // Step 2: Handle cookie consent if present
    console.log('Checking for cookie consent...');
    const cookieText = await page.locator('body').textContent();
    
    if (cookieText.includes('Cookie Policy') || cookieText.includes('Privacy Notice')) {
      console.log('Cookie consent detected, looking for accept button...');
      
      // Look for accept/close button
      const acceptSelectors = [
        'button:has-text("Accept")',
        'button:has-text("Agree")',
        'button:has-text("OK")',
        'button:has-text("Continue")',
        '[aria-label*="Accept"]',
        '[aria-label*="Close"]',
        '.cookie-accept',
        '#accept-cookies'
      ];
      
      for (const selector of acceptSelectors) {
        const btn = await page.locator(selector).first();
        if (await btn.isVisible().catch(() => false)) {
          console.log('Clicking cookie accept button...');
          await btn.click();
          await page.waitForTimeout(3000);
          break;
        }
      }
    }
    
    // Step 3: Click "Let's go" to start booking
    console.log('Step 3: Starting booking...');
    const letsGoBtn = await page.locator('text="Let\'s go"').first();
    
    if (await letsGoBtn.isVisible().catch(() => false)) {
      await letsGoBtn.click();
      await page.waitForTimeout(5000);
    }
    
    // Step 4: Select Peppermint Pedi
    console.log('Step 4: Selecting Peppermint Pedi...');
    await page.waitForTimeout(3000);
    
    // Scroll to services
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(2000);
    
    const peppermintBtn = await page.locator('text="Peppermint Pedi"').first();
    if (await peppermintBtn.isVisible().catch(() => false)) {
      await peppermintBtn.click();
      console.log('Selected Peppermint Pedi');
      await page.waitForTimeout(5000);
    }
    
    // Step 5: Check for staff selection and continue
    console.log('Step 5: Checking for staff selection...');
    const continueBtn = await page.locator('button:has-text("Continue"), text="Continue"').first();
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
      await page.waitForTimeout(5000);
    }
    
    // Step 6: Navigate to April 29, 2026
    console.log('Step 6: Navigating to April 29, 2026...');
    await page.waitForTimeout(3000);
    
    // Check current month
    const monthText = await page.locator('body').textContent();
    console.log('Current month detected:', monthText.includes('March') ? 'March' : monthText.includes('April') ? 'April' : 'Unknown');
    
    // If on March, click next to get to April
    if (monthText.includes('March 2026') || monthText.includes('March')) {
      console.log('Advancing to April...');
      const nextBtn = await page.locator('button[aria-label*="next"], button:has("")').first();
      if (await nextBtn.isVisible().catch(() => false)) {
        await nextBtn.click();
        await page.waitForTimeout(3000);
      }
    }
    
    // Click April 29
    const date29 = await page.locator('button:has-text("29")').first();
    if (await date29.isVisible().catch(() => false)) {
      const enabled = await date29.isEnabled().catch(() => false);
      console.log('Date 29 found, enabled:', enabled);
      
      if (enabled) {
        await date29.click();
        console.log('Selected April 29');
        await page.waitForTimeout(5000);
      }
    }
    
    // Step 7: Extract time slots
    console.log('Step 7: Extracting time slots...');
    await page.waitForTimeout(3000);
    
    const allButtons = await page.locator('button').all();
    const timeSlots = [];
    
    for (const btn of allButtons.slice(0, 30)) {
      const text = await btn.textContent().catch(() => '');
      const trimmed = text.trim();
      
      // Match times like "5:00 PM", "6:30 PM"
      if (trimmed.match(/^\d{1,2}:\d{2}\s*(AM|PM)$/i)) {
        let hour = parseInt(trimmed.match(/(\d{1,2}):/)[1]);
        const period = trimmed.match(/(AM|PM)/i)[1].toUpperCase();
        
        if (period === 'PM' && hour !== 12) hour += 12;
        
        timeSlots.push({
          text: trimmed,
          hour: hour,
          isEvening: hour >= 17 && hour <= 19
        });
      }
    }
    
    const eveningSlots = timeSlots.filter(s => s.isEvening);
    
    // Save results
    const results = {
      service: 'Peppermint Pedi',
      location: 'Shade Nail Spa',
      targetDate: '2026-04-29',
      allSlots: timeSlots.map(s => s.text),
      eveningSlots: eveningSlots.map(s => s.text),
      slotCount: timeSlots.length,
      url: page.url(),
      timestamp: new Date().toISOString()
    };
    
    await fs.promises.writeFile('/workspace/openclaw/logs/shade_peppermint_results.json', JSON.stringify(results, null, 2));
    await page.screenshot({ path: '/workspace/openclaw/logs/shade_final.png', fullPage: true });
    
    console.log('\n=== RESULTS ===');
    console.log('Peppermint Pedi at Shade Nail Spa');
    console.log('Date: April 29, 2026');
    console.log('Total slots found:', timeSlots.length);
    console.log('Evening (5-7 PM):', eveningSlots.map(s => s.text).join(', ') || 'None available');
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/shade_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
