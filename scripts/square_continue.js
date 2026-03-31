const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Square booking - Continue to calendar
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
    // Start from the current state (service added)
    await page.goto('https://book.squareup.com/appointments/zhyuoylr81g79j/location/L6SV5MCXN00CB/services', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForTimeout(4000);
    await page.screenshot({ path: '/workspace/openclaw/logs/sq_continue_start.png', fullPage: true });
    
    // Look for Continue button - might be "Next" or need to scroll
    console.log('Looking for Continue/Next button...');
    
    // Scroll down to see if there's a button at bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    
    const buttons = await page.evaluate(() => {
      const allBtns = document.querySelectorAll('button, market-button');
      const results = [];
      
      allBtns.forEach(btn => {
        const text = btn.textContent?.trim() || '';
        const rect = btn.getBoundingClientRect();
        
        if (rect.width > 0 && (text.toLowerCase().includes('continue') || text.toLowerCase().includes('next') || text.toLowerCase().includes('done'))) {
          results.push({
            text: text,
            x: Math.round(rect.x + rect.width/2),
            y: Math.round(rect.y + rect.height/2)
          });
        }
      });
      
      return results;
    });
    
    console.log('Navigation buttons:', buttons);
    
    if (buttons.length > 0) {
      console.log(`Clicking "${buttons[0].text}"`);
      await page.mouse.click(buttons[0].x, buttons[0].y);
      await page.waitForTimeout(5000);
      
      await page.screenshot({ path: '/workspace/openclaw/logs/sq_calendar_page.png', fullPage: true });
      
      // Check where we are
      const info = await page.evaluate(() => ({
        url: window.location.href,
        text: document.body.innerText.substring(0, 800)
      }));
      
      console.log('Current URL:', info.url);
      console.log('Page text:', info.text.substring(0, 500));
      
      // Check if on calendar
      if (info.text.includes('2026') || /(January|February|March|April|May|June)/i.test(info.text)) {
        console.log('\n=== CALENDAR PAGE REACHED ===');
        
        // Navigate to April
        let pageText = info.text;
        if (pageText.includes('March')) {
          console.log('Currently showing March, navigating to April...');
          
          // Find next month button
          const nextBtn = await page.evaluate(() => {
            const btns = document.querySelectorAll('button');
            for (const btn of btns) {
              const aria = btn.getAttribute('aria-label');
              if (aria && (aria.includes('Next') || aria.includes('next'))) {
                const rect = btn.getBoundingClientRect();
                return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
              }
            }
            return null;
          });
          
          if (nextBtn) {
            await page.mouse.click(nextBtn.x, nextBtn.y);
            await page.waitForTimeout(3000);
          }
        }
        
        await page.screenshot({ path: '/workspace/openclaw/logs/sq_april_calendar.png', fullPage: true });
        
        // Find available dates
        const dates = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          const results = [];
          
          buttons.forEach(btn => {
            const text = btn.textContent?.trim();
            const disabled = btn.disabled || btn.getAttribute('aria-disabled') === 'true';
            const rect = btn.getBoundingClientRect();
            const ariaLabel = btn.getAttribute('aria-label') || '';
            
            if (text && /^\d{1,2}$/.test(text)) {
              results.push({
                day: parseInt(text),
                disabled: disabled,
                available: !disabled,
                x: Math.round(rect.x + rect.width/2),
                y: Math.round(rect.y + rect.height/2),
                ariaLabel: ariaLabel
              });
            }
          });
          
          return results;
        });
        
        console.log('\n=== APRIL DATES ===');
        const available = dates.filter(d => d.available);
        console.log('Available:', available.map(d => d.day));
        console.log('All dates:', dates);
        
        // Click date 29
        const day29 = dates.find(d => d.day === 29 && d.available);
        if (day29) {
          console.log(`\n=== Clicking April 29 at (${day29.x}, ${day29.y}) ===`);
          await page.mouse.click(day29.x, day29.y);
          await page.waitForTimeout(5000);
          
          await page.screenshot({ path: '/workspace/openclaw/logs/sq_april29_times.png', fullPage: true });
          
          // Extract time slots
          const times = await page.evaluate(() => {
            const text = document.body.innerText;
            const matches = text.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];
            return [...new Set(matches)];
          });
          
          console.log('\n=== ALL TIME SLOTS ===');
          console.log(times.join('\n'));
          
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
          console.log(evening.join('\n') || 'No evening slots');
          
          // Save results
          const results = {
            date: '2026-04-29',
            allTimes: times,
            eveningTimes: evening,
            timestamp: new Date().toISOString()
          };
          
          await fs.promises.writeFile('/workspace/openclaw/logs/square_availability.json', JSON.stringify(results, null, 2));
          
        } else {
          console.log('\nApril 29 is not available');
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/sq_continue_error.png' });
  } finally {
    await browser.close();
  }
})();
