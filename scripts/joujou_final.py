#!/usr/bin/env python3
"""
JouJou - Working Tock implementation
Key insight: Tock shows availability but ignores URL date parameter
Need to interact with calendar to find future dates
"""

from playwright.sync_api import sync_playwright
from datetime import datetime, timedelta

print("JouJou SF - First Available Saturday")
print("=" * 60)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    )
    
    # Stealth
    context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
    
    page = context.new_page()
    
    # Load experience
    url = 'https://www.exploretock.com/joujousf/experience/583810/joujou-dinner-reservation?size=2'
    print(f"Loading: {url}")
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
    
    # Extract current availability
    result = page.evaluate('''() => {
        const buttons = [...document.querySelectorAll('button')];
        const times = buttons
            .filter(b => /\\d{1,2}:\\d{2}/.test(b.textContent))
            .map(b => ({
                time: b.textContent.trim(),
                disabled: b.disabled
            }));
        
        const dateBtn = [...buttons].find(b => b.textContent.includes('Date'));
        const currentDate = dateBtn ? dateBtn.textContent.replace('Date', '').trim() : 'unknown';
        
        return { times, currentDate };
    }''')
    
    print(f"\nCurrent date loaded: {result['currentDate']}")
    print(f"Times available: {len(result['times'])}")
    
    if result['times']:
        print("\n✅ Available now:")
        for t in result['times'][:10]:
            status = "✓" if not t['disabled'] else "✗"
            print(f"   {status} {t['time']}")
    
    # Try to navigate to find Saturday
    print("\n" + "=" * 60)
    print("Trying to find a Saturday...")
    print("=" * 60)
    
    # Click date picker
    try:
        date_btn = page.locator('button:has-text("Date")').first
        if date_btn.is_visible():
            date_btn.click()
            page.wait_for_timeout(2000)
            
            # Extract calendar
            calendar = page.evaluate('''() => {
                const cells = [...document.querySelectorAll('td')];
                return cells.map(c => ({
                    text: c.textContent.trim(),
                    available: !c.classList.contains('unavailable') && !c.disabled,
                    isSaturday: c.getAttribute('aria-label')?.includes('Saturday')
                })).filter(c => /^\\d+$/.test(c.text));
            }''')
            
            print(f"\nCalendar has {len(calendar)} days")
            
            # Find Saturdays
            saturdays = [c for c in calendar if c.get('isSaturday') and c.get('available')]
            if saturdays:
                print(f"\n🎉 Found {len(saturdays)} available Saturdays!")
                for sat in saturdays[:3]:
                    print(f"   Day {sat['text']}")
            else:
                print("\nNo Saturdays found in current calendar view")
                
    except Exception as e:
        print(f"Error: {e}")
    
    browser.close()

print("\nDone!")
