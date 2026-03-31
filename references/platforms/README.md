# Scheduling Platform Knowledge Base

Systematic patterns for booking and availability automation. Organized for continuous pressure testing of new platforms.

---

## Platform Directory

| Platform | Status | Method | Last Tested |
|----------|--------|--------|-------------|
| [Acuity Scheduling](./acuity.md) | ✅ Production | REST API | 2026-03-30 |
| [Square Appointments](./square.md) | ⚠️ Working | Browser automation | 2026-03-30 |
| Mindbody | ❌ Unknown | TBD | - |
| Fresha | ❌ Unknown | TBD | - |
| StyleSeat | ❌ Unknown | TBD | - |
| Calendly | ❌ Unknown | TBD | - |

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

### Mindbody (TODO)
- **Domain:** `*.mindbodyonline.com`
- **Signature:** TBD

### Fresha (TODO)
- **Domain:** `*.fresha.com`
- **Signature:** TBD

### StyleSeat (TODO)
- **Domain:** `*.styleseat.com`
- **Signature:** TBD

### Calendly (TODO)
- **Domain:** `calendly.com`
- **Signature:** TBD

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

---

## File Structure

```
knowledge/scheduling/
├── README.md              # This file
├── NEW_PLATFORM.md        # Step-by-step guide for new platforms
├── acuity.md              # Acuity: Happy path + pitfalls
├── square.md              # Square: Happy path + pitfalls
├── mindbody.md            # (future)
├── fresha.md              # (future)
└── patterns/              # Reusable code patterns
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
