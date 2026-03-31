const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    console.log('=== Clean April 29 Check ===\n');
    
    await page.goto(
      'https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=XA4S2WKU7HYBHTWNKCPBIBDJ',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    await page.waitForTimeout(4000);
    
    await page.locator('[aria-label="Any staff"]').first().click().catch(() => {});
    await page.waitForTimeout(1500);
    await page.mouse.click(960, 1040);
    await page.waitForTimeout(1500);
    await page.mouse.click(1280, 317);
    await page.waitForTimeout(4000);
    
    const text = await page.locator('body').textContent();
    if (text.includes('Mar') && !text.includes('Apr')) {
      await page.mouse.click(1400, 200);
      await page.waitForTimeout(4000);
    }
    
    // Check April 29 - use evaluate for truth
    console.log('April 29 status (from DOM):');
    const status = await page.evaluate(() => {
      const btn = document.querySelector('market-button[data-testid="date-29"]');
      if (!btn) return { found: false };
      
      return {
        found: true,
        disabled: btn.hasAttribute('disabled'),
        ariaDisabled: btn.getAttribute('aria-disabled'),
        ariaPressed: btn.getAttribute('aria-pressed'),
        text: btn.textContent?.trim(),
        outerHTML: btn.outerHTML?.substring(0, 200)
      };
    });
    
    console.log(status);
    
    // Compare with Playwright method
    const btn = await page.locator('[data-testid="date-29"]').first();
    const isEnabled = await btn.isEnabled();
    const isDisabled = await btn.isDisabled();
    const isVisible = await btn.isVisible();
    
    console.log('\nPlaywright methods:');
    console.log('  isEnabled():', isEnabled);
    console.log('  isDisabled():', isDisabled);
    console.log('  isVisible():', isVisible);
    
    // List ALL dates and their status
    console.log('\n\nAll April dates:');
    const allDates = await page.evaluate(() => {
      const results = [];
      const btns = document.querySelectorAll('market-button[data-testid^="date-"]');
      
      btns.forEach(btn => {
        const testId = btn.getAttribute('data-testid');
        const day = parseInt(testId.replace('date-', ''));
        const disabled = btn.hasAttribute('disabled');
        
        if (day >= 22 && day <= 31) {
          results.push({ day, disabled });
        }
      });
      
      return results;
    });
    
    allDates.forEach(d => {
      console.log(`  April ${d.day}: ${d.disabled ? 'NOT AVAILABLE' : 'AVAILABLE'}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
