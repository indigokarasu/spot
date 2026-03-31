#!/usr/bin/env python3
"""
JouJou - Extract times from dropdown elements
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
    
    print("JouJou - Extracting Times")
    print("=" * 60)
    
    url = 'https://www.exploretock.com/joujousf/experience/583810/joujou-dinner-reservation?cameFrom=search_modal&date=2026-04-28&showExclusives=true&size=2&time=20%3A00'
    
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
    
    # Extract times from the DOM where they appear as text
    result = page.evaluate('''() => {
        // The times are in the time dropdown (not clickable buttons yet)
        // Look for elements containing "Time" followed by times
        
        const allElements = [...document.querySelectorAll('*')];
        const timeContainers = allElements.filter(el => {
            const text = el.textContent || '';
            return text.includes('4:00 PM') && text.includes('10:00 PM');
        });
        
        // Get the parent container
        const container = timeContainers[0];
        
        if (!container) {
            return { error: 'Time container not found' };
        }
        
        // Extract text and split into individual times
        const text = container.textContent;
        // More strict pattern to avoid concatenation issues
        const timeMatch = text.match(/\b\d{1,2}:\d{2}\s*(AM|PM)\b/g);
        
        // Get current date shown
        const dateBtn = document.querySelector('button[data-testid="reservation-date-button"]');
        const currentDate = dateBtn ? dateBtn.textContent : 'unknown';
        
        return {
            currentDate,
            times: timeMatch,
            containerTag: container.tagName,
            containerClass: container.className?.substring(0, 50) || ''
        };
    }''')
    
    print(f"Current date: {result.get('currentDate')}")
    print(f"Container: {result.get('containerTag')} - {result.get('containerClass')}")
    
    times = result.get('times', [])
    print(f"\n✅ Times found: {len(times)}")
    for t in times[:10]:
        print(f"   - {t}")
    
    browser.close()

print("\nDone!")
