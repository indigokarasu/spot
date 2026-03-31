#!/usr/bin/env python3
"""Find first available Saturday for 7 Adams on Resy"""
import sys
sys.path.insert(0, '/workspace/openclaw/skills/spot/scripts')

from resy_availability import find_first_saturday_resy
from datetime import datetime, timedelta

# Start from first Saturday ~1 month out
target = datetime.now() + timedelta(days=35)
while target.weekday() != 5:  # Saturday
    target += timedelta(days=1)
start_date = target.strftime("%Y-%m-%d")

print(f"Searching for first available Saturday at 7 Adams (Resy)...")
print(f"Starting from: {start_date}")
print("-" * 50)

result = find_first_saturday_resy('7-adams', start_date, party_size=2, max_weeks=8, headless=True)

if result:
    print(f"\n✅ First available Saturday: {result['date']}")
    if result.get('times'):
        print(f"Available times: {', '.join([t.get('time', str(t)) for t in result['times'][:5]])}")
else:
    print("\n❌ No Saturday availability found in 8 weeks")
