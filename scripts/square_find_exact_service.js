const { chromium } = require('playwright');
const fs = require('fs');

/**
 * Find EXACT service ID for Peppermint Pedi
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
    console.log('=== Finding EXACT Peppermint Pedi Service ID ===\n');
    
    // Load service list
    await page.goto(
      'https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start',
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    await page.waitForTimeout(5000);
    
    // Get all services with their details
    const services = await page.evaluate(() => {
      const rows = document.querySelectorAll('market-row');
      const results = [];
      
      rows.forEach((row, index) => {
        const text = row.textContent?.trim() || '';
        const href = row.getAttribute('href');
        const hasClick = typeof row.click === 'function';
        
        // Check if it's a service row (has price or duration)
        const hasPrice = text.includes('$');
        const hasDuration = text.includes('min') || text.includes('hr');
        
        if ((hasPrice || hasDuration) && text.length > 10) {
          // Extract service name (before price or first line)
          const nameMatch = text.match(/^([A-Za-z\s-]+)/);
          const name = nameMatch ? nameMatch[1].trim() : text.substring(0, 30);
          
          results.push({
            index,
            name,
            text: text.substring(0, 80),
            href,
            hasClick
          });
        }
      });
      
      return results;
    });
    
    console.log('All services:');
    services.forEach(s => {
      console.log(`\n[${s.index}] ${s.name}`);
      console.log(`    Text: ${s.text}`);
      console.log(`    Href: ${s.href || 'N/A'}`);
    });
    
    // Find Peppermint Pedi specifically
    const peppermintPedi = services.find(s => 
      s.name.toLowerCase() === 'peppermint pedi' ||
      s.text.toLowerCase().startsWith('peppermint pedi')
    );
    
    if (peppermintPedi) {
      console.log('\n\n=== FOUND Peppermint Pedi ===');
      console.log('Index:', peppermintPedi.index);
      console.log('Name:', peppermintPedi.name);
      console.log('Href:', peppermintPedi.href);
      
      // Click it and track URL change
      console.log('\nClicking Peppermint Pedi...');
      const beforeUrl = page.url();
      
      const rows = await page.locator('market-row').all();
      await rows[peppermintPedi.index].click();
      await page.waitForTimeout(3000);
      
      const afterUrl = page.url();
      console.log('Before URL:', beforeUrl);
      console.log('After URL:', afterUrl);
      
      // Extract service ID
      const match = afterUrl.match(/services\/([A-Z0-9]+)/);
      const serviceId = match ? match[1] : 'Not found';
      console.log('\n=== CORRECT SERVICE ID ===');
      console.log(serviceId);
      
      // Save results
      const result = {
        serviceName: peppermintPedi.name,
        serviceId: serviceId,
        url: afterUrl,
        timestamp: new Date().toISOString()
      };
      
      await fs.promises.writeFile(
        '/workspace/openclaw/logs/correct_service_id.json',
        JSON.stringify(result, null, 2)
      );
      
    } else {
      console.log('\nPeppermint Pedi not found in service list!');
      console.log('Available names:', services.map(s => s.name));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
