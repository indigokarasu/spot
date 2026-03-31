# Spot

Appointment booking automation research and scripts.

## Contents

### knowledge/
Scheduling platform documentation and findings:
- `README.md` - Universal decision tree for platform classification
- `NEW_PLATFORM.md` - Step-by-step guide for pressure testing new platforms
- `acuity.md` / `acuity_scheduling.md` - Acuity Scheduling patterns (✅ Production ready)
- `square.md` / `square_booking_pattern.md` - Square Appointments patterns (✅ Working)
- `opentable.md` - OpenTable findings (❌ Blocked by CDN)

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

### logs/
Debug outputs, screenshots, and JSON traces from testing.

## Key Findings

| Platform | Status | Method | Notes |
|----------|--------|--------|-------|
| Acuity Scheduling | ✅ Working | REST API | Public endpoints, no auth |
| Square Appointments | ✅ Working | Browser automation | Custom elements, DOM checks |
| OpenTable | ❌ Blocked | N/A | Akamai CDN bot detection |
| Mindbody | ⏳ Untested | - | - |
| Fresha | ⏳ Untested | - | - |
| Resy | ⏳ Untested | - | - |

## Universal Truth

Playwright `isEnabled()`/`isDisabled()` methods are unreliable on custom web components. Always verify via `hasAttribute('disabled')` in `page.evaluate()`.

## License

Private research. Not for redistribution.
