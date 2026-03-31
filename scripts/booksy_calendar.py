#!/usr/bin/env python3
"""
Booksy - Body & Skin Sanctuary
Find furthest out available appointment
"""

from playwright.sync_api import sync_playwright
from datetime import datetime, timedelta
import re

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-gpu'])
    context = browser.new_context(
        viewport={'width': 1280, 'height': 800},
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )
    context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
    
    page = context.new_page()
    
    print("Booksy - Body & Skin Sanctuary")
    print("=" * 60)
    print("Finding furthest out available appointment...\n")
    
    # Load the Booksy page
    url = 'https://booksy.com/en-us/1736100_body-skin-sanctuary_massage_100921_sausalito'
    page.goto(url, wait_until='networkidle', timeout=60000)
    page.wait_for_timeout(5000)
    
    # Click a service to open booking flow
    print("Looking for service buttons...")
    
    # Try clicking the first "Book" button
    try:
        book_buttons = page.locator('button:has-text("Book")')
        if book_buttons.count() > 0:
            print(f"Found {book_buttons.count()} Book buttons")
            book_buttons.first.click()
            page.wait_for_timeout(3000)
            
            # Look for calendar
            calendar_data = page.evaluate('''() => {
                // Look for calendar elements
                const days = [...document.querySelectorAll('[data-testid*="day"], [class*="day"], [class*="Day"]')].map(el => ({
                    text: el.textContent.trim(),
                    disabled: el.disabled || el.getAttribute('disabled'),
                    className: el.className
                }));
                
                // Look for date headers
                const headers = [...document.querySelectorAll('h2, h3, [class*="month"], [class*="Month"]')].map(el => el.textContent.trim());
                
                // Look for available slots
                const slots = [...document.querySelectorAll('[data-testid*="slot"], [class*="slot"], [class*="time"]')].map(el => el.textContent.trim());
                
                return { days: days.slice(0, 20), headers: headers.slice(0, 5), slots: slots.slice(0, 10) };
            }''')
            
            print(f"\nCalendar headers: {calendar_data['headers']}")
            print(f"\nDays found: {len(calendar_data['days'])}")
            for d in calendar_data['days'][:10]:
                print(f"  - {d['text']} (disabled: {d['disabled']})")
            
            print(f"\nTime slots: {calendar_data['slots']}")
    except Exception as e:
        print(f"Error: {e}")
    
    browser.close()

print("\nDone!")
