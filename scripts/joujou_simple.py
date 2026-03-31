#!/usr/bin/env python3
"""
JouJou - What date is loaded and is it available?
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
    
    print("JouJou - Current Loaded Date")
    print("=" * 60)
    
    url = 'https://www.exploretock.com/joujousf/experience/583810/joujou-dinner-reservation?cameFrom=search_modal&date=2026-04-28&showExclusives=true&size=2&time=20%3A00'
    
    page.goto(url, wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(5000)
    
    # Close modal
    try:
        close_btn = page.locator('button[aria-label*="Close"]').first
        if close_btn.is_visible():
            close_btn.click()
            page.wait_for_timeout(2000)
    except:
        pass
    
    # Extract date and times
    result = page.evaluate('''() => {
        const dateBtn = document.querySelector('button[data-testid="reservation-date-button"]');
        const dateText = dateBtn ? dateBtn.textContent.trim() : 'unknown';
        
        // Parse "DateMar 31, 2026" to just the date part
        const match = dateText.match(/Date([A-Z][a-z]+ \d{1,2},? \d{4})/);
        const parsedDate = match ? match[1] : dateText;
        
        // Get times from page content
        const allElements = [...document.querySelectorAll('*')];
        const container = allElements.find(el => {
            const text = el.textContent || '';
            return text.includes('4:00 PM') && text.includes('10:00 PM');
        });
        
        let times = [];
        if (container) {
            const text = container.textContent;
            times = text.match(/\d{1,2}:\d{2}\s*(AM|PM)/g) || [];
        }
        
        return { dateText, parsedDate, times, hasTimes: times.length > 0 };
    }''')
    
    print(f"Date button: {result['dateText']}")
    print(f"Parsed date: {result['parsedDate']}")
    print(f"Has times: {result['hasTimes']}")
    
    if result['times']:
        print(f"\n✅ {len(result['times'])} times available:")
        for t in result['times'][:10]:
            print(f"   - {t}")
    else:
        print("\n❌ No times found")
    
    # Summary
    date_str = result['parsedDate']
    print(f"\n📊 Summary:")
    print(f"   Page loaded with: {date_str}")
    print(f"   Times available: {len(result['times'])}")
    print(f"   (Note: URL requested 2026-04-28, but page loaded {date_str.split(' ')[0] if ' ' in date_str else 'unknown'})")
    
    browser.close()

print("\nDone!")
