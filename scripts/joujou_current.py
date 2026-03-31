#!/usr/bin/env python3
"""
JouJou - Check current loaded date without clicking
"""

from playwright.sync_api import sync_playwright
from datetime import datetime

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
    
    # Extract current date and times without clicking
    result = page.evaluate('''() => {
        const dateBtn = document.querySelector('button[data-testid="reservation-date-button"]');
        const dateText = dateBtn ? dateBtn.textContent : 'unknown';
        
        // Extract date from text like "DateMar 31, 2026"
        const dateMatch = dateText.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
        
        // Get times from visible content
        const allElements = [...document.querySelectorAll('*')];
        const container = allElements.find(el => {
            const text = el.textContent || '';
            return text.includes('4:00 PM') && text.includes('10:00 PM');
        });
        
        let times = [];
        if (container) {
            const text = container.textContent;
            times = text.match(/\b\d{1,2}:\d{2}\s*(AM|PM)\b/g) || [];
        }
        
        // Get day of week if possible
        const calendarDays = [...document.querySelectorAll('.ConsumerCalendar-day')];
        const currentDay = calendarDays.find(d => d.classList.contains('is-selected'));
        const dayOfWeek = currentDay ? currentDay.getAttribute('aria-label') : '';
        
        return { dateText, dateMatch, times, dayOfWeek };
    }''')
    
    print(f"Date button text: {result['dateText']}")
    
    if result['dateMatch']:
        month, day, year = result['dateMatch'][1], result['dateMatch'][2], result['dateMatch'][3]
        print(f"Parsed: {month} {day}, {year}")
        
        # Check if it's Saturday
        date_obj = datetime.strptime(f"{year}-{month}-{day}", "%Y-%B-%d")
        is_saturday = date_obj.weekday() == 5
        print(f"Day of week: {date_obj.strftime('%A')}")
        print(f"Is Saturday: {is_saturday}")
    
    print(f"\n✅ Times available: {len(result['times'])}")
    for t in result['times'][:10]:
        print(f"   - {t}")
    
    browser.close()

print("\nDone!")
