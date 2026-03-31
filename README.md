# Spot

Appointment and restaurant reservation automation research and scripts.

## Contents

### knowledge/
Scheduling platform documentation and findings:
- `README.md` - Universal decision tree for platform classification
- `NEW_PLATFORM.md` - Step-by-step guide for pressure testing new platforms
- `acuity.md` / `acuity_scheduling.md` - Acuity Scheduling patterns (✅ Production ready)
- `square.md` / `square_booking_pattern.md` - Square Appointments patterns (✅ Working)
- `opentable.md` - OpenTable findings (❌ Blocked by CDN)
- `sevenrooms.md` - SevenRooms patterns (✅ Production ready) **NEW**
- `resy.md` - Resy patterns (⚠️ Browser automation) **NEW**
- `tock.md` - Tock patterns (⚠️ Browser automation) **NEW**

### scripts/
Automation scripts organized by platform:

**Acuity:**
- `acuity_booking.js` - Full booking flow with REST API

**Square (Shade Nail Spa):**
- Working implementations with accessibility-first selectors
- DOM verification methods for custom web components
- Time slot extraction scripts
- Network intercept experiments

**OpenTable:**
- Discovery and stealth attempts
- Bypass experiments (all blocked by Akamai CDN)

**Raksa (Buddha Raksa Thai Spa):**
- API intercept scripts for Acuity-based booking
- Availability checking automation

**Restaurant Platforms (NEW):**
- `sevenrooms_availability.py` - SevenRooms API checker
- `resy_availability.py` - Resy browser automation
- `tock_availability.py` - Tock browser automation

### logs/
Debug outputs, screenshots, and JSON traces from testing.

## Key Findings

| Platform | Status | Method | Notes |
|----------|--------|--------|-------|
| Acuity Scheduling | ✅ Working | REST API | Public endpoints, no auth |
| Square Appointments | ✅ Working | Browser automation | Custom elements, DOM checks |
| SevenRooms | ✅ Working | Browser automation | Modal dialogs, calendar nav |
| Resy | ✅ Working | Browser automation | SPA, body text check |
| Tock | ⚠️ Partial | Browser automation | Modal blocks, times not extracted |
| OpenTable | ❌ Blocked | N/A | Akamai CDN bot detection |
| Mindbody | ⏳ Untested | - | - |
| Fresha | ⏳ Untested | - | - |

## Restaurant Platform Comparison

| Feature | SevenRooms | Resy | Tock |
|---------|------------|------|------|
| Public API | ✅ | ❌ | ❌ |
| Browser automation | Not needed | ✅ | ✅ |
| Bot detection | None | Medium | High (Cloudflare) |
| Headless mode | N/A | ✅ | ❌ (headed required) |

## Universal Truth

Playwright `isEnabled()`/`isDisabled()` methods are unreliable on custom web components. Always verify via `hasAttribute('disabled')` in `page.evaluate()`.

## License

Private research. Not for redistribution.
