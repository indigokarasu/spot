#!/usr/bin/env python3
"""
Redmint - Book Here page
Find furthest out available appointment
"""

import requests
import re

print("Redmint - Book Here")
print("=" * 60)
print("Finding booking system...\n")

url = 'https://www.redmint.com/pages/book-here'
headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

response = requests.get(url, headers=headers, timeout=30)
print(f"Status: {response.status_code}")

html = response.text

# Check for booking systems
systems = []
if 'acuity' in html.lower(): systems.append('Acuity Scheduling')
if 'square' in html.lower() and 'booking' in html.lower(): systems.append('Square Appointments')
if 'mindbody' in html.lower(): systems.append('Mindbody')
if 'vagaro' in html.lower(): systems.append('Vagaro')
if 'booksy' in html.lower(): systems.append('Booksy')
if 'zenoti' in html.lower(): systems.append('Zenoti')
if 'schedulicity' in html.lower(): systems.append('Schedulicity')

print(f"\nBooking systems detected: {systems}")

# Look for iframe
iframe_match = re.search(r'<iframe[^>]+src="([^"]+)"', html)
if iframe_match:
    print(f"\nEmbedded iframe: {iframe_match.group(1)}")
    
# Look for booking links
booking_links = re.findall(r'href="([^"]*(book|schedule|appointment)[^"]*)"', html)
if booking_links:
    print(f"\nBooking links found: {len(booking_links)}")
    for link in set([l[0] for l in booking_links[:10]]):
        print(f"  - {link}")

# Look for scripts that might load booking widgets
scripts = re.findall(r'<script[^>]*src="([^"]+)"', html)
booking_scripts = [s for s in scripts if any(x in s.lower() for x in ['booking', 'schedule', 'appointment', 'acuity', 'square', 'mindbody'])]
if booking_scripts:
    print(f"\nBooking-related scripts:")
    for s in booking_scripts:
        print(f"  - {s}")

print("\nDone!")
