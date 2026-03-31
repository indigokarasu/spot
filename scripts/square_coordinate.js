const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Square Booking - Coordinate-based approach
 * Use exact positions from visual inspection
 */

(async () => {
  const browser = await chromium.launch({
    headless: false,  // Non-headless to see what's happening
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  const page = await context.newPage();

  try {
    console.log('Loading Square booking...');
    
    // Load booking page
    await page.goto('https://square.site/book/L6SV5MCXN00CB/shade-nail-spa-san-francisco-ca', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    await page.waitForTimeout(3000);
    
    // Click "Let's go" - coordinates from screenshot ~960, 540
    await page.mouse.click(960, 540);
    console.log('Clicked Let\'s go');
    await page.waitForTimeout(4000);
    
    // Scroll to Peppermint Pedi
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(1000);
    
    // Click Peppermint Pedi - approximate coordinates
    await page.mouse.click(960, 700);
    console.log('Clicked Peppermint Pedi area');
    await page.waitForTimeout(4000);
    
    // Click Continue if present
    await page.mouse.click(960, 800);
    console.log('Clicked Continue area');
    await page.waitForTimeout(5000);
    
    // Should be on calendar now - click next month arrow
    // Arrow is typically top right of calendar ~1200, 400
    await page.mouse.click(1200, 400);
    console.log('Clicked next month');
    await page.waitForTimeout(3000);
    
    // Click April 29
    // Calendar grid: April 29 would be row 5, around ~1100, 700
    await page.mouse.click(1100, 700);
    console.log('Clicked date 29 area');
    await page.waitForTimeout(5000);
    
    // Screenshot result
    await page.screenshot({ path: '/workspace/openclaw/logs/square_coord_result.png' });
    
    // Extract times
    const timeSlots = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const times = [];
      buttons.forEach(btn => {
        const text = btn.textContent?.trim() || '';
        if (text.match(/^\d{1,2}:\d{2}\s*(AM|PM)$/i)) {
          times.push(text);
        }
      });
      return times;
    });
    
    console.log('Time slots:', timeSlots);
    
    const evening = timeSlots.filter(t => {
      const h = parseInt(t.match(/(\d{1,2}):/)[1]);
      const p = t.match(/(AM|PM)/i)[1];
      return p === 'PM' && h >= 5 && h <= 7;
    });
    
    console.log('Evening slots:', evening);
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/coord_error.png' });
  } finally {
    await browser.close();
  }
})();
