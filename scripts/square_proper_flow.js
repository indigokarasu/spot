const { chromium } = require('playwright');

/**
 * Square booking - proper flow with staff selection
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
    console.log('Loading...');
    await page.goto('https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=XA4S2WKU7HYBHTWNKCPBIBDJ', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForTimeout(5000);
    
    // Step 1: Select "Any staff"
    console.log('Step 1: Selecting "Any staff"...');
    
    const staffRow = await page.locator('market-row').filter({ hasText: 'Any staff' }).first();
    const staffCount = await page.locator('market-row').count();
    console.log(`Found ${staffCount} market-row elements`);
    
    // Try clicking the staff row
    const anyStaff = await page.evaluate(() => {
      const rows = document.querySelectorAll('market-row');
      for (const row of rows) {
        const text = row.textContent?.trim() || '';
        if (text.includes('Any staff')) {
          // Check if it has a radio button or is clickable
          const shadow = row.shadowRoot;
          return { found: true, text: text.substring(0, 50) };
        }
      }
      return { found: false };
    });
    
    console.log('Any staff element:', anyStaff);
    
    // Try clicking at the "Any staff" position
    await page.mouse.click(960, 374);
    await page.waitForTimeout(2000);
    
    // Check if there's a visual selection indicator
    await page.screenshot({ path: '/workspace/openclaw/logs/sq_after_staff.png', fullPage: true });
    
    // Step 2: Try to find and click the Add button
    console.log('Step 2: Clicking Add...');
    
    // The Add button might be at the bottom
    const addBtn = await page.locator('market-button').filter({ hasText: 'Add' }).first();
    const addVisible = await addBtn.isVisible().catch(() => false);
    console.log('Add button visible:', addVisible);
    
    if (addVisible) {
      await addBtn.click();
      await page.waitForTimeout(5000);
    } else {
      // Try coordinate click
      await page.mouse.click(960, 1040);
      await page.waitForTimeout(5000);
    }
    
    await page.screenshot({ path: '/workspace/openclaw/logs/sq_after_add.png', fullPage: true });
    
    // Check current URL and page state
    const info = await page.evaluate(() => ({
      url: window.location.href,
      text: document.body.innerText.substring(0, 500)
    }));
    
    console.log('\nAfter Add click:');
    console.log('URL:', info.url);
    console.log('Text:', info.text);
    
    // If we're on calendar page, try to navigate
    if (info.text.includes('2026') || info.text.includes('March') || info.text.includes('April')) {
      console.log('On calendar page!');
      
      // Find and click date 29
      const dates = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        const results = [];
        
        buttons.forEach(btn => {
          const text = btn.textContent?.trim();
          const disabled = btn.disabled || btn.getAttribute('aria-disabled') === 'true';
          const rect = btn.getBoundingClientRect();
          
          if (text === '29' && !disabled) {
            results.push({
              x: rect.x + rect.width/2,
              y: rect.y + rect.height/2
            });
          }
        });
        
        return results;
      });
      
      if (dates.length > 0) {
        console.log('Clicking date 29...');
        await page.mouse.click(dates[0].x, dates[0].y);
        await page.waitForTimeout(5000);
        
        await page.screenshot({ path: '/workspace/openclaw/logs/sq_timeslots.png', fullPage: true });
        
        // Extract times
        const times = await page.evaluate(() => {
          const text = document.body.innerText;
          const matches = text.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];
          return [...new Set(matches)];
        });
        
        console.log('\n=== TIME SLOTS ===');
        console.log(times.join('\n'));
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
