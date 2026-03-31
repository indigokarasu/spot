const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Square booking - extract from actual calendar page
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
    // Start from calendar page
    await page.goto('https://book.squareup.com/appointments/zhyuoylr81g79j/location/L6SV5MCXN00CB/services', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForTimeout(4000);
    
    // Click Next to get to calendar
    await page.mouse.click(1280, 212);
    await page.waitForTimeout(5000);
    
    await page.screenshot({ path: '/workspace/openclaw/logs/sq_cal_debug.png', fullPage: true });
    
    // Get ALL interactive elements
    console.log('=== Scanning page structure ===');
    
    const structure = await page.evaluate(() => {
      // Get all clickable elements including custom ones
      const allElements = document.querySelectorAll('*');
      const results = [];
      
      allElements.forEach(el => {
        const rect = el.getBoundingClientRect();
        const text = el.textContent?.trim() || '';
        
        // Only elements with size and text
        if (rect.width > 0 && rect.height > 0 && text.length > 0 && text.length < 100) {
          // Check if it looks like a date (1-31)
          const isDate = /^\d{1,2}$/.test(text) && parseInt(text) >= 1 && parseInt(text) <= 31;
          
          if (isDate || text.includes('AM') || text.includes('PM') || 
              text.toLowerCase().includes('april') || text.toLowerCase().includes('may')) {
            results.push({
              tag: el.tagName,
              text: text,
              x: Math.round(rect.x),
              y: Math.round(rect.y),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              disabled: el.disabled || el.getAttribute('aria-disabled') === 'true'
            });
          }
        }
      });
      
      return results.slice(0, 50); // Limit output
    });
    
    console.log('Date/time related elements:');
    structure.forEach(e => {
      console.log(`  ${e.tag}: "${e.text}" at (${e.x}, ${e.y}) ${e.disabled ? '[disabled]' : ''}`);
    });
    
    // Try to find dates in the page text
    const pageText = await page.evaluate(() => document.body.innerText);
    console.log('\n=== Page text sample ===');
    console.log(pageText.substring(0, 1000));
    
    // Extract dates from text
    const textLines = pageText.split('\n').filter(l => l.trim());
    console.log('\n=== Looking for dates in text ===');
    textLines.forEach((line, i) => {
      if (/^\d{1,2}$/.test(line.trim()) && parseInt(line) >= 1 && parseInt(line) <= 31) {
        console.log(`Line ${i}: "${line}" (possible date)`);
      }
    });
    
    // Find date 29 by scanning all elements
    console.log('\n=== Looking for date 29 ===');
    const date29 = structure.find(e => e.text === '29');
    
    if (date29) {
      console.log('Found date 29:', date29);
      
      if (!date29.disabled) {
        const clickX = date29.x + date29.width / 2;
        const clickY = date29.y + date29.height / 2;
        console.log(`Clicking at (${clickX}, ${clickY})`);
        
        await page.mouse.click(clickX, clickY);
        await page.waitForTimeout(5000);
        
        await page.screenshot({ path: '/workspace/openclaw/logs/sq_date29_times.png', fullPage: true });
        
        // Extract times
        const times = await page.evaluate(() => {
          const allText = document.body.innerText;
          const matches = allText.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];
          return [...new Set(matches)];
        });
        
        console.log('\n=== TIME SLOTS ===');
        console.log(times.join('\n') || 'No times found');
        
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
        console.log('Date 29 is disabled (not available)');
      }
    } else {
      console.log('Date 29 not found in calendar');
      
      // Try clicking by text content
      const allTextElements = await page.evaluate(() => {
        const elements = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        while (node = walker.nextNode()) {
          const text = node.textContent?.trim();
          if (text === '29') {
            const rect = node.parentElement.getBoundingClientRect();
            elements.push({
              x: rect.x + rect.width/2,
              y: rect.y + rect.height/2
            });
          }
        }
        return elements;
      });
      
      console.log('Text nodes with "29":', allTextElements);
      
      if (allTextElements.length > 0) {
        console.log('Trying to click text node...');
        await page.mouse.click(allTextElements[0].x, allTextElements[0].y);
        await page.waitForTimeout(5000);
        await page.screenshot({ path: '/workspace/openclaw/logs/sq_text29_times.png', fullPage: true });
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
