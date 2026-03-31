const { chromium } = require('playwright');

/**
 * Test with CORRECT service ID
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
    console.log('=== Testing Correct Service ID ===\n');
    
    // Use the service ID from manual navigation
    const correctServiceId = 'GO2NN5SVUS4LGXMENLKZYFJY';
    
    console.log('Using service ID:', correctServiceId);
    console.log('(This is the ID from manual navigation, not the one I was using before)\n');
    
    await page.goto(
      `https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=${correctServiceId}`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    await page.waitForTimeout(5000);
    
    // Check if this is Peppermint Pedi
    const pageInfo = await page.evaluate(() => ({
      hasPeppermint: document.body.innerText.includes('Peppermint Pedi'),
      hasAnyStaff: document.body.innerText.includes('Any staff'),
      headings: Array.from(document.querySelectorAll('h1, h2')).map(h => h.textContent?.trim())
    }));
    
    console.log('Page info:');
    console.log('  Headings:', pageInfo.headings);
    console.log('  Has Peppermint:', pageInfo.hasPeppermint);
    console.log('  Has Any staff:', pageInfo.hasAnyStaff);
    
    // Continue booking flow
    await page.locator('[aria-label="Any staff"]').first().click().catch(() => {});
    await page.waitForTimeout(2000);
    await page.mouse.click(960, 1040);
    await page.waitForTimeout(2000);
    await page.mouse.click(1280, 317);
    await page.waitForTimeout(5000);
    
    // Navigate to April
    const pageText = await page.locator('body').textContent();
    if (pageText.includes('Mar') && !pageText.includes('Apr')) {
      await page.mouse.click(1400, 200);
      await page.waitForTimeout(4000);
    }
    
    await page.screenshot({ path: '/workspace/openclaw/logs/correct_service_calendar.png' });
    
    // Check April 29
    console.log('\nChecking April 29...');
    const date29 = await page.evaluate(() => {
      const btn = document.querySelector('market-button[data-testid="date-29"]');
      if (!btn) return { found: false };
      return {
        found: true,
        disabled: btn.disabled,
        text: btn.textContent?.trim()
      };
    });
    
    console.log('  Found:', date29.found);
    console.log('  Disabled:', date29.disabled);
    console.log('  Text:', date29.text);
    
    if (date29.found && !date29.disabled) {
      // Click and get times
      await page.evaluate(() => {
        document.querySelector('market-button[data-testid="date-29"]')?.click();
      });
      await page.waitForTimeout(5000);
      
      await page.screenshot({ path: '/workspace/openclaw/logs/correct_service_times.png' });
      
      const times = await page.evaluate(() => {
        const text = document.body.innerText;
        return [...new Set((text.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || []))].sort();
      });
      
      console.log('\n=== SUCCESS! April 29 Times ===');
      console.log(times.join('\n'));
    } else {
      console.log('\nApril 29 still not available with correct service ID');
      
      // Check what dates ARE available
      const allDates = await page.evaluate(() => {
        const buttons = document.querySelectorAll('market-button[data-testid^="date-"]');
        return Array.from(buttons)
          .filter(btn => !btn.disabled)
          .map(btn => {
            const testId = btn.getAttribute('data-testid');
            return parseInt(testId.replace('date-', ''));
          });
      });
      
      console.log('\nAvailable dates:', allDates);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
