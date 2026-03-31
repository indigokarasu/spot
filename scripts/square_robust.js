const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Square Booking Availability Extractor
 * Handles Square's multi-step booking flow for Shade Nail Spa
 * Target: Peppermint Pedi on specific date with evening slots
 */

const CONFIG = {
  bookingUrl: 'https://square.site/book/L6SV5MCXN00CB/shade-nail-spa-san-francisco-ca',
  serviceName: 'Peppermint Pedi',
  targetDate: '2026-04-29',
  eveningHours: { start: 17, end: 19 }, // 5 PM - 7 PM
  timeout: { step: 5000, navigation: 30000 }
};

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function extractAvailability() {
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
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    locale: 'en-US'
  });

  const page = await context.newPage();
  const results = {
    service: CONFIG.serviceName,
    targetDate: CONFIG.targetDate,
    steps: [],
    availability: [],
    errors: []
  };

  try {
    // Step 1: Load booking page
    console.log('Step 1: Loading Square booking page...');
    await page.goto(CONFIG.bookingUrl, { 
      waitUntil: 'networkidle',
      timeout: CONFIG.timeout.navigation
    });
    await delay(CONFIG.timeout.step);
    results.steps.push({ step: 1, status: 'loaded', url: page.url() });

    // Step 2: Find and click service - Square uses specific data attributes
    console.log('Step 2: Looking for service selection...');
    
    // Square renders services as clickable cards/divs
    // Try multiple selector strategies
    const serviceSelectors = [
      `div:has-text("${CONFIG.serviceName}")`,
      `[data-testid*="service"]`,
      '[role="listitem"]',
      '.service-item',
      'div[tabindex="0"]'
    ];

    let serviceFound = false;
    
    for (const selector of serviceSelectors) {
      const elements = await page.locator(selector).all();
      console.log(`  Selector "${selector}": found ${elements.length} elements`);
      
      for (const el of elements.slice(0, 10)) {
        const text = await el.textContent().catch(() => '');
        const lowerText = text.toLowerCase();
        
        if (lowerText.includes('peppermint') && lowerText.includes('pedi')) {
          console.log('  Found Peppermint Pedi element:', text.slice(0, 50));
          
          // Check if clickable
          const isClickable = await el.isEnabled().catch(() => false);
          if (isClickable) {
            await el.click();
            console.log('  Clicked service');
            serviceFound = true;
            await delay(CONFIG.timeout.step);
            break;
          }
        }
      }
      if (serviceFound) break;
    }

    if (!serviceFound) {
      throw new Error('Could not find or click Peppermint Pedi service');
    }
    
    results.steps.push({ step: 2, status: 'service_selected' });

    // Step 3: Handle staff selection if present
    console.log('Step 3: Checking for staff/provider selection...');
    await delay(CONFIG.timeout.step);
    
    // Square sometimes shows "Choose staff" or "Any available"
    const staffSelectors = [
      'text=/Any available/i',
      'text=/Choose staff/i',
      '[data-testid*="staff"]',
      'button:has-text("Continue")'
    ];
    
    for (const selector of staffSelectors) {
      const btn = await page.locator(selector).first();
      if (await btn.isVisible().catch(() => false)) {
        console.log('  Found staff selection, clicking...');
        await btn.click();
        await delay(CONFIG.timeout.step);
        break;
      }
    }
    
    results.steps.push({ step: 3, status: 'staff_handled' });

    // Step 4: Navigate to date selection
    console.log('Step 4: Looking for date/calendar...');
    await delay(CONFIG.timeout.step);
    
    // Square shows calendar in various formats
    const calendarSelectors = [
      '[data-testid*="calendar"]',
      '[role="grid"]',
      '.calendar',
      'div:has-text("Select a date")'
    ];
    
    let calendarVisible = false;
    for (const selector of calendarSelectors) {
      if (await page.locator(selector).first().isVisible().catch(() => false)) {
        calendarVisible = true;
        console.log('  Calendar found with selector:', selector);
        break;
      }
    }

    if (!calendarVisible) {
      console.log('  Calendar not immediately visible, checking URL/state...');
    }

    // Step 5: Navigate to target month and select date
    console.log('Step 5: Navigating to April 2026...');
    
    // Square typically shows current month, need to advance
    // Look for month navigation
    const nextMonthSelectors = [
      'button:has("")',
      '[aria-label*="next month"]',
      '[data-testid*="next"]',
      'button[aria-label*="Next"]'
    ];
    
    // Try to find and click next month if needed
    // Current is March 2026, need April 2026 = 1 click
    for (let i = 0; i < 2; i++) { // Try up to 2 times
      for (const selector of nextMonthSelectors) {
        const btn = await page.locator(selector).first();
        if (await btn.isVisible().catch(() => false)) {
          const ariaLabel = await btn.getAttribute('aria-label').catch(() => '');
          console.log(`  Found nav button: ${ariaLabel}`);
          
          // Check if we're already on April
          const pageText = await page.locator('body').textContent();
          if (pageText.includes('April 2026')) {
            console.log('  Already on April 2026');
            break;
          }
          
          await btn.click();
          console.log('  Clicked next month');
          await delay(CONFIG.timeout.step);
          break;
        }
      }
    }

    // Step 6: Select date 29
    console.log('Step 6: Selecting April 29...');
    
    // Look for date 29 button
    const dateSelectors = [
      'button:has-text("29")',
      '[role="gridcell"]:has-text("29")',
      '[data-date*="29"]',
      'div:has-text("29"):not(:has-text("2025"))'
    ];
    
    let dateSelected = false;
    for (const selector of dateSelectors) {
      const dateBtn = await page.locator(selector).first();
      if (await dateBtn.isVisible().catch(() => false)) {
        const text = await dateBtn.textContent().catch(() => '');
        const isEnabled = await dateBtn.isEnabled().catch(() => false);
        
        if (text.includes('29') && isEnabled) {
          console.log('  Found date 29, clicking...');
          await dateBtn.click();
          dateSelected = true;
          await delay(CONFIG.timeout.step);
          break;
        }
      }
    }

    if (!dateSelected) {
      console.log('  Date 29 not found or not clickable');
    }
    
    results.steps.push({ step: 6, status: dateSelected ? 'date_selected' : 'date_not_found' });

    // Step 7: Extract time slots
    console.log('Step 7: Looking for time slots...');
    await delay(CONFIG.timeout.step);
    
    const timeSelectors = [
      'button:has-text(":")',
      '[data-testid*="time"]',
      '[role="listitem"]:has-text(":")',
      '.time-slot'
    ];
    
    const allSlots = [];
    for (const selector of timeSelectors) {
      const slots = await page.locator(selector).all();
      for (const slot of slots.slice(0, 20)) {
        const text = await slot.textContent().catch(() => '');
        const trimmed = text.trim();
        
        // Parse time like "5:00 PM", "6:30 PM"
        const timeMatch = trimmed.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
          let hour = parseInt(timeMatch[1]);
          const period = timeMatch[3].toUpperCase();
          
          if (period === 'PM' && hour !== 12) hour += 12;
          if (period === 'AM' && hour === 12) hour = 0;
          
          allSlots.push({
            text: trimmed,
            hour: hour,
            isEvening: hour >= CONFIG.eveningHours.start && hour < CONFIG.eveningHours.end
          });
        }
      }
    }

    // Filter for evening slots
    results.availability = allSlots.filter(slot => slot.isEvening);
    
    results.steps.push({ 
      step: 7, 
      status: 'complete',
      totalSlots: allSlots.length,
      eveningSlots: results.availability.length
    });

    // Save screenshot and results
    await page.screenshot({ path: '/workspace/openclaw/logs/square_final.png', fullPage: true });
    await fs.promises.writeFile('/workspace/openclaw/logs/square_results.json', JSON.stringify(results, null, 2));

    console.log('\n=== Results ===');
    console.log('Service:', CONFIG.serviceName);
    console.log('Target date:', CONFIG.targetDate);
    console.log('Total slots found:', allSlots.length);
    console.log('Evening slots (5-7 PM):', results.availability.map(s => s.text));

  } catch (error) {
    console.error('Error:', error.message);
    results.errors.push(error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/square_error.png', fullPage: true });
    await fs.promises.writeFile('/workspace/openclaw/logs/square_results.json', JSON.stringify(results, null, 2));
  } finally {
    await browser.close();
  }

  return results;
}

// Run the extraction
extractAvailability().then(results => {
  console.log('\nExtraction complete');
  process.exit(0);
}).catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
