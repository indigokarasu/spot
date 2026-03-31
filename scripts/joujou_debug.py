#!/usr/bin/env python3
"""
JouJou debug - Check actual page content
"""

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    )
    context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
    
    page = context.new_page()
    
    print("JouJou Debug - May 9, 2026")
    print("=" * 60)
    
    url = 'https://www.exploretock.com/joujousf/experience/583810/joujou-dinner-reservation?date=2026-05-09&size=2'
    page.goto(url, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(5000)
    
    print(f"URL: {page.url}")
    print(f"Title: {page.title()}")
    
    # Close modal
    try:
        close_btn = page.locator('button[aria-label*="Close"]').first
        if close_btn.is_visible():
            close_btn.click()
            page.wait_for_timeout(2000)
    except:
        pass
    
    # Get body text
    text = page.evaluate('() => document.body.innerText')
    
    print("\n--- Body Text (first 2000 chars) ---")
    print(text[:2000])
    
    print("\n--- Looking for specific patterns ---")
    
    # Check for various messages
    patterns = [
        'released',
        'available',
        'fully booked',
        'sold out',
        'not available',
        'closed',
        'check back',
        'coming soon'
    ]
    
    text_lower = text.lower()
    for pattern in patterns:
        if pattern in text_lower:
            idx = text_lower.find(pattern)
            print(f"Found '{pattern}': ...{text[idx-30:idx+50]}...")
    
    browser.close()
