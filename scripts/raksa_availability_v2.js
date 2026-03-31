const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  // Intercept network requests to capture availability data
  const availabilityData = [];
  await context.route('**/*', async (route, request) => {
    const url = request.url();
    if (url.includes('availability') || url.includes('api') || url.includes('schedule')) {
      console.log('Intercepting:', url.slice(0, 100));
      route.continue();
      try {
        const response = await request.response();
        if (response) {
          const body = await response.text();
          if (body.length < 10000) {
            availabilityData.push({ url: url.slice(0, 100), body: body.slice(0, 1000) });
          }
        }
      } catch (e) {}
    } else {
      route.continue();
    }
  });

  const page = await context.newPage();

  try {
    // Step 1: Navigate to Acuity Scheduling
    console.log('Navigating to Acuity Scheduling...');
    await page.goto('https://raksa.as.me/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    // Step 2: Click "Patrick and Anya" category
    console.log('Looking for Patrick and Anya category...');
    const patrickAnyaButton = await page.locator('button:has-text("Patrick and Anya"), text="Patrick and Anya"').first();
    
    if (await patrickAnyaButton.isVisible().catch(() => false)) {
      console.log('Found Patrick and Anya, clicking...');
      await patrickAnyaButton.click();
      await page.waitForTimeout(3000);
    } else {
      // Try alternative selector
      const allButtons = await page.locator('button').all();
      for (const btn of allButtons) {
        const text = await btn.textContent().catch(() => '');
        if (text.includes('Patrick and Anya')) {
          console.log('Found via text search, clicking...');
          await btn.click();
          await page.waitForTimeout(3000);
          break;
        }
      }
    }

    // Step 3: Look for Thai Aroma 90 MINS
    console.log('Looking for Thai Aroma 90 MINS...');
    const thaiAromaButton = await page.locator('button:has-text("THAI AROMA"), text=/THAI AROMA.*90/i').first();
    
    if (await thaiAromaButton.isVisible().catch(() => false)) {
      console.log('Found Thai Aroma 90 MINS, clicking...');
      await thaiAromaButton.click();
      await page.waitForTimeout(4000);
    } else {
      // Look for service containing Thai Aroma
      const allServices = await page.locator('button, [role="button"]').all();
      for (const svc of allServices) {
        const text = await svc.textContent().catch(() => '');
        if (text.includes('THAI AROMA') && text.includes('90')) {
          console.log('Found Thai Aroma via text:', text.slice(0, 50));
          await svc.click();
          await page.waitForTimeout(4000);
          break;
        }
      }
    }

    // Step 4: Look for provider selection (Anya)
    console.log('Looking for Anya provider selection...');
    await page.waitForTimeout(3000);

    const anyaButton = await page.locator('button:has-text("Anya"), text="Anya", [aria-label*="Anya"]').first();
    if (await anyaButton.isVisible().catch(() => false)) {
      console.log('Found Anya, clicking...');
      await anyaButton.click();
      await page.waitForTimeout(3000);
    }

    // Step 5: Wait for calendar and extract data
    console.log('Waiting for calendar...');
    await page.waitForTimeout(5000);

    // Take screenshot
    await page.screenshot({ path: '/workspace/openclaw/logs/raksa_calendar_view.png', fullPage: true });
    
    // Try to find calendar elements
    const calendarSelector = '.calendar, [class*="calendar"], [class*="Calendar"], .datepicker, [class*="date-picker"]';
    const calendarElements = await page.locator(calendarSelector).all();
    console.log('Calendar elements found:', calendarElements.length);

    // Look for date cells
    const dateCells = await page.locator('[class*="day"], [class*="date"], [class*="cell"]').all();
    console.log('Date cells found:', dateCells.length);

    const availableDates = [];
    for (const cell of dateCells.slice(0, 40)) {
      const text = await cell.textContent().catch(() => '');
      const isClickable = await cell.isEnabled().catch(() => false);
      const className = await cell.getAttribute('class').catch(() => '');
      
      // Check if it looks like an available date
      if (text.trim() && (className.includes('available') || isClickable || /\d+/.test(text))) {
        availableDates.push({
          text: text.trim(),
          clickable: isClickable,
          className: className
        });
      }
    }

    // Look for time slots
    const timeSlots = await page.locator('[class*="time"], button:has-text(":"), [class*="slot"]').all();
    console.log('Time slot elements found:', timeSlots.length);

    const availableTimes = [];
    for (const slot of timeSlots.slice(0, 30)) {
      const text = await slot.textContent().catch(() => '');
      if (text.includes(':') || text.includes('AM') || text.includes('PM')) {
        availableTimes.push(text.trim());
      }
    }

    // Save results
    const results = {
      url: page.url(),
      currentStep: 'calendar',
      datesFound: availableDates.length,
      availableDates: availableDates.slice(0, 20),
      timesFound: availableTimes.length,
      availableTimes: availableTimes.slice(0, 20),
      networkData: availabilityData
    };

    await fs.promises.writeFile('/workspace/openclaw/logs/raksa_availability.json', JSON.stringify(results, null, 2));
    
    // Save final HTML
    const html = await page.content();
    await fs.promises.writeFile('/workspace/openclaw/logs/raksa_final.html', html);

    console.log('\n=== Results ===');
    console.log('URL:', page.url());
    console.log('Dates found:', availableDates.length);
    console.log('Times found:', availableTimes.length);
    console.log('First 5 dates:', availableDates.slice(0, 5));
    console.log('First 5 times:', availableTimes.slice(0, 5));

  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/raksa_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
