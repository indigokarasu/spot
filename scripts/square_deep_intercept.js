const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Deep Square Interception - Capture the actual availability API call
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

  // Intercept ALL responses
  const responses = [];
  page.on('response', async response => {
    const url = response.url();
    
    // Check for availability-related responses
    if (url.includes('square') && 
        (url.includes('availability') || url.includes('appointment') || url.includes('booking') ||
         url.includes('service') || url.includes('schedule') || url.includes('timeslot'))) {
      
      try {
        const body = await response.text();
        responses.push({
          url: url,
          status: response.status(),
          preview: body.slice(0, 2000)
        });
        console.log(`\n=== Response from ${url} ===`);
        console.log(body.slice(0, 500));
      } catch (e) {
        // Binary or non-text response
      }
    }
  });

  try {
    // Load booking page with full interaction
    console.log('Loading booking page...');
    await page.goto('https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=XA4S2WKU7HYBHTWNKCPBIBDJ', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    await page.waitForTimeout(3000);
    
    // Click through the flow
    console.log('Clicking Let\'s go...');
    await page.click('button:has-text("Let\'s go")').catch(() => console.log('No Let\'s go button'));
    await page.waitForTimeout(3000);
    
    // Find and click Peppermint Pedi
    console.log('Selecting Peppermint Pedi...');
    const pep = await page.locator('text="Peppermint Pedi"').first();
    await pep.click({ force: true }).catch(() => console.log('Could not click Peppermint Pedi'));
    await page.waitForTimeout(3000);
    
    // Click Continue
    console.log('Clicking Continue...');
    await page.click('button:has-text("Continue")').catch(() => console.log('No Continue button'));
    await page.waitForTimeout(5000);
    
    // Look for time slots
    const pageText = await page.locator('body').textContent();
    console.log('\n=== Page text containing "AM" or "PM" ===');
    const timeMatches = pageText.match(/\d{1,2}:\d{2}\s*[AP]M/g);
    if (timeMatches) {
      console.log('Times found:', [...new Set(timeMatches)].slice(0, 20));
    }
    
    // Check localStorage/sessionStorage
    console.log('\n=== Checking storage...');
    const localStorage = await page.evaluate(() => JSON.stringify(localStorage));
    const sessionStorage = await page.evaluate(() => JSON.stringify(sessionStorage));
    
    // Look for availability data in storage
    if (localStorage.includes('availability') || localStorage.includes('timeslot')) {
      console.log('localStorage contains availability data');
    }
    if (sessionStorage.includes('availability') || sessionStorage.includes('timeslot')) {
      console.log('sessionStorage contains availability data');
    }
    
    // Save all responses
    await fs.promises.writeFile('/workspace/openclaw/logs/square_deep_intercept.json', JSON.stringify({
      responses: responses,
      localStorage: localStorage.slice(0, 5000),
      sessionStorage: sessionStorage.slice(0, 5000)
    }, null, 2));
    
    console.log('\n=== Saved to square_deep_intercept.json ===');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
