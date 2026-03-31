#!/usr/bin/env python3
"""
JouJou - Full body scan for aria roles and time patterns
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
    
    print("JouJou - Full Scan")
    print("=" * 60)
    
    url = 'https://www.exploretock.com/joujousf/experience/583810/joujou-dinner-reservation?cameFrom=search_modal&date=2026-04-28&showExclusives=true&size=2&time=20%3A00'
    
    print(f"Loading: {url}")
    page.goto(url, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(6000)
    
    print(f"URL: {page.url}")
    
    # Full scan of all elements with aria attributes
    result = page.evaluate('''() => {
        // All elements with aria attributes
        const ariaElements = [...document.querySelectorAll('[aria-label]')];
        
        // Time pattern matches
        const timePattern = /\\d{1,2}:\\d{2}/;
        const timeElements = ariaElements.filter(el => 
            timePattern.test(el.textContent) || 
            timePattern.test(el.getAttribute('aria-label') || '')
        );
        
        // All aria roles
        const roleElements = [...document.querySelectorAll('[role]')];
        
        // Elements with "time" in aria-label
        const timeAria = ariaElements.filter(el => 
            (el.getAttribute('aria-label') || '').toLowerCase().includes('time')
        );
        
        return {
            totalAriaElements: ariaElements.length,
            timePatternElements: timeElements.map(el => ({
                tag: el.tagName,
                text: el.textContent.trim().substring(0, 50),
                ariaLabel: el.getAttribute('aria-label')?.substring(0, 50),
                role: el.getAttribute('role')
            })).slice(0, 20),
            roles: [...new Set(roleElements.map(el => el.getAttribute('role')))].slice(0, 20),
            timeAriaElements: timeAria.map(el => ({
                tag: el.tagName,
                text: el.textContent.trim().substring(0, 50),
                ariaLabel: el.getAttribute('aria-label')?.substring(0, 80)
            })).slice(0, 10)
        };
    }''')
    
    print(f"\nTotal elements with aria-label: {result['totalAriaElements']}")
    
    print(f"\nUnique aria roles found: {', '.join(result['roles'])}")
    
    print(f"\nElements with time in aria-label: {len(result['timeAriaElements'])}")
    for el in result['timeAriaElements']:
        print(f"  {el['tag']}: '{el['text']}' - {el['ariaLabel']}")
    
    print(f"\nElements matching time pattern: {len(result['timePatternElements'])}")
    for el in result['timePatternElements'][:15]:
        print(f"  {el['tag']} [role={el['role']}]: '{el['text']}' - {el['ariaLabel']}")
    
    browser.close()

print("\nDone!")
