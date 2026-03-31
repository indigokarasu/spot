#!/usr/bin/env python3
"""
Tock - Check all available experiences and their release dates
"""

from playwright.sync_api import sync_playwright
from datetime import datetime, timedelta

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    )
    context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
    
    page = context.new_page()
    
    print("Checking Lazy Bear - Finding available dates...")
    print("=" * 60)
    
    # Check March experience
    march_url = 'https://www.exploretock.com/lazybearsf/experience/592381/2026-march-dinner-lazy-bear'
    page.goto(march_url, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(3000)
    
    march_info = page.evaluate('''() => {
        const text = document.body.innerText;
        // Look for availability message
        const releaseMatch = text.match(/Reservations for .+? will be released on .+? at .+?/);
        const fullyBooked = text.includes('fully booked') || text.includes('sold out');
        return { releaseMatch: releaseMatch ? releaseMatch[0] : null, fullyBooked };
    }''')
    
    print(f"\nMarch Experience:")
    print(f"  Release info: {march_info['releaseMatch'] or 'N/A'}")
    print(f"  Fully booked: {march_info['fullyBooked']}")
    
    # Check April experience  
    april_url = 'https://www.exploretock.com/lazybearsf/experience/597492/2026-april-dinner-lazy-bear'
    page.goto(april_url, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(3000)
    
    april_info = page.evaluate('''() => {
        const text = document.body.innerText;
        const releaseMatch = text.match(/Reservations for .+? will be released on .+? at .+?/);
        const fullyBooked = text.includes('fully booked') || text.includes('sold out');
        return { releaseMatch: releaseMatch ? releaseMatch[0] : null, fullyBooked };
    }''')
    
    print(f"\nApril Experience:")
    print(f"  Release info: {april_info['releaseMatch'] or 'N/A'}")
    print(f"  Fully booked: {april_info['fullyBooked']}")
    
    browser.close()

print("\n" + "=" * 60)
print("SUMMARY")
print("=" * 60)
print("Tock releases reservations in monthly batches.")
print("Need to check which month is currently released.")
