const { chromium } = require('playwright');

/**
 * Find correct service ID for Peppermint Pedi
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
    console.log('=== Finding Correct Service ID ===\n');
    
    // Load without service_id
    await page.goto('https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    await page.waitForTimeout(5000);
    
    // Extract service IDs from the page
    const services = await page.evaluate(() => {
      const results = [];
      
      // Look at all clickable elements that might be services
      const elements = document.querySelectorAll('market-row, market-list-item, [data-testid], a[href*="service"]');
      
      elements.forEach(el => {
        const text = el.textContent?.trim();
        const href = el.getAttribute('href');
        const dataTestId = el.getAttribute('data-testid');
        
        // Look for service ID in href
        let serviceId = null;
        if (href) {
          const match = href.match(/service[_-]?id=([^&]+)/i) || 
                       href.match(/services\/([A-Z0-9]+)/i);
          if (match) serviceId = match[1];
        }
        
        // Also check for data attributes
        if (!serviceId && dataTestId) {
          const match = dataTestId.match(/service[_-]?([A-Z0-9]+)/i);
          if (match) serviceId = match[1];
        }
        
        if (text && (text.toLowerCase().includes('pedi') || text.toLowerCase().includes('mani'))) {
          results.push({
            text: text.substring(0, 60),
            serviceId: serviceId,
            href: href?.substring(0, 100),
            dataTestId
          });
        }
      });
      
      return results;
    });
    
    console.log('Services found:');
    services.forEach(s => {
      console.log(`\n  Name: ${s.text}`);
      console.log(`  Service ID: ${s.serviceId || 'Not found'}`);
      console.log(`  Href: ${s.href || 'N/A'}`);
      console.log(`  Data testid: ${s.dataTestId || 'N/A'}`);
    });
    
    // Also check URL after clicking Peppermint Pedi
    console.log('\n\n=== Testing: Click Peppermint Pedi ===');
    
    // Find Peppermint Pedi element
    const peppermintElements = await page.locator('text="Peppermint Pedi"').all();
    console.log(`Found ${peppermintElements.length} "Peppermint Pedi" elements`);
    
    if (peppermintElements.length > 0) {
      // Get parent href before clicking
      const beforeInfo = await peppermintElements[0].evaluate(el => {
        // Walk up to find clickable parent
        let current = el;
        while (current && current.tagName !== 'A' && current.tagName !== 'BUTTON') {
          current = current.parentElement;
        }
        return {
          tagName: current?.tagName,
          href: current?.getAttribute('href'),
          dataServiceId: current?.getAttribute('data-service-id')
        };
      });
      
      console.log('Parent element:', beforeInfo);
      
      // Click it
      await peppermintElements[0].click();
      await page.waitForTimeout(3000);
      
      const afterUrl = page.url();
      console.log('\nAfter click URL:', afterUrl);
      
      // Extract service ID from URL
      const urlMatch = afterUrl.match(/service[_-]?id=([A-Z0-9]+)/i) ||
                      afterUrl.match(/services\/([A-Z0-9]+)/i);
      console.log('Extracted service ID:', urlMatch ? urlMatch[1] : 'Not found');
    }
    
    console.log('\n\n=== Comparison ===');
    console.log('My service_id: XA4S2WKU7HYBHTWNKCPBIBDJ');
    console.log('Check if this matches the extracted service ID above');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
