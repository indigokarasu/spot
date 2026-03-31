#!/usr/bin/env python3
"""
Booksy - Body & Skin Sanctuary (Sausalito)
Find furthest out available appointment via HTTP
"""

import requests
from datetime import datetime, timedelta

print("Booksy - Body & Skin Sanctuary")
print("=" * 60)
print("Finding furthest out available appointment...\n")

# Booksy uses an API - let's try to find it
url = 'https://booksy.com/en-us/1736100_body-skin-sanctuary_massage_100921_sausalito'
headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*'
}

response = requests.get(url, headers=headers, timeout=30)
print(f"Status: {response.status_code}")

html = response.text

# Look for API endpoints or embedded data
import re

# Check for Booksy API patterns
api_patterns = re.findall(r'https://[^\s"\'<>]+booksy[^\s"\'<>]*', html)
if api_patterns:
    print(f"\nBooksy API endpoints found:")
    for p in set(api_patterns[:10]):
        print(f"  - {p}")

# Look for service data
service_match = re.search(r'"serviceId"[:\s]*["\']?([^"\'\s,]+)', html)
if service_match:
    print(f"\nService ID: {service_match.group(1)}")

# Look for business ID
business_match = re.search(r'"businessId"[:\s]*["\']?([^"\'\s,]+)', html)
if business_match:
    print(f"Business ID: {business_match.group(1)}")

# Look for embedded JSON data
json_match = re.search(r'window\.__INITIAL_STATE__\s*=\s*({.+?});', html, re.DOTALL)
if json_match:
    print("\nFound __INITIAL_STATE__ data")
    try:
        import json
        data = json.loads(json_match.group(1))
        print(f"Keys: {list(data.keys())[:10]}")
    except:
        print("Could not parse JSON")

print("\nDone!")
