# Booksy

**Status:** ⚠️ Partially Working (Page loads, requires JavaScript interaction)
**Last tested:** 2026-03-31
**Method:** Browser automation

---

## Overview

Booksy is a SPA (Single Page Application) that loads availability data dynamically. API endpoints return HTML instead of JSON when accessed without proper authentication.

---

## Implementation Status

**File:** `scripts/booksy_explore.py`

**Working:**
- ✅ Navigate to business page
- ✅ Extract page structure (headings, buttons)
- ✅ Calendar renders in DOM

**Not Working:**
- ❌ Direct API access (returns HTML instead of JSON)
- ❌ Availability extraction (requires service selection first)
- ❌ Network idle detection (SPA continuously polls)

---

## Architecture

**Flow:**
```
1. Business page (/en-us/{id}_{slug})
   ↓ Click "Book" on service
2. Service selection modal
   ↓ Select service
3. Calendar view
   ↓ Click date
4. Time slots appear
```

**Challenges:**
1. **SPA rendering** — Requires JavaScript, no server-rendered availability
2. **API requires auth** — API endpoints redirect to HTML page
3. **Service selection required** — Must select service before seeing calendar
4. **Network never idle** — Continuous polling

---

## Methods Tried

### Method 1: Direct API
```python
url = f"https://booksy.com/api/business/{business_id}/availability"
response = requests.get(url, headers=headers)
# Result: Returns HTML page, not JSON
```

### Method 2: Browser Automation
```python
page.goto(url, wait_until='domcontentloaded')
# Result: Page loads, calendar visible
```

---

## What Works

**Page Structure Extraction:**
```python
result = page.evaluate('''() => {
    const buttons = [...document.querySelectorAll('button')]
        .map(b => b.textContent.trim());
    const days = [...document.querySelectorAll('[class*="day"]')]
        .map(el => el.textContent.trim());
    return { buttons, days };
}''')
```

---

## What Doesn't Work

**Direct API Access:**
```python
# Returns HTML instead of JSON
requests.get("https://booksy.com/api/business/1736100/services")
```

**Network Idle Wait:**
```python
page.goto(url, wait_until='networkidle')  # Timeout - SPA polls continuously
```

---

## DOM Structure (Observed)

**Service Buttons:**
```html
<button>Book</button> <!-- For each service -->
```

**Calendar (after service selection):**
```html
<div class="calendar">
  <div class="day">1</div>
  <div class="day">2</div>
  <!-- Days marked available/unavailable -->
</div>
```

---

## Working Implementation Approach

1. Navigate to business page with `domcontentloaded`
2. Click "Book" on target service
3. Wait for calendar modal
4. Iterate through months to find furthest available date
5. Extract available time slots

---

## Tested: 2026-03-31

**Business:** Body & Skin Sanctuary (Sausalito)
**Business ID:** 1736100
**Result:** ⚠️ Page loads, requires service selection flow

**Finding:** API requires authentication. Browser automation needed.

---

## Next Steps

1. **Service selection flow** — Click "Book", select service, extract calendar
2. **Month navigation** — Click arrows to iterate months
3. **Date availability** — Check CSS classes for available/unavailable days

---

## Related

- See `mindbody.md` for wellness/booking patterns
- See `acuity.md` for similar SPA calendar patterns
