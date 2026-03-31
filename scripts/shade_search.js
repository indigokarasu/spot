const { chromium } = require('playwright');
const fs = require('fs');

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
    // Navigate to Shade Nail Spa booking
    console.log('Loading booking page...');
    await page.goto('https://square.site/book/L6SV5MCXN00CB/shade-nail-spa-san-francisco-ca', { 
      waitUntil: 'networkidle', 
      timeout: 45000 
    });
    
    await page.waitForTimeout(4000);
    console.log('Page URL:', page.url());
    
    // Get all text content
    const html = await page.content();
    await fs.promises.writeFile('/workspace/openclaw/logs/shade_full.html', html);
    
    // Search for "pedi" services
    const bodyText = await page.locator('body').textContent();
    const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    
    const pediServices = [];
    const allServices = [];
    
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.includes('pedi')) {
        pediServices.push(line);
      }
      // Look for service patterns (usually have price like dollar sign or contain service words)
      const hasPrice = line.includes('\$');
      if (lower.includes('manicure') || lower.includes('pedicure') || lower.includes('gel') || lower.includes('nail') || hasPrice) {
        if (line.length < 100 && line.length > 5) {
          allServices.push(line);
        }
      }
    }
    
    console.log('\n=== Pedi Services Found ===');
    console.log(pediServices.slice(0, 20));
    
    console.log('\n=== All Service-like Text ===');
    console.log(allServices.slice(0, 30));
    
    // Save results
    const results = {
      url: page.url(),
      pediServices: pediServices.slice(0, 20),
      allServices: allServices.slice(0, 50),
      timestamp: new Date().toISOString()
    };
    
    await fs.promises.writeFile('/workspace/openclaw/logs/shade_services.json', JSON.stringify(results, null, 2));
    
    await page.screenshot({ path: '/workspace/openclaw/logs/shade_services.png', fullPage: true });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
