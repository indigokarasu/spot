#!/usr/bin/env python3
"""
Redmint - Mindbody booking widget
Find furthest out available appointment
"""

import requests
import re

print("Redmint - Mindbody Widget")
print("=" * 60)

# Get the book-here page to find the Mindbody widget
url = 'https://www.redmint.com/pages/book-here'
headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
}

response = requests.get(url, headers=headers, timeout=30)
html = response.text

# Extract Mindbody widget link
# Mindbody uses healcode widgets like: https://widgets.mindbodyonline.com/scheduling/visit?site=...
widget_match = re.search(r'(https://widgets\.mindbodyonline\.com/[^"\'\s]+)', html)
if widget_match:
    widget_url = widget_match.group(1)
    print(f"Mindbody widget URL: {widget_url}")
    
    # Try to get the widget
    print("\nFetching Mindbody widget...")
    widget_response = requests.get(widget_url, headers=headers, timeout=30)
    print(f"Widget status: {widget_response.status_code}")
    
    # Look for API endpoints
    widget_html = widget_response.text
    api_patterns = re.findall(r'(https://[^\s"\'\s]+mindbody[^\s"\'\s]+)', widget_html)
    if api_patterns:
        print(f"\nMindbody API endpoints:")
        for p in set(api_patterns[:10]):
            print(f"  - {p}")
    
    # Look for site ID
    site_match = re.search(r'site[=:]([^&"\'\s]+)', widget_html)
    if site_match:
        print(f"\nSite ID: {site_match.group(1)}")
    
    # Look for location/session info
    loc_match = re.search(r'location[=:]([^&"\'\s]+)', widget_html)
    if loc_match:
        print(f"Location: {loc_match.group(1)}")

print("\nDone!")
