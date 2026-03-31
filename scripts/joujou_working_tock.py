#!/usr/bin/env python3
"""
JouJou - Working Tock implementation
URL-based date search without Cloudflare issues
"""

from playwright.sync_api import sync_playwright
from datetime import datetime, timedelta

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(
        viewport={'width': 1280, 'height': 800},
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    )
    context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
    
    page = context.new_page()
    
    print("JouJou - First Available Saturday")
    print("=" * 60)
    
    # Start from April 4, 2026 (next Saturday)
    current = datetime(2026, 4, 4)
    
    found = None
    max_attempts = 8  # Check 8 Saturdays
    
    for i in range(max_attempts):
        date_str = current.strftime('%Y-%m-%d')
        
        url = f'https://www.exploretock.com/joujousf/experience/583810/joujou-dinner-reservation?cameFrom=search_modal&date={date_str}&showExclusives=true&size=2'
        
        print(f"Checking {date_str} (Saturday)...")
        page.goto(url, wait_until='domcontentloaded', timeout=30000)
        page.wait_for_timeout(4000)
        
        # Close modal
        try:
            close_btn = page.locator('button[aria-label*="Close"]').first
            if close_btn.is_visible():
                close_btn.click()
                page.wait_for_timeout(1500)
        except:
            pass
        
        # Extract times
        result = page.evaluate('''() => {
            const allElements = [...document.querySelectorAll('*')];
            const container = allElements.find(el => {
                const text = el.textContent || '';
                return text.includes('4:00 PM') && text.includes('10:00 PM');
            });
            
            let times = [];
            if (container) {
                const text = container.textContent;
                times = text.match(/\\d{1,2}:\\d{2}\\s*(AM|PM)/g) || [];
            }
            
            return { times, hasAvailability: times.length > 0 };
        }''')
        
        if result['hasAvailability']:
            found = {
                'date': date_str,
                'times': result['times']
            }
            break
        
        print(f"   ❌ No availability")
        current += timedelta(days=7)
    
    print()
    print("=" * 60)
    if found:
        print(f"🎉 First available Saturday: {found['date']}")
        print(f"   {len(found['times'])} time slots:")
        for t in found['times'][:10]:
            print(f"      - {t}")
    else:
        print("❌ No Saturday availability found")
    
    browser.close()

print("\nDone!")
