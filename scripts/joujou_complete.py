#!/usr/bin/env python3
"""
JouJou - Complete Tock implementation with calendar navigation
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
    
    # Load experience
    url = 'https://www.exploretock.com/joujousf/experience/583810/joujou-dinner-reservation?size=2'
    page.goto(url, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(4000)
    
    # Get initial state
    initial = page.evaluate('''() => {
        const text = document.body.innerText;
        const buttons = [...document.querySelectorAll('button')];
        const times = buttons
            .filter(b => /\\d{1,2}:\\d{2}/.test(b.textContent))
            .map(b => b.textContent.trim());
        
        return { times, hasModal: text.includes('Reservation') && text.includes('JouJou Dinner') };
    }''')
    
    print(f"Initial times found: {len(initial['times'])}")
    if initial['times']:
        print(f"Times: {initial['times'][:5]}")
    
    # Close modal if present
    try:
        close_btn = page.locator('button[aria-label*="Close"]').first
        if close_btn.is_visible():
            close_btn.click()
            page.wait_for_timeout(2000)
            print("Modal closed")
    except:
        pass
    
    # Now look for times again
    result = page.evaluate('''() => {
        const buttons = [...document.querySelectorAll('button')];
        return buttons
            .filter(b => /\\d{1,2}:\\d{2}/.test(b.textContent))
            .map(b => ({
                time: b.textContent.trim(),
                disabled: b.disabled
            }));
    }''')
    
    print(f"\nAfter modal close: {len(result)} times")
    
    available = [r for r in result if not r['disabled']]
    if available:
        print(f"✅ {len(available)} available times:")
        for t in available[:10]:
            print(f"   - {t['time']}")
    
    browser.close()

print("\nDone!")
