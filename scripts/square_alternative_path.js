const { chromium } = require('playwright');

/**
 * Alternative path: Manual service selection
 * Maybe pre-selecting service_id bypasses something
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
    console.log('=== Alternative Path Test ===\n');
    
    // Step 1: Load WITHOUT service_id
    console.log('Step 1: Loading without service_id...');
    await page.goto(
      'https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    await page.waitForTimeout(5000);
    
    const startUrl = page.url();
    console.log('  Start URL:', startUrl);
    
    // Step 2: Find and click Peppermint Pedi from the list
    console.log('\nStep 2: Finding Peppermint Pedi...');
    
    const services = await page.evaluate(() => {
      const rows = document.querySelectorAll('market-row');
      const results = [];
      rows.forEach((row, i) => {
        const text = row.textContent?.trim();
        if (text?.toLowerCase().includes('peppermint')) {
          results.push({ index: i, text: text.substring(0, 50) });
        }
      });
      return results;
    });
    
    console.log('  Peppermint services found:', services.length);
    services.forEach(s => console.log(`    [${s.index}]: ${s.text}`));
    
    if (services.length > 0) {
      // Click the Peppermint Pedi row
      const rows = await page.locator('market-row').all();
      for (const row of rows) {
        const text = await row.textContent().catch(() => '');
        if (text.toLowerCase().includes('peppermint')) {
          console.log('  Clicking Peppermint Pedi...');
          await row.click();
          await page.waitForTimeout(3000);
          break;
        }
      }
    }
    
    const afterServiceUrl = page.url();
    console.log('  After service URL:', afterServiceUrl);
    
    // Step 3: Continue with staff selection
    console.log('\nStep 3: Staff selection...');
    await page.locator('[aria-label="Any staff"]').first().click().catch(() => {});
    await page.waitForTimeout(2000);
    await page.mouse.click(960, 1040);
    await page.waitForTimeout(2000);
    await page.mouse.click(1280, 317);
    await page.waitForTimeout(5000);
    
    // Step 4: Navigate to April
    const pageText = await page.locator('body').textContent();
    if (pageText.includes('Mar') && !pageText.includes('Apr')) {
      await page.mouse.click(1400, 200);
      await page.waitForTimeout(4000);
    }
    
    // Step 5: Check April 29
    console.log('\nStep 4: Check April 29...');
    const date29Info = await page.evaluate(() => {
      const btn = document.querySelector('market-button[data-testid="date-29"]');
      if (!btn) return { found: false };
      return {
        found: true,
        disabled: btn.disabled,
        text: btn.textContent?.trim()
      };
    });
    
    console.log('  Found:', date29Info.found);
    console.log('  Disabled:', date29Info.disabled);
    console.log('  Text:', date29Info.text);
    
    // Take screenshot
    await page.screenshot({ 
      path: '/workspace/openclaw/logs/alternative_path_test.png',
      fullPage: true 
    });
    
    console.log('\n  Screenshot saved');
    
    // Compare URLs
    console.log('\n=== Comparison ===');
    console.log('My service_id URL:');
    console.log('  https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=XA4S2WKU7HYBHTWNKCPBIBDJ');
    console.log('Alternative path URL:');
    console.log('  ', afterServiceUrl);
    console.log('  Are they the same?', afterServiceUrl.includes('XA4S2WKU7HYBHTWNKCPBIBDJ'));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
