# SevenRooms

**Status:** ✅ Production
**Last tested:** 2026-03-31
**Method:** Browser automation (no public API for availability data)

---

## Overview

SevenRooms appears to have a public widget API, but it returns empty arrays for future dates. Real availability data requires browser automation to interact with the booking widget.

---

## Implementation

**File:** `scripts/sevenrooms_availability.py`

**Approach:**
1. Navigate to booking page: `/explore/{venue}/reservations/create/search/`
2. Interact with date picker
3. Extract time slot buttons from rendered DOM
4. Parse available times

**Working Code:**
```python
from playwright.sync_api import sync_playwright
from datetime import datetime, timedelta

def check_sevenrooms_availability(venue_id, date, party_size=2):
    url = f"https://www.sevenrooms.com/explore/{venue_id}/reservations/create/search/"
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...'
        )
        page = context.new_page()
        
        # Navigate to booking page
        page.goto(url, wait_until='networkidle', timeout=60000)
        page.wait_for_timeout(5000)
        
        # Set party size
        page.locator('button:has-text("Guests")').first.click()
        page.wait_for_timeout(500)
        page.locator(f'text={party_size} Guest').first.click()
        
        # Set date
        page.locator('button:has-text("Date")').first.click()
        page.wait_for_timeout(1000)
        # ... navigate to correct month, click date
        
        # Extract times
        times = page.evaluate('''() => {
            const buttons = document.querySelectorAll('button');
            return [...buttons]
                .filter(b => /\d{1,2}:\d{2}/.test(b.textContent))
                .map(b => b.textContent.trim());
        }''')
        
        browser.close()
        return times
```

---

## Tested: 2026-03-31

**Restaurant:** Quince
**Result:** ✅ Working

**First available Saturday:** May 9, 2026
**Available times:** 78 slots including:
- 5:00 PM Bar Table
- 5:30 PM Bar Table  
- 6:30 PM Bar Table
- 7:00 PM Bar Table
- 7:30 PM Bar Table
- 8:00 PM Bar Table
- Plus Dining Room options

---

## Key Findings

1. **Widget API returns empty** — Don't rely on `api-yoa/availability/widget/range`
2. **Browser automation required** — Real data only in rendered DOM
3. **Modal dialogs** — Use semantic selectors (button text, aria-labels)
4. **Calendar navigation** — Need to handle month switching

---

## DOM Structure

**Date picker:**
```html
<button>Date Mar 30</button>
<!-- Opens calendar modal -->
<td>5</td> <!-- Click to select date -->
```

**Time slots:**
```html
<button>7:00 PM Bar Table</button>
<button disabled>8:00 PM Bar Table</button>
```

---

## Rejected Methods

| Method | Result |
|--------|--------|
| Public API (`api-yoa/availability`) | Returns empty arrays |
| Direct HTTP requests | Requires cookies/session |
| Headless without stealth | Works but unnecessary |

---

## Related

- See `acuity.md` for similar SPA booking patterns
- See `square.md` for accessibility-first selector approach
