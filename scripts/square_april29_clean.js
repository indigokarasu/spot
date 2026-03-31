const { chromium } = require('playwright');

/**
 * Clean test for April 29 availability
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
    console.log('=== Clean Test: April 29 ===\n');
    
    // Load with confirmed service ID
    await page.goto(
      'https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=XA4S2WKU7HYBHTWNKCPBIBDJ',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    await page.waitForTimeout(5000);
    
    // Check initial state
    const initial = await page.evaluate(() => ({
      url: window.location.href,
      hasStaffSection: document.body.innerText.includes('Any staff'),
      hasPeppermint: document.body.innerText.includes('Peppermint Pedi')
    }));
    
    console.log('Initial state:');
    console.log('  URL:', initial.url);
    console.log('  Has staff section:', initial.hasStaffSection);
    console.log('  Has Peppermint Pedi:', initial.hasPeppermint);
    
    // Step 1: Select "Any staff"
    console.log('\nStep 1: Select Any staff...');
    const staffBtn = await page.locator('[aria-label="Any staff"]').first();
    const staffVisible = await staffBtn.isVisible().catch(() => false);
    
    if (staffVisible) {
      await staffBtn.click();
      console.log('  ✓ Selected via aria-label');
    } else {
      // Look for any staff option
      const allRadios = await page.locator('market-radio').all();
      console.log(`  Found ${allRadios.length} radio buttons`);
      
      for (const radio of allRadios.slice(0, 3)) {
        const aria = await radio.getAttribute('aria-label').catch(() => '');
        console.log(`    Option: ${aria}`);
      }
      
      if (allRadios.length > 0) {
        await allRadios[0].click();
        console.log('  ✓ Selected first option');
      }
    }
    await page.waitForTimeout(2000);
    
    // Step 2: Click "Add"
    console.log('\nStep 2: Click Add...');
    const addBtn = await page.locator('[aria-label="Add"]').first();
    const addVisible = await addBtn.isVisible().catch(() => false);
    
    if (addVisible) {
      await addBtn.click();
      console.log('  ✓ Clicked Add via aria-label');
    } else {
      await page.mouse.click(960, 1040);
      console.log('  ✓ Clicked Add via coordinates');
    }
    await page.waitForTimeout(2000);
    
    // Step 3: Click "Next"
    console.log('\nStep 3: Click Next...');
    const nextBtn = await page.locator('[aria-label="Next"]').first();
    const nextVisible = await nextBtn.isVisible().catch(() => false);
    
    if (nextVisible) {
      await nextBtn.click();
      console.log('  ✓ Clicked Next via aria-label');
    } else {
      await page.mouse.click(1280, 317);
      console.log('  ✓ Clicked Next via coordinates');
    }
    await page.waitForTimeout(5000);
    
    // Check calendar state
    const calendarState = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasCalendar: text.includes('2026'),
        hasMarch: text.includes('Mar'),
        hasApril: text.includes('Apr'),
        hasAprilFull: text.includes('April')
      };
    });
    
    console.log('\nCalendar state:');
    console.log('  Has calendar:', calendarState.hasCalendar);
    console.log('  Has March:', calendarState.hasMarch);
    console.log('  Has April:', calendarState.hasApril);
    console.log('  Has April (full):', calendarState.hasAprilFull);
    
    // Navigate to April if needed
    if (calendarState.hasMarch && !calendarState.hasApril) {
      console.log('\n  Navigating to April...');
      await page.mouse.click(1400, 200);
      await page.waitForTimeout(4000);
    }
    
    await page.screenshot({ path: '/workspace/openclaw/logs/april29_test_calendar.png' });
    
    // Check all dates
    console.log('\nStep 4: Check all April dates...');
    const allDates = await page.evaluate(() => {
      const buttons = document.querySelectorAll('market-button[data-testid^="date-"]');
      return Array.from(buttons).map(btn => {
        const testId = btn.getAttribute('data-testid');
        const day = parseInt(testId.replace('date-', ''));
        const disabled = btn.disabled || btn.getAttribute('aria-disabled') === 'true';
        
        return {
          day,
          disabled,
          available: !disabled,
          rect: btn.getBoundingClientRect()
        };
      });
    });
    
    console.log(`  Found ${allDates.length} date buttons`);
    
    // Group by month (approximate based on typical calendar layout)
    const aprilDates = allDates.filter(d => d.day >= 1 && d.day <= 30);
    const mayDates = allDates.filter(d => d.day >= 1 && d.day <= 10 && !aprilDates.find(ad => ad.day === d.day));
    
    console.log('\n  April dates:');
    aprilDates.forEach(d => {
      console.log(`    ${d.day}: ${d.available ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
    });
    
    // Specifically check April 29
    const april29 = aprilDates.find(d => d.day === 29);
    console.log('\n  April 29 specific:');
    if (april29) {
      console.log(`    Status: ${april29.available ? 'AVAILABLE' : 'NOT AVAILABLE'}`);
      console.log(`    Disabled: ${april29.disabled}`);
      
      if (april29.available) {
        // Try to click it
        console.log('\nStep 5: Clicking April 29...');
        await page.evaluate(() => {
          const btn = document.querySelector('market-button[data-testid="date-29"]');
          if (btn) btn.click();
        });
        await page.waitForTimeout(5000);
        
        await page.screenshot({ path: '/workspace/openclaw/logs/april29_test_after_click.png' });
        
        // Extract times
        const times = await page.evaluate(() => {
          const text = document.body.innerText;
          return [...new Set((text.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || []))].sort();
        });
        
        console.log('  Available times:', times);
      }
    } else {
      console.log('    Date 29 not found in calendar!');
    }
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
