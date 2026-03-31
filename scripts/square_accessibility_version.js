const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Square Booking Automation - Accessibility-First Version
 * Uses aria-label and semantic selectors for reliability
 * Works across Square booking sites
 */

class SquareBooking {
  constructor() {
    this.browser = null;
    this.page = null;
    this.results = {
      location: '',
      service: '',
      date: '',
      allTimes: [],
      eveningTimes: [],
      timestamp: new Date().toISOString(),
      errors: []
    };
  }

  async initialize() {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const context = await this.browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });

    this.page = await context.newPage();
  }

  /**
   * Navigate to booking page and extract availability
   */
  async checkAvailability(config) {
    const {
      baseUrl,
      locationId,
      serviceId,
      targetDate, // Format: '2026-04-29'
      checkEvening = true // 5-7 PM
    } = config;

    try {
      await this.initialize();

      // Step 1: Load booking page
      console.log('Step 1: Loading booking page...');
      const bookingUrl = baseUrl || 
        `https://app.squareup.com/appointments/book/${locationId}/start?service_id=${serviceId}`;
      
      await this.page.goto(bookingUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      await this.page.waitForTimeout(4000);

      // Extract page info
      const pageInfo = await this.getPageInfo();
      this.results.location = pageInfo.location || '';
      this.results.service = pageInfo.service || '';

      // Step 2: Select staff using aria-label
      console.log('Step 2: Selecting "Any staff"...');
      const staffSelected = await this.selectByAriaLabel('Any staff');
      if (!staffSelected) {
        // Try fallback: click first radio
        await this.selectFirstStaff();
      }
      await this.page.waitForTimeout(2000);

      // Step 3: Click "Add" button
      console.log('Step 3: Adding to appointment...');
      const added = await this.clickByAriaLabel('Add');
      if (!added) {
        // Fallback: look for button with "Add" text
        await this.clickByText('Add');
      }
      await this.page.waitForTimeout(3000);

      // Step 4: Navigate to calendar
      console.log('Step 4: Continuing to calendar...');
      
      // Try multiple navigation approaches
      let navigated = await this.clickByAriaLabel('Next');
      if (!navigated) navigated = await this.clickByText('Next');
      if (!navigated) navigated = await this.clickByText('Continue');
      if (!navigated) {
        // Fallback: click at bottom right where Next button usually is
        await this.page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await this.page.waitForTimeout(500);
        await this.page.mouse.click(1280, 317);
        navigated = true;
      }
      await this.page.waitForTimeout(5000);

      // Step 5: Navigate to target month if needed
      console.log('Step 5: Navigating calendar...');
      const [year, month, day] = targetDate.split('-');
      const monthName = this.getMonthName(parseInt(month));
      
      // Take screenshot to see calendar state
      await this.page.screenshot({ path: '/workspace/openclaw/logs/square_calendar_debug.png', fullPage: true });
      
      const currentMonth = await this.getCurrentMonth();
      console.log(`  Current month: ${currentMonth}, target: ${monthName}`);
      
      if (currentMonth && !currentMonth.includes(monthName)) {
        console.log('  Navigating to target month...');
        await this.navigateToMonth(monthName);
      }
      await this.page.waitForTimeout(2000);

      // Step 6: Click target date
      console.log(`Step 6: Selecting ${targetDate}...`);
      
      // Try aria-label first (e.g., "April 29")
      const dateLabel = `${monthName} ${parseInt(day)}`;
      let dateClicked = await this.selectByAriaLabel(dateLabel);
      
      if (!dateClicked) {
        // Try clicking by day number with more robust detection
        dateClicked = await this.clickDayNumberRobust(parseInt(day));
      }
      
      if (!dateClicked) {
        this.results.errors.push(`Date ${targetDate} not available or not clickable`);
        await this.page.screenshot({ path: '/workspace/openclaw/logs/square_date_error.png', fullPage: true });
        return this.results;
      }
      
      await this.page.waitForTimeout(5000);
      await this.page.screenshot({ path: '/workspace/openclaw/logs/square_after_date_click.png', fullPage: true });

      // Step 7: Extract time slots
      console.log('Step 7: Extracting time slots...');
      const times = await this.extractTimeSlots();
      this.results.allTimes = times;
      this.results.date = targetDate;

      // Step 8: Filter evening slots
      if (checkEvening) {
        this.results.eveningTimes = this.filterEveningSlots(times);
        console.log(`\nEvening slots (5-7 PM): ${this.results.eveningTimes.length}`);
      }

      // Save results
      await this.saveResults();
      
      return this.results;

    } catch (error) {
      this.results.errors.push(error.message);
      console.error('Error:', error.message);
      await this.page.screenshot({ 
        path: '/workspace/openclaw/logs/square_a11y_error.png',
        fullPage: true 
      });
      return this.results;
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }

  // Helper methods
  async getPageInfo() {
    return await this.page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2'));
      return {
        location: headings[0]?.textContent?.trim() || '',
        service: headings[1]?.textContent?.trim() || ''
      };
    });
  }

  async selectByAriaLabel(label) {
    try {
      const element = await this.page.locator(`[aria-label="${label}"]`).first();
      const visible = await element.isVisible().catch(() => false);
      
      if (visible) {
        await element.click();
        console.log(`  ✓ Selected "${label}"`);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  async selectFirstStaff() {
    // Find first market-radio with staff
    const staff = await this.page.locator('market-radio').first();
    await staff.click().catch(() => {});
  }

  async clickByAriaLabel(label) {
    try {
      // Try exact match first
      const element = await this.page.locator(`[aria-label="${label}"]`).first();
      const visible = await element.isVisible().catch(() => false);
      
      if (visible) {
        await element.click();
        console.log(`  ✓ Clicked "${label}"`);
        return true;
      }
      
      // Try partial match
      const partial = await this.page.locator(`[aria-label*="${label}"]`).first();
      const partialVisible = await partial.isVisible().catch(() => false);
      
      if (partialVisible) {
        await partial.click();
        console.log(`  ✓ Clicked partial match "${label}"`);
        return true;
      }
      
      return false;
    } catch (e) {
      return false;
    }
  }

  async clickByText(text) {
    try {
      await this.page.click(`text="${text}"`);
      console.log(`  ✓ Clicked "${text}"`);
      return true;
    } catch (e) {
      return false;
    }
  }

  async clickDayNumberRobust(day) {
    // More robust day selection using multiple strategies
    console.log(`  Looking for day ${day}...`);
    
    // Strategy 1: Find by text content in buttons
    const buttons = await this.page.locator('button').all();
    for (const btn of buttons) {
      const text = await btn.textContent().catch(() => '');
      if (text.trim() === day.toString()) {
        // Check if enabled
        const disabled = await btn.evaluate(el => 
          el.disabled || el.getAttribute('aria-disabled') === 'true'
        ).catch(() => true);
        
        if (!disabled) {
          await btn.click();
          console.log(`    ✓ Clicked day ${day} (button)`);
          return true;
        } else {
          console.log(`    Day ${day} is disabled`);
          return false;
        }
      }
    }
    
    // Strategy 2: Find by aria-label containing the day
    const dayButtons = await this.page.locator(`[aria-label*="${day}"]`).all();
    for (const btn of dayButtons) {
      const visible = await btn.isVisible().catch(() => false);
      if (visible) {
        const disabled = await btn.evaluate(el => 
          el.disabled || el.getAttribute('aria-disabled') === 'true'
        ).catch(() => true);
        
        if (!disabled) {
          await btn.click();
          console.log(`    ✓ Clicked day ${day} (aria-label)`);
          return true;
        }
      }
    }
    
    // Strategy 3: JavaScript evaluation to find and click
    const clicked = await this.page.evaluate((targetDay) => {
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const text = el.textContent?.trim();
        if (text === targetDay.toString()) {
          const disabled = el.disabled || el.getAttribute('aria-disabled') === 'true';
          if (!disabled && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
            el.click();
            return true;
          }
        }
      }
      return false;
    }, day);
    
    if (clicked) {
      console.log(`    ✓ Clicked day ${day} (JavaScript)`);
      return true;
    }
    
    console.log(`    ✗ Could not find clickable day ${day}`);
    return false;
  }

  async getCurrentMonth() {
    try {
      // Look for month heading
      const headings = await this.page.locator('h2, h3, [role="heading"]').all();
      for (const h of headings) {
        const text = await h.textContent().catch(() => '');
        if (/^(January|February|March|April|May|June|July|August|September|October|November|December)/.test(text)) {
          return text.trim();
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  async navigateToMonth(targetMonth) {
    // Try clicking "Next month" button using aria-label partial match
    let attempts = 0;
    while (attempts < 12) {
      // Try multiple selectors for next month
      const selectors = [
        '[aria-label*="Next"]',
        'button:has-text("Next")',
        '[aria-label="Next month"]'
      ];
      
      let clicked = false;
      for (const selector of selectors) {
        try {
          const btn = await this.page.locator(selector).first();
          const visible = await btn.isVisible().catch(() => false);
          if (visible) {
            await btn.click();
            clicked = true;
            break;
          }
        } catch (e) {}
      }
      
      if (!clicked) {
        // Coordinate fallback
        await this.page.mouse.click(1280, 212);
        clicked = true;
      }
      
      await this.page.waitForTimeout(2000);
      
      const current = await this.getCurrentMonth();
      if (current && current.includes(targetMonth)) {
        break;
      }
      attempts++;
    }
  }

  async extractTimeSlots() {
    const pageText = await this.page.evaluate(() => document.body.innerText);
    const matches = pageText.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];
    return [...new Set(matches)].sort();
  }

  filterEveningSlots(times) {
    return times.filter(t => {
      const m = t.match(/(\d{1,2}):(\d{2})\s*([AP])M/i);
      if (m) {
        let hour = parseInt(m[1]);
        const period = m[3].toUpperCase();
        if (period === 'P' && hour !== 12) hour += 12;
        return hour >= 17 && hour <= 19;
      }
      return false;
    });
  }

  getMonthName(monthNum) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNum - 1];
  }

  async saveResults() {
    await fs.promises.writeFile(
      '/workspace/openclaw/logs/square_a11y_availability.json',
      JSON.stringify(this.results, null, 2)
    );
    console.log('\n✓ Results saved');
  }
}

// Run test
(async () => {
  const booking = new SquareBooking();
  
  const results = await booking.checkAvailability({
    locationId: 'L6SV5MCXN00CB',
    serviceId: 'XA4S2WKU7HYBHTWNKCPBIBDJ',
    targetDate: '2026-04-29',
    checkEvening: true
  });
  
  console.log('\n=== FINAL RESULTS ===');
  console.log(`Location: ${results.location}`);
  console.log(`Service: ${results.service}`);
  console.log(`Date: ${results.date}`);
  console.log(`\nAll times (${results.allTimes.length}):`);
  results.allTimes.forEach(t => console.log(`  ${t}`));
  
  if (results.eveningTimes.length > 0) {
    console.log('\nEvening (5-7 PM):');
    results.eveningTimes.forEach(t => console.log(`  ${t}`));
  } else {
    console.log('\nNo evening slots available');
  }
  
  if (results.errors.length > 0) {
    console.log('\nErrors:', results.errors);
  }
})();
