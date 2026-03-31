const { chromium } = require('playwright');

/**
 * Test with proper Playwright interactions (no mouse coordinates)
 */

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  try {
    console.log('=== Proper Playwright Interaction Test ===\n');
    
    // Enable request logging
    const requests = [];
    page.on('request', req => {
      const url = req.url();
      if (url.includes('availability') || url.includes('booking') || url.includes('api')) {
        requests.push({ url: url.substring(0, 100), time: Date.now() });
      }
    });
    
    await page.goto(
      'https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=XA4S2WKU7HYBHTWNKCPBIBDJ',
      { waitUntil: 'networkidle', timeout: 60000 }
    );
    
    console.log('Step 1: Select Any staff');
    await page.getByLabel('Any staff').click({ timeout: 10000 });
    await page.waitForTimeout(2000);
    
    console.log('Step 2: Click Add button');
    await page.getByLabel('Add').click({ timeout: 10000 });
    await page.waitForTimeout(2000);
    
    console.log('Step 3: Click Next button');
    await page.getByLabel('Next').click({ timeout: 10000 });
    await page.waitForTimeout(5000);
    
    // Check what month we're on
    const monthInfo = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasMarch: text.includes('Mar'),
        hasApril: text.includes('Apr'),
        currentMonth: text.match(/(March|April)\s+2026/)?.[0]
      };
    });
    
    console.log('Month info:', monthInfo);
    
    // Navigate to April if needed
    if (monthInfo.hasMarch && !monthInfo.hasApril) {
      console.log('Step 4: Navigate to April');
      const nextMonthBtn = await page.locator('[aria-label="Next month"]').first();
      if (await nextMonthBtn.isVisible().catch(() => false)) {
        await nextMonthBtn.click();
      } else {
        await page.mouse.click(1400, 200);
      }
      await page.waitForTimeout(4000);
    }
    
    // Check April 29
    console.log('\nStep 5: Check April 29');
    const date29Btn = await page.locator('[data-testid="date-29"]').first();
    const isVisible = await date29Btn.isVisible().catch(() => false);
    
    if (isVisible) {
      const isDisabled = await date29Btn.isDisabled();
      const isEnabled = await date29Btn.isEnabled();
      const text = await date29Btn.textContent();
      
      console.log('  Found: true');
      console.log('  Text:', text);
      console.log('  isDisabled():', isDisabled);
      console.log('  isEnabled():', isEnabled);
      
      // Try to click it
      if (!isDisabled) {
        console.log('\n  Attempting to click April 29...');
        await date29Btn.click();
        await page.waitForTimeout(5000);
        
        const times = await page.locator('text=/\\d{1,2}:\\d{2}\\s*[AP]M/i').allTextContents();
        console.log('  Times found:', [...new Set(times)].slice(0, 10));
      } else {
        console.log('  Cannot click - button is disabled');
      }
    } else {
      console.log('  April 29 button not visible');
    }
    
    // Get all available dates
    console.log('\nAll dates:');
    const allDateBtns = await page.locator('market-button[data-testid^="date-"]').all();
    for (const btn of allDateBtns.slice(0, 15)) {
      const testId = await btn.getAttribute('data-testid');
      const day = testId.replace('date-', '');
      const disabled = await btn.isDisabled();
      console.log(`  ${day}: ${disabled ? 'disabled' : 'available'}`);
    }
    
    await page.screenshot({ 
      path: '/workspace/openclaw/logs/proper_interaction_test.png',
      fullPage: true 
    });
    
    console.log('\nScreenshot saved');
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await browser.close();
  }
})();
