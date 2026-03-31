const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Square Network Interception - Same approach as Acuity
 * Capture actual API calls Square's React app makes
 */

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  const page = await context.newPage();

  // Capture ALL network requests and responses
  const networkData = {
    requests: [],
    responses: [],
    availabilityEndpoints: []
  };

  // Intercept requests
  page.on('request', request => {
    const url = request.url();
    const postData = request.postData();
    
    // Capture all Square/Squareup requests
    if (url.includes('square') || url.includes('squareup')) {
      networkData.requests.push({
        url: url,
        method: request.method(),
        headers: request.headers(),
        postData: postData?.slice(0, 1000)
      });
    }
  });

  // Intercept responses
  page.on('response', async response => {
    const url = response.url();
    
    if (url.includes('square') || url.includes('squareup')) {
      try {
        const body = await response.text();
        
        // Check if this is availability data
        const isAvailability = body.includes('availability') || 
                              body.includes('2026-04') || 
                              body.includes('time') && body.includes('slot');
        
        if (isAvailability) {
          networkData.availabilityEndpoints.push({
            url: url,
            preview: body.slice(0, 2000)
          });
        }
        
        networkData.responses.push({
          url: url.slice(0, 200),
          status: response.status(),
          isAvailability: isAvailability,
          preview: body.slice(0, 500)
        });
      } catch (e) {}
    }
  });

  try {
    console.log('Starting network interception...');
    
    // Step 1: Load booking page
    await page.goto('https://square.site/book/L6SV5MCXN00CB/shade-nail-spa-san-francisco-ca', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    await page.waitForTimeout(5000);
    console.log('✓ Loaded page 1');
    
    // Step 2: Click "Let's go"
    const letsGo = await page.locator('text="Let\'s go"').first();
    if (await letsGo.isVisible().catch(() => false)) {
      await letsGo.click();
      console.log('✓ Clicked Let\'s go');
    }
    await page.waitForTimeout(5000);
    
    // Step 3: Select Peppermint Pedi
    await page.evaluate(() => window.scrollTo(0, 600));
    await page.waitForTimeout(1000);
    
    const peppermint = await page.locator('text="Peppermint Pedi"').first();
    if (await peppermint.isVisible().catch(() => false)) {
      await peppermint.click();
      console.log('✓ Selected Peppermint Pedi');
    }
    await page.waitForTimeout(5000);
    
    // Step 4: Click Continue
    const continueBtn = await page.locator('button:has-text("Continue")').first();
    if (await continueBtn.isVisible().catch(() => false)) {
      await continueBtn.click();
      console.log('✓ Clicked Continue');
    }
    await page.waitForTimeout(5000);
    
    // Step 5: Navigate to April (click next month)
    console.log('Looking for next month button...');
    await page.screenshot({ path: '/workspace/openclaw/logs/square_net_calendar.png' });
    
    // Try to find and click the next month arrow
    const nextArrow = await page.locator('button[aria-label*="Next"], button:has("")').nth(1);
    if (await nextArrow.isVisible().catch(() => false)) {
      await nextArrow.click();
      console.log('✓ Clicked next month');
    }
    await page.waitForTimeout(5000);
    
    // Step 6: Click April 29
    const date29 = await page.locator('button:has-text("29")').first();
    if (await date29.isVisible().catch(() => false)) {
      const enabled = await date29.isEnabled().catch(() => false);
      if (enabled) {
        await date29.click();
        console.log('✓ Clicked April 29');
      }
    }
    await page.waitForTimeout(5000);
    
    // Step 7: Wait for time slots to load and capture all network traffic
    console.log('Capturing time slot data...');
    await page.waitForTimeout(5000);
    
    // Extract time slots from page
    const times = await page.evaluate(() => {
      const slots = [];
      document.querySelectorAll('button').forEach(btn => {
        const text = btn.textContent?.trim();
        if (text && text.match(/^\d{1,2}:\d{2}\s*[AP]M$/)) {
          slots.push(text);
        }
      });
      return slots;
    });
    
    console.log('Time slots found:', times);
    
    // Save all network data
    const results = {
      timeSlots: times,
      requests: networkData.requests.slice(0, 50),
      responses: networkData.responses.filter(r => r.isAvailability),
      availabilityEndpoints: networkData.availabilityEndpoints,
      timestamp: new Date().toISOString()
    };
    
    await fs.promises.writeFile('/workspace/openclaw/logs/square_network_full.json', JSON.stringify(results, null, 2));
    
    console.log('\n=== Network Capture Complete ===');
    console.log('Total requests:', networkData.requests.length);
    console.log('Total responses:', networkData.responses.length);
    console.log('Availability endpoints:', networkData.availabilityEndpoints.length);
    
    if (networkData.availabilityEndpoints.length > 0) {
      console.log('\n=== Found API Endpoints ===');
      networkData.availabilityEndpoints.forEach((ep, i) => {
        console.log(`${i + 1}. ${ep.url.slice(0, 100)}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/square_net_error.png' });
  } finally {
    // Save whatever we captured
    await fs.promises.writeFile('/workspace/openclaw/logs/square_network_all.json', JSON.stringify(networkData, null, 2));
    await browser.close();
  }
})();
