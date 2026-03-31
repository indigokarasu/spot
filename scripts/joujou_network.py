#!/usr/bin/env python3
"""
JouJou - Capture network requests to find time slot loading
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
    
    # Capture network requests
    requests = []
    page.on('request', lambda req: requests.append(req.url) if 'tock' in req.url or 'api' in req.url else None)
    
    print("JouJou - Network Capture")
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
    
    # Open calendar
    page.evaluate('''() => {
        const btn = document.querySelector('button[data-testid="reservation-date-button"]');
        if (btn) btn.click();
    }''')
    page.wait_for_timeout(3000)
    
    # Click Saturday 7
    print("Clicking Saturday 7...")
    page.evaluate('''() => {
        const days = [...document.querySelectorAll('.ConsumerCalendar-day')];
        const sat = days.find(d => d.textContent.trim() === '7' && !d.classList.contains('is-unavailable'));
        if (sat) sat.click();
    }''')
    
    # Wait longer for XHR
    page.wait_for_timeout(5000)
    
    print(f"\nNetwork requests captured: {len(requests)}")
    for req in requests[-10:]:
        print(f"  {req[:100]}...")
    
    # Check for times
    times = page.evaluate('''() => {
        return [...document.querySelectorAll('button, div, span')]
            .filter(el => /\\d{1,2}:\\d{2}/.test(el.textContent))
            .map(el => ({
                text: el.textContent.trim(),
                tag: el.tagName,
                className: el.className?.substring(0, 30) || ''
            }))
            .slice(0, 20);
    }''')
    
    print(f"\nTime elements found: {len(times)}")
    for t in times[:10]:
        print(f"  {t['tag']}: '{t['text']}' | {t['className']}")
    
    browser.close()

print("\nDone!")
