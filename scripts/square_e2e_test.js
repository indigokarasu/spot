const { chromium } = require('playwright');
const fs = require('fs');

/**
 * End-to-end test: Full booking flow with April 30
 * Validates the complete automation pattern
 */

class SquareBookingTester {
  constructor() {
    this.serviceId = 'XA4S2WKU7HYBHTWNKCPBIBDJ';
    this.browser = null;
    this.page = null;
    this.results = {
      steps: [],
      screenshots: [],
      errors: []
    };
  }

  async init() {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.page = await this.browser.newPage({
      viewport: { width: 1920, height: 1080 }
    });
    
    this.log('INIT', 'Browser launched');
  }

  log(step, message, data = null) {
    const entry = { step, message, data, time: new Date().toISOString() };
    this.results.steps.push(entry);
    console.log(`[${step}] ${message}`);
    if (data) console.log('  Data:', JSON.stringify(data, null, 2));
  }

  async screenshot(name) {
    const path = `/workspace/openclaw/logs/e2e_${name}.png`;
    await this.page.screenshot({ path, fullPage: true });
    this.results.screenshots.push({ name, path });
    this.log('SCREENSHOT', `Saved ${name}`, { path });
  }

  async step1_LoadServicePage() {
    this.log('STEP1', 'Loading service page...');
    
    await this.page.goto(
      `https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=${this.serviceId}`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    await this.page.waitForTimeout(4000);
    
    const info = await this.page.evaluate(() => ({
      url: window.location.href,
      hasPeppermint: document.body.innerText.includes('Peppermint Pedi'),
      hasStaff: document.body.innerText.includes('Any staff')
    }));
    
    this.log('STEP1', 'Page loaded', info);
    await this.screenshot('step1_service_page');
    
    if (!info.hasPeppermint) throw new Error('Service not found');
    if (!info.hasStaff) throw new Error('Staff section not found');
    
    return info;
  }

  async step2_SelectStaff() {
    this.log('STEP2', 'Selecting "Any staff"...');
    
    // Try aria-label first
    const staffBtn = await this.page.locator('[aria-label="Any staff"]').first();
    const isVisible = await staffBtn.isVisible().catch(() => false);
    
    if (isVisible) {
      await staffBtn.click();
      this.log('STEP2', 'Clicked via aria-label');
    } else {
      // Fallback to first radio
      await this.page.locator('market-radio').first().click();
      this.log('STEP2', 'Clicked first radio fallback');
    }
    
    await this.page.waitForTimeout(2000);
    await this.screenshot('step2_staff_selected');
  }

  async step3_ClickAdd() {
    this.log('STEP3', 'Clicking "Add"...');
    
    const addBtn = await this.page.locator('[aria-label="Add"]').first();
    const isVisible = await addBtn.isVisible().catch(() => false);
    
    if (isVisible) {
      await addBtn.click();
      this.log('STEP3', 'Clicked via aria-label');
    } else {
      await this.page.mouse.click(960, 1040);
      this.log('STEP3', 'Clicked via coordinates fallback');
    }
    
    await this.page.waitForTimeout(2000);
    await this.screenshot('step3_added');
  }

  async step4_ClickNext() {
    this.log('STEP4', 'Clicking "Next"...');
    
    const nextBtn = await this.page.locator('[aria-label="Next"]').first();
    const isVisible = await nextBtn.isVisible().catch(() => false);
    
    if (isVisible) {
      await nextBtn.click();
      this.log('STEP4', 'Clicked via aria-label');
    } else {
      await this.page.mouse.click(1280, 317);
      this.log('STEP4', 'Clicked via coordinates fallback');
    }
    
    await this.page.waitForTimeout(4000);
    
    const url = this.page.url();
    this.log('STEP4', 'Navigated', { url, hasAvailability: url.includes('availability') });
    await this.screenshot('step4_calendar');
    
    return url.includes('availability');
  }

  async step5_NavigateToApril() {
    this.log('STEP5', 'Checking current month...');
    
    const monthInfo = await this.page.evaluate(() => ({
      text: document.body.innerText.substring(0, 500),
      hasMarch: document.body.innerText.includes('Mar'),
      hasApril: document.body.innerText.includes('Apr')
    }));
    
    this.log('STEP5', 'Month check', monthInfo);
    
    if (monthInfo.hasMarch && !monthInfo.hasApril) {
      this.log('STEP5', 'Navigating March -> April...');
      await this.page.mouse.click(1400, 200);
      await this.page.waitForTimeout(4000);
    }
    
    await this.screenshot('step5_april_view');
  }

  async step6_CheckAvailability() {
    this.log('STEP6', 'Checking all date availability...');
    
    const availability = await this.page.evaluate(() => {
      const results = {};
      const buttons = document.querySelectorAll('market-button[data-testid^="date-"]');
      
      buttons.forEach(btn => {
        const testId = btn.getAttribute('data-testid');
        const day = parseInt(testId.replace('date-', ''));
        const disabled = btn.hasAttribute('disabled');
        const text = btn.textContent?.trim();
        
        results[day] = {
          available: !disabled,
          disabled: disabled,
          text
        };
      });
      
      return results;
    });
    
    this.log('STEP6', 'Availability retrieved', availability);
    
    // Find April dates
    const aprilDates = Object.entries(availability)
      .filter(([day, info]) => day >= 22 && day <= 31)
      .map(([day, info]) => ({ day: parseInt(day), ...info }));
    
    this.log('STEP6', 'April dates summary', aprilDates);
    
    return availability;
  }

  async step7_ClickDate(targetDay) {
    this.log('STEP7', `Clicking date ${targetDay}...`);
    
    // Check if available first
    const isAvailable = await this.page.evaluate((day) => {
      const btn = document.querySelector(`market-button[data-testid="date-${day}"]`);
      return btn && !btn.hasAttribute('disabled');
    }, targetDay);
    
    if (!isAvailable) {
      throw new Error(`Date ${targetDay} is not available`);
    }
    
    this.log('STEP7', `Date ${targetDay} is available, clicking...`);
    
    // Click via DOM
    await this.page.evaluate((day) => {
      document.querySelector(`market-button[data-testid="date-${day}"]`)?.click();
    }, targetDay);
    
    await this.page.waitForTimeout(5000);
    await this.screenshot(`step7_date_${targetDay}_clicked`);
  }

  async step8_ExtractTimes() {
    this.log('STEP8', 'Extracting available times...');
    
    const times = await this.page.evaluate(() => {
      const results = [];
      
      // Look for time buttons
      document.querySelectorAll('market-button').forEach(btn => {
        const text = btn.textContent?.trim();
        if (/^\d{1,2}:\d{2}\s*[AP]M$/i.test(text)) {
          results.push({
            time: text,
            disabled: btn.hasAttribute('disabled'),
            testId: btn.getAttribute('data-testid')
          });
        }
      });
      
      // Also check aria-labels
      document.querySelectorAll('[aria-label*="AM"], [aria-label*="PM"]').forEach(el => {
        const label = el.getAttribute('aria-label');
        if (label && /^\d{1,2}:\d{2}/.test(label)) {
          results.push({ time: label, source: 'aria-label' });
        }
      });
      
      return results;
    });
    
    this.log('STEP8', 'Times found', times);
    
    // Also get raw text match
    const pageText = await this.page.locator('body').textContent();
    const textTimes = [...new Set((pageText.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || []))].sort();
    this.log('STEP8', 'Times from text', textTimes);
    
    return { domTimes: times, textTimes };
  }

  async step9_ClickTime(targetTime) {
    this.log('STEP9', `Attempting to click time ${targetTime}...`);
    
    // Try to find and click the time
    const clicked = await this.page.evaluate((time) => {
      // Find button with this time text
      const buttons = document.querySelectorAll('market-button');
      for (const btn of buttons) {
        if (btn.textContent?.trim() === time) {
          btn.click();
          return true;
        }
      }
      return false;
    }, targetTime);
    
    if (!clicked) {
      this.log('STEP9', `Could not find time ${targetTime} to click`);
      return false;
    }
    
    await this.page.waitForTimeout(4000);
    
    const url = this.page.url();
    this.log('STEP9', 'After clicking time', { url });
    await this.screenshot('step9_time_clicked');
    
    return true;
  }

  async runFullTest() {
    const startTime = Date.now();
    
    try {
      await this.init();
      await this.step1_LoadServicePage();
      await this.step2_SelectStaff();
      await this.step3_ClickAdd();
      await this.step4_ClickNext();
      await this.step5_NavigateToApril();
      
      const availability = await this.step6_CheckAvailability();
      
      // Find first available date
      const availableDates = Object.entries(availability)
        .filter(([day, info]) => info.available)
        .map(([day]) => parseInt(day));
      
      this.log('TEST', 'Available dates found', availableDates);
      
      if (availableDates.length === 0) {
        throw new Error('No available dates found');
      }
      
      // Test with first available
      const testDate = availableDates[0];
      this.log('TEST', `Testing with date ${testDate}`);
      
      await this.step7_ClickDate(testDate);
      const times = await this.step8_ExtractTimes();
      
      // Try to click first time if available
      if (times.domTimes.length > 0 && !times.domTimes[0].disabled) {
        await this.step9_ClickTime(times.domTimes[0].time);
      }
      
      this.log('TEST', 'Full flow completed successfully');
      
    } catch (error) {
      this.log('ERROR', error.message);
      this.results.errors.push({ message: error.message, stack: error.stack });
      await this.screenshot('error_state');
    } finally {
      const duration = Date.now() - startTime;
      this.log('COMPLETE', `Test completed in ${duration}ms`);
      
      // Save results
      await fs.promises.writeFile(
        '/workspace/openclaw/logs/e2e_test_results.json',
        JSON.stringify(this.results, null, 2)
      );
      
      await this.browser?.close();
    }
    
    return this.results;
  }
}

// Run the test
(async () => {
  console.log('=== End-to-End Square Booking Test ===\n');
  console.log('Testing full flow with available dates...\n');
  
  const tester = new SquareBookingTester();
  const results = await tester.runFullTest();
  
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Steps completed: ${results.steps.length}`);
  console.log(`Screenshots: ${results.screenshots.length}`);
  console.log(`Errors: ${results.errors.length}`);
  
  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(e => console.log('  -', e.message));
  }
  
  console.log('\nResults saved to: /workspace/openclaw/logs/e2e_test_results.json');
})();
