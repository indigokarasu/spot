const { chromium } = require('playwright');

/**
 * Test the /availability endpoint
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
    console.log('=== Testing /availability Endpoint ===\n');
    
    // Try the exact URL pattern you showed
    const url = 'https://book.squareup.com/appointments/zhyuoylr81g79j/location/L6SV5MCXN00CB/availability';
    
    console.log('Loading:', url);
    
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(5000);
    
    // Get page info
    const info = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      text: document.body.innerText.substring(0, 1000)
    }));
    
    console.log('\nPage Info:');
    console.log('  Final URL:', info.url);
    console.log('  Title:', info.title);
    console.log('  Has calendar:', info.text.includes('2026'));
    console.log('  Has April:', info.text.includes('Apr') || info.text.includes('April'));
    console.log('  Has March:', info.text.includes('Mar') || info.text.includes('March'));
    
    // Check if we need to navigate to April
    if (info.text.includes('Mar') && !info.text.includes('Apr')) {
      console.log('\n  Navigating to April...');
      await page.mouse.click(1400, 200);
      await page.waitForTimeout(4000);
    }
    
    await page.screenshot({ 
      path: '/workspace/openclaw/logs/availability_endpoint.png',
      fullPage: true 
    });
    
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
      await page.evaluate(() => {
        document.querySelector('market-button[data-testid="date-29"]')?.click();
      });
      await page.waitForTimeout(5000);
      
      const times = await page.evaluate(() => {
        const t = document.body.innerText.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];
        return [...new Set(t)].sort();
      });
      
      console.log('\n=== APRIL 29 TIMES ===');
      console.log(times.join('\n'));
      
      await page.screenshot({ 
        path: '/workspace/openclaw/logs/availability_april29_times.png',
        fullPage: true 
      });
    }
    
    console.log('\nScreenshot saved to /workspace/openclaw/logs/availability_endpoint.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
