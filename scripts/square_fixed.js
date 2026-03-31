const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Square Booking - Fixed for actual page structure
 * Handles DIV-based dates and abbreviated month names
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
    console.log('=== Square Booking (Fixed) ===\n');
    
    // Load page
    await page.goto('https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=XA4S2WKU7HYBHTWNKCPBIBDJ', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(4000);
    
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
    
    // Step 1: Select staff
    console.log('\nStep 1: Selecting staff...');
    await page.locator('[aria-label="Any staff"]').first().click().catch(() => {
      return page.locator('market-radio').first().click();
    });
    console.log('  ✓ Staff selected');
    await page.waitForTimeout(2000);
    
    // Step 2: Add to appointment
    console.log('\nStep 2: Adding to appointment...');
    await page.locator('[aria-label="Add"]').first().click().catch(() => {
      return page.mouse.click(960, 1040);
    });
    console.log('  ✓ Added');
    await page.waitForTimeout(3000);
    
    // Step 3: Continue to calendar
    console.log('\nStep 3: Continuing to calendar...');
    await page.locator('[aria-label="Next"]').first().click().catch(() => {
      return page.mouse.click(1280, 317);
    });
    console.log('  ✓ Navigated to calendar');
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: '/workspace/openclaw/logs/square_fixed_calendar.png', fullPage: true });
    
    // Step 4: Check current month and navigate
    console.log('\nStep 4: Checking calendar...');
    const calendarInfo = await page.evaluate(() => {
      const text = document.body.innerText;
      return {
        hasMar: text.includes('Mar'),
        hasApr: text.includes('Apr'),
        hasApril: text.includes('April'),
        has2026: text.includes('2026')
      };
    });
    
    console.log(`  Month info: Mar=${calendarInfo.hasMar}, Apr=${calendarInfo.hasApr}, 2026=${calendarInfo.has2026}`);
    
    if (calendarInfo.hasMar && !calendarInfo.hasApr) {
      console.log('  Navigating from March to April...');
      
      // Click next month - try multiple approaches
      const nextClicked = await page.evaluate(() => {
        // Look for any element that might be "next" button
        const elements = document.querySelectorAll('button, [role="button"], svg, market-icon');
        for (const el of elements) {
          const aria = el.getAttribute('aria-label');
          if (aria && (aria.includes('Next') || aria.includes('next'))) {
            el.click();
            return true;
          }
        }
        return false;
      });
      
      if (!nextClicked) {
        // Coordinate fallback for next month button (typically top right of calendar)
        await page.mouse.click(1400, 200);
      }
      
      await page.waitForTimeout(4000);
      console.log('  ✓ Navigated to April');
    }
    
    await page.screenshot({ path: '/workspace/openclaw/logs/square_fixed_april.png', fullPage: true });
    
    // Step 5: Click date 29
    console.log('\nStep 5: Selecting April 29...');
    
    // Find and click date 29 - try multiple strategies
    const dateClicked = await page.evaluate(() => {
      // Find all elements with text "29"
      const allElements = document.querySelectorAll('*');
      const candidates = [];
      
      for (const el of allElements) {
        const text = el.childNodes[0]?.textContent?.trim();
        if (text === '29' && el.tagName !== 'SCRIPT' && el.tagName !== 'STYLE') {
          const rect = el.getBoundingClientRect();
          const disabled = el.disabled || el.getAttribute('aria-disabled') === 'true';
          
          candidates.push({
            tag: el.tagName,
            x: rect.x + rect.width/2,
            y: rect.y + rect.height/2,
            disabled: disabled,
            hasClick: typeof el.click === 'function'
          });
          
          // Click the first valid one
          if (!disabled && rect.width > 0) {
            el.click();
            return { clicked: true, tag: el.tagName, x: rect.x, y: rect.y };
          }
        }
      }
      
      return { clicked: false, candidates: candidates };
    });
    
    if (dateClicked.clicked) {
      console.log(`  ✓ Clicked date 29 (${dateClicked.tag})`);
    } else {
      console.log('  Date 29 candidates:', dateClicked.candidates);
      
      // Try coordinate clicking
      if (dateClicked.candidates?.length > 0) {
        const c = dateClicked.candidates[0];
        await page.mouse.click(c.x, c.y);
        console.log(`  ✓ Clicked date via coordinates (${c.x}, ${c.y})`);
      } else {
        console.log('  ✗ Could not find date 29');
        await browser.close();
        return;
      }
    }
    
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/workspace/openclaw/logs/square_fixed_times.png', fullPage: true });
    
    // Step 6: Extract times
    console.log('\nStep 6: Extracting times...');
    const times = await page.evaluate(() => {
      const text = document.body.innerText;
      const matches = text.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];
      return [...new Set(matches)].sort();
    });
    
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
    
    // Save results
    const results = {
      location: pageInfo.location,
      service: pageInfo.service,
      date: '2026-04-29',
      allTimes: times,
      eveningTimes: evening,
      timestamp: new Date().toISOString()
    };
    
    await fs.promises.writeFile(
      '/workspace/openclaw/logs/square_fixed_results.json',
      JSON.stringify(results, null, 2)
    );
    
    console.log('\n=== RESULTS ===');
    console.log(`All times (${times.length}): ${times.join(', ')}`);
    console.log(`Evening (5-7 PM): ${evening.length > 0 ? evening.join(', ') : 'None'}`);
    console.log('\n✓ Saved to square_fixed_results.json');
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/square_fixed_error.png' });
  } finally {
    await browser.close();
  }
})();
