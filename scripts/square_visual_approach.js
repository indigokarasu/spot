const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Visual/Screenshot-based Square Booking
 * Use bounding boxes and coordinates to interact with custom elements
 */

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });

  const page = await context.newPage();

  try {
    console.log('=== Visual Coordinate Approach ===');
    
    // Load page
    await page.goto('https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=XA4S2WKU7HYBHTWNKCPBIBDJ', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForTimeout(3000);
    console.log('Page loaded, taking screenshot...');
    
    // Screenshot for visual debugging
    await page.screenshot({ path: '/workspace/openclaw/logs/square_step1_initial.png', fullPage: true });
    
    // Method 1: Get bounding box and click by coordinates
    console.log('\nMethod 1: Bounding box click for "Let\'s go"');
    const letsGoElements = await page.locator('button').filter({ hasText: /let\'s go/i }).all();
    console.log(`Found ${letsGoElements.length} potential "Let's go" buttons`);
    
    for (let i = 0; i < Math.min(letsGoElements.length, 3); i++) {
      const el = letsGoElements[i];
      const visible = await el.isVisible().catch(() => false);
      const box = await el.boundingBox().catch(() => null);
      console.log(`  Button ${i}: visible=${visible}, box=${JSON.stringify(box)}`);
      
      if (box && visible) {
        // Click by coordinates
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        console.log(`  Clicking at coordinates: (${x}, ${y})`);
        await page.mouse.click(x, y);
        await page.waitForTimeout(3000);
        break;
      }
    }
    
    await page.screenshot({ path: '/workspace/openclaw/logs/square_step2_after_letsgo.png', fullPage: true });
    
    // Method 2: Query shadow DOM elements directly
    console.log('\nMethod 2: Shadow DOM query for service selection');
    
    const shadowElements = await page.evaluate(() => {
      // Find all custom elements
      const customElements = document.querySelectorAll('market-button, market-row, market-list');
      const info = [];
      
      customElements.forEach((el, i) => {
        const text = el.textContent?.substring(0, 100) || '';
        const rect = el.getBoundingClientRect();
        info.push({
          tag: el.tagName,
          index: i,
          text: text,
          rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          }
        });
      });
      
      return info;
    });
    
    console.log(`Found ${shadowElements.length} custom elements`);
    
    // Look for Peppermint Pedi
    const pepElement = shadowElements.find(e => 
      e.text.toLowerCase().includes('peppermint') || 
      e.text.toLowerCase().includes('pedi')
    );
    
    if (peElement) {
      console.log('Found Peppermint Pedi element:', pepElement);
      const { x, y, width, height } = pepElement.rect;
      const clickX = x + width / 2;
      const clickY = y + height / 2;
      console.log(`Clicking at (${clickX}, ${clickY})`);
      await page.mouse.click(clickX, clickY);
      await page.waitForTimeout(3000);
    } else {
      console.log('Peppermint Pedi element not found in shadow DOM');
    }
    
    await page.screenshot({ path: '/workspace/openclaw/logs/square_step3_after_service.png', fullPage: true });
    
    // Method 3: Press Tab to navigate, Enter to select
    console.log('\nMethod 3: Keyboard navigation');
    
    // Focus something interactive first
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(3000);
    
    await page.screenshot({ path: '/workspace/openclaw/logs/square_step4_after_keyboard.png', fullPage: true });
    
    // Method 4: JavaScript click on custom elements
    console.log('\nMethod 4: JavaScript dispatchEvent on custom elements');
    
    await page.evaluate(() => {
      // Find and click the first interactive custom element
      const buttons = document.querySelectorAll('market-button, button');
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        if (text.includes('continue') || text.includes('next') || text.includes('select')) {
          console.log('Dispatching click event on:', text.substring(0, 50));
          
          // Dispatch multiple event types
          const events = ['mousedown', 'click', 'mouseup', 'pointerdown', 'pointerup'];
          events.forEach(type => {
            const event = new Event(type, { bubbles: true, cancelable: true });
            btn.dispatchEvent(event);
          });
          
          // Also try the custom element click method if it exists
          if (btn.click) btn.click();
          break;
        }
      }
    });
    
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '/workspace/openclaw/logs/square_step5_final.png', fullPage: true });
    
    // Try to extract visible text for time slots
    console.log('\n=== Extracting page content ===');
    const pageText = await page.locator('body').textContent();
    
    // Look for time patterns
    const timeMatches = pageText.match(/\d{1,2}:\d{2}\s*[AP]M/gi) || [];
    const uniqueTimes = [...new Set(timeMatches)];
    
    console.log('Times found on page:', uniqueTimes.slice(0, 20));
    
    // Look for dates
    const dateMatches = pageText.match(/(April|May|June)\s+\d{1,2}/gi) || [];
    console.log('Dates found:', [...new Set(dateMatches)].slice(0, 10));
    
    // Save results
    const results = {
      times: uniqueTimes,
      dates: [...new Set(dateMatches)],
      shadowElements: shadowElements.slice(0, 20),
      timestamp: new Date().toISOString()
    };
    
    await fs.promises.writeFile('/workspace/openclaw/logs/square_visual_results.json', JSON.stringify(results, null, 2));
    
    console.log('\n=== Screenshots saved ===');
    console.log('- square_step1_initial.png');
    console.log('- square_step2_after_letsgo.png');
    console.log('- square_step3_after_service.png');
    console.log('- square_step4_after_keyboard.png');
    console.log('- square_step5_final.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
