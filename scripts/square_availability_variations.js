const { chromium } = require('playwright');

/**
 * Test availability endpoint variations
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

  const serviceId = 'XA4S2WKU7HYBHTWNKCPBIBDJ';
  
  const tests = [
    {
      name: 'Service with /availability',
      url: `https://book.squareup.com/appointments/zhyuoylr81g79j/location/L6SV5MCXN00CB/services/${serviceId}/availability`
    },
    {
      name: 'Availability with service_id param',
      url: `https://book.squareup.com/appointments/zhyuoylr81g79j/location/L6SV5MCXN00CB/availability?service_id=${serviceId}`
    },
    {
      name: 'Start with availability',
      url: `https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=${serviceId}`
    }
  ];
  
  for (const test of tests) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TEST: ${test.name}`);
    console.log('='.repeat(60));
    console.log('URL:', test.url);
    
    try {
      await page.goto(test.url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      await page.waitForTimeout(5000);
      
      const info = await page.evaluate(() => ({
        finalUrl: window.location.href,
        hasCalendar: document.body.innerText.includes('2026'),
        hasStaff: document.body.innerText.includes('Any staff'),
        hasApril29: !!document.querySelector('market-button[data-testid="date-29"]'),
        textSample: document.body.innerText.substring(0, 300)
      }));
      
      console.log('  Final URL:', info.finalUrl);
      console.log('  Has calendar:', info.hasCalendar);
      console.log('  Has staff:', info.hasStaff);
      console.log('  Has April 29:', info.hasApril29);
      console.log('  Page preview:', info.textSample.substring(0, 100));
      
      // If on calendar, check April 29
      if (info.hasApril29) {
        const date29 = await page.evaluate(() => {
          const btn = document.querySelector('market-button[data-testid="date-29"]');
          return btn ? { disabled: btn.disabled, text: btn.textContent?.trim() } : null;
        });
        console.log('  April 29 status:', date29 ? `${date29.text} - ${date29.disabled ? 'disabled' : 'AVAILABLE'}` : 'Not found');
      }
      
      await page.screenshot({ 
        path: `/workspace/openclaw/logs/test_${test.name.replace(/\s+/g, '_')}.png`,
        fullPage: true 
      });
      
    } catch (error) {
      console.error('  Error:', error.message);
    }
  }
  
  await browser.close();
})();
