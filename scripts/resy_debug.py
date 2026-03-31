#!/usr/bin/env python3
"""Debug Resy page structure to find availability"""
from playwright.sync_api import sync_playwright
from datetime import datetime, timedelta

def debug_resy(venue_slug, date, party_size=2):
    url = f"https://resy.com/cities/san-francisco-ca/venues/{venue_slug}?date={date}&seats={party_size}"
    
    print(f"Debugging Resy: {venue_slug}")
    print(f"URL: {url}")
    print("=" * 60)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = context.new_page()
        
        page.goto(url, wait_until='networkidle', timeout=60000)
        page.wait_for_timeout(5000)
        
        # Get full page info
        info = page.evaluate('''() => {
            // Look for various selectors
            const buttons = [...document.querySelectorAll('button')];
            const timeButtons = buttons.filter(b => {
                const text = b.textContent.trim();
                return /\\d{1,2}:\\d{2}/.test(text);
            });
            
            // Look for reservation slots
            const slots = [...document.querySelectorAll('[class*="slot"], [class*="Slot"], [data-testid*="slot"]')];
            
            // Look for time containers
            const timeContainers = [...document.querySelectorAll('[class*="time"], [class*="Time"]')];
            
            return {
                title: document.title,
                totalButtons: buttons.length,
                timeButtons: timeButtons.map(b => ({
                    text: b.textContent.trim(),
                    disabled: b.disabled,
                    className: b.className
                })),
                slotsFound: slots.length,
                timeContainers: timeContainers.length,
                bodyText: document.body.innerText.substring(0, 2000)
            };
        }''')
        
        print(f"\nTitle: {info['title']}")
        print(f"Total buttons: {info['totalButtons']}")
        print(f"Time buttons found: {len(info['timeButtons'])}")
        
        if info['timeButtons']:
            print("\nTime buttons:")
            for btn in info['timeButtons'][:10]:
                print(f"  - '{btn['text']}' (disabled: {btn['disabled']})")
        
        print(f"\nSlots found via class: {info['slotsFound']}")
        print(f"Time containers: {info['timeContainers']}")
        
        # Check for specific Resy patterns
        if 'No Reservations' in info['bodyText'] or 'Fully Booked' in info['bodyText']:
            print("\n⚠️ Page shows 'No Reservations' or 'Fully Booked'")
        
        context.close()
        browser.close()

if __name__ == "__main__":
    # Debug 7 Adams for Saturday May 9
    debug_resy('7-adams', '2026-05-09', 2)
