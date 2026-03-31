#!/usr/bin/env python3
"""Find first available Saturday for Lazy Bear on Tock"""
import sys
sys.path.insert(0, '/workspace/openclaw/skills/spot/scripts')

from tock_availability import find_first_saturday_tock
from datetime import datetime, timedelta

# Start from first Saturday ~1 month out
target = datetime.now() + timedelta(days=35)
while target.weekday() != 5:  # Saturday
    target += timedelta(days=1)
start_date = target.strftime("%Y-%m-%d")

print(f"Searching for first available Saturday at Lazy Bear (Tock)...")
print(f"Starting from: {start_date}")
print("Note: Tock requires headed browser (will open window)")
print("-" * 50)

# Lazy Bear requires an experience ID - using common tasting menu ID
# If this doesn't work, will need to auto-detect
result = find_first_saturday_tock('lazybearsf', experience_id=None, start_date=start_date, party_size=2, max_weeks=6, headless=True)

if result:
    print(f"\n✅ First available Saturday: {result['date']}")
    if result.get('times'):
        print(f"Available times: {', '.join([t.get('time', str(t)) for t in result['times'][:5]])}")
else:
    print("\n❌ No Saturday availability found in 6 weeks")
