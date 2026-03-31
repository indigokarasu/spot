const { chromium } = require('playwright');

/**
 * Comprehensive April 29 diagnostic
 * Test multiple configurations to find the discrepancy
 */

async function testConfig(name, config) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST: ${name}`);
  console.log('='.repeat(60));
  
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext(config);
  const page = await context.newPage();

  try {
    // Load booking page
    await page.goto(
      'https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=XA4S2WKU7HYBHTWNKCPBIBDJ',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    await page.waitForTimeout(5000);
    
    // Get initial page info
    const initialInfo = await page.evaluate(() => ({
      url: window.location.href,
      userAgent: navigator.userAgent,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hasPeppermint: document.body.innerText.includes('Peppermint Pedi'),
      hasStaff: document.body.innerText.includes('Any staff')
    }));
    
    console.log('  User Agent:', initialInfo.userAgent.substring(0, 80));
    console.log('  Timezone:', initialInfo.timezone);
    console.log('  Has Peppermint:', initialInfo.hasPeppermint);
    console.log('  Has Staff:', initialInfo.hasStaff);
    
    // Navigate through booking flow
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
    
    // Detailed check of April 29
    console.log('\n  Checking April 29...');
    
    const date29Info = await page.evaluate(() => {
      const btn = document.querySelector('market-button[data-testid="date-29"]');
      if (!btn) return { found: false };
      
      return {
        found: true,
        disabled: btn.disabled,
        ariaDisabled: btn.getAttribute('aria-disabled'),
        className: btn.className,
        text: btn.textContent?.trim(),
        innerHTML: btn.innerHTML?.substring(0, 200),
        rect: btn.getBoundingClientRect(),
        attributes: Array.from(btn.attributes).map(a => `${a.name}=${a.value}`).slice(0, 10)
      };
    });
    
    console.log('    Found:', date29Info.found);
    if (date29Info.found) {
      console.log('    Disabled:', date29Info.disabled);
      console.log('    aria-disabled:', date29Info.ariaDisabled);
      console.log('    Class:', date29Info.className?.substring(0, 100));
      console.log('    Text:', date29Info.text);
      console.log('    Attributes:', date29Info.attributes);
    }
    
    // Try to click April 29 anyway
    console.log('\n  Attempting to click April 29...');
    await page.evaluate(() => {
      const btn = document.querySelector('market-button[data-testid="date-29"]');
      if (btn) {
        // Try multiple click methods
        btn.click();
        btn.dispatchEvent(new Event('click', { bubbles: true }));
        btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
        btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
      }
    });
    await page.waitForTimeout(3000);
    
    // Check if times appeared
    const afterClick = await page.evaluate(() => {
      const text = document.body.innerText;
      const times = text.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];
      return {
        hasTimes: times.length > 0,
        times: [...new Set(times)].slice(0, 10),
        textSample: text.substring(0, 500)
      };
    });
    
    console.log('    Times found:', afterClick.hasTimes);
    if (afterClick.hasTimes) {
      console.log('    Times:', afterClick.times);
    }
    
    // Get screenshot
    await page.screenshot({ 
      path: `/workspace/openclaw/logs/test_${name.replace(/\s+/g, '_')}.png`,
      fullPage: true 
    });
    
    console.log('    Screenshot saved');
    
    return {
      config: name,
      found: date29Info.found,
      disabled: date29Info.disabled,
      hasTimes: afterClick.hasTimes,
      times: afterClick.times
    };
    
  } catch (error) {
    console.error('  Error:', error.message);
    return { config: name, error: error.message };
  } finally {
    await browser.close();
  }
}

(async () => {
  console.log('=== April 29 Diagnostic Suite ===\n');
  
  const results = [];
  
  // Test 1: Standard desktop
  results.push(await testConfig('Standard Desktop', {
    viewport: { width: 1920, height: 1080 }
  }));
  
  // Test 2: Mobile user agent
  results.push(await testConfig('Mobile iPhone', {
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  }));
  
  // Test 3: Different timezone
  results.push(await testConfig('UTC Timezone', {
    viewport: { width: 1920, height: 1080 },
    timezoneId: 'UTC'
  }));
  
  // Test 4: With locale
  results.push(await testConfig('en-US Locale', {
    viewport: { width: 1920, height: 1080 },
    locale: 'en-US'
  }));
  
  // Test 5: Private/incognito mode (fresh context each time)
  results.push(await testConfig('Fresh Session', {
    viewport: { width: 1920, height: 1080 }
  }));
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  
  results.forEach(r => {
    console.log(`\n${r.config}:`);
    if (r.error) {
      console.log('  ERROR:', r.error);
    } else {
      console.log('  Found:', r.found);
      console.log('  Disabled:', r.disabled);
      console.log('  Has times:', r.hasTimes);
      if (r.times?.length > 0) {
        console.log('  Times:', r.times.join(', '));
      }
    }
  });
  
  console.log('\n' + '='.repeat(60));
  
})();
