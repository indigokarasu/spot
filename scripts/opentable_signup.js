const { chromium } = require('playwright');
const { execSync } = require('child_process');

/**
 * OpenTable signup as Indigo Karasu
 * Email: mx.indigo.karasu@gmail.com
 */

async function checkEmailForOpenTable() {
  try {
    const result = execSync(
      "GOG_KEYRING_PASSWORD='' GOG_ACCOUNT=mx.indigo.karasu@gmail.com /workspace/gogcli/bin/gog gmail search 'opentable OR verify' --limit 5",
      { encoding: 'utf-8', timeout: 30000 }
    );
    return result;
  } catch (e) {
    return 'Error checking email: ' + e.message;
  }
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-http2',
      '--disable-quic'
    ]
  });

  const page = await browser.newPage({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const results = { steps: [] };

  try {
    console.log('=== OpenTable Signup as Indigo Karasu ===\n');
    
    // Try signup page
    console.log('Step 1: Loading signup page...');
    await page.goto('https://www.opentable.com/account/create', {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });
    
    await page.waitForTimeout(5000);
    
    const pageInfo = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      hasAccessDenied: document.body.innerText.includes('Access Denied'),
      hasSignupForm: document.body.innerText.includes('Create account') ||
                     document.body.innerText.includes('Sign up') ||
                     document.querySelector('input[type="email"]') !== null,
      textSample: document.body.innerText.substring(0, 400)
    }));
    
    results.steps.push({ step: 'load', pageInfo });
    console.log('URL:', pageInfo.url);
    console.log('Title:', pageInfo.title);
    console.log('Access Denied:', pageInfo.hasAccessDenied);
    console.log('Has signup form:', pageInfo.hasSignupForm);
    
    await page.screenshot({ path: '/workspace/openclaw/logs/opentable_signup_page.png' });
    
    if (pageInfo.hasAccessDenied || !pageInfo.hasSignupForm) {
      console.log('\nSignup page blocked or no form found');
      results.blocked = true;
      return;
    }
    
    // Fill signup form
    console.log('\nStep 2: Filling signup form...');
    
    // Look for email field
    const emailField = await page.locator('input[type="email"], input[name*="email"], input[placeholder*="email"]').first();
    if (await emailField.isVisible().catch(() => false)) {
      await emailField.fill('mx.indigo.karasu@gmail.com');
      console.log('  ✓ Email filled');
    }
    
    // Look for password field
    const passwordField = await page.locator('input[type="password"]').first();
    if (await passwordField.isVisible().catch(() => false)) {
      // Generate a secure password
      const password = 'IndigoKarasu2026!OT';
      await passwordField.fill(password);
      console.log('  ✓ Password filled');
      results.password = password;
    }
    
    // Look for first name
    const firstNameField = await page.locator('input[name*="first"], input[placeholder*="First"]').first();
    if (await firstNameField.isVisible().catch(() => false)) {
      await firstNameField.fill('Indigo');
      console.log('  ✓ First name filled');
    }
    
    // Look for last name
    const lastNameField = await page.locator('input[name*="last"], input[placeholder*="Last"]').first();
    if (await lastNameField.isVisible().catch(() => false)) {
      await lastNameField.fill('Karasu');
      console.log('  ✓ Last name filled');
    }
    
    await page.screenshot({ path: '/workspace/openclaw/logs/opentable_signup_filled.png' });
    
    // Find and click submit
    console.log('\nStep 3: Submitting form...');
    const submitBtn = await page.locator('button[type="submit"], button:has-text("Sign up"), button:has-text("Create")').first();
    if (await submitBtn.isVisible().catch(() => false)) {
      await submitBtn.click();
      console.log('  ✓ Form submitted');
    } else {
      console.log('  Submit button not found');
    }
    
    await page.waitForTimeout(5000);
    
    // Check result
    const afterSubmit = await page.evaluate(() => ({
      url: window.location.href,
      title: document.title,
      hasVerify: document.body.innerText.includes('verify') ||
                 document.body.innerText.includes('confirmation') ||
                 document.body.innerText.includes('email'),
      textSample: document.body.innerText.substring(0, 400)
    }));
    
    results.steps.push({ step: 'submit', afterSubmit });
    console.log('After submit URL:', afterSubmit.url);
    console.log('Has verify message:', afterSubmit.hasVerify);
    
    await page.screenshot({ path: '/workspace/openclaw/logs/opentable_signup_after.png' });
    
    // Check email for verification
    if (afterSubmit.hasVerify || afterSubmit.url.includes('verify')) {
      console.log('\nStep 4: Checking email for verification...');
      await new Promise(r => setTimeout(r, 10000)); // Wait for email
      
      const emailCheck = await checkEmailForOpenTable();
      console.log('Email check result:', emailCheck);
      results.emailCheck = emailCheck;
    }
    
    results.success = true;
    console.log('\n=== Signup attempt complete ===');
    
  } catch (error) {
    console.error('Error:', error.message);
    results.error = error.message;
  } finally {
    await page.screenshot({ path: '/workspace/openclaw/logs/opentable_signup_final.png' });
    await browser.close();
    
    // Save results
    const fs = require('fs');
    await fs.promises.writeFile(
      '/workspace/openclaw/logs/opentable_signup_results.json',
      JSON.stringify(results, null, 2)
    );
  }
})();
