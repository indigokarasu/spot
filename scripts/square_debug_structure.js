const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Debug version - understand page structure
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
    // Navigate to calendar quickly
    await page.goto('https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=XA4S2WKU7HYBHTWNKCPBIBDJ', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(4000);
    
    // Quick navigation
    await page.locator('[aria-label="Any staff"]').first().click().catch(() => {});
    await page.waitForTimeout(2000);
    await page.mouse.click(960, 1040); // Add
    await page.waitForTimeout(2000);
    await page.mouse.click(1280, 317); // Next
    await page.waitForTimeout(5000);
    
    // Debug: Get page text structure
    console.log('=== PAGE TEXT ANALYSIS ===');
    const pageText = await page.evaluate(() => document.body.innerText);
    
    // Look for month names
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const foundMonths = months.filter(m => pageText.includes(m));
    console.log('Months found in text:', foundMonths);
    
    // Look for specific patterns
    console.log('\n=== Looking for date patterns ===');
    const lines = pageText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    lines.slice(0, 50).forEach((line, i) => {
      if (/\d/.test(line) && line.length < 50) {
        console.log(`Line ${i}: "${line}"`);
      }
    });
    
    // Debug: Get all buttons with text
    console.log('\n=== BUTTONS ===');
    const buttons = await page.evaluate(() => {
      const btns = document.querySelectorAll('button, [role="button"]');
      const results = [];
      btns.forEach(btn => {
        const text = btn.textContent?.trim();
        if (text && text.length < 100) {
          results.push({
            text: text,
            disabled: btn.disabled || btn.getAttribute('aria-disabled') === 'true',
            ariaLabel: btn.getAttribute('aria-label')
          });
        }
      });
      return results;
    });
    
    buttons.slice(0, 30).forEach(b => {
      console.log(`  "${b.text}" disabled=${b.disabled} aria="${b.ariaLabel}"`);
    });
    
    // Debug: Find elements with "29"
    console.log('\n=== ELEMENTS WITH "29" ===');
    const elementsWith29 = await page.evaluate(() => {
      const results = [];
      const all = document.querySelectorAll('*');
      all.forEach(el => {
        const text = el.textContent?.trim();
        const aria = el.getAttribute('aria-label');
        if ((text === '29' || aria?.includes('29'))) {
          results.push({
            tag: el.tagName,
            text: text,
            ariaLabel: aria,
            disabled: el.disabled || el.getAttribute('aria-disabled') === 'true'
          });
        }
      });
      return results;
    });
    
    console.log('Found', elementsWith29.length, 'elements:');
    elementsWith29.forEach(e => console.log(e));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
