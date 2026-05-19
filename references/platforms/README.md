# Scheduling Platform Knowledge Base

Systematic patterns for booking and availability automation. Organized for continuous pressure testing of new platforms.

---

## Platform Directory

### Appointment/Spa Platforms

| Platform | Status | Method | Last Tested |
|----------|--------|--------|-------------|
| [Acuity Scheduling](./acuity.md) | ✅ Production | REST API | 2026-03-30 |
| [Square Appointments](./square.md) | ⚠️ Working | Browser automation | 2026-05-18 |
| [Meevo](./meevo.md) | ⚠️ Working | Browser automation | 2026-05-18 |
| [Vagaro](./vagaro.md) | ⚠️ Partial | Browser automation | 2026-05-18 |
| [Mindbody](./mindbody.md) | ⚠️ Working | Browser automation | 2026-05-18 |
| [Fresha](./fresha.md) | ⚠️ Working | Browser automation | 2026-05-18 |
| [StyleSeat](./styleseat.md) | ⚠️ Working | Browser automation | 2026-05-18 |
| [Calendly](./calendly.md) | ✅ Working | REST API + browser | 2026-05-18 |
| [Booksy](./booksy.md) | 🆕 New | Browser automation | Not yet tested |
| [GlossGenius](./glossgenius.md) | 🆕 New | Browser automation | Not yet tested |
| [SimplyBook.me](./simplybook.md) | 🆕 New | Browser automation | Not yet tested |
| [Boulevard](./boulevard.md) | 🆕 New | Browser automation | Not yet tested |
| [Mangomint](./mangomint.md) | 🆕 New | Browser automation | Not yet tested |
| [DaySmart Salon](./daysmart.md) | 🆕 New | Browser automation | Not yet tested |

### Restaurant Reservation Platforms

| Platform | Status | Method | Last Tested |
|----------|--------|--------|-------------|
| [SevenRooms](./sevenrooms.md) | ✅ Production | REST API | 2026-03-31 |
| [Resy](./resy.md) | ⚠️ Working | Browser automation | 2026-03-31 |
| [Tock](./tock.md) | ⚠️ Working | Browser automation | 2026-03-31 |
| [OpenTable](./opentable.md) | ⚠️ Working | Session-based | 2026-03-30 |
| [Yelp Reservations](./yelp-reservations.md) | 🆕 New | Browser automation | Not yet tested |
| [ResDiary](./resdiary.md) | 🆕 New | Browser automation | Not yet tested |
| [Eat App](./eatapp.md) | 🆕 New | Browser automation | Not yet tested |

---

## Universal Decision Tree (Use for NEW platforms)

```
1. LOAD booking page
   ↓
2. Check page architecture:
   ├─ Server-rendered HTML with clear IDs? → Try DOM scraping
   ├─ React/Vue/SPA with shadow DOM? → Browser automation required
   └─ Network calls visible? → Try API interception
   ↓
3. Test availability endpoint:
   ├─ Returns JSON? → API route (Acuity pattern)
   ├─ Returns HTML? → DOM scraping
   └─ Requires auth? → Browser automation (Square pattern)
   ↓
4. Determine element type:
   ├─ Standard buttons/inputs? → Standard Playwright selectors
   └─ Custom elements (market-*, etc)? → Check disabled attributes directly
   ↓
5. Verify detection works:
   ├─ Compare with manual browser
   └─ Check if dates show same availability
   ↓
6. FULL FLOW test with available date
   ↓
7. Document: Happy path, Pitfalls, Platform-specific quirks
```

---

## Quick Reference: Platform Fingerprints

### Acuity Scheduling
- **Domain:** `*.acuityscheduling.com`, `*.as.me`
- **Signature:** `/api/scheduling/v1/availability/*` endpoints
- **Response:** JSON with boolean availability
- **Auth:** None required for public bookings

### Square Appointments
- **Domain:** `book.squareup.com`, `app.squareup.com`
- **Signature:** `market-*` custom elements
- **Response:** React SPA with shadow DOM
- **Auth:** OAuth for business, public for consumer

### Meevo (Millennium)
- **Domain:** `*.meevo.com`, `login.meevo.com`
- **Signature:** Angular SPA, multi-step wizard, `div.category-item` for service categories
- **Response:** Angular-rendered SPA; requires JS click on inner elements
- **Auth:** None required for public bookings

### Vagaro
- **Domain:** `*.vagaro.com`
- **Signature:** Bootstrap modals, service list on `/services` page
- **Response:** API-dependent; may fail in automation environments
- **Auth:** None required for public bookings

### Mindbody
- **Domain:** `*.mindbodyonline.com`, `*.mindbody.io`
- **Signature:** React SPA, booking widget loads after hydration
- **Auth:** None for public bookings; OAuth for API

### Fresha
- **Domain:** `*.fresha.com`
- **Signature:** React SPA, service cards with "Book" buttons
- **Auth:** None for public bookings; no public API

