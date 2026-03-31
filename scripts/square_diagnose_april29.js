const { chromium } = require('playwright');

/**
 * Diagnose April 29 availability discrepancy
 * Check multiple service variations and conditions
 */

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US',
    timezoneId: 'America/Los_Angeles'
  });

  const page = await context.newPage();

  try {
    console.log('=== Diagnosing April 29 Availability ===\n');
    
    // Test 1: Check what happens with NO service_id pre-selected
    console.log('Test 1: Loading without service_id...');
    await page.goto('https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(4000);
    
    const pageInfo = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3'));
      return {
        headings: headings.map(h => h.textContent?.trim()).slice(0, 5),
        url: window.location.href,
        hasPeppermint: document.body.innerText.includes('Peppermint Pedi'),
        services: Array.from(new Set(
          Array.from(document.querySelectorAll('market-row, market-list-item'))
            .map(el => el.textContent?.trim())
            .filter(t => t && t.length > 5)
        )).slice(0, 10)
      };
    });
    
    console.log('  URL:', pageInfo.url);
    console.log('  Headings:', pageInfo.headings);
    console.log('  Has Peppermint Pedi:', pageInfo.hasPeppermint);
    console.log('  Services found:', pageInfo.services);
    
    // If on service selection page, try clicking Peppermint Pedi manually
    if (!pageInfo.hasPeppermint) {
      // Look for service list
      const services = await page.locator('market-row, market-list-item').all();
      console.log(`\n  Found ${services.length} service elements`);
      
      for (const svc of services.slice(0, 5)) {
        const text = await svc.textContent().catch(() => '');
        console.log(`    Service: ${text.substring(0, 50)}`);
        if (text.toLowerCase().includes('peppermint')) {
          console.log('    ^ Clicking Peppermint Pedi');
          await svc.click();
          await page.waitForTimeout(3000);
          break;
        }
      }
    }
    
    // Continue with the flow
    console.log('\nTest 2: Continuing flow with selected service...');
    
    // Select any staff
    const staffSelected = await page.evaluate(() => {
      const btn = document.querySelector('[aria-label="Any staff"]');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('  Staff selected:', staffSelected);
    await page.waitForTimeout(1500);
    
    // Click Add
    await page.mouse.click(960, 1040);
    await page.waitForTimeout(1500);
    
    // Click Next
    await page.mouse.click(1280, 317);
    await page.waitForTimeout(4000);
    
    await page.screenshot({ path: '/workspace/openclaw/logs/diag_start.png', fullPage: true });
    
    // Navigate to April
    const pageText = await page.locator('body').textContent();
    if (pageText.includes('Mar') && !pageText.includes('Apr')) {
      console.log('\n  Navigating to April...');
      await page.mouse.click(1400, 200);
      await page.waitForTimeout(4000);
    }
    
    // Check ALL dates status
    console.log('\nTest 3: Checking ALL date statuses in April...');
    const allDates = await page.evaluate(() => {
      const buttons = document.querySelectorAll('market-button[data-testid^="date-"]');
      return Array.from(buttons).map(btn => {
        const testId = btn.getAttribute('data-testid');
        const day = parseInt(testId.replace('date-', ''));
        const disabled = btn.disabled;
        const ariaDisabled = btn.getAttribute('aria-disabled');
        const classList = btn.className;
        const text = btn.textContent?.trim();
        
        return {
          day,
          disabled,
          ariaDisabled,
          classList: classList?.substring(0, 100),
          text
        };
      });
    });
    
    console.log('\n  All date buttons:');
    allDates.forEach(d => {
      const status = d.disabled || d.ariaDisabled === 'true' ? 'NOT AVAILABLE' : 'AVAILABLE';
      console.log(`    ${d.day}: ${status}`);
      if (d.day === 29) {
        console.log(`      Details: disabled=${d.disabled}, ariaDisabled=${d.ariaDisabled}, text="${d.text}"`);
      }
    });
    
    // Specifically check April 29
    const date29 = allDates.find(d => d.day === 29);
    console.log('\n  April 29 analysis:');
    console.log('    Is disabled:', date29?.disabled);
    console.log('    aria-disabled:', date29?.ariaDisabled);
    console.log('    Text content:', date29?.text);
    console.log('    Class list:', date29?.classList);
    
    // Take screenshot focused on calendar
    await page.screenshot({ path: '/workspace/openclaw/logs/diag_april_calendar.png', fullPage: true });
    
    // Test 4: Try different service IDs
    console.log('\nTest 4: Testing with different service configurations...');
    
    // Check current URL for service_id
    const currentUrl = page.url();
    console.log('  Current URL:', currentUrl);
    
    // Look for service ID in URL
    const serviceMatch = currentUrl.match(/service_id=([^&]+)/);
    console.log('  Service ID from URL:', serviceMatch ? serviceMatch[1] : 'Not found');
    
    // Test 5: Try clicking April 29 anyway to see what happens
    console.log('\nTest 5: Attempting to click April 29 anyway...');
    const clickResult = await page.evaluate(() => {
      const btn = document.querySelector('market-button[data-testid="date-29"]');
      if (btn) {
        const before = document.body.innerText.substring(0, 200);
        btn.click();
        return { clicked: true, beforeText: before };
      }
      return { clicked: false };
    });
    
    console.log('  Click result:', clickResult);
    
    if (clickResult.clicked) {
      await page.waitForTimeout(3000);
      const afterText = await page.evaluate(() => document.body.innerText.substring(0, 500));
      console.log('  After click text:', afterText);
      
      // Check for times
      const times = (afterText.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || []);
      console.log('  Times found:', times);
    }
    
    await page.screenshot({ path: '/workspace/openclaw/logs/diag_after_click.png', fullPage: true });
    
    console.log('\n=== Diagnosis Complete ===');
    console.log('Screenshots saved:');
    console.log('  - diag_start.png');
    console.log('  - diag_april_calendar.png');
    console.log('  - diag_after_click.png');
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/diag_error.png' });
  } finally {
    await browser.close();
  }
})();
