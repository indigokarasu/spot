const { chromium } = require('playwright');

/**
 * Square booking - handle custom web components properly
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
    
    await page.waitForTimeout(5000);
    await page.screenshot({ path: '/workspace/openclaw/logs/square_v2_start.png', fullPage: true });
    
    // Get full page text
    let pageText = await page.evaluate(() => document.body.innerText);
    console.log('\n=== Page content ===');
    console.log(pageText.substring(0, 800));
    
    // Look for "Add" button or "Continue" or "Next"
    console.log('\n=== Looking for navigation buttons ===');
    
    const buttons = await page.evaluate(() => {
      const allButtons = document.querySelectorAll('button, market-button, [role="button"]');
      const results = [];
      
      allButtons.forEach((btn, i) => {
        const text = btn.textContent?.trim() || '';
        const rect = btn.getBoundingClientRect();
        
        if (rect.width > 0) {
          results.push({
            index: i,
            text: text.substring(0, 50),
            tag: btn.tagName,
            disabled: btn.disabled,
            x: Math.round(rect.x + rect.width/2),
            y: Math.round(rect.y + rect.height/2)
          });
        }
      });
      
      return results;
    });
    
    console.log('Buttons found:');
    buttons.forEach(b => {
      console.log(`  [${b.index}] ${b.tag}: "${b.text}" at (${b.x}, ${b.y}) ${b.disabled ? '[disabled]' : ''}`);
    });
    
    // Find Add or Continue button
    const navButton = buttons.find(b => 
      b.text.toLowerCase().includes('add') || 
      b.text.toLowerCase().includes('continue') ||
      b.text.toLowerCase().includes('next')
    );
    
    if (navButton && !navButton.disabled) {
      console.log(`\nClicking "${navButton.text}" at (${navButton.x}, ${navButton.y})`);
      
      // Try multiple click methods
      await page.mouse.click(navButton.x, navButton.y);
      await page.waitForTimeout(2000);
      
      // Also try JS click
      await page.evaluate(({x, y}) => {
        const el = document.elementFromPoint(x, y);
        if (el) {
          ['mousedown', 'click', 'mouseup'].forEach(type => {
            el.dispatchEvent(new MouseEvent(type, { bubbles: true }));
          });
        }
      }, { x: navButton.x, y: navButton.y });
      
      await page.waitForTimeout(3000);
      await page.screenshot({ path: '/workspace/openclaw/logs/square_v2_after_nav.png', fullPage: true });
    }
    
    // Check page state again
    pageText = await page.evaluate(() => document.body.innerText);
    
    // If we see a calendar, extract dates
    if (pageText.includes('2026') || /(January|February|March|April|May|June)/i.test(pageText)) {
      console.log('\n=== Calendar detected! ===');
      
      // Look for date buttons
      const dates = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        const results = [];
        
        buttons.forEach(btn => {
          const text = btn.textContent?.trim();
          const ariaLabel = btn.getAttribute('aria-label') || '';
          const disabled = btn.disabled || btn.getAttribute('aria-disabled') === 'true';
          const rect = btn.getBoundingClientRect();
          
          if (text && /^\d{1,2}$/.test(text)) {
            results.push({
              day: parseInt(text),
              disabled: disabled,
              x: Math.round(rect.x + rect.width/2),
              y: Math.round(rect.y + rect.height/2)
            });
          }
        });
        
        return results;
      });
      
      console.log('Dates on calendar:', dates);
      
      // Navigate to April
      const isMarch = pageText.includes('March');
      const isApril = pageText.includes('April');
      
      if (isMarch) {
        console.log('Need to navigate to April...');
        
        // Find next month button
        const nextBtn = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          for (const btn of buttons) {
            const aria = btn.getAttribute('aria-label');
            if (aria && (aria.includes('Next month') || aria.includes('next month'))) {
              const rect = btn.getBoundingClientRect();
              return { x: rect.x + rect.width/2, y: rect.y + rect.height/2 };
            }
          }
          return null;
        });
        
        if (nextBtn) {
          await page.mouse.click(nextBtn.x, nextBtn.y);
          await page.waitForTimeout(3000);
          await page.screenshot({ path: '/workspace/openclaw/logs/square_v2_april.png', fullPage: true });
        }
      }
      
      // Re-scan dates
      const aprilDates = await page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        const results = [];
        
        buttons.forEach(btn => {
          const text = btn.textContent?.trim();
          const disabled = btn.disabled || btn.getAttribute('aria-disabled') === 'true';
          const rect = btn.getBoundingClientRect();
          
          if (text && /^\d{1,2}$/.test(text)) {
            results.push({
              day: parseInt(text),
              disabled: disabled,
              x: Math.round(rect.x + rect.width/2),
              y: Math.round(rect.y + rect.height/2)
            });
          }
        });
        
        return results;
      });
      
      console.log('April dates:', aprilDates.filter(d => !d.disabled).map(d => d.day));
      
      // Click date 29
      const day29 = aprilDates.find(d => d.day === 29 && !d.disabled);
      if (day29) {
        console.log(`\nClicking date 29 at (${day29.x}, ${day29.y})`);
        await page.mouse.click(day29.x, day29.y);
        await page.waitForTimeout(5000);
        
        await page.screenshot({ path: '/workspace/openclaw/logs/square_v2_timeslots.png', fullPage: true });
        
        // Extract time slots
        const times = await page.evaluate(() => {
          const text = document.body.innerText;
          const matches = text.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];
          return [...new Set(matches)];
        });
        
        console.log('\n=== TIME SLOTS ===');
        console.log(times.join('\n'));
        
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
        
        console.log('\n=== EVENING (5-7 PM) ===');
        console.log(evening.join('\n') || 'No evening slots');
        
      } else {
        console.log('Date 29 is not available');
      }
    }
    
    console.log('\nDone.');
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/square_v2_error.png' });
  } finally {
    await browser.close();
  }
})();
