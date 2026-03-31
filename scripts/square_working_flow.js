const { chromium } = require('playwright');

/**
 * Square booking - working with actual page state
 * Current page shows staff selection
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
    console.log('Loading booking page...');
    await page.goto('https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=XA4S2WKU7HYBHTWNKCPBIBDJ', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForTimeout(4000);
    
    // Get current page state
    const pageInfo = await page.evaluate(() => {
      return {
        url: window.location.href,
        title: document.title,
        bodyText: document.body.innerText.substring(0, 1000)
      };
    });
    
    console.log('URL:', pageInfo.url);
    console.log('\nPage text preview:');
    console.log(pageInfo.bodyText);
    
    // Check what stage we're at
    if (pageInfo.bodyText.includes("Let's go")) {
      console.log('\n=== Stage: Initial landing page ===');
      // Click Let's go
      await page.click('text="Let\'s go"');
      await page.waitForTimeout(3000);
    }
    
    // Re-check
    const afterLetsGo = await page.evaluate(() => document.body.innerText.substring(0, 1000));
    
    if (afterLetsGo.includes('Peppermint Pedi') || afterLetsGo.includes('Select a service')) {
      console.log('\n=== Stage: Service selection ===');
      
      // Find Peppermint Pedi - it might be in a custom element
      const services = await page.evaluate(() => {
        const elements = document.querySelectorAll('market-row, market-list-item, [class*="service"], button');
        const results = [];
        
        elements.forEach(el => {
          const text = el.textContent?.trim() || '';
          if (text.toLowerCase().includes('peppermint') || text.toLowerCase().includes('pedi') || text.includes('$')) {
            const rect = el.getBoundingClientRect();
            results.push({
              text: text.substring(0, 100),
              x: Math.round(rect.x + rect.width/2),
              y: Math.round(rect.y + rect.height/2),
              tag: el.tagName
            });
          }
        });
        
        return results;
      });
      
      console.log('Services found:', services);
      
      if (services.length > 0) {
        const pep = services.find(s => s.text.toLowerCase().includes('peppermint'));
        if (pep) {
          console.log(`\nClicking Peppermint Pedi at (${pep.x}, ${pep.y})`);
          await page.mouse.click(pep.x, pep.y);
          await page.waitForTimeout(3000);
        }
      }
    }
    
    if (afterLetsGo.includes('Any staff') || afterLetsGo.includes('staff')) {
      console.log('\n=== Stage: Staff selection ===');
      
      // Click "Any staff" 
      const staffElements = await page.evaluate(() => {
        const elements = document.querySelectorAll('market-row, button');
        const results = [];
        
        elements.forEach(el => {
          const text = el.textContent?.trim() || '';
          if (text.toLowerCase().includes('any staff') || text.toLowerCase().includes('any available')) {
            const rect = el.getBoundingClientRect();
            results.push({
              text: text.substring(0, 50),
              x: Math.round(rect.x + rect.width/2),
              y: Math.round(rect.y + rect.height/2)
            });
          }
        });
        
        return results;
      });
      
      console.log('Staff options:', staffElements);
      
      if (staffElements.length > 0) {
        console.log(`\nClicking "Any staff" at (${staffElements[0].x}, ${staffElements[0].y})`);
        await page.mouse.click(staffElements[0].x, staffElements[0].y);
        await page.waitForTimeout(4000);
      }
    }
    
    // Check for Continue button
    const hasContinue = await page.evaluate(() => 
      document.body.innerText.includes('Continue')
    );
    
    if (hasContinue) {
      console.log('\n=== Stage: Ready to continue ===');
      await page.click('text="Continue"');
      await page.waitForTimeout(5000);
    }
    
    // Now check for calendar
    const pageText = await page.evaluate(() => document.body.innerText);
    
    if (pageText.includes('2026') || pageText.includes('March') || pageText.includes('April')) {
      console.log('\n=== Stage: Calendar view ===');
      
      // Navigate to April if showing March
      if (pageText.includes('March 2026')) {
        console.log('Currently showing March, looking for next month...');
        
        // Find and click next month arrow
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
      
      // Find available dates
      const availableDates = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        const dates = [];
        
        buttons.forEach(btn => {
          const text = btn.textContent?.trim();
          const ariaDisabled = btn.getAttribute('aria-disabled');
          const disabled = btn.disabled || ariaDisabled === 'true';
          
          if (text && /^\d{1,2}$/.test(text)) {
            dates.push({
              day: parseInt(text),
              disabled: disabled,
              available: !disabled
            });
          }
        });
        
        return dates;
      });
      
      console.log('\nAvailable dates:', availableDates.filter(d => d.available).map(d => d.day));
      
      // Click date 29
      const day29 = availableDates.find(d => d.day === 29 && d.available);
      if (day29) {
        console.log('\nClicking date 29...');
        
        // Find the button for date 29
        const date29Pos = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            if (btn.textContent?.trim() === '29') {
              const rect = btn.getBoundingClientRect();
              return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
            }
          }
          return null;
        });
        
        if (date29Pos) {
          await page.mouse.click(date29Pos.x, date29Pos.y);
          await page.waitForTimeout(5000);
          
          // Screenshot
          await page.screenshot({ path: '/workspace/openclaw/logs/square_timeslots.png', fullPage: true });
          
          // Extract time slots
          const times = await page.evaluate(() => {
            const text = document.body.innerText;
            const matches = text.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];
            return [...new Set(matches)];
          });
          
          console.log('\n=== TIME SLOTS FOUND ===');
          console.log(times.join(', '));
          
          // Filter for evening
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
          
          console.log('\n=== EVENING SLOTS (5-7 PM) ===');
          console.log(evening.join(', ') || 'No evening slots');
        }
      } else {
        console.log('\nDate 29 is not available');
      }
    }
    
    // Final screenshot
    await page.screenshot({ path: '/workspace/openclaw/logs/square_final.png', fullPage: true });
    console.log('\nFinal screenshot saved: square_final.png');
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/square_error.png' });
  } finally {
    await browser.close();
  }
})();
