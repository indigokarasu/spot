const { chromium } = require('playwright');

/**
 * Trace URL changes through booking flow
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

  // Track URL changes
  const urls = [];
  
  page.on('framenavigated', async frame => {
    if (frame === page.mainFrame()) {
      const url = frame.url();
      urls.push({ step: urls.length + 1, url, time: new Date().toISOString() });
      console.log(`\n[URL ${urls.length}] ${url}`);
    }
  });

  try {
    console.log('=== Tracing URL Changes ===\n');
    
    // Step 1: Start
    console.log('\n--- Step 1: Loading start page ---');
    await page.goto(
      'https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=XA4S2WKU7HYBHTWNKCPBIBDJ',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    await page.waitForTimeout(3000);
    
    console.log('\n--- Step 2: Select Any staff ---');
    await page.locator('[aria-label="Any staff"]').first().click().catch(() => {});
    await page.waitForTimeout(2000);
    
    console.log('\n--- Step 3: Click Add ---');
    await page.mouse.click(960, 1040);
    await page.waitForTimeout(2000);
    
    console.log('\n--- Step 4: Click Next ---');
    await page.mouse.click(1280, 317);
    await page.waitForTimeout(5000);
    
    console.log('\n--- Step 5: Check current state ---');
    const currentState = await page.evaluate(() => ({
      url: window.location.href,
      hasCalendar: document.body.innerText.includes('2026'),
      hasStaff: document.body.innerText.includes('Any staff')
    }));
    console.log('  URL:', currentState.url);
    console.log('  Has calendar:', currentState.hasCalendar);
    console.log('  Has staff section:', currentState.hasStaff);
    
    if (currentState.hasCalendar) {
      console.log('\n--- Step 6: Navigate to April ---');
      await page.mouse.click(1400, 200);
      await page.waitForTimeout(4000);
      
      const afterNav = await page.evaluate(() => ({
        url: window.location.href,
        hasApril: document.body.innerText.includes('Apr')
      }));
      console.log('  After nav URL:', afterNav.url);
      console.log('  Has April:', afterNav.hasApril);
      
      // Check for availability in URL
      if (afterNav.url.includes('availability')) {
        console.log('\n=== FOUND /availability IN URL ===');
      }
      
      // Click April 29
      console.log('\n--- Step 7: Click April 29 ---');
      const date29Status = await page.evaluate(() => {
        const btn = document.querySelector('market-button[data-testid="date-29"]');
        return btn ? { disabled: btn.disabled, found: true } : { found: false };
      });
      
      console.log('  April 29 found:', date29Status.found);
      console.log('  April 29 disabled:', date29Status.disabled);
      
      if (date29Status.found && !date29Status.disabled) {
        await page.evaluate(() => {
          document.querySelector('market-button[data-testid="date-29"]')?.click();
        });
        await page.waitForTimeout(5000);
        
        const finalUrl = page.url();
        console.log('\n  After clicking April 29 URL:', finalUrl);
        
        const times = await page.evaluate(() => {
          const t = document.body.innerText.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];
          return [...new Set(t)].sort();
        });
        console.log('  Times:', times);
      }
    }
    
    console.log('\n\n=== URL HISTORY ===');
    urls.forEach(u => console.log(`${u.step}. ${u.url}`));
    
    await page.screenshot({ 
      path: '/workspace/openclaw/logs/url_trace_final.png',
      fullPage: true 
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
