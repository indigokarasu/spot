#!/usr/bin/env python3
"""
JouJou - Try desktop viewport which sometimes bypasses mobile bot detection
"""

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(
        viewport={'width': 1280, 'height': 800},  # Desktop
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36'
    )
    context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
    
    page = context.new_page()
    
    print("JouJou - Desktop viewport")
    print("=" * 60)
    
    url = 'https://www.exploretock.com/joujousf/experience/583810/joujou-dinner-reservation?cameFrom=search_modal&date=2026-04-28&showExclusives=true&size=2&time=20%3A00'
    
    page.goto(url, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(6000)
    
    print(f"URL: {page.url}")
    
    # Check for Cloudflare
    cf = page.evaluate('''() => {
        return document.body.innerText.includes('security verification') || 
               document.body.innerText.includes('Cloudflare');
    }''')
    
    if cf:
        print("❌ Cloudflare blocked")
    else:
        print("✅ Page loaded")
        
        # Look for times
        result = page.evaluate('''() => {
            // All buttons
            const buttons = [...document.querySelectorAll('button')];
            const times = buttons
                .filter(b => /\\d{1,2}:\\d{2}/.test(b.textContent))
                .map(b => b.textContent.trim());
            
            return { times, totalButtons: buttons.length };
        }''')
        
        print(f"Buttons: {result['totalButtons']}, Times: {len(result['times'])}")
        if result['times']:
            print(f"Times: {result['times'][:10]}")
    
    browser.close()

print("\nDone!")
