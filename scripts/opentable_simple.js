const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({
    headless: false, // Try headed mode
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-http2',
      '--disable-quic'
    ]
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  try {
    console.log('Loading with HTTP/1.1...');
    
    await page.goto('https://www.opentable.com/r/atelier-crenn', {
      waitUntil: 'load',
      timeout: 60000
    });
    
    console.log('Loaded!');
    console.log('URL:', page.url());
    console.log('Title:', await page.title());
    
    await page.waitForTimeout(10000);
    
    const info = await page.evaluate(() => ({
      title: document.title,
      hasAccessDenied: document.body.innerText.includes('Access Denied'),
      hasBooking: document.body.innerText.includes('Book')
    }));
    
    console.log('Info:', info);
    
    await page.screenshot({ path: '/workspace/openclaw/logs/opentable_headed.png' });
    
    // Wait for user to see
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
