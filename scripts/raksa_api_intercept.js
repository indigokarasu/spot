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

  // Collect all API responses
  const apiResponses = [];
  
  const page = await context.newPage();
  
  // Listen for API responses
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('api') || url.includes('scheduling') || url.includes('availability')) {
      try {
        const body = await response.text();
        apiResponses.push({ 
          url: url, 
          status: response.status(),
          preview: body.slice(0, 2000)
        });
      } catch (e) {}
    }
  });

  try {
    // Direct URL with pre-selected service
    const directUrl = 'https://app.acuityscheduling.com/schedule.php?owner=23888333&appointmentType=66903512&calendarID=5949533';
    console.log('Navigating to:', directUrl);
    
    await page.goto(directUrl, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(5000);
    
    console.log('Current URL:', page.url());
    
    // Save screenshot and HTML
    await page.screenshot({ path: '/workspace/openclaw/logs/raksa_direct.png', fullPage: true });
    const html = await page.content();
    await fs.promises.writeFile('/workspace/openclaw/logs/raksa_direct.html', html);
    
    // Try to find and click through the booking flow
    // First, check if we're on a category selection page
    const categoryButton = await page.locator('button:has-text("Patrick and Anya")').first();
    if (await categoryButton.isVisible().catch(() => false)) {
      console.log('Found Patrick and Anya category, clicking...');
      await categoryButton.click();
      await page.waitForTimeout(3000);
    }
    
    // Look for service confirmation
    const serviceButton = await page.locator('button:has-text("THAI AROMA"), [class*="service"]:has-text("THAI AROMA")').first();
    if (await serviceButton.isVisible().catch(() => false)) {
      console.log('Found Thai Aroma, clicking...');
      await serviceButton.click();
      await page.waitForTimeout(3000);
    }
    
    // Wait for calendar to load
    await page.waitForTimeout(5000);
    
    // Try to interact with the calendar - look for available days
    const availableDays = await page.locator('[class*="available"], [class*="day"]:not([disabled]), .calendar-day').all();
    console.log('Found', availableDays.length, 'day elements');
    
    // Click first available day
    for (const day of availableDays.slice(0, 10)) {
      const isEnabled = await day.isEnabled().catch(() => false);
      const text = await day.textContent().catch(() => '');
      if (isEnabled && text.trim()) {
        console.log('Clicking day:', text.trim());
        await day.click();
        await page.waitForTimeout(3000);
        break;
      }
    }
    
    // Look for time slots
    const timeSlots = await page.locator('[class*="time"], button:has-text(":"), [class*="slot"]').all();
    console.log('Found', timeSlots.length, 'time slot elements');
    
    const times = [];
    for (const slot of timeSlots.slice(0, 20)) {
      const text = await slot.textContent().catch(() => '');
      if (text.includes(':') || text.includes('AM') || text.includes('PM')) {
        times.push(text.trim());
      }
    }
    
    // Save results
    const results = {
      url: page.url(),
      apiResponses: apiResponses,
      timeSlots: times,
      timestamp: new Date().toISOString()
    };
    
    await fs.promises.writeFile('/workspace/openclaw/logs/raksa_api_results.json', JSON.stringify(results, null, 2));
    
    console.log('\n=== Results ===');
    console.log('API calls intercepted:', apiResponses.length);
    console.log('Time slots found:', times.length);
    console.log('Sample times:', times.slice(0, 10));
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/raksa_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
