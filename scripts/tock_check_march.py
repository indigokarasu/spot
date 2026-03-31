#!/usr/bin/env python3
"""
Tock - Check March dates (within release window)
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
    
    print("Checking Lazy Bear - March dates (within release window)")
    print("=" * 60)
    
    # Check Saturday March 29, 2026
    date_str = "2026-03-29"  # Sunday (checking if any March dates work)
    
    url = f'https://www.exploretock.com/lazybearsf/experience/592381/2026-march-dinner-lazy-bear?date={date_str}&size=2'
    
    print(f"\nLoading: {url}")
    page.goto(url, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(5000)
    
    # Close modal if present
    try:
        close_btn = page.locator('button[aria-label*="Close"]').first
        if close_btn.is_visible():
            close_btn.click()
            page.wait_for_timeout(2000)
    except:
        pass
    
    # Look for calendar and times
    result = page.evaluate('''() => {
        const buttons = [...document.querySelectorAll('button')];
        const times = buttons
            .filter(b => /\\d{1,2}:\\d{2}/.test(b.textContent))
            .map(b => b.textContent.trim());
        
        // Check for calendar cells
        const calendar = document.querySelector('table, [class*="calendar"]');
        const days = calendar ? [...calendar.querySelectorAll('td')].map(td => td.textContent.trim()).filter(t => /^\\d+$/.test(t)) : [];
        
        return { times, days: days.slice(0, 31) };
    }''')
    
    print(f"Calendar days found: {result['days'][:10]}")
    print(f"Time buttons: {result['times'][:5]}")
    
    if result['times']:
        print("\n✅ Availability found!")
    else:
        print("\n⚠️ No times found (may need to click date in calendar)")
    
    browser.close()
