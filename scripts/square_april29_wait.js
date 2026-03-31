const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

  try {
    console.log('=== April 29 - Extended Wait ===\n');
    
    await page.goto(
      'https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=XA4S2WKU7HYBHTWNKCPBIBDJ',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    await page.waitForTimeout(4000);
    
    // Navigate to calendar
    await page.locator('[aria-label="Any staff"]').first().click().catch(() => {});
    await page.waitForTimeout(1500);
    await page.mouse.click(960, 1040);
    await page.waitForTimeout(1500);
    await page.mouse.click(1280, 317);
    await page.waitForTimeout(4000);
    
    // Go to April
    const text = await page.locator('body').textContent();
    if (text.includes('Mar') && !text.includes('Apr')) {
      await page.mouse.click(1400, 200);
      await page.waitForTimeout(4000);
    }
    
    await page.screenshot({ path: '/workspace/openclaw/logs/before_click.png' });
    
    // Click April 29 and wait for navigation/change
    console.log('Clicking April 29...');
    const date29 = await page.locator('[data-testid="date-29"]').first();
    
    // Check initial state
    const before = await date29.evaluate(el => ({
      text: el.textContent,
      ariaPressed: el.getAttribute('aria-pressed'),
      disabled: el.disabled
    }));
    console.log('Before click:', before);
    
    await date29.click();
    console.log('Clicked, waiting 10 seconds...');
    await page.waitForTimeout(10000);
    
    await page.screenshot({ path: '/workspace/openclaw/logs/after_click.png' });
    
    // Check if page changed
    const afterUrl = page.url();
    console.log('After URL:', afterUrl);
    
    // Check for time elements
    const times = await page.evaluate(() => {
      const allText = document.body.innerText;
      
      // Look for AM/PM patterns
      const timeMatches = allText.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];
      
      // Look for time buttons
      const timeButtons = Array.from(document.querySelectorAll('market-button, button')).filter(btn => {
        const text = btn.textContent || '';
        return /\d{1,2}:\d{2}/.test(text);
      }).map(btn => btn.textContent?.trim());
      
      return {
        textMatches: [...new Set(timeMatches)].slice(0, 20),
        buttons: timeButtons.slice(0, 20),
        pageSnippet: allText.substring(0, 500)
      };
    });
    
    console.log('\nText matches:', times.textMatches);
    console.log('Buttons:', times.buttons);
    console.log('\nPage snippet:', times.pageSnippet.substring(0, 300));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
