#!/usr/bin/env python3
"""
Tock - Broad selector approach after date click
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
    
    print("Tock: Broad Selector After Click")
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
    
    # Click date using JavaScript (bypass visibility check)
    print("Clicking date via JavaScript...")
    page.evaluate('''() => {
        const btn = document.querySelector('button[data-testid="reservation-date-button"]');
        if (btn) {
            btn.click();
            return 'clicked';
        }
        return 'not found';
    }''')
    page.wait_for_timeout(3000)
    
    # Take screenshot after click
    page.screenshot(path='/workspace/openclaw/data/tock_after_click.png')
    print("Screenshot: /workspace/openclaw/data/tock_after_click.png")
    
    # Check all elements with numbers
    numbers = page.evaluate('''() => {
        const all = [...document.querySelectorAll('*')];
        const withNumbers = all
            .filter(el => /^\\d+$/.test(el.textContent?.trim()))
            .map(el => ({
                tag: el.tagName,
                text: el.textContent.trim(),
                parent: el.parentElement?.tagName,
                className: el.className?.substring(0, 30) || ''
            }))
            .slice(0, 50);
        
        return withNumbers;
    }''')
    
    print(f"\nElements with numbers: {len(numbers)}")
    for n in numbers[:20]:
        print(f"  {n['tag']} ({n['parent']}): '{n['text']}' | {n['className']}")
    
    browser.close()

print("\nDone!")
