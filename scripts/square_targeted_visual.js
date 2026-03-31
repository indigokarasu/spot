const { chromium } = require('playwright');

/**
 * Targeted visual approach - use known coordinates from screenshot
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
    
    // Wait for React to hydrate
    await page.waitForTimeout(5000);
    
    // Screenshot to see current state
    await page.screenshot({ path: '/workspace/openclaw/logs/square_current.png' });
    console.log('Screenshot saved: square_current.png');
    
    // Get all clickable elements with their text and positions
    const elements = await page.evaluate(() => {
      const allElements = document.querySelectorAll('button, [role="button"], market-button, market-row');
      const data = [];
      
      allElements.forEach((el, i) => {
        const rect = el.getBoundingClientRect();
        const text = el.textContent?.trim() || '';
        
        if (rect.width > 0 && rect.height > 0) {
          data.push({
            index: i,
            tag: el.tagName,
            text: text.substring(0, 100),
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            clickable: !el.disabled
          });
        }
      });
      
      return data;
    });
    
    console.log(`\nFound ${elements.length} interactive elements:`);
    elements.slice(0, 15).forEach(e => {
      console.log(`  [${e.index}] ${e.tag}: "${e.text.substring(0, 40)}" at (${e.x}, ${e.y}) ${e.clickable ? '[clickable]' : '[disabled]'}`);
    });
    
    // Find "Let's go" button
    const letsGo = elements.find(e => e.text.toLowerCase().includes("let's go") || e.text.toLowerCase().includes("lets go"));
    if (letsGo) {
      console.log(`\nClicking "Let's go" at (${letsGo.x + letsGo.width/2}, ${letsGo.y + letsGo.height/2})`);
      await page.mouse.click(letsGo.x + letsGo.width/2, letsGo.y + letsGo.height/2);
      await page.waitForTimeout(3000);
    }
    
    // Screenshot after click
    await page.screenshot({ path: '/workspace/openclaw/logs/square_after_letsgo.png' });
    
    // Re-scan for Peppermint Pedi
    const elements2 = await page.evaluate(() => {
      const allElements = document.querySelectorAll('button, [role="button"], market-button, market-row, market-list-item');
      const data = [];
      
      allElements.forEach((el) => {
        const rect = el.getBoundingClientRect();
        const text = el.textContent?.trim() || '';
        
        if (rect.width > 0 && rect.height > 0) {
          data.push({
            tag: el.tagName,
            text: text.substring(0, 100),
            x: Math.round(rect.x + rect.width/2),
            y: Math.round(rect.y + rect.height/2)
          });
        }
      });
      
      return data;
    });
    
    console.log(`\nAfter "Let's go" - ${elements2.length} elements:`);
    elements2.slice(0, 20).forEach(e => {
      if (e.text.toLowerCase().includes('peppermint') || e.text.toLowerCase().includes('pedi') || e.text.toLowerCase().includes('$')) {
        console.log(`  >>> ${e.tag}: "${e.text.substring(0, 50)}" at (${e.x}, ${e.y})`);
      }
    });
    
    // Click Peppermint Pedi
    const pep = elements2.find(e => 
      e.text.toLowerCase().includes('peppermint') || 
      (e.text.toLowerCase().includes('pedi') && e.text.includes('$'))
    );
    
    if (pep) {
      console.log(`\nClicking Peppermint Pedi at (${pep.x}, ${pep.y})`);
      await page.mouse.click(pep.x, pep.y);
      await page.waitForTimeout(3000);
      
      // Screenshot
      await page.screenshot({ path: '/workspace/openclaw/logs/square_after_service.png' });
      
      // Look for Continue button
      const elements3 = await page.evaluate(() => {
        const allElements = document.querySelectorAll('button, [role="button"], market-button');
        const data = [];
        
        allElements.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const text = el.textContent?.trim() || '';
          
          if (rect.width > 0 && rect.height > 0 && text.toLowerCase().includes('continue')) {
            data.push({
              text: text,
              x: Math.round(rect.x + rect.width/2),
              y: Math.round(rect.y + rect.height/2)
            });
          }
        });
        
        return data;
      });
      
      if (elements3.length > 0) {
        console.log(`Clicking Continue at (${elements3[0].x}, ${elements3[0].y})`);
        await page.mouse.click(elements3[0].x, elements3[0].y);
        await page.waitForTimeout(5000);
        
        // Screenshot calendar page
        await page.screenshot({ path: '/workspace/openclaw/logs/square_calendar.png' });
        
        // Extract calendar data
        const calendarData = await page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          const dates = [];
          
          buttons.forEach(btn => {
            const text = btn.textContent?.trim();
            const disabled = btn.disabled || btn.getAttribute('aria-disabled') === 'true';
            
            if (text && /^\d{1,2}$/.test(text)) {
              dates.push({
                day: parseInt(text),
                disabled: disabled
              });
            }
          });
          
          return dates;
        });
        
        console.log('\nCalendar days found:', calendarData.slice(0, 10));
        
        // Click date 29 if available
        const day29 = calendarData.find(d => d.day === 29 && !d.disabled);
        if (day29) {
          console.log('Clicking date 29...');
          await page.click('button:has-text("29")').catch(() => console.log('Click failed'));
          await page.waitForTimeout(5000);
          await page.screenshot({ path: '/workspace/openclaw/logs/square_timeslots.png' });
          
          // Extract time slots
          const times = await page.evaluate(() => {
            const allText = document.body.innerText;
            const matches = allText.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];
            return [...new Set(matches)];
          });
          
          console.log('\nTime slots found:', times);
        } else {
          console.log('Date 29 not available or disabled');
        }
      }
    } else {
      console.log('Peppermint Pedi not found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/square_error.png' });
  } finally {
    await browser.close();
  }
})();
