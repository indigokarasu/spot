const { chromium } = require('playwright');

/**
 * Final test with verified correct service ID
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
    console.log('=== FINAL TEST: Verified Peppermint Pedi Service ID ===\n');
    
    // This is the EXACT service ID from manual navigation
    const serviceId = 'XA4S2WKU7HYBHTWNKCPBIBDJ';
    
    await page.goto(
      `https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=${serviceId}`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    await page.waitForTimeout(5000);
    
    // Verify this is Peppermint Pedi
    const verify = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      hasPeppermintPedi: document.body.innerText.includes('Peppermint Pedi'),
      hasAnyStaff: document.body.innerText.includes('Any staff'),
      heading: document.querySelector('h2')?.textContent?.trim()
    }));
    
    console.log('Verification:');
    console.log('  URL:', verify.url);
    console.log('  Title:', verify.title);
    console.log('  Has Peppermint Pedi:', verify.hasPeppermintPedi);
    console.log('  Has Any staff:', verify.hasAnyStaff);
    console.log('  H2:', verify.heading);
    
    // Navigate through booking
    await page.locator('[aria-label="Any staff"]').first().click().catch(() => {});
    await page.waitForTimeout(2000);
    await page.mouse.click(960, 1040);
    await page.waitForTimeout(2000);
    await page.mouse.click(1280, 317);
    await page.waitForTimeout(5000);
    
    // Go to April
    const text = await page.locator('body').textContent();
    if (text.includes('Mar') && !text.includes('Apr')) {
      await page.mouse.click(1400, 200);
      await page.waitForTimeout(4000);
    }
    
    // Check April 29
    console.log('\nApril 29 Status:');
    const status = await page.evaluate(() => {
      const btn = document.querySelector('market-button[data-testid="date-29"]');
      if (!btn) return { found: false };
      
      return {
        found: true,
        disabled: btn.disabled,
        ariaDisabled: btn.getAttribute('aria-disabled'),
        text: btn.textContent?.trim(),
        classList: btn.className
      };
    });
    
    console.log('  Found:', status.found);
    console.log('  Disabled:', status.disabled);
    console.log('  Text:', status.text);
    
    if (status.found && !status.disabled) {
      // Get times
      await page.evaluate(() => {
        document.querySelector('market-button[data-testid="date-29"]')?.click();
      });
      await page.waitForTimeout(5000);
      
      const times = await page.evaluate(() => {
        const t = document.body.innerText.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];
        return [...new Set(t)].sort();
      });
      
      console.log('\n=== APRIL 29 IS AVAILABLE ===');
      console.log('Times:', times.join(', '));
    } else {
      console.log('\n=== APRIL 29 IS NOT AVAILABLE ===');
      
      // Show what IS available
      const available = await page.evaluate(() => {
        const btns = document.querySelectorAll('market-button[data-testid^="date-"]');
        return Array.from(btns)
          .filter(b => !b.disabled)
          .map(b => {
            const id = b.getAttribute('data-testid');
            return parseInt(id.replace('date-', ''));
          });
      });
      
      console.log('Available dates:', available);
    }
    
    await page.screenshot({ 
      path: '/workspace/openclaw/logs/final_april29_test.png',
      fullPage: true 
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
