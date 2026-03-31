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
    // Navigate to Shade Nail Spa booking page
    console.log('Navigating to Shade Nail Spa booking...');
    await page.goto('https://square.site/book/L6SV5MCXN00CB/shade-nail-spa-san-francisco-ca', { 
      waitUntil: 'networkidle', 
      timeout: 45000 
    });
    
    console.log('Loaded booking page');
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ path: '/workspace/openclaw/logs/shade_initial.png', fullPage: true });
    
    // Look for Peppermint Pedi service
    console.log('Looking for Peppermint Pedi...');
    const serviceElements = await page.locator('text=/Peppermint Pedi/i, [data-testid*="peppermint"], .service-item:has-text("Peppermint")').all();
    console.log('Found', serviceElements.length, 'potential service elements');
    
    // Try to find and click Peppermint Pedi
    const peppermintButton = await page.locator('button:has-text("Peppermint Pedi"), text="Peppermint Pedi"').first();
    if (await peppermintButton.isVisible().catch(() => false)) {
      console.log('Found Peppermint Pedi, clicking...');
      await peppermintButton.click();
      await page.waitForTimeout(3000);
    } else {
      // Look for any service list
      const allButtons = await page.locator('button, [role="button"]').all();
      const serviceNames = [];
      for (const btn of allButtons.slice(0, 20)) {
        const text = await btn.textContent().catch(() => '');
        if (text.toLowerCase().includes('pedi') || text.toLowerCase().includes('peppermint')) {
          serviceNames.push(text.trim());
        }
      }
      console.log('Services found:', serviceNames);
    }
    
    // Navigate to April 29, 2026
    console.log('Looking for date picker...');
    await page.waitForTimeout(3000);
    
    // Try to find date navigation
    const datePicker = await page.locator('[data-testid*="date"], input[type="date"], .datepicker').first();
    if (await datePicker.isVisible().catch(() => false)) {
      console.log('Found date picker');
      await datePicker.fill('2026-04-29');
      await page.waitForTimeout(3000);
    }
    
    // Look for time slots
    console.log('Looking for time slots...');
    const timeSlots = await page.locator('button:has-text(":"), [data-testid*="time"], .time-slot, text=/[0-9]:[0-9]{2}/').all();
    console.log('Found', timeSlots.length, 'time slot elements');
    
    const times = [];
    for (const slot of timeSlots.slice(0, 20)) {
      const text = await slot.textContent().catch(() => '');
      if (text.includes(':') && (text.includes('AM') || text.includes('PM') || text.includes('am') || text.includes('pm'))) {
        times.push(text.trim());
      }
    }
    
    console.log('Time slots found:', times);
    
    // Save results
    const results = {
      url: page.url(),
      serviceFound: serviceElements.length > 0,
      timeSlots: times,
      timestamp: new Date().toISOString()
    };
    
    await fs.promises.writeFile('/workspace/openclaw/logs/shade_results.json', JSON.stringify(results, null, 2));
    
    // Final screenshot
    await page.screenshot({ path: '/workspace/openclaw/logs/shade_final.png', fullPage: true });
    
    console.log('Results saved');
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/shade_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
