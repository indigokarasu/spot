const { chromium } = require('playwright');

/**
 * Square Accessibility-First Approach
 * Use aria attributes and semantic navigation
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
    console.log('=== ACCESSIBILITY-FIRST TEST ===');
    
    await page.goto('https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=XA4S2WKU7HYBHTWNKCPBIBDJ', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(5000);
    
    // Test 1: Get by aria-label
    console.log('\nTest 1: aria-label selectors');
    const ariaButtons = await page.evaluate(() => {
      const buttons = document.querySelectorAll('[aria-label]');
      const results = [];
      buttons.forEach(btn => {
        const label = btn.getAttribute('aria-label');
        if (label && label.length > 0) {
          results.push({
            label: label,
            tag: btn.tagName,
            disabled: btn.disabled || btn.getAttribute('aria-disabled') === 'true'
          });
        }
      });
      return results.slice(0, 15);
    });
    
    console.log('aria-label buttons:', ariaButtons);
    
    // Test 2: Get by role
    console.log('\nTest 2: role selectors');
    const roleElements = await page.evaluate(() => {
      const elements = document.querySelectorAll('[role]');
      const results = [];
      elements.forEach(el => {
        const role = el.getAttribute('role');
        const text = el.textContent?.trim().substring(0, 40);
        if (role && (role === 'button' || role === 'radio' || role === 'tab')) {
          results.push({ role, text, tag: el.tagName });
        }
      });
      return results.slice(0, 15);
    });
    
    console.log('Role elements:', roleElements);
    
    // Test 3: Use semantic structure
    console.log('\nTest 3: Semantic structure');
    const semantic = await page.evaluate(() => {
      return {
        headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent?.trim()).slice(0, 5),
        lists: document.querySelectorAll('ul, ol').length,
        landmarks: Array.from(new Set(Array.from(document.querySelectorAll('[role]')).map(el => el.getAttribute('role')))),
        labels: Array.from(document.querySelectorAll('label')).map(l => l.textContent?.trim()).slice(0, 5)
      };
    });
    
    console.log('Semantic structure:', semantic);
    
    // Test 4: Check if aria helps find dates
    console.log('\nTest 4: Navigate and find dates via aria');
    
    // Quick navigation flow
    await page.mouse.click(960, 374); // Any staff
    await page.waitForTimeout(2000);
    await page.mouse.click(960, 1040); // Add
    await page.waitForTimeout(2000);
    await page.mouse.click(1280, 317); // Next
    await page.waitForTimeout(4000);
    
    // Now look for dates with aria
    const dateInfo = await page.evaluate(() => {
      const buttons = document.querySelectorAll('button');
      const results = [];
      buttons.forEach(btn => {
        const text = btn.textContent?.trim();
        if (/^\d{1,2}$/.test(text)) {
          results.push({
            day: parseInt(text),
            ariaLabel: btn.getAttribute('aria-label'),
            ariaDisabled: btn.getAttribute('aria-disabled'),
            disabled: btn.disabled
          });
        }
      });
      return results;
    });
    
    console.log('Date buttons with aria:', dateInfo);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
