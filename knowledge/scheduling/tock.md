# Tock

**Status:** ⚠️ Partially Working (Page loads, availability extraction incomplete)
**Last tested:** 2026-03-31
**Method:** Browser automation (multi-step flow)

---

## Overview

Tock uses Cloudflare Turnstile bot detection and a multi-step booking flow. Page loads successfully but extracting actual availability times requires handling modal dialogs and dynamic rendering.

---

## Implementation Status

**File:** `scripts/tock_availability.py` (partial)

**Working:**
- ✅ Navigate to restaurant page
- ✅ Extract experience links
- ✅ Load experience with date parameters
- ✅ Close blocking modal dialogs

**Not Working:**
- ❌ Extract time slot buttons after modal closes
- ❌ Navigate calendar to select specific dates
- ❌ Detect availability vs. no availability state

---

## Architecture

**Flow:**
```
1. Restaurant page (/lazybearsf)
   ↓ Click experience
2. Experience page (/experience/{id})
   ↓ Modal opens
3. Close modal / click date in calendar
   ↓ SPA fetches availability
4. Time slots render dynamically
```

**Challenges:**
1. **Modal blocking** — `data-testid="experience-dialog"` intercepts clicks
2. **SPA polling** — Network never idle, continuous API polling
3. **Dynamic rendering** — Time slots load after date selection via XHR
4. **Cloudflare** — Requires stealth scripts to bypass bot detection

---

## Methods Tried

### Method 1: API Endpoint
```python
# Tried public widget API pattern (like SevenRooms)
# Result: No known public endpoint found
```

### Method 2: Headless Browser
```python
browser = p.chromium.launch(headless=True)
# Result: Page loads, modal blocks interaction
```

### Method 3: Stealth Scripts
```javascript
Object.defineProperty(navigator, 'webdriver', { get: () =>> undefined });
// Result: Bypasses bot detection, modal still blocks
```

### Method 4: Modal Close + Wait
```python
close_btn = page.locator('[data-testid="experience-dialog"] button').first
close_btn.click()
page.wait_for_timeout(5000)
# Result: Modal closes, times still not in DOM
```

### Method 5: Text Extraction
```python
text = page.evaluate('() => document.body.innerText')
times = text.match(/\d{1,2}:\d{2}/g)
# Result: No time patterns found in body text
```

### Method 6: Mobile Viewport
```python
viewport={'width': 390, 'height': 844}
user_agent='iPhone...'
# Result: Same behavior as desktop
```

---

## What Works

**Page Investigation:**
```python
# Load experience page
url = "https://www.exploretock.com/lazybearsf/experience/597492/2026-april-dinner-lazy-bear"
page.goto(url, wait_until='domcontentloaded')

# Find experiences
experiences = page.evaluate('''() => {
    return [...document.querySelectorAll('a[href*="/experience/"]')]
        .map(a => ({ text: a.textContent, href: a.href }));
}''')
# Returns: "2026 March Dinner", "2026 April Dinner"
```

**Modal Detection:**
```python
modal = page.locator('[data-testid="experience-dialog"]')
# Exists and blocks all interaction
```

---

## What Doesn't Work

**Time Slot Extraction:**
```python
# After modal close, times not in DOM
buttons = page.query_selector_all('button')
# Returns navigation buttons only, no time slots
```

**Calendar Navigation:**
```python
# Calendar renders but clicking dates doesn't show times
date_cell = page.locator('td:has-text("5")')
date_cell.click()  # Blocked by modal or no-op
```

---

## DOM Structure (Observed)

**Experience Modal:**
```html
<div data-testid="experience-dialog" class="MuiDialog-root">
  <div class="MuiDialog-container">
    <!-- Experience description -->
    <button aria-label="Close">X</button>
  </div>
</div>
```

**After Modal (Expected but not observed):**
```html
<!-- Should see calendar -->
<table class="calendar">
  <td><button>5</button></td>
</table>

<!-- After date click, should see -->
<div class="time-slots">
  <button>7:00 PM</button>
</div>
```

---

## Hypothesis

Tock may require:
1. **Authenticated session** — Login cookies for availability data
2. **Specific click sequence** — Select experience → Close intro → Click calendar → Wait for XHR → Times appear
3. **Different endpoint** — API endpoint that requires auth token
4. **Headed browser** — Some rendering only happens with visible window

---

## Next Steps

1. **Try headed browser** — Run with `headless=False` and observe
2. **Capture network traffic** — Look for XHR calls when selecting dates
3. **Check for auth requirements** — See if login changes availability display
4. **Research existing bots** — Check GitHub for working Tock implementations

---

## Related

- See `square.md` for SPA modal handling patterns
- See `sevenrooms.md` for calendar navigation approach
- GitHub: `azoff/tockstalk` (Cypress-based)
