const { chromium } = require('playwright');

/**
 * Simple test with proper interactions
 */

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  try {
    console.log('=== April 29 Availability Check ===\n');
    
    await page.goto(
      'https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=XA4S2WKU7HYBHTWNKCPBIBDJ',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    await page.waitForTimeout(4000);
    
    // Select staff
    await page.locator('[aria-label="Any staff"]').first().click().catch(() => {});
    await page.waitForTimeout(1500);
    
    // Click Add - try aria-label first, then text
    const addBtn = await page.locator('[aria-label="Add"]').first();
    if (await addBtn.isVisible().catch(() => false)) {
      await addBtn.click();
    } else {
      await page.mouse.click(960, 1040);
    }
    await page.waitForTimeout(1500);
    
    // Click Next
    const nextBtn = await page.locator('[aria-label="Next"]').first();
    if (await nextBtn.isVisible().catch(() => false)) {
      await nextBtn.click();
    } else {
      await page.mouse.click(1280, 317);
    }
    await page.waitForTimeout(4000);
    
    // Navigate to April
    const text = await page.locator('body').textContent();
    if (text.includes('Mar') && !text.includes('Apr')) {
      await page.mouse.click(1400, 200);
      await page.waitForTimeout(4000);
    }
    
    // Check April 29 using Playwright methods
    console.log('Checking April 29...');
    const date29 = await page.locator('[data-testid="date-29"]').first();
    const isVisible = await date29.isVisible().catch(() => false);
    
    if (isVisible) {
      const isEnabled = await date29.isEnabled();
      const text = await date29.textContent();
      
      console.log('  Found: true');
      console.log('  Text:', text);
      console.log('  isEnabled:', isEnabled);
      
      if (isEnabled) {
        console.log('  ✓ APRIL 29 IS AVAILABLE!');
        
        await date29.click();
        await page.waitForTimeout(5000);
        
        const times = await page.evaluate(() => {
          const t = document.body.innerText.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];
          return [...new Set(t)].sort();
        });
        
        console.log('\n  Times:', times.join(', '));
      } else {
        console.log('  ✗ April 29 is disabled');
      }
    } else {
      console.log('  April 29 not found');
    }
    
    // List available dates
    console.log('\nAll dates:');
    const allDates = await page.locator('market-button[data-testid^="date-"]').all();
    const availableDates = [];
    
    for (const btn of allDates) {
      const testId = await btn.getAttribute('data-testid');
      const day = parseInt(testId.replace('date-', ''));
      const isEnabled = await btn.isEnabled().catch(() => false);
      
      if (isEnabled) {
        availableDates.push(day);
      }
    }
    
    console.log('  Available:', availableDates.join(', '));
    
    await page.screenshot({ 
      path: '/workspace/openclaw/logs/april29_final_check.png',
      fullPage: true 
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
