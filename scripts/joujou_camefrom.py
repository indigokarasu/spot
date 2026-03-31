#!/usr/bin/env python3
"""
JouJou - Try the URL with cameFrom parameter and longer wait
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
    
    print("JouJou - cameFrom URL with wait")
    print("=" * 60)
    
    # URL with cameFrom parameter
    url = 'https://www.exploretock.com/joujousf/experience/583810/joujou-dinner-reservation?cameFrom=search_modal&date=2026-04-28&showExclusives=true&size=2&time=20%3A00'
    
    print(f"Loading: {url}")
    page.goto(url, wait_until='domcontentloaded', timeout=30000)
    
    # Wait longer as suggested
    print("Waiting 5 seconds...")
    page.wait_for_timeout(5000)
    
    print(f"Final URL: {page.url}")
    
    # Check for Cloudflare
    cloudflare = page.evaluate('''() => {
        const text = document.body.innerText;
        return text.includes('security verification') || text.includes('Cloudflare');
    }''')
    
    if cloudflare:
        print("\n⚠️ Cloudflare verification detected")
    else:
        print("\n✅ Page loaded normally")
        
        # Check for times using aria selectors
        result = page.evaluate('''() => {
            // Look for buttons with time patterns
            const buttons = [...document.querySelectorAll('button')];
            const times = buttons
                .filter(b => /\\d{1,2}:\\d{2}/.test(b.textContent))
                .map(b => ({
                    time: b.textContent.trim(),
                    disabled: b.disabled,
                    ariaLabel: b.getAttribute('aria-label') || ''
                }));
            
            // Check aria-roles
            const ariaButtons = [...document.querySelectorAll('[role="button"]')]
                .map(b => ({
                    text: b.textContent.trim().substring(0, 50),
                    ariaLabel: b.getAttribute('aria-label')
                }))
                .filter(b => /\\d{1,2}:\\d{2}/.test(b.text) || b.ariaLabel?.includes('time'));
            
            return { times, ariaButtons };
        }''')
        
        print(f"Time buttons: {len(result['times'])}")
        for t in result['times'][:10]:
            status = "✓" if not t['disabled'] else "✗"
            print(f"  {status} {t['time']} - {t['ariaLabel']}")
        
        print(f"\nAria role buttons: {len(result['ariaButtons'])}")
        for b in result['ariaButtons'][:5]:
            print(f"  - {b['text']}")
    
    browser.close()

print("\nDone!")
