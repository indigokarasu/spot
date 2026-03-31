const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Square Booking Extractor v3
 * Strategy: Intercept internal API calls + JavaScript injection
 * Square uses GraphQL/internal APIs that we can capture
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
  
  // Store intercepted data
  const interceptedData = {
    services: [],
    availability: [],
    apiCalls: []
  };

  // Intercept network requests
  await page.route('**/*', async (route, request) => {
    const url = request.url();
    
    // Square uses GraphQL and internal APIs
    if (url.includes('square') && (url.includes('graphql') || url.includes('api') || url.includes('v2'))) {
      console.log('Intercepting:', url.slice(0, 80));
      
      route.continue();
      
      try {
        const response = await request.response();
        if (response) {
          const body = await response.text();
          interceptedData.apiCalls.push({
            url: url.slice(0, 100),
            preview: body.slice(0, 2000)
          });
          
          // Try to parse for services or availability
          if (body.includes('Peppermint') || body.includes('pedi') || body.includes('service')) {
            console.log('  Found service data in response');
            try {
              const json = JSON.parse(body);
              if (json.data) {
                interceptedData.services.push(json.data);
              }
            } catch (e) {}
          }
          
          if (body.includes('availability') || body.includes('2026-04')) {
            console.log('  Found availability data');
            interceptedData.availability.push(body.slice(0, 1000));
          }
        }
      } catch (e) {}
    } else {
      route.continue();
    }
  });

  try {
    console.log('Loading Square booking...');
    await page.goto('https://app.squareup.com/appointments/book/start/L6SV5MCXN00CB', {
      waitUntil: 'networkidle',
      timeout: 60000
    });
    
    // Wait for React to hydrate
    console.log('Waiting for React hydration...');
    await page.waitForTimeout(8000);
    
    // Method 1: Use page.evaluate to access React component tree or DOM directly
    console.log('Using JavaScript injection to find services...');
    
    const services = await page.evaluate(() => {
      // Try multiple strategies to find service elements
      const results = [];
      
      // Strategy 1: Look for data-testid attributes (common in React)
      const testIdElements = document.querySelectorAll('[data-testid*="service"], [data-testid*="item"]');
      testIdElements.forEach(el => {
        results.push({
          strategy: 'data-testid',
          text: el.textContent?.slice(0, 100),
          testId: el.getAttribute('data-testid'),
          clickable: el.tagName === 'BUTTON' || el.onclick !== null
        });
      });
      
      // Strategy 2: Look for elements containing "Peppermint"
      const allElements = document.querySelectorAll('*');
      for (const el of allElements) {
        const text = el.textContent?.toLowerCase() || '';
        if (text.includes('peppermint') && text.includes('pedi')) {
          results.push({
            strategy: 'text-content',
            text: el.textContent?.slice(0, 100),
            tagName: el.tagName,
            className: el.className,
            id: el.id,
            hasClick: el.onclick !== null || el.tagName === 'BUTTON'
          });
          
          // Try to find the actual clickable parent
          let parent = el.parentElement;
          for (let i = 0; i < 5 && parent; i++) {
            if (parent.tagName === 'BUTTON' || parent.getAttribute('role') === 'button') {
              results.push({
                strategy: 'clickable-parent',
                text: parent.textContent?.slice(0, 100),
                tagName: parent.tagName,
                clickable: true
              });
              break;
            }
            parent = parent.parentElement;
          }
        }
      }
      
      // Strategy 3: Access React props if available
      const reactElements = document.querySelectorAll('[data-reactroot], [data-reactid]');
      results.push({
        strategy: 'react-check',
        reactRootCount: reactElements.length
      });
      
      return results;
    });
    
    console.log('Services found via JS injection:', services.length);
    services.slice(0, 10).forEach((s, i) => console.log(`  ${i + 1}. ${s.strategy}: ${s.text?.slice(0, 40)}`));
    
    // Method 2: Try to find and click using evaluated JavaScript
    console.log('Attempting JavaScript click...');
    
    const clickResult = await page.evaluate(() => {
      // Find all elements that might be Peppermint Pedi
      const candidates = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
      
      while (walker.nextNode()) {
        const el = walker.currentNode;
        const text = el.textContent?.toLowerCase() || '';
        
        if (text.includes('peppermint') && text.includes('pedi')) {
          // Check if this or parent is clickable
          let target = el;
          for (let i = 0; i < 3 && target; i++) {
            if (target.tagName === 'BUTTON' || 
                target.getAttribute('role') === 'button' ||
                target.onclick ||
                target.getAttribute('tabindex') === '0') {
              candidates.push({
                found: true,
                text: target.textContent?.slice(0, 50),
                tagName: target.tagName,
                clicked: false
              });
              
              // Try to click
              try {
                target.click();
                target.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
                target.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
                candidates[candidates.length - 1].clicked = true;
              } catch (e) {
                candidates[candidates.length - 1].error = e.message;
              }
              break;
            }
            target = target.parentElement;
          }
        }
      }
      
      return candidates;
    });
    
    console.log('Click results:', clickResult);
    
    // Wait and check for navigation
    await page.waitForTimeout(5000);
    console.log('URL after click:', page.url());
    
    // Try to get availability data via API interception
    // Look for April 29 availability
    await page.evaluate((date) => {
      // Try to set date programmatically if there's a date picker
      const dateInputs = document.querySelectorAll('input[type="date"], [data-testid*="date"]');
      dateInputs.forEach(input => {
        input.value = date;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }, '2026-04-29');
    
    await page.waitForTimeout(3000);
    
    // Get time slots
    const timeSlots = await page.evaluate(() => {
      const slots = [];
      const allElements = document.querySelectorAll('button, div[role="button"], [tabindex]');
      
      for (const el of allElements) {
        const text = el.textContent?.trim() || '';
        if (text.match(/\d{1,2}:\d{2}/) && (text.includes('PM') || text.includes('AM'))) {
          slots.push(text);
        }
      }
      
      return slots;
    });
    
    console.log('Time slots found:', timeSlots);
    
    // Filter for evening (5-7 PM)
    const eveningSlots = timeSlots.filter(t => {
      const match = t.match(/(\d{1,2}):\d{2}\s*(PM)/i);
      if (match) {
        const hour = parseInt(match[1]);
        return hour >= 5 && hour <= 7;
      }
      return false;
    });
    
    console.log('Evening slots (5-7 PM):', eveningSlots);
    
    // Save all data
    const results = {
      url: page.url(),
      services: services,
      clickResults: clickResult,
      allTimeSlots: timeSlots,
      eveningSlots: eveningSlots,
      intercepted: interceptedData,
      timestamp: new Date().toISOString()
    };
    
    await fs.promises.writeFile('/workspace/openclaw/logs/square_v3_results.json', JSON.stringify(results, null, 2));
    await page.screenshot({ path: '/workspace/openclaw/logs/square_v3_final.png', fullPage: true });
    
    console.log('\n=== Summary ===');
    console.log('Services detected:', services.length);
    console.log('Time slots found:', timeSlots.length);
    console.log('Evening availability:', eveningSlots.length > 0 ? eveningSlots : 'None detected');
    
  } catch (error) {
    console.error('Error:', error.message);
    await page.screenshot({ path: '/workspace/openclaw/logs/square_v3_error.png', fullPage: true });
    await fs.promises.writeFile('/workspace/openclaw/logs/square_v3_error.json', JSON.stringify({ error: error.message }, null, 2));
  } finally {
    await browser.close();
  }
})();
