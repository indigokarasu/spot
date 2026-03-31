#!/usr/bin/env python3
"""
JouJou - Complete: Navigate calendar and find first available Saturday
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
    
    print("JouJou SF - Finding First Available Saturday")
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
    except:
        pass
    
    # Click date picker
    print("Opening date picker...")
    date_btn = page.locator('button:has-text("Date")').first
    date_btn.click()
    page.wait_for_timeout(2000)
    
    # Extract calendar to find Saturdays
    print("Scanning calendar for Saturdays...")
    
    # Get the month
    month = page.evaluate('''() => {
        const header = document.querySelector('h6');
        return header ? header.textContent : 'unknown';
    }''')
    
    print(f"Current month: {month}")
    
    # Get all calendar cells
    cells = page.evaluate('''() => {
        const allCells = [...document.querySelectorAll('button, td, [role="button"]')];
        return allCells
            .filter(el => /^\\d+$/.test(el.textContent.trim()))
            .map(el => ({
                day: el.textContent.trim(),
                disabled: el.disabled || el.getAttribute('disabled'),
                ariaLabel: el.getAttribute('aria-label') || ''
            }));
    }''')
    
    print(f"Found {len(cells)} date cells")
    
    # Find Saturdays (check aria-label for "Saturday")
    saturdays = [c for c in cells if 'saturday' in c.get('ariaLabel', '').lower()]
    available_saturdays = [s for s in saturdays if not s.get('disabled')]
    
    print(f"Saturdays found: {len(saturdays)}")
    print(f"Available Saturdays: {len(available_saturdays)}")
    
    if available_saturdays:
        # Click first available Saturday
        first_sat = available_saturdays[0]
        day_num = first_sat['day']
        print(f"\nClicking Saturday, {month} {day_num}...")
        
        # Find and click the button
        day_btn = page.locator(f'button:has-text("{day_num}"):not([disabled])').first
        if day_btn.is_visible():
            day_btn.click()
            page.wait_for_timeout(3000)
            
            # Extract times
            times = page.evaluate('''() => {
                return [...document.querySelectorAll('button')]
                    .filter(b => /\\d{1,2}:\\d{2}/.test(b.textContent))
                    .map(b => b.textContent.trim());
            }''')
            
            if times:
                print(f"\n✅ AVAILABLE TIMES for Saturday {day_num}:")
                for t in times[:10]:
                    print(f"   - {t}")
                print(f"\n🎉 First available Saturday: {month} {day_num}")
            else:
                print("\n⚠️ No times found after clicking date")
        else:
            print("\n❌ Could not click Saturday")
    else:
        print("\n❌ No available Saturdays in current month")
    
    browser.close()

print("\nDone!")