### StyleSeat
- **Domain:** `*.styleseat.com`
- **Signature:** React SPA, professional profile pages
- **Auth:** Required for booking; not for availability check

### Calendly
- **Domain:** `calendly.com`
- **Signature:** REST API (`/v2/event_type_available_times`) or browser
- **Auth:** `CALENDLY_API_TOKEN` for API; none for browser

### Booksy
- **Domain:** `*.booksy.com`
- **Signature:** React SPA, consumer-first design, service cards
- **Auth:** Required for booking; not for availability check

### GlossGenius
- **Domain:** `*.glossgenius.com`
- **Signature:** React SPA, branded booking pages for independent professionals
- **Auth:** Required for booking; not for availability check

### SimplyBook.me
- **Domain:** `*.simplybook.me`
- **Signature:** Highly customizable React SPA, multi-language support
- **Auth:** Required for booking; not for availability check

### Boulevard
- **Domain:** `*.blvdup.com`, `book.boulevard.io`
- **Signature:** Premium React SPA, staff-centric design
- **Auth:** Required for booking; not for availability check

### Mangomint
- **Domain:** `*.mangomint.com`
- **Signature:** Visual-first React SPA, Instagram-style service cards
- **Auth:** Required for booking; not for availability check

### DaySmart Salon
- **Domain:** `*.daysmart.com`
- **Signature:** React SPA, salon-specific service categories
- **Auth:** Required for booking; not for availability check

### Yelp Reservations
- **Domain:** `*.yelp.com`
- **Signature:** React SPA widget embedded in Yelp business pages
- **Auth:** None for availability check; Yelp account for booking

### ResDiary
- **Domain:** `*.resdiary.com`
- **Signature:** React SPA, UK/Europe/Asia focus, 24-hour time format
- **Auth:** None for availability check

### Eat App
- **Domain:** `*.eatapp.co`
- **Signature:** React SPA, Middle East focus, multi-language
- **Auth:** None for availability check

### Yelp (Discovery)
- **Domain:** `www.yelp.com`
- **Signature:** Business search API + review aggregation
- **Auth:** Optional `YELP_API_KEY`; works in page mode without key

---

## Detection Anti-Patterns (Universal DON'Ts)

1. **DON'T trust Playwright `isEnabled()`/`isDisabled()`** on custom elements
   - ✅ DO: Check DOM `disabled` attribute directly via `page.evaluate()`

2. **DON'T assume coordinates work** across screen sizes
   - ✅ DO: Use semantic selectors (aria-label, data-testid)

3. **DON'T rely on `networkidle`** for SPAs
   - ✅ DO: Wait for specific elements to appear

4. **DON'T skip manual verification**
   - ✅ DO: Always compare automation results with manual browser check

5. **DON'T assume API endpoints are stable**
   - ✅ DO: Capture and document exact request/response patterns

6. **DON'T assume uniform layout** on customizable platforms
   - ✅ DO: Use flexible selectors; handle missing elements gracefully

7. **DON'T ignore timezone differences** on international platforms
   - ✅ DO: Check for 24-hour format, DD/MM/YYYY dates, non-English text

---

## File Structure

```
knowledge/scheduling/
├── README.md              # This file
├── NEW_PLATFORM.md        # Step-by-step guide for new platforms

# Appointment/Spa Platforms
├── acuity.md              # Acuity: Happy path + pitfalls
├── square.md              # Square: Happy path + pitfalls
├── mindbody.md            # Mindbody: React SPA + VPN fallback
├── fresha.md              # Fresha: React SPA + VPN fallback
├── styleseat.md           # StyleSeat: React SPA
├── calendly.md            # Calendly: REST API + browser
├── booksy.md              # Booksy: React SPA
├── glossgenius.md         # GlossGenius: React SPA
├── simplybook.md          # SimplyBook.me: Customizable React SPA
├── boulevard.md           # Boulevard: Premium React SPA
├── mangomint.md           # Mangomint: Visual-first React SPA
├── daysmart.md            # DaySmart: React SPA

# Restaurant Reservation Platforms
├── sevenrooms.md          # SevenRooms: Public API
├── resy.md                # Resy: Browser automation
├── tock.md                # Tock: Browser automation
├── opentable.md           # OpenTable: Session-based
├── yelp-reservations.md   # Yelp Reservations: Widget automation
├── resdiary.md            # ResDiary: UK/Europe/Asia focus
├── eatapp.md              # Eat App: Middle East focus

# Reusable patterns
└── patterns/
    ├── dom-check.js
    ├── api-intercept.js
    └── custom-element.js
```

---

## Adding a New Platform

1. Create `{platform}.md` from template
2. Document happy path with working code
3. Document all failed attempts (what NOT to do)
4. Update this README platform directory
5. Add to decision tree if new patterns discovered

See [NEW_PLATFORM.md](./NEW_PLATFORM.md) for full workflow.
