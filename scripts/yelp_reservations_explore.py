#!/usr/bin/env python3
"""
Yelp Reservations - Palette Tea House
Find furthest out available appointment
"""

import requests

print("Yelp Reservations - Palette Tea House")
print("=" * 60)
print("Finding booking system and availability...\n")

# Try direct HTTP request
url = 'https://www.yelp.com/reservations/palette-tea-house-san-francisco-2'
headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

response = requests.get(url, headers=headers, timeout=30)
print(f"Status: {response.status_code}")

# Look for Resy, OpenTable, or other booking system
html = response.text

if 'resy' in html.lower():
    print("\nBooking system: Resy")
    # Extract Resy venue ID
    import re
    resy_match = re.search(r'resy\.com.*?venues?/([^"\'\s]+)', html)
    if resy_match:
        print(f"Resy venue: {resy_match.group(1)}")
elif 'opentable' in html.lower():
    print("\nBooking system: OpenTable")
    opentable_match = re.search(r'opentable\.com.*?rest[^/]+/([^"\'\s]+)', html)
    if opentable_match:
        print(f"OpenTable ID: {opentable_match.group(1)}")
else:
    print("\nBooking system: Unknown or native Yelp")

# Look for reservation links
import re
reservation_links = re.findall(r'href="([^"]*reservation[^"]*)"', html) + re.findall(r'href="([^"]*book[^"]*)"', html)
if reservation_links:
    print(f"\nReservation links found: {len(reservation_links)}")
    for link in reservation_links[:5]:
        print(f"  - {link}")

# Look for embedded iframe
iframe_match = re.search(r'<iframe[^>]+src="([^"]+)"', html)
if iframe_match:
    print(f"\nEmbedded iframe: {iframe_match.group(1)}")

print("\nDone!")
