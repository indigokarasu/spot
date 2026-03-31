const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Phase 1: Discovery - OpenTable / Atelier Crenn
 * Testing: https://www.opentable.com/r/atelier-crenn
 * Party size: 2 people
 */

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  // Capture API calls
  const apiCalls = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('api') || url.includes('graphql') || url.includes('availability') || url.includes('booking')) {
      apiCalls.push({
        url: url.substring(0, 150),
        method: req.method(),
        time: Date.now()
      });
    }
  });

  const results = {
    phase: 'discovery',
    url: 'https://www.opentable.com/r/atelier-crenn',
    steps: []
  };

  try {
    console.log('=== Phase 1: Discovery - OpenTable ===\n');
    
    // Step 1.1: Load the page
    console.log('Step 1.1: Loading Atelier Crenn page...');
    await page.goto('https://www.opentable.com/r/atelier-crenn', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(5000);
    
    results.steps.push({ step: 'load', url: page.url() });
    console.log('  URL:', page.url());
    
    // Step 1.2: Capture initial state
    console.log('\nStep 1.2: Capturing page fingerprint...');
    const fingerprint = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      hasShadowDOM: !!document.querySelector('*').shadowRoot,
      customElements: [...new Set(
        Array.from(document.querySelectorAll('*'))
          .map(el => el.tagName.toLowerCase())
          .filter(tag => tag.includes('-'))
      )].slice(0, 15),
      frameworks: {
        react: !!window.__REACT_ROOT__ || !!document.querySelector('[data-reactroot]'),
        vue: !!window.__VUE__,
        angular: !!window.angular,
        next: !!window.__NEXT_DATA__
      },
      hasBookingButton: document.body.innerText.includes('Book a table') ||
                         document.body.innerText.includes('Reserve') ||
                         document.body.innerText.includes('Find a table'),
      textSample: document.body.innerText.substring(0, 500)
    }));
    
    results.fingerprint = fingerprint;
    console.log('  Title:', fingerprint.title);
    console.log('  Custom elements:', fingerprint.customElements);
    console.log('  Frameworks:', fingerprint.frameworks);
    console.log('  Has booking button:', fingerprint.hasBookingButton);
    
    await page.screenshot({ path: '/workspace/openclaw/logs/opentable_step1_initial.png' });
    
    // Step 1.3: Look for booking interface
    console.log('\nStep 1.3: Looking for booking interface...');
    
    const bookingElements = await page.evaluate(() => {
      const results = [];
      
      // Look for common booking-related elements
      const selectors = [
        'button:contains("Book")',
        'button:contains("Reserve")',
        '[data-testid*="book"]',
        '[data-testid*="reserve"]',
        '[aria-label*="book"]',
        '[aria-label*="reserve"]'
      ];
      
      // Check for party size selector
      const partySelectors = document.querySelectorAll('select, [role="listbox"]');
      
      // Check for date/time inputs
      const dateInputs = document.querySelectorAll('input[type="date"], input[placeholder*="date"], [data-testid*="date"]');
      
      return {
        partySelectors: partySelectors.length,
        dateInputs: dateInputs.length,
        buttonsWithBook: Array.from(document.querySelectorAll('button'))
          .filter(b => /book|reserve|find.*table/i.test(b.textContent))
          .map(b => ({
            text: b.textContent?.trim().substring(0, 50),
            ariaLabel: b.getAttribute('aria-label'),
            dataTestId: b.getAttribute('data-testid')
          })).slice(0, 10)
      };
    });
    
    results.bookingElements = bookingElements;
    console.log('  Booking buttons found:', bookingElements.buttonsWithBook.length);
    console.log('  Party selectors:', bookingElements.partySelectors);
    console.log('  Date inputs:', bookingElements.dateInputs);
    
    if (bookingElements.buttonsWithBook.length > 0) {
      console.log('\n  Button details:');
      bookingElements.buttonsWithBook.forEach((b, i) => {
        console.log(`    [${i}] "${b.text}" | aria: ${b.ariaLabel} | testId: ${b.dataTestId}`);
      });
    }
    
    // Step 2: Try to initiate booking flow
    console.log('\nStep 2: Attempting to initiate booking flow...');
    
    // Look for "View full availability" or similar
    const availabilityButton = await page.locator('text=/View full availability/i').first();
    const hasAvailabilityBtn = await availabilityButton.isVisible().catch(() => false);
    
    if (hasAvailabilityBtn) {
      console.log('  Found "View full availability" button, clicking...');
      await availabilityButton.click();
      await page.waitForTimeout(5000);
      
      results.steps.push({ step: 'clicked_availability', url: page.url() });
      console.log('  After click URL:', page.url());
    } else {
      // Try finding any booking/reserve button
      const bookBtn = await page.locator('button:has-text("Book"), button:has-text("Reserve"), button:has-text("Find")').first();
      if (await bookBtn.isVisible().catch(() => false)) {
        console.log('  Found booking button, clicking...');
        await bookBtn.click();
        await page.waitForTimeout(5000);
        results.steps.push({ step: 'clicked_book', url: page.url() });
        console.log('  After click URL:', page.url());
      } else {
        console.log('  No booking button found, checking for embedded widget...');
      }
    }
    
    await page.screenshot({ path: '/workspace/openclaw/logs/opentable_step2_booking.png' });
    
    // Step 3: Analyze booking interface
    console.log('\nStep 3: Analyzing booking interface...');
    
    const bookingInterface = await page.evaluate(() => ({
      hasCalendar: document.body.innerText.includes('Calendar') ||
                   document.body.innerText.includes('Sun') ||
                   document.body.innerText.includes('Mon') ||
                   document.body.innerText.includes('2026'),
      hasTimeSlots: document.body.innerText.includes('AM') ||
                    document.body.innerText.includes('PM'),
      hasPartySize: document.body.innerText.includes('people') ||
                    document.body.innerText.includes('guests') ||
                    document.body.innerText.includes('party'),
      textSample: document.body.innerText.substring(0, 800)
    }));
    
    results.bookingInterface = bookingInterface;
    console.log('  Has calendar:', bookingInterface.hasCalendar);
    console.log('  Has time slots:', bookingInterface.hasTimeSlots);
    console.log('  Has party size:', bookingInterface.hasPartySize);
    
    // Step 4: Check for API calls made
    console.log('\nStep 4: API calls captured:');
    console.log('  Total API calls:', apiCalls.length);
    
    if (apiCalls.length > 0) {
      apiCalls.slice(0, 10).forEach((call, i) => {
        console.log(`    [${i}] ${call.method} ${call.url}`);
      });
    }
    results.apiCalls = apiCalls;
    
    // Step 5: Look for semantic selectors
    console.log('\nStep 5: Looking for semantic selectors...');
    
    const semanticElements = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('[data-testid], [aria-label]').forEach(el => {
        const tag = el.tagName.toLowerCase();
        const testId = el.getAttribute('data-testid');
        const ariaLabel = el.getAttribute('aria-label');
        const text = el.textContent?.trim().substring(0, 40);
        
        if (testId || ariaLabel) {
          results.push({ tag, testId, ariaLabel, text });
        }
      });
      return results.slice(0, 20);
    });
    
    results.semanticElements = semanticElements;
    console.log('  Found', semanticElements.length, 'semantic elements');
    semanticElements.slice(0, 10).forEach(el => {
      console.log(`    ${el.tag}: testId="${el.testId}" aria="${el.ariaLabel?.substring(0, 30)}"`);
    });
    
    await page.screenshot({ path: '/workspace/openclaw/logs/opentable_step3_analysis.png' });
    
    // Save results
    await fs.promises.writeFile(
      '/workspace/openclaw/logs/opentable_discovery.json',
      JSON.stringify(results, null, 2)
    );
    
    console.log('\n=== Discovery Complete ===');
    console.log('Results saved to: /workspace/openclaw/logs/opentable_discovery.json');
    console.log('Screenshots saved:');
    console.log('  - opentable_step1_initial.png');
    console.log('  - opentable_step2_booking.png');
    console.log('  - opentable_step3_analysis.png');
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/opentable_error.png' });
  } finally {
    await browser.close();
  }
})();
