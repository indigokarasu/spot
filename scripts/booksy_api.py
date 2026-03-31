#!/usr/bin/env python3
"""
Booksy API - Get availability for Body & Skin Sanctuary
"""

import requests
import json
from datetime import datetime, timedelta

print("Booksy API - Body & Skin Sanctuary")
print("=" * 60)

# Booksy business ID from URL: 1736100
business_id = "1736100"

# Try the Booksy API
# Common patterns:
# https://booksy.com/api/business/{id}/availability
# https://booksy.com/api/business/{id}/services

base_url = f"https://booksy.com/api/business/{business_id}"
headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'Accept': 'application/json',
    'Origin': 'https://booksy.com',
    'Referer': 'https://booksy.com/'
}

# Try to get services first
print("Fetching services...")
services_url = f"{base_url}/services"
try:
    resp = requests.get(services_url, headers=headers, timeout=10)
    print(f"Services status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"Services: {json.dumps(data, indent=2)[:500]}")
except Exception as e:
    print(f"Error: {e}")

# Try availability endpoint
print("\nFetching availability...")
avail_url = f"{base_url}/availability"
try:
    resp = requests.get(avail_url, headers=headers, timeout=10)
    print(f"Availability status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"Availability: {json.dumps(data, indent=2)[:1000]}")
except Exception as e:
    print(f"Error: {e}")

# Try widget API
print("\nTrying widget API...")
widget_url = f"https://widget.booksy.com/api/business/{business_id}/availability"
try:
    resp = requests.get(widget_url, headers=headers, timeout=10)
    print(f"Widget status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        print(f"Widget data: {json.dumps(data, indent=2)[:1000]}")
except Exception as e:
    print(f"Error: {e}")

print("\nDone!")
