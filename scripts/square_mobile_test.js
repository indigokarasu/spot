const { chromium } = require('playwright');

/**
 * Square Mobile Site Test
 * Compare complexity vs desktop version
 */

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  // Mobile viewport
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });

  const page = await context.newPage();

  try {
    console.log('=== MOBILE SITE TEST ===');
    
    // Try mobile URL
    await page.goto('https://book.squareup.com/appointments/zhyuoylr81g79j/location/L6SV5MCXN00CB/services', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForTimeout(4000);
    
    // Check structure
    const info = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      bodyText: document.body.innerText.substring(0, 800),
      elementCount: document.querySelectorAll('*').length,
      buttonCount: document.querySelectorAll('button').length,
      customElements: Array.from(new Set(Array.from(document.querySelectorAll('*')).map(el => el.tagName))).filter(tag => tag.includes('-')).slice(0, 10)
    }));
    
    console.log('URL:', info.url);
    console.log('Element count:', info.elementCount);
    console.log('Button count:', info.buttonCount);
    console.log('Custom elements:', info.customElements);
    console.log('\nBody text preview:');
    console.log(info.bodyText);
    
    // Check for simpler selectors
    const buttons = await page.evaluate(() => {
      const btns = document.querySelectorAll('button, [role="button"], a');
      const results = [];
      btns.forEach((btn, i) => {
        if (i < 15) {
          results.push({
            tag: btn.tagName,
            text: btn.textContent?.trim().substring(0, 50),
            ariaLabel: btn.getAttribute('aria-label')?.substring(0, 50)
          });
        }
      });
      return results;
    });
    
    console.log('\nButtons found:');
    buttons.forEach(b => console.log(`  ${b.tag}: "${b.text}" aria="${b.ariaLabel}"`));
    
    await page.screenshot({ path: '/workspace/openclaw/logs/square_mobile.png', fullPage: true });
    console.log('\nScreenshot saved: square_mobile.png');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
