#!/usr/bin/env python3
"""
Tock - Check April dates (within release window)
Page indicates: "Reservations for May 2026 released April 1 at 10am"
"""

from playwright.sync_api import sync_playwright
from datetime import datetime

# Check April 5 (Saturday)
date_str = "2026-04-05"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    )
    context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
    
    page = context.new_page()
    
    print(f"Checking Lazy Bear for Saturday {date_str}")
    print("=" * 60)
    
    url = f'https://www.exploretock.com/lazybearsf/experience/597492/2026-april-dinner-lazy-bear?date={date_str}&size=2'
    page.goto(url, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(5000)
    
    print(f"URL: {page.url}")
    
    # Close modal if present
    try:
        close_btn = page.locator('button[aria-label*="Close"]').first
        if close_btn.is_visible():
            close_btn.click()
            page.wait_for_timeout(2000)
    except:
        pass
    
    # Extract availability
    result = page.evaluate('''() => {
        // Look for time buttons
        const buttons = [...document.querySelectorAll('button')];
        const times = buttons
            .filter(b => /\d{1,2}:\d{2}/.test(b.textContent))
            .map(b => b.textContent.trim());
        
        // Check body for messages
        const text = document.body.innerText;
        const fullyBooked = text.includes('fully booked') || 
                           text.includes('sold out') ||
                           text.includes('no longer available');
        
        // Look for release info
        const releaseMatch = text.match(/Reservations for .+ will be released/);
        const releaseInfo = releaseMatch ? releaseMatch[0] : null;
        
        return { times, fullyBooked, releaseInfo };
    }''')
    
    if result['releaseInfo']:
        print(f"\n📅 Release Info: {result['releaseInfo']}")
    
    if result['times'] and len(result['times']) > 0:
        print(f"\n✅ Available times: {result['times'][:5]}")
    elif result['fullyBooked']:
        print("\n❌ Fully booked")
    else:
        print(f"\n⚠️ No times found (not yet released or unavailable)")
    
    browser.close()

print("\nDone!")
