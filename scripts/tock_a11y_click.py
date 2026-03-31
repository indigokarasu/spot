#!/usr/bin/env python3
"""
Tock - Click date picker via a11y, then extract calendar
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
    
    print("Tock: A11y Click Approach")
    print("=" * 60)
    
    url = 'https://www.exploretock.com/joujousf/experience/583810/joujou-dinner-reservation?date=2026-04-28&size=2'
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
    
    # Click date picker using a11y selector
    print("Clicking date picker via a11y...")
    date_picker = page.locator('[aria-label*="select"][aria-label*="Date"]').first
    
    if date_picker.is_visible():
        print(f"Found: {date_picker.get_attribute('aria-label')}")
        date_picker.click()
        page.wait_for_timeout(3000)
        
        # Now extract calendar
        print("\nExtracting calendar...")
        calendar = page.evaluate('''() => {
            const cells = [...document.querySelectorAll('td, [role="gridcell"]')];
            return cells.map(c => ({
                text: c.textContent.trim(),
                disabled: c.disabled,
                ariaLabel: c.getAttribute('aria-label') || ''
            })).filter(c => /^\\d+$/.test(c.text));
        }''')
        
        print(f"Calendar cells: {len(calendar)}")
        for cell in calendar[:14]:
            day = cell['text']
            status = "✓" if not cell['disabled'] else "✗"
            sat = " (SAT)" if 'saturday' in cell.get('ariaLabel', '').lower() else ""
            print(f"  {status} {day}{sat}")
        
        # Find and click first available Saturday
        saturday = next((c for c in calendar if 'saturday' in c.get('ariaLabel', '').lower() and not c['disabled']), None)
        
        if saturday:
            day_num = saturday['text']
            print(f"\nClicking Saturday {day_num}...")
            
            sat_btn = page.locator(f'td:has-text("{day_num}"), [role="gridcell"]:has-text("{day_num}")').first
            if sat_btn.is_visible():
                sat_btn.click()
                page.wait_for_timeout(3000)
                
                # Extract times
                times = page.evaluate('''() => {
                    return [...document.querySelectorAll('button')]
                        .filter(b => /\\d{1,2}:\\d{2}/.test(b.textContent))
                        .map(b => b.textContent.trim());
                }''')
                
                print(f"Times found: {len(times)}")
                if times:
                    print(f"✅ AVAILABLE: {times[:5]}")
                else:
                    print("⚠️ No times after click")
        else:
            print("\n❌ No available Saturday found")
    else:
        print("❌ Date picker not found via a11y")
    
    browser.close()

print("\nDone!")
