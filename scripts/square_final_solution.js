const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Complete Square booking automation - FINAL VERSION
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
    console.log('=== Square Booking Automation ===');
    
    // Step 1: Load booking page with Peppermint Pedi pre-selected
    console.log('\nStep 1: Loading booking page...');
    await page.goto('https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=XA4S2WKU7HYBHTWNKCPBIBDJ', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: '/workspace/openclaw/logs/sq_final_step1.png', fullPage: true });
    
    // Step 2: Select "Any staff"
    console.log('Step 2: Selecting "Any staff"...');
    
    const staffElements = await page.evaluate(() => {
      const rows = document.querySelectorAll('market-row');
      const results = [];
      
      rows.forEach((row, i) => {
        const text = row.textContent?.trim() || '';
        if (text.includes('Any staff')) {
          const rect = row.getBoundingClientRect();
          results.push({
            index: i,
            text: text.substring(0, 50),
            x: Math.round(rect.x + rect.width/2),
            y: Math.round(rect.y + rect.height/2)
          });
        }
      });
      
      return results;
    });
    
    if (staffElements.length > 0) {
      console.log(`  Found at (${staffElements[0].x}, ${staffElements[0].y})`);
      await page.mouse.click(staffElements[0].x, staffElements[0].y);
      await page.waitForTimeout(2000);
    }
    
    // Step 3: Click "Add" button
    console.log('Step 3: Clicking "Add" button...');
    
    const addBtn = await page.evaluate(() => {
      const buttons = document.querySelectorAll('market-button, button');
      for (const btn of buttons) {
        const text = btn.textContent?.trim();
        if (text === 'Add') {
          const rect = btn.getBoundingClientRect();
          return {
            x: rect.x + rect.width/2,
            y: rect.y + rect.height/2
          };
        }
      }
      return null;
    });
    
    if (addBtn) {
      console.log(`  Clicking at (${addBtn.x}, ${addBtn.y})`);
      await page.mouse.click(addBtn.x, addBtn.y);
      await page.waitForTimeout(4000);
    }
    
    await page.screenshot({ path: '/workspace/openclaw/logs/sq_final_step3.png', fullPage: true });
    
    // Step 4: Find and click "Next" button (might need to scroll)
    console.log('Step 4: Looking for "Next" button...');
    
    // Scroll to bottom to see Next button
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    const nextBtn = await page.evaluate(() => {
      const buttons = document.querySelectorAll('market-button, button');
      for (const btn of buttons) {
        const text = btn.textContent?.trim();
        const rect = btn.getBoundingClientRect();
        
        if ((text === 'Next' || text === 'Continue') && rect.y > 0) {
          return {
            text: text,
            x: rect.x + rect.width/2,
            y: rect.y + rect.height/2
          };
        }
      }
      return null;
    });
    
    if (nextBtn) {
      console.log(`  Found "${nextBtn.text}" at (${nextBtn.x}, ${nextBtn.y})`);
      await page.mouse.click(nextBtn.x, nextBtn.y);
      await page.waitForTimeout(5000);
    } else {
      // Try coordinate we found earlier
      console.log('  Trying coordinate (1280, 212)...');
      await page.mouse.click(1280, 212);
      await page.waitForTimeout(5000);
    }
    
    await page.screenshot({ path: '/workspace/openclaw/logs/sq_final_calendar.png', fullPage: true });
    
    // Step 5: Check if we're on calendar
    const pageInfo = await page.evaluate(() => ({
      url: window.location.href,
      text: document.body.innerText.substring(0, 1000)
    }));
    
    console.log('\nCurrent state:');
    console.log('URL:', pageInfo.url);
    console.log('Has dates:', /(January|February|March|April|May|June|July)/i.test(pageInfo.text));
    
    if (pageInfo.url.includes('calendar') || pageInfo.text.includes('2026')) {
      console.log('✓ Successfully reached calendar page!');
      
      // Step 6: Navigate to April if showing March
      if (pageInfo.text.includes('March')) {
        console.log('  Navigating to April...');
        
        // Find next month button
        const nextMonth = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            const aria = btn.getAttribute('aria-label');
            if (aria && aria.includes('Next')) {
              const rect = btn.getBoundingClientRect();
              return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
            }
          }
          return null;
        });
        
        if (nextMonth) {
          await page.mouse.click(nextMonth.x, nextMonth.y);
          await page.waitForTimeout(3000);
        }
      }
      
      await page.screenshot({ path: '/workspace/openclaw/logs/sq_final_april.png', fullPage: true });
      
      // Step 7: Find and click April 29
      console.log('Step 7: Looking for April 29...');
      
      // Get all elements and look for "29"
      const dates = await page.evaluate(() => {
        const results = [];
        const allElements = document.querySelectorAll('*');
        
        allElements.forEach(el => {
          const text = el.textContent?.trim();
          if (text === '29') {
            const rect = el.getBoundingClientRect();
            const disabled = el.disabled || el.getAttribute('aria-disabled') === 'true';
            
            if (rect.width > 0) {
              results.push({
                x: Math.round(rect.x + rect.width/2),
                y: Math.round(rect.y + rect.height/2),
                disabled: disabled,
                tag: el.tagName
              });
            }
          }
        });
        
        return results;
      });
      
      console.log('  Found', dates.length, 'elements with "29":', dates);
      
      const day29 = dates.find(d => !d.disabled);
      
      if (day29) {
        console.log(`  ✓ April 29 is available! Clicking at (${day29.x}, ${day29.y})`);
        await page.mouse.click(day29.x, day29.y);
        await page.waitForTimeout(5000);
        
        await page.screenshot({ path: '/workspace/openclaw/logs/sq_final_times.png', fullPage: true });
        
        // Step 8: Extract time slots
        console.log('Step 8: Extracting time slots...');
        
        const times = await page.evaluate(() => {
          const allText = document.body.innerText;
          const matches = allText.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];
          return [...new Set(matches)];
        });
        
        console.log('\n=== RESULTS ===');
        console.log('All available times:');
        times.forEach(t => console.log(`  ${t}`));
        
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
        
        console.log('\nEvening slots (5-7 PM):');
        evening.forEach(t => console.log(`  ${t}`));
        
        // Save results
        const results = {
          date: '2026-04-29',
          location: 'Shade Nail Spa',
          service: 'Peppermint Pedi',
          allTimes: times,
          eveningTimes: evening,
          timestamp: new Date().toISOString()
        };
        
        await fs.promises.writeFile('/workspace/openclaw/logs/square_final_availability.json', JSON.stringify(results, null, 2));
        console.log('\n✓ Results saved to square_final_availability.json');
        
      } else if (dates.length > 0) {
        console.log('  ✗ April 29 is disabled (not available)');
      } else {
        console.log('  ✗ April 29 not found on calendar');
      }
      
    } else {
      console.log('✗ Not on calendar page yet');
      console.log('Page text:', pageInfo.text.substring(0, 500));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/sq_final_error.png', fullPage: true });
  } finally {
    await browser.close();
  }
})();
