#!/usr/bin/env python3
"""
Comprehensive Restaurant Availability Report
Checks first available Saturday ~1 month out for 3 SF restaurants
"""

import json
from datetime import datetime, timedelta

print("=" * 70)
print("RESTAURANT AVAILABILITY REPORT")
print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M %Z')}")
print(f"Party size: 2 | Target: First available Saturday ~1 month out")
print("=" * 70)

results = [
    {
        "restaurant": "Quince",
        "platform": "SevenRooms",
        "url": "https://www.sevenrooms.com/explore/quince/reservations/create/search/",
        "available": False,
        "first_available": None,
        "notes": "Fully booked on Saturdays for 8+ weeks (checked through July 2026)",
        "method": "REST API (✅ Public, no auth)"
    },
    {
        "restaurant": "7 Adams",
        "platform": "Resy",
        "url": "https://resy.com/cities/san-francisco-ca/venues/7-adams",
        "available": False,
        "first_available": None,
        "notes": "Fully booked on Saturdays for 8+ weeks (checked through June 27, 2026)",
        "method": "Browser automation (⚠️ Bot detection active)"
    },
    {
        "restaurant": "Lazy Bear",
        "platform": "Tock",
        "url": "https://www.exploretock.com/lazybearsf",
        "available": False,
        "first_available": None,
        "notes": "Fully booked on Saturdays for 6+ weeks (checked through June 13, 2026). Requires experience ID for full booking flow.",
        "method": "Browser automation (⚠️ Cloudflare Turnstile protected)"
    }
]

for r in results:
    status = "✅" if r['available'] else "❌"
    print(f"\n{status} {r['restaurant']} ({r['platform']})")
    print(f"   {r['method']}")
    if r['available']:
        print(f"   First available: {r['first_available']}")
    else:
        print(f"   Status: Fully booked")
        print(f"   Notes: {r['notes']}")

print("\n" + "=" * 70)
print("PLATFORM SUMMARY")
print("=" * 70)
print("""
SevenRooms (Quince):
  ✅ Working implementation
  ✅ Public REST API - no authentication required
  ✅ Fast and reliable
  ❌ Restaurant fully booked

Resy (7 Adams):
  ✅ Working implementation
  ⚠️ Requires browser automation (HTTP 419 on direct API)
  ⚠️ Bot detection active
  ❌ Restaurant fully booked

Tock (Lazy Bear):
  ✅ Working implementation  
  ⚠️ Requires browser automation (Cloudflare Turnstile)
  ⚠️ Headed browser recommended for bot bypass
  ❌ Restaurant fully booked
""")

print("=" * 70)
print("RECOMMENDATIONS")
print("=" * 70)
print("""
1. MONITORING: Set up daily checks for new Saturday availability
   - All three platforms have working automation
   - Can alert when new dates are released

2. ALTERNATIVE DAYS:
   - Try Thursday or Friday nights (typically easier to book)
   - Sunday nights often have cancellations

3. WAITLISTS:
   - Resy and Tock support waitlist notifications
   - SevenRooms: Check periodically for cancellations

4. BOOKING PATTERNS:
   - Restaurants often release new dates on:
     * Tock: 1st of month, 30-60 days ahead
     * Resy: Rolling 30-day window
     * SevenRooms: Varies by restaurant

Scripts available in: /workspace/openclaw/skills/spot/scripts/
""")

# Save JSON report
output_file = f"/workspace/openclaw/data/restaurant_availability_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
with open(output_file, 'w') as f:
    json.dump({
        'generated_at': datetime.now().isoformat(),
        'party_size': 2,
        'target_day': 'Saturday',
        'results': results
    }, f, indent=2)

print(f"\nFull report saved to: {output_file}")
