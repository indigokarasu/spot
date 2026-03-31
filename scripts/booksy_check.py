#!/usr/bin/env python3
"""
Booksy API - Check response content
"""

import requests

print("Booksy API Response Check")
print("=" * 60)

business_id = "1736100"
headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'Accept': 'application/json, text/html',
}

urls = [
    f"https://booksy.com/api/business/{business_id}/services",
    f"https://booksy.com/api/business/{business_id}/availability",
    f"https://booksy.com/en-us/{business_id}_body-skin-sanctuary_massage_100921_sausalito",
]

for url in urls:
    print(f"\n{url}")
    print("-" * 60)
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        print(f"Status: {resp.status_code}")
        print(f"Content-Type: {resp.headers.get('content-type', 'unknown')}")
        print(f"Length: {len(resp.text)}")
        print(f"Preview:\n{resp.text[:500]}")
    except Exception as e:
        print(f"Error: {e}")

print("\nDone!")
