const { chromium } = require('playwright');

/**
 * Direct load of /availability endpoint
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
    console.log('=== Direct /availability Load ===\n');
    
    // Load the exact URL provided
    const url = 'https://book.squareup.com/appointments/zhyuoylr81g79j/location/L6SV5MCXN00CB/availability';
    console.log('Loading:', url);
    
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(5000);
    
    const finalUrl = page.url();
    console.log('\nFinal URL:', finalUrl);
    
    const info = await page.evaluate(() => ({
      title: document.title,
      hasCalendar: document.body.innerText.includes('2026'),
      hasStaff: document.body.innerText.includes('staff'),
      text: document.body.innerText.substring(0, 800)
    }));
    
    console.log('\nPage Info:');
    console.log('  Title:', info.title);
    console.log('  Has calendar:', info.hasCalendar);
    console.log('  Has staff:', info.hasStaff);
    console.log('  Text preview:', info.text);
    
    // Try to find any date elements
    const dates = await page.evaluate(() => {
      const btns = document.querySelectorAll('market-button[data-testid^="date-"]');
      return Array.from(btns).map(b => ({
        testId: b.getAttribute('data-testid'),
        disabled: b.disabled,
        text: b.textContent?.trim()
      })).slice(0, 10);
    });
    
    console.log('\nDate elements found:', dates.length);
    dates.forEach(d => console.log(`  ${d.testId}: ${d.text} (${d.disabled ? 'disabled' : 'available'})`));
    
    // Specifically check April 29
    const date29 = dates.find(d => d.testId === 'date-29');
    if (date29) {
      console.log('\nApril 29:', date29.disabled ? 'DISABLED' : 'AVAILABLE');
    }
    
    await page.screenshot({ 
      path: '/workspace/openclaw/logs/direct_availability.png',
      fullPage: true 
    });
    
    console.log('\nScreenshot saved');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
