#!/usr/bin/env python3
"""
JouJou - Navigate calendar to find furthest available reservation
Proof of concept for Tock booking system navigation
"""

from playwright.sync_api import sync_playwright
from datetime import datetime

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    )
    context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
    
    page = context.new_page()
    
    print("JouJou SF - Finding Furthest Available Reservation")
    print("=" * 60)
    
    # Load experience
    url = 'https://www.exploretock.com/joujousf/experience/583810/joujou-dinner-reservation?size=2'
    page.goto(url, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(4000)
    
    # Close modal
    try:
        close_btn = page.locator('button[aria-label*="Close"]').first
        if close_btn.is_visible():
            close_btn.click()
            page.wait_for_timeout(2000)
    except:
        pass
    
    # Click date picker to open calendar
    print("Opening date picker...")
    date_btn = page.locator('button:has-text("Date")').first
    if not date_btn.is_visible():
        print("Date picker not found")
        browser.close()
        exit(1)
    
    date_btn.click()
    page.wait_for_timeout(2000)
    
    print("Calendar opened, scanning for available dates...")
    print("-" * 60)
    
    # Check current month
    month_info = page.evaluate('''() => {
        // Get month header
        const header = document.querySelector('h6, [class*="month"], [class*="Month"]');
        const monthText = header ? header.textContent.trim() : 'unknown';
        
        // Get all calendar cells
        const cells = [...document.querySelectorAll('td, [role="gridcell"]')];
        const days = cells.map(c => ({
            day: c.textContent.trim(),
            disabled: c.getAttribute('disabled') || c.disabled,
            ariaLabel: c.getAttribute('aria-label') || ''
        })).filter(d => /^\\d+$/.test(d.day));
        
        return { monthText, days: days.slice(0, 31) };
    }''')
    
    print(f"Current month: {month_info['monthText']}")
    print(f"Days in calendar: {len(month_info['days'])}")
    
    # Find available days (not disabled)
    available_days = [d for d in month_info['days'] if not d.get('disabled')]
    print(f"Available days: {len(available_days)}")
    print(f"Day numbers: {[d['day'] for d in available_days[:10]]}")
    
    # Try to navigate forward to find furthest month
    furthest_date = None
    max_attempts = 12  # Try 12 months forward
    
    for attempt in range(max_attempts):
        # Check if there's a next month button
        next_btn = page.locator('button[title*="Next"], button[aria-label*="next"], button:has-text(">")').first
        
        if not next_btn.is_visible():
            print(f"\nNo next month button found at attempt {attempt}")
            break
        
        # Click next
        print(f"\nNavigating to month {attempt + 2}...")
        next_btn.click()
        page.wait_for_timeout(1500)
        
        # Check this month
        current = page.evaluate('''() => {
            const header = document.querySelector('h6, [class*="month"], [class*="Month"]');
            const monthText = header ? header.textContent.trim() : 'unknown';
            
            const cells = [...document.querySelectorAll('td, [role="gridcell"]')];
            const days = cells.map(c => ({
                day: c.textContent.trim(),
                disabled: c.getAttribute('disabled') || c.disabled,
                ariaLabel: c.getAttribute('aria-label') || ''
            })).filter(d => /^\\d+$/.test(d.day));
            
            const available = days.filter(d => !d.disabled);
            
            return { monthText, available: available.length, lastDay: available.length > 0 ? available[available.length - 1].day : null };
        }''')
        
        print(f"  Month: {current['monthText']}, Available days: {current['available']}")
        
        if current['available'] > 0:
            furthest_date = current['monthText']
        else:
            # No more availability beyond this
            print(f"  No availability, stopping")
            break
    
    print("\n" + "=" * 60)
    if furthest_date:
        print(f"✅ Furthest available month: {furthest_date}")
    else:
        print("❌ Could not determine furthest date")
    
    browser.close()
    print("\nDone!")
