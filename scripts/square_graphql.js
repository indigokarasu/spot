const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Square GraphQL/REST API Extraction
 * Based on discovered endpoints from network capture
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

  try {
    console.log('=== Square API Discovery ===');
    
    // Try to hit the discovered endpoint directly
    const serviceUrl = 'https://my-business-102000-107381.square.site/app/square-sync/published/users/143340576/site/864887102346731255/appointments/services/L6SV5MCXN00CB?return_bookable=true';
    
    console.log('Fetching services data...');
    const response = await page.evaluate(async (url) => {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        return await res.text();
      } catch (e) {
        return { error: e.message };
      }
    }, serviceUrl);
    
    console.log('Response:', typeof response === 'string' ? response.slice(0, 500) : JSON.stringify(response).slice(0, 500));
    
    // Try to parse if it's JSON
    let parsedData;
    try {
      parsedData = JSON.parse(response);
      console.log('Parsed services data successfully');
    } catch (e) {
      console.log('Not JSON:', response.slice(0, 200));
    }
    
    // Now try to get availability
    // The booking page uses a different flow - let's try constructing availability URL
    const availabilityUrl = `https://app.squareup.com/appointments/api/v2/booking/availability`;
    
    console.log('\nTrying availability query...');
    const availResponse = await page.evaluate(async (url) => {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            location_id: 'L6SV5MCXN00CB',
            service_id: 'XA4S2WKU7HYBHTWNKCPBIBDJ',
            start_date: '2026-04-29',
            end_date: '2026-04-29'
          })
        });
        return { status: res.status, text: await res.text() };
      } catch (e) {
        return { error: e.message };
      }
    }, availabilityUrl);
    
    console.log('Availability response:', availResponse);
    
    // Save results
    const results = {
      serviceData: parsedData,
      availabilityResponse: availResponse,
      timestamp: new Date().toISOString()
    };
    
    await fs.promises.writeFile('/workspace/openclaw/logs/square_api_results.json', JSON.stringify(results, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
