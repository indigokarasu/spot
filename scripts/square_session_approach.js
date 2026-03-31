const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Square Session-Based Approach
 * Maintain session cookies and extract availability with auth tokens
 */

(async () => {
  const browser = await chromium.launch({
    headless: true,  // Back to headless
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  const page = await context.newPage();

  // Store all requests with their headers/cookies
  const requestLog = [];
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('square') && (url.includes('appointment') || url.includes('booking') || url.includes('availability'))) {
      requestLog.push({
        url: url,
        method: request.method(),
        headers: request.headers(),
        postData: request.postData()?.slice(0, 500)
      });
    }
  });

  try {
    console.log('Loading Square booking with visual mode...');
    
    // Step 1: Load the booking page
    await page.goto('https://square.site/book/L6SV5MCXN00CB/shade-nail-spa-san-francisco-ca', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    await page.waitForTimeout(3000);
    console.log('Step 1: Loaded. Waiting before clicking Let\'s go...');
    
    // Step 2: Click "Let's go"
    const letsGo = await page.locator('text="Let\'s go"').first();
    if (await letsGo.isVisible().catch(() => false)) {
      await letsGo.click();
      console.log('Step 2: Clicked Let\'s go');
    }
    await page.waitForTimeout(4000);
    
    // Step 3: Click Peppermint Pedi with multiple attempts
    console.log('Step 3: Selecting Peppermint Pedi...');
    await page.evaluate(() => window.scrollTo(0, 800));
    await page.waitForTimeout(1000);
    
    // Try clicking the exact text position
    const peppermintBtn = await page.locator('text="Peppermint Pedi"');
    const count = await peppermintBtn.count();
    console.log(`Found ${count} Peppermint Pedi elements`);
    
    for (let i = 0; i < Math.min(count, 3); i++) {
      const btn = peppermintBtn.nth(i);
      const visible = await btn.isVisible().catch(() => false);
      const enabled = await btn.isEnabled().catch(() => false);
      console.log(`  Element ${i}: visible=${visible}, enabled=${enabled}`);
      
      if (visible && enabled) {
        try {
          await btn.click({ force: true });
          console.log(`  Clicked element ${i}`);
          break;
        } catch (e) {
          console.log(`  Click failed: ${e.message}`);
        }
      }
    }
    await page.waitForTimeout(5000);
    
    // Step 4: Click Continue
    console.log('Step 4: Looking for Continue button...');
    const continueBtn = await page.locator('button:has-text("Continue")').first();
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
      console.log('Step 4: Clicked Continue');
    }
    await page.waitForTimeout(5000);
    
    // Step 5: Navigate to April
    console.log('Step 5: Navigating calendar...');
    const pageText = await page.locator('body').textContent();
    
    if (pageText.includes('March 2026') || pageText.includes('March')) {
      console.log('On March, looking for next month button...');
      
      // Try to find the right arrow button in the calendar header
      const buttons = await page.locator('button').all();
      for (const btn of buttons.slice(0, 20)) {
        const aria = await btn.getAttribute('aria-label').catch(() => '');
        if (aria.includes('Next') || aria.includes('next')) {
          console.log('Found next button:', aria);
          await btn.click();
          await page.waitForTimeout(3000);
          break;
        }
      }
    }
    
    // Step 6: Click date 29
    console.log('Step 6: Looking for date 29...');
    const dateButtons = await page.locator('button').all();
    
    for (const btn of dateButtons) {
      const text = await btn.textContent().catch(() => '');
      const trimmed = text.trim();
      
      if (trimmed === '29') {
        const enabled = await btn.isEnabled().catch(() => false);
        const disabled = await btn.evaluate(el => el.disabled).catch(() => true);
        const ariaDisabled = await btn.getAttribute('aria-disabled').catch(() => 'true');
        
        console.log(`Found date 29: enabled=${enabled}, disabled=${disabled}, aria-disabled=${ariaDisabled}`);
        
        if (!disabled && ariaDisabled !== 'true') {
          await btn.click();
          console.log('Step 6: Clicked date 29');
          await page.waitForTimeout(5000);
          break;
        } else {
          console.log('Date 29 is disabled (not available)');
        }
      }
    }
    
    // Step 7: Extract time slots
    console.log('Step 7: Extracting time slots...');
    await page.waitForTimeout(3000);
    
    const timeElements = await page.locator('button').all();
    const times = [];
    
    for (const el of timeElements.slice(0, 30)) {
      const text = await el.textContent().catch(() => '');
      const trimmed = text.trim();
      
      if (trimmed.match(/^\d{1,2}:\d{2}\s*[AP]M$/)) {
        times.push(trimmed);
      }
    }
    
    const evening = times.filter(t => {
      const match = t.match(/(\d{1,2}):/);
      const period = t.match(/(AM|PM)/);
      if (match && period) {
        let hour = parseInt(match[1]);
        if (period[1] === 'PM' && hour !== 12) hour += 12;
        return hour >= 17 && hour <= 19;
      }
      return false;
    });
    
    console.log('\n=== RESULTS ===');
    console.log('All times:', times);
    console.log('Evening (5-7 PM):', evening);
    
    // Save request log with auth headers
    await fs.promises.writeFile('/workspace/openclaw/logs/square_session_requests.json', JSON.stringify({
      times: times,
      evening: evening,
      requests: requestLog
    }, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
