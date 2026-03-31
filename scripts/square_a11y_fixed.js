const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Square Booking Automation - Accessibility-First Version (Fixed)
 * Uses aria-label and semantic selectors for reliability
 */

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });

  const page = await context.newPage();

  try {
    console.log('=== Square Booking (Accessibility-First) ===');
    
    // Step 1: Load page
    await page.goto('https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=XA4S2WKU7HYBHTWNKCPBIBDJ', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(4000);
    
    // Get page info
    const pageInfo = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const h2 = document.querySelector('h2');
      return {
        location: h1?.textContent?.trim() || '',
        service: h2?.textContent?.trim() || ''
      };
    });
    
    console.log(`Location: ${pageInfo.location}`);
    console.log(`Service: ${pageInfo.service}`);
    
    // Step 2: Select "Any staff" via aria-label
    console.log('\nStep 2: Selecting staff...');
    const staffBtn = await page.locator('[aria-label="Any staff"]').first();
    const staffVisible = await staffBtn.isVisible().catch(() => false);
    
    if (staffVisible) {
      await staffBtn.click();
      console.log('  ✓ Selected "Any staff" via aria-label');
    } else {
      // Fallback: click first market-radio
      await page.locator('market-radio').first().click();
      console.log('  ✓ Selected first staff option');
    }
    await page.waitForTimeout(2000);
    
    // Step 3: Click "Add"
    console.log('\nStep 3: Clicking "Add"...');
    const addBtn = await page.locator('[aria-label="Add"]').first();
    const addVisible = await addBtn.isVisible().catch(() => false);
    
    if (addVisible) {
      await addBtn.click();
      console.log('  ✓ Clicked "Add" via aria-label');
    } else {
      // Fallback
      await page.click('text="Add"').catch(() => {
        // Coordinate fallback
        return page.mouse.click(960, 1040);
      });
      console.log('  ✓ Clicked "Add" via fallback');
    }
    await page.waitForTimeout(3000);
    
    // Step 4: Click "Next"
    console.log('\nStep 4: Continuing to calendar...');
    const nextBtn = await page.locator('[aria-label="Next"]').first();
    const nextVisible = await nextBtn.isVisible().catch(() => false);
    
    if (nextVisible) {
      await nextBtn.click();
      console.log('  ✓ Clicked "Next" via aria-label');
    } else {
      await page.click('text="Next"').catch(() => page.mouse.click(1280, 317));
      console.log('  ✓ Clicked "Next" via fallback');
    }
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: '/workspace/openclaw/logs/square_a11y_calendar.png', fullPage: true });
    
    // Step 5: Navigate to April if needed
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('\nStep 5: Calendar check...');
    console.log('  Has March:', pageText.includes('March'));
    console.log('  Has April:', pageText.includes('April'));
    
    if (pageText.includes('March') && !pageText.includes('April')) {
      console.log('  Navigating to April...');
      await page.locator('[aria-label*="Next"]').first().click().catch(() => page.mouse.click(1280, 212));
      await page.waitForTimeout(3000);
    }
    
    // Step 6: Click date 29
    console.log('\nStep 6: Selecting April 29...');
    
    // Try aria-label first
    const dateByAria = await page.locator('[aria-label="April 29"]').first();
    const dateVisible = await dateByAria.isVisible().catch(() => false);
    
    let dateClicked = false;
    
    if (dateVisible) {
      await dateByAria.click();
      console.log('  ✓ Clicked date via aria-label');
      dateClicked = true;
    } else {
      // Find by button text
      const dayClicked = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          if (btn.textContent?.trim() === '29') {
            const disabled = btn.disabled || btn.getAttribute('aria-disabled') === 'true';
            if (!disabled) {
              btn.click();
              return true;
            }
          }
        }
        return false;
      });
      
      if (dayClicked) {
        console.log('  ✓ Clicked date 29 via JavaScript');
        dateClicked = true;
      } else {
        console.log('  ✗ Date 29 not available');
      }
    }
    
    if (!dateClicked) {
      console.log('\nDate not available, ending...');
      await browser.close();
      return;
    }
    
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/workspace/openclaw/logs/square_a11y_times.png', fullPage: true });
    
    // Step 7: Extract times
    console.log('\nStep 7: Extracting times...');
    const times = await page.evaluate(() => {
      const text = document.body.innerText;
      const matches = text.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];
      return [...new Set(matches)].sort();
    });
    
    // Filter evening
    const evening = times.filter(t => {
      const m = t.match(/(\d{1,2}):(\d{2})\s*([AP])M/i);
      if (m) {
        let hour = parseInt(m[1]);
        const period = m[3].toUpperCase();
        if (period === 'P' && hour !== 12) hour += 12;
        return hour >= 17 && hour <= 19;
      }
      return false;
    });
    
    // Results
    const results = {
      location: pageInfo.location,
      service: pageInfo.service,
      date: '2026-04-29',
      allTimes: times,
      eveningTimes: evening,
      timestamp: new Date().toISOString()
    };
    
    await fs.promises.writeFile(
      '/workspace/openclaw/logs/square_a11y_results.json',
      JSON.stringify(results, null, 2)
    );
    
    console.log('\n=== RESULTS ===');
    console.log(`All times (${times.length}): ${times.join(', ')}`);
    console.log(`Evening (5-7 PM): ${evening.length > 0 ? evening.join(', ') : 'None'}`);
    console.log('\n✓ Saved to square_a11y_results.json');
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/square_a11y_error.png' });
  } finally {
    await browser.close();
  }
})();
