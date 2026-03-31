const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Square Booking - Network Interception Strategy
 * Capture actual API calls Square makes for availability
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

  // Collect all network requests
  const networkLog = [];
  
  page.on('request', request => {
    const url = request.url();
    if (url.includes('square') && (url.includes('api') || url.includes('booking') || url.includes('appointment'))) {
      networkLog.push({
        type: 'request',
        url: url,
        method: request.method(),
        postData: request.postData()?.slice(0, 500)
      });
    }
  });
  
  page.on('response', async response => {
    const url = response.url();
    if (url.includes('square') && (url.includes('api') || url.includes('booking'))) {
      try {
        const body = await response.text();
        networkLog.push({
          type: 'response',
          url: url,
          status: response.status(),
          preview: body.slice(0, 2000)
        });
      } catch (e) {}
    }
  });

  try {
    console.log('Loading and intercepting...');
    
    // Load the booking flow
    await page.goto('https://book.squareup.com/appointments/zhyuoylr81g79j/location/L6SV5MCXN00CB/services/XA4S2WKU7HYBHTWNKCPBIBDJ', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    await page.waitForTimeout(5000);
    
    // Try to trigger availability loading by clicking a date
    // First get current calendar state
    const calendarData = await page.evaluate(() => {
      // Look for React component data in the DOM
      const elements = document.querySelectorAll('[data-testid]');
      const data = [];
      elements.forEach(el => {
        data.push({
          testId: el.getAttribute('data-testid'),
          text: el.textContent?.slice(0, 50)
        });
      });
      return data;
    });
    
    console.log('Calendar elements:', calendarData.slice(0, 10));
    
    // Look for available dates
    const availableDates = await page.evaluate(() => {
      const dates = [];
      const buttons = document.querySelectorAll('button');
      buttons.forEach(btn => {
        const text = btn.textContent?.trim();
        const aria = btn.getAttribute('aria-label');
        if (text && /^\d{1,2}$/.test(text)) {
          dates.push({
            day: text,
            ariaLabel: aria,
            disabled: btn.disabled,
            className: btn.className?.slice(0, 50)
          });
        }
      });
      return dates;
    });
    
    console.log('Available dates:', availableDates);
    
    // Save everything
    const results = {
      networkLog: networkLog,
      calendarData: calendarData,
      availableDates: availableDates,
      timestamp: new Date().toISOString()
    };
    
    await fs.promises.writeFile('/workspace/openclaw/logs/square_network.json', JSON.stringify(results, null, 2));
    await page.screenshot({ path: '/workspace/openclaw/logs/square_network.png' });
    
    console.log('Saved network log with', networkLog.length, 'entries');
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/square_network_error.png' });
    await fs.promises.writeFile('/workspace/openclaw/logs/square_network.json', JSON.stringify({ error: error.message, log: networkLog }, null, 2));
  } finally {
    await browser.close();
  }
})();
