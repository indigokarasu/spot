#!/usr/bin/env python3
"""
JouJou - Extract calendar properly
"""

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    )
    context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
    
    page = context.new_page()
    
    print("JouJou - Calendar Extraction")
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
    date_btn = page.locator('button:has-text("Date")').first
    date_btn.click()
    page.wait_for_timeout(2000)
    
    # Extract calendar with screenshot
    page.screenshot(path='/workspace/openclaw/data/joujou_calendar.png')
    print("Screenshot saved: /workspace/openclaw/data/joujou_calendar.png")
    
    # Try different selectors
    calendar = page.evaluate('''() => {
        // Try various calendar selectors
        const selectors = [
            'table', 
            '[role="grid"]',
            '[class*="calendar"]',
            '[class*="Calendar"]',
            'MuiPickersCalendar'
        ];
        
        for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el) {
                return {
                    found: sel,
                    html: el.outerHTML.substring(0, 500)
                };
            }
        }
        
        // Get all buttons with dates
        const buttons = [...document.querySelectorAll('button')];
        const dateButtons = buttons
            .filter(b => /^\\d+$/.test(b.textContent.trim()))
            .map(b => ({
                text: b.textContent.trim(),
                disabled: b.disabled || b.getAttribute('disabled'),
                ariaLabel: b.getAttribute('aria-label')
            }));
        
        return { dateButtons: dateButtons.slice(0, 31) };
    }''')
    
    print(f"\nCalendar found: {calendar.get('found', 'No table found')}")
    
    if 'dateButtons' in calendar:
        print(f"\nDate buttons: {len(calendar['dateButtons'])}")
        for btn in calendar['dateButtons'][:14]:
            status = "✓" if not btn['disabled'] else "✗"
            print(f"  {status} Day {btn['text']}")
    
    browser.close()

print("\nDone!")
