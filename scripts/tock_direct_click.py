#!/usr/bin/env python3
"""
Tock - Direct button text click
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
    
    print("Tock: Direct Button Click")
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
    
    # Get all buttons
    buttons = page.locator('button').all()
    print(f"Total buttons: {len(buttons)}")
    
    # Find date button
    date_btn = None
    for btn in buttons:
        text = btn.text_content() or ''
        if 'Date' in text or 'date' in text.lower():
            print(f"Found date button: '{text[:50]}'")
            date_btn = btn
            break
    
    if date_btn and date_btn.is_visible():
        print("\nClicking date button...")
        date_btn.click()
        page.wait_for_timeout(3000)
        
        # Take screenshot
        page.screenshot(path='/workspace/openclaw/data/tock_calendar.png')
        print("Screenshot saved")
        
        # Get all clickable elements
        clickable = page.evaluate('''() => {
            const all = [...document.querySelectorAll('button, td, [role="button"]')];
            return all.map(el => ({
                tag: el.tagName,
                text: el.textContent.trim().substring(0, 30),
                clickable: !el.disabled
            })).filter(el => /^\\d+$/.test(el.text));
        }''')
        
        print(f"\nDate cells: {len(clickable)}")
        for cell in clickable[:14]:
            status = "✓" if cell['clickable'] else "✗"
            print(f"  {status} {cell['tag']}: {cell['text']}")
    else:
        print("❌ Date button not found")
    
    browser.close()

print("\nDone!")
