const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1920,1080'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  // Intercept API calls to capture availability data
  const availabilityData = [];
  
  await context.route('**/*', (route, request) => {
    const url = request.url();
    if (url.includes('availability') || url.includes('dates') || url.includes('times')) {
      console.log('Intercepting:', url);
      route.continue().then(async () => {
        try {
          const response = await request.response();
          if (response) {
            const body = await response.text();
            availabilityData.push({ url, body: body.slice(0, 5000) });
          }
        } catch (e) {}
      });
    } else {
      route.continue();
    }
  });

  const page = await context.newPage();

  try {
    // Go directly to Acuity Scheduling
    console.log('Navigating to raksa.as.me...');
    await page.goto('https://raksa.as.me/', { waitUntil: 'networkidle', timeout: 30000 });
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);
    
    // Step 1: Find and click on Anya
    console.log('Looking for Anya...');
    const anyaSelector = await page.locator('text=/Anya/i, [data-testid*="Anya"], .staff-item:has-text("Anya"), button:has-text("Anya")').first();
    
    if (await anyaSelector.isVisible().catch(() => false)) {
      console.log('Found Anya, clicking...');
      await anyaSelector.click();
      await page.waitForTimeout(2000);
    } else {
      // Try looking for "Patrick and Anya" category
      const patrickAnya = await page.locator('text=/Patrick and Anya/i, .category-header:has-text("Patrick and Anya")').first();
      if (await patrickAnya.isVisible().catch(() => false)) {
        console.log('Found Patrick and Anya category');
        await patrickAnya.click();
        await page.waitForTimeout(2000);
      }
    }

    // Step 2: Find and click Thai Aroma 90 mins
    console.log('Looking for Thai Aroma 90 mins...');
    const serviceSelector = await page.locator('text=/Thai Aroma.*90/i, .service-item:has-text("Thai Aroma"):has-text("90"), button:has-text("Thai Aroma")').first();
    
    if (await serviceSelector.isVisible().catch(() => false)) {
      console.log('Found Thai Aroma 90 mins, clicking...');
      await serviceSelector.click();
      await page.waitForTimeout(3000);
    }

    // Step 3: Wait for calendar to load and take screenshot
    console.log('Waiting for calendar...');
    await page.waitForTimeout(5000);
    
    // Look for calendar elements
    const calendarExists = await page.locator('.calendar, [class*="calendar"], .datepicker, [class*="datepicker"], .availability-calendar').count() > 0;
    console.log('Calendar found:', calendarExists);

    // Get page content
    const html = await page.content();
    await fs.promises.writeFile('/workspace/openclaw/logs/raksa_calendar.html', html);
    
    // Take screenshot
    await page.screenshot({ path: '/workspace/openclaw/logs/raksa_calendar.png', fullPage: true });
    
    // Try to extract visible dates/times
    const dateElements = await page.locator('.calendar-day, .date-cell, [class*="day"], [class*="date"]').all();
    console.log('Found', dateElements.length, 'date elements');
    
    const dates = [];
    for (const el of dateElements.slice(0, 20)) {
      const text = await el.textContent().catch(() => '');
      const className = await el.getAttribute('class').catch(() => '');
      if (text.trim()) {
        dates.push({ text: text.trim(), class: className });
      }
    }

    // Look for time slots
    const timeElements = await page.locator('.time-slot, .time-cell, button:has-text(":"), [class*="time"]').all();
    console.log('Found', timeElements.length, 'time elements');
    
    const times = [];
    for (const el of timeElements.slice(0, 30)) {
      const text = await el.textContent().catch(() => '');
      if (text.includes(':') || text.includes('AM') || text.includes('PM')) {
        times.push(text.trim());
      }
    }

    // Save results
    const results = {
      url: page.url(),
      datesAvailable: dates,
      timeSlots: times,
      interceptedCalls: availabilityData.map(d => ({ url: d.url, preview: d.body.slice(0, 500) }))
    };
    
    await fs.promises.writeFile('/workspace/openclaw/logs/raksa_results.json', JSON.stringify(results, null, 2));
    
    console.log('\n=== Results ===');
    console.log('Current URL:', page.url());
    console.log('Dates found:', dates.length);
    console.log('Times found:', times.length);
    console.log('API calls intercepted:', availabilityData.length);
    console.log('\nData saved to /workspace/openclaw/logs/');

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/raksa_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
