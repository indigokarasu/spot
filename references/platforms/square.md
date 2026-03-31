# Square Appointments

**Status:** ⚠️ Working (Browser automation required)
**Method:** Playwright with custom element handling
**Last Tested:** 2026-03-30
**Example Site:** Shade Nail Spa (app.squareup.com)

---

## Happy Path (What Works)

### 1. Initialize with Proper Config

```javascript
const { chromium } = require('playwright');

const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox']
});

const page = await browser.newPage({
  viewport: { width: 1920, height: 1080 }
});
```

### 2. Navigate with Service ID

```javascript
const serviceId = 'XA4S2WKU7HYBHTWNKCPBIBDJ';  // Peppermint Pedi

await page.goto(
  `https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=${serviceId}`,
  { waitUntil: 'domcontentloaded', timeout: 30000 }
);
await page.waitForTimeout(4000);
```

**Where to find serviceId:**
- From service selection page (`/services/{ID}`)
- Or in URL after clicking service manually

### 3. Select Staff

```javascript
// Primary: Use aria-label
await page.locator('[aria-label="Any staff"]').first().click();

// Fallback: First radio button
await page.locator('market-radio').first().click();

await page.waitForTimeout(2000);
```

### 4. Continue to Calendar

```javascript
// Click "Add"
const addBtn = await page.locator('[aria-label="Add"]').first();
if (await addBtn.isVisible().catch(() => false)) {
  await addBtn.click();
} else {
  await page.mouse.click(960, 1040);  // Fallback coordinates
}
await page.waitForTimeout(1500);

// Click "Next"
const nextBtn = await page.locator('[aria-label="Next"]').first();
if (await nextBtn.isVisible().catch(() => false)) {
  await nextBtn.click();
} else {
  await page.mouse.click(1280, 317);  // Fallback
}
await page.waitForTimeout(4000);

// URL should now be: .../availability
```

### 5. Navigate to Target Month

```javascript
const text = await page.locator('body').textContent();

if (text.includes('Mar') && !text.includes('Apr')) {
  // Click next month button
  await page.mouse.click(1400, 200);
  await page.waitForTimeout(4000);
}
```

### 6. Check Date Availability (CRITICAL PATTERN)

```javascript
// ❌ WRONG - Playwright methods lie for custom elements
const isAvailable = await btn.isEnabled();  // Returns true even when disabled!

// ✅ CORRECT - Check DOM directly
const availability = await page.evaluate(() => {
  const results = {};
  const buttons = document.querySelectorAll('market-button[data-testid^="date-"]');
  
  buttons.forEach(btn => {
    const testId = btn.getAttribute('data-testid');
    const day = parseInt(testId.replace('date-', ''));
    const disabled = btn.hasAttribute('disabled');  // THE TRUTH
    
    results[day] = {
      available: !disabled,
      text: btn.textContent?.trim()
    };
  });
  
  return results;
});

// Returns: { "29": { available: false, text: "Su 29" }, "30": { available: true, ... } }
```

### 7. Extract Times for Available Date

```javascript
// Click available date via DOM
await page.evaluate((day) => {
  document.querySelector(`market-button[data-testid="date-${day}"]`)?.click();
}, targetDay);

await page.waitForTimeout(5000);

// Extract times
const times = await page.evaluate(() => {
  const results = [];
  
  document.querySelectorAll('market-button').forEach(btn => {
    const text = btn.textContent?.trim();
    if (/^\d{1,2}:\d{2}\s*[AP]M$/i.test(text)) {
      results.push({
        time: text,
        disabled: btn.hasAttribute('disabled'),
        testId: btn.getAttribute('data-testid')
      });
    }
  });
  
  return results;
});
```

### 8. Complete Working Example

