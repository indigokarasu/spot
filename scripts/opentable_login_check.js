const { chromium } = require('playwright');

/**
 * Check if OpenTable login page is accessible
 */

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 }
  });

  try {
    console.log('=== Checking OpenTable Login Page ===\n');
    
    // Try login page
    console.log('Attempt 1: Login page...');
    await page.goto('https://www.opentable.com/account/login', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForTimeout(5000);
    
    const loginInfo = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      hasAccessDenied: document.body.innerText.includes('Access Denied'),
      hasLoginForm: document.body.innerText.includes('Email') || 
                    document.body.innerText.includes('Password') ||
                    document.body.innerText.includes('Sign in'),
      textSample: document.body.innerText.substring(0, 500)
    }));
    
    console.log('URL:', loginInfo.url);
    console.log('Title:', loginInfo.title);
    console.log('Access Denied:', loginInfo.hasAccessDenied);
    console.log('Has login form:', loginInfo.hasLoginForm);
    console.log('Text:', loginInfo.textSample.substring(0, 200));
    
    await page.screenshot({ path: '/workspace/openclaw/logs/opentable_login.png' });
    
    // Try homepage
    console.log('\nAttempt 2: Homepage...');
    await page.goto('https://www.opentable.com', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    await page.waitForTimeout(5000);
    
    const homeInfo = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      hasAccessDenied: document.body.innerText.includes('Access Denied'),
      textSample: document.body.innerText.substring(0, 300)
    }));
    
    console.log('Homepage URL:', homeInfo.url);
    console.log('Homepage Access Denied:', homeInfo.hasAccessDenied);
    
    await page.screenshot({ path: '/workspace/openclaw/logs/opentable_home.png' });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
})();
