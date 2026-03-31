#!/usr/bin/env python3
"""
Booksy - Body & Skin Sanctuary (Sausalito)
Find furthest out available appointment
"""

from playwright.sync_api import sync_playwright
from datetime import datetime, timedelta

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(
        viewport={'width': 1280, 'height': 800},
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    )
    context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
    
    page = context.new_page()
    
    print("Booksy - Body & Skin Sanctuary")
    print("=" * 60)
    print("Finding furthest out available appointment...\n")
    
    # Load the Booksy page
    url = 'https://booksy.com/en-us/1736100_body-skin-sanctuary_massage_100921_sausalito'
    page.goto(url, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(5000)
    
    # Take screenshot for debugging
    page.screenshot(path='/workspace/openclaw/data/booksy_initial.png')
    print("Screenshot saved: booksy_initial.png")
    
    # Extract page structure
    result = page.evaluate('''() => {
        // Look for calendar, date selectors, or appointment buttons
        const buttons = [...document.querySelectorAll('button')].map(b => ({
            text: b.textContent.trim(),
            ariaLabel: b.getAttribute('aria-label'),
            className: b.className
        }));
        
        const dateElements = [...document.querySelectorAll('[data-testid*="date"], [class*="date"], [class*="calendar"]')].map(el => ({
            text: el.textContent.trim(),
            className: el.className
        }));
        
        const headings = [...document.querySelectorAll('h1, h2, h3')].map(h => h.textContent.trim());
        
        return { buttons: buttons.slice(0, 20), dateElements: dateElements.slice(0, 20), headings };
    }''')
    
    print("\nHeadings:")
    for h in result['headings']:
        print(f"  - {h}")
    
    print("\nButtons (first 20):")
    for b in result['buttons']:
        print(f"  - {b['text'][:50]}")
    
    print("\nDate elements (first 20):")
    for d in result['dateElements']:
        print(f"  - {d['text'][:50]}")
    
    browser.close()

print("\nDone!")