```javascript
class SquareBooking {
  constructor(serviceId) {
    this.serviceId = serviceId;
  }

  async init() {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage({
      viewport: { width: 1920, height: 1080 }
    });
  }

  async checkAvailability(targetMonth = 'April') {
    // Navigate
    await this.page.goto(
      `https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start?service_id=${this.serviceId}`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );
    await this.page.waitForTimeout(4000);
    
    // Select staff
    await this.page.locator('[aria-label="Any staff"]').first().click().catch(() => {});
    await this.page.waitForTimeout(1500);
    
    // Click Add
    await this.page.mouse.click(960, 1040);
    await this.page.waitForTimeout(1500);
    
    // Click Next
    await this.page.mouse.click(1280, 317);
    await this.page.waitForTimeout(4000);
    
    // Navigate to target month
    const text = await this.page.locator('body').textContent();
    if (text.includes('Mar') && targetMonth === 'April') {
      await this.page.mouse.click(1400, 200);
      await this.page.waitForTimeout(4000);
    }
    
    // Get availability (DOM method - THE ONLY RELIABLE WAY)
    return await this.page.evaluate(() => {
      const results = {};
      document.querySelectorAll('market-button[data-testid^="date-"]').forEach(btn => {
        const day = parseInt(btn.getAttribute('data-testid').replace('date-', ''));
        results[day] = {
          available: !btn.hasAttribute('disabled'),
          text: btn.textContent?.trim()
        };
      });
      return results;
    });
  }

  async getTimes(day) {
    await this.page.evaluate((d) => {
      document.querySelector(`market-button[data-testid="date-${d}"]`)?.click();
    }, day);
    await this.page.waitForTimeout(5000);
    
    return await this.page.evaluate(() => {
      const times = [];
      document.querySelectorAll('market-button').forEach(btn => {
        const text = btn.textContent?.trim();
        if (/^\d{1,2}:\d{2}\s*[AP]M$/i.test(text)) {
          times.push({ time: text, disabled: btn.hasAttribute('disabled') });
        }
      });
      return times;
    });
  }

  async close() {
    await this.browser?.close();
  }
}
```

---

## What Does NOT Work (Learned Painfully)

### ❌ Playwright `isEnabled()` / `isDisabled()` on custom elements
```javascript
// Returns WRONG results for market-button
const btn = await page.locator('[data-testid="date-29"]');
await btn.isEnabled();   // Returns true (WRONG!)
await btn.isDisabled();  // Returns false (WRONG!)

// The button has disabled="" attribute but Playwright doesn't detect it
// on custom elements (web components/shadow DOM)
```

### ❌ Direct API calls
- Square's internal APIs require OAuth authentication
- Consumer bookings can't use the GraphQL endpoints
- Returns "An error has occurred" without proper auth tokens

### ❌ `networkidle` wait condition
```javascript
// ❌ Times out - SPA never reaches networkidle
await page.goto(url, { waitUntil: 'networkidle' });

// ✅ Use domcontentloaded + manual waits
await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
```

### ❌ Standard button selectors
- Square uses `market-button` custom elements
- Standard `page.click('button')` won't work
- **DO:** Use `aria-label` or `data-testid` selectors

### ❌ Assuming availability is consistent
- April 29 showed DISABLED in automation but AVAILABLE in manual browser
- Same service ID, same timezone, not logged in
- **DO:** Always verify with manual check; discrepancy cause unknown

### ❌ Relying on coordinates
- Coordinate-based clicking is fragile
- Different screen sizes break positions
- **DO:** Use semantic selectors as primary, coordinates as fallback only

---

## Platform Quirks

1. **Custom Elements Everywhere** - `market-*` tags replace standard HTML
2. **Shadow DOM** - Some elements inaccessible to standard selectors
3. **URL Structure** - `/availability` only appears after flow completion
4. **OAuth Required for API** - No public consumer API, must use browser automation
5. **Availability Discrepancies** - Automation vs manual browser can show different results

---

## Detection Summary

| Check | Element Type | Method |
|-------|--------------|--------|
| Date available? | `market-button` | `hasAttribute('disabled')` in page.evaluate() |
| Time available? | `market-button` | `hasAttribute('disabled')` in page.evaluate() |
| Staff selected? | `market-radio` | `aria-pressed="true"` |
| Page loaded? | URL | Contains `/availability` |

---

## Service ID Format

Square service IDs are 24-character alphanumeric:
```
XA4S2WKU7HYBHTWNKCPBIBDJ
```

Found in:
- URL after clicking service: `/services/{ID}`
- `service_id` query parameter

