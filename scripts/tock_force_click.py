#!/usr/bin/env python3
"""
Tock - Force click approach
"""

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(
        viewport={'width': 390, 'height': 844},
        user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
    )
    context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
    
    page = context.new_page()
    
    print("Tock: Force Click Approach")
    print("=" * 60)
    
    url = 'https://www.exploretock.com/joujousf/experience/583810/joujou-dinner-reservation?size=2'
    page.goto(url, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(4000)
    
    # Close modal
    try:
        close_btn = page.locator('button[aria-label*="Close"]').first
        if close_btn.is_visible():
            close_btn.click()
            page.wait_for_timeout(2000)
            print("Modal closed")
    except:
        pass
    
    # Click via locator (more reliable)
    print("\nTrying locator click...")
    try:
        date_btn = page.locator('button:has-text("Date")').first
        date_btn.click(force=True, timeout=5000)
        page.wait_for_timeout(3000)
        print("Clicked date button")
        
        # Now look for calendar
        calendar = page.evaluate('''() => {
            const tds = [...document.querySelectorAll('td')];
            return tds.map(td => ({
                text: td.textContent.trim(),
                disabled: td.disabled
            })).filter(t => /^\\d+$/.test(t.text));
        }''')
        
        print(f"Calendar days: {len(calendar)}")
        for day in calendar[:10]:
            print(f"  Day {day['text']} (disabled: {day['disabled']})")
        
        # Try to click a date
        if calendar:
            day_num = calendar[0]['text']
            print(f"\nClicking day {day_num}...")
            day_btn = page.locator(f'td:has-text("{day_num}")').first
            day_btn.click(force=True)
            page.wait_for_timeout(3000)
            
            # Check for times
            times = page.evaluate('''() => {
                return [...document.querySelectorAll('button')]
                    .filter(b => /\\d{1,2}:\\d{2}/.test(b.textContent))
                    .map(b => b.textContent.trim());
            }''')
            
            print(f"Times: {len(times)}")
            if times:
                print(f"✅ {times[:5]}")
            else:
                print("⚠️ No times")
                
    except Exception as e:
        print(f"Error: {e}")
    
    browser.close()

print("\nDone!")
