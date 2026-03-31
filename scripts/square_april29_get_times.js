const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    console.log('=== Getting April 29 Times ===\n');
    
    await page.goto(
      'https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=XA4S2WKU7HYBHTWNKCPBIBDJ',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    await page.waitForTimeout(4000);
    
    // Select staff, Add, Next
    await page.locator('[aria-label="Any staff"]').first().click().catch(() => {});
    await page.waitForTimeout(1500);
    await page.mouse.click(960, 1040);
    await page.waitForTimeout(1500);
    await page.mouse.click(1280, 317);
    await page.waitForTimeout(4000);
    
    // Navigate to April
    const text = await page.locator('body').textContent();
    if (text.includes('Mar') && !text.includes('Apr')) {
      await page.mouse.click(1400, 200);
      await page.waitForTimeout(4000);
    }
    
    // Click April 29
    const date29 = await page.locator('[data-testid="date-29"]').first();
    await date29.click();
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: '/workspace/openclaw/logs/april29_times_view.png' });
    
    // Extract times from the DOM
    const times = await page.evaluate(() => {
      // Look for time buttons or time text
      const buttons = document.querySelectorAll('market-button');
      const timeElements = [];
      
      buttons.forEach(btn => {
        const text = btn.textContent?.trim();
        if (text && /\d{1,2}:\d{2}/.test(text)) {
          timeElements.push(text);
        }
      });
      
      // Also check for time labels
      const labels = document.querySelectorAll('[aria-label*="AM"], [aria-label*="PM"]');
      labels.forEach(el => {
        const label = el.getAttribute('aria-label');
        if (label && !timeElements.includes(label)) {
          timeElements.push(label);
        }
      });
      
      return timeElements;
    });
    
    console.log('Times found:', times.length);
    console.log(times.join('\n'));
    
    // Also get raw page text
    const pageText = await page.locator('body').textContent();
    const textTimes = [...new Set((pageText.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || []))].sort();
    console.log('\nTimes from text:', textTimes.join(', '));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
