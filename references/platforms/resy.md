# Resy

**Status:** ✅ Production
**Last tested:** 2026-03-31
**Method:** Browser automation (direct API blocked)

---

## Overview

Resy blocks unauthenticated API requests (HTTP 419). Browser automation with standard selectors works reliably.

---

## Implementation

**File:** `scripts/resy_availability.py`

**Approach:**
1. Navigate to venue page with date/party URL parameters
2. Wait for SPA to render
3. Extract available times from DOM
4. Check for "no tables available" message

**Working Code:**
```python
from playwright.sync_api import sync_playwright
from datetime import datetime, timedelta

def check_resy_availability(venue_slug, date, party_size=2):
    # Pre-fill date and party via URL
    url = f"https://resy.com/cities/san-francisco-ca/venues/{venue_slug}?date={date}&seats={party_size}"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...'
        )
        page = context.new_page()
        
        # Load page (SPA, no networkidle)
        page.goto(url, wait_until='domcontentloaded', timeout=30000)
        page.wait_for_timeout(3000)
        
        # Check body text for availability
        result = page.evaluate('''() => {
            const text = document.body.innerText;
            
            // Check for availability message
            const noTables = text.includes("don't currently have any tables");
            
            // Look for time buttons
            const times = [...document.querySelectorAll('button')]
                .filter(b => /\d{1,2}:\d{2}/.test(b.textContent))
                .map(b => b.textContent.trim());
            
            return { noTables, times };
        }''')
        
        browser.close()
        return result
```

---

## Tested: 2026-03-31

**Restaurant:** 7 Adams
**Result:** ✅ Working

**First available Saturday:** April 4, 2026
**Availability pattern:** Has availability Tuesday-Sunday in April

**Checked dates:**
- ✅ 2026-04-04 (Saturday) — Available
- ✅ Multiple Saturdays in April available

---

## Key Findings

1. **Direct API blocked** — `api.resy.com/4/find` returns HTTP 419
2. **URL parameters work** — `?date=YYYY-MM-DD&seats=N` pre-fills form
3. **SPA renders asynchronously** — Use `domcontentloaded` + wait
4. **Body text check reliable** — "don't currently have any tables" = fully booked

---

## DOM Structure

**Availability indicator:**
```
Sorry, we don't currently have any tables available for 2.
Unfortunately, we can't accommodate that reservation.
```

**Time buttons (when available):**
```html
<button>7:00 PM</button>
<button>7:30 PM</button>
```

---

## Rejected Methods

| Method | Result |
|--------|--------|
| Public API (`api.resy.com`) | HTTP 419, requires auth |
| Network idle wait | SPA polls continuously |
| Direct element selectors | Works but body text check is faster |

---

## Related

- See `square.md` for similar SPA patterns
- See `sevenrooms.md` for modal-based booking flow
