#!/usr/bin/env python3
"""
JouJou - Close modal, wait, scroll to load times
"""

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(
        viewport={'width': 1280, 'height': 800},
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    )
    context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
    
    page = context.new_page()
    
    print("JouJou - Close modal, wait, scroll")
    print("=" * 60)
    
    url = 'https://www.exploretock.com/joujousf/experience/583810/joujou-dinner-reservation?cameFrom=search_modal&date=2026-04-28&showExclusives=true&size=2&time=20%3A00'
    
    page.goto(url, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(3000)
    
    print(f"Loaded: {page.url}")
    
    # Close modal
    try:
        close_btn = page.locator('button[aria-label*="Close"]').first
        if close_btn.is_visible():
            close_btn.click()
            print("Modal closed")
            page.wait_for_timeout(2000)
    except:
        print("No modal to close")
    
    # Wait more
    print("Waiting 5 seconds...")
    page.wait_for_timeout(5000)
    
    # Scroll down to load any lazy content
    print("Scrolling down...")
    page.evaluate('''() => {
        window.scrollTo(0, document.body.scrollHeight);
    }''')
    page.wait_for_timeout(2000)
    
    # Check for times
    result = page.evaluate('''() => {
        const allElements = [...document.querySelectorAll('button, div, span, a')];
        const times = allElements
            .filter(el => /\\d{1,2}:\\d{2}/.test(el.textContent))
            .map(el => ({
                text: el.textContent.trim(),
                tag: el.tagName,
                parent: el.parentElement?.tagName
            }))
            .slice(0, 30);
        
        return times;
    }''')
    
    print(f"\nTime elements found: {len(result)}")
    for t in result[:15]:
        print(f"  {t['tag']} ({t['parent']}): {t['text']}")
    
    browser.close()

print("\nDone!")
