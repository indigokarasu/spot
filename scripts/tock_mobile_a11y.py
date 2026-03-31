#!/usr/bin/env python3
"""
Tock - Mobile + A11y spoofing combination
Try mobile viewport with accessibility selectors
"""

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    
    # Mobile viewport + iPhone user agent
    context = browser.new_context(
        viewport={'width': 390, 'height': 844},
        user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    )
    
    # Stealth
    context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
    
    page = context.new_page()
    
    print("Tock: Mobile + A11y Approach")
    print("=" * 60)
    
    # Load experience with April 28 date
    url = 'https://www.exploretock.com/joujousf/experience/583810/joujou-dinner-reservation?date=2026-04-28&size=2'
    
    page.goto(url, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(4000)
    
    print(f"URL: {page.url}")
    print(f"Title: {page.title()}")
    
    # Close modal
    try:
        close_btn = page.locator('button[aria-label*="Close"]').first
        if close_btn.is_visible():
            close_btn.click()
            page.wait_for_timeout(2000)
            print("Modal closed")
    except:
        pass
    
    # Use a11y selectors (like Square pattern)
    result = page.evaluate('''() => {
        // A11y selectors
        const selectors = [
            '[role="button"]',
            '[aria-label*="time"]',
            '[aria-label*="select"]',
            'button[aria-haspopup]'
        ];
        
        const found = [];
        selectors.forEach(sel => {
            const els = [...document.querySelectorAll(sel)];
            els.forEach(el => {
                const text = el.textContent?.trim() || el.getAttribute('aria-label') || '';
                if (text.length > 0 && text.length < 100) {
                    found.push({
                        selector: sel,
                        text: text.substring(0, 50),
                        role: el.getAttribute('role'),
                        ariaLabel: el.getAttribute('aria-label')
                    });
                }
            });
        });
        
        // Also look for time patterns
        const allElements = [...document.querySelectorAll('*')];
        const times = allElements
            .filter(el => /\\d{1,2}:\\d{2}/.test(el.textContent || el.getAttribute('aria-label') || ''))
            .map(el => ({
                tag: el.tagName,
                text: (el.textContent || el.getAttribute('aria-label') || '').trim().substring(0, 50)
            }))
            .slice(0, 20);
        
        return { found: found.slice(0, 15), times };
    }''')
    
    print(f"\nA11y elements found: {len(result['found'])}")
    for el in result['found'][:10]:
        print(f"  [{el['selector']}] '{el['text']}'")
    
    print(f"\nTime patterns: {len(result['times'])}")
    for t in result['times'][:10]:
        print(f"  - {t['tag']}: '{t['text']}'")
    
    browser.close()

print("\nDone!")
