#!/usr/bin/env python3
"""
JouJou - Working implementation
Key finding: Times DO render, but URL date doesn't stick
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
    
    print("JouJou - Checking availability")
    print("=" * 60)
    
    # Load experience (URL date doesn't stick, loads current/next available)
    url = 'https://www.exploretock.com/joujousf/experience/583810/joujou-dinner-reservation?size=2'
    page.goto(url, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(5000)
    
    print(f"Loaded: {page.url}")
    
    # Close modal
    try:
        close_btn = page.locator('button[aria-label*="Close"]').first
        if close_btn.is_visible():
            close_btn.click()
            page.wait_for_timeout(2000)
    except:
        pass
    
    # Extract everything
    result = page.evaluate('''() => {
        // Get current displayed date
        const dateBtn = document.querySelector('button[class*="Date"], button:contains("Date")');
        const currentDate = dateBtn ? dateBtn.textContent.trim() : 'unknown';
        
        // Get all time buttons
        const buttons = [...document.querySelectorAll('button')];
        const times = buttons
            .filter(b => /\\d{1,2}:\\d{2}/.test(b.textContent))
            .map(b => ({
                time: b.textContent.trim(),
                disabled: b.disabled
            }));
        
        // Check release policy
        const text = document.body.innerText;
        const releasePolicy = text.includes('rolling 30 day availability');
        
        return { currentDate, times, releasePolicy, totalButtons: buttons.length };
    }''')
    
    print(f"\nCurrent date shown: {result['currentDate']}")
    print(f"Rolling 30-day policy: {result['releasePolicy']}")
    print(f"Total buttons: {result['totalButtons']}")
    print(f"Time buttons found: {len(result['times'])}")
    
    if result['times']:
        print("\n✅ AVAILABLE TIMES:")
        available = [t for t in result['times'] if not t['disabled']]
        for t in available[:10]:
            print(f"   - {t['time']}")
    
    # Try to find Saturday by navigating calendar
    print("\n" + "=" * 60)
    print("Trying to find a Saturday...")
    print("=" * 60)
    
    # Click date picker
    try:
        date_btn = page.locator('button:has-text("Date")').first
        if date_btn.is_visible():
            date_btn.click()
            page.wait_for_timeout(2000)
            
            # Look for Saturday in calendar
            calendar = page.evaluate('''() => {
                const cells = [...document.querySelectorAll('td, [class*="day"]')];
                const days = cells.map(c => ({
                    text: c.textContent.trim(),
                    available: !c.classList.contains('unavailable') && !c.disabled
                })).filter(d => /\d+/.test(d.text));
                return days.slice(0, 31);
            }''')
            
            print(f"Calendar days: {calendar[:14]}")
            
            # Find a Saturday (day 6 in typical calendars)
            # Just pick any available day for now
            available_days = [d for d in calendar if d.get('available')]
            if available_days:
                print(f"\nAvailable days: {[d['text'] for d in available_days[:7]]}")
    except Exception as e:
        print(f"Calendar navigation: {e}")
    
    browser.close()
    print("\nDone!")
