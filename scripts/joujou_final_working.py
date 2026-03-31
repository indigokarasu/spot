#!/usr/bin/env python3
"""
JouJou - Working implementation: extract times from dropdown
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
    
    print("JouJou - First Available Saturday")
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
    
    # Open calendar
    page.evaluate('''() => {
        const btn = document.querySelector('button[data-testid="reservation-date-button"]');
        if (btn) btn.click();
    }''')
    page.wait_for_timeout(3000)
    
    # Find Saturdays
    result = page.evaluate('''() => {
        const weeks = [...document.querySelectorAll('.ConsumerCalendar-week')];
        const saturdays = [];
        
        weeks.forEach((week, weekIdx) => {
            const days = week.querySelectorAll('.ConsumerCalendar-day');
            days.forEach((day, dayIdx) => {
                // Day 6 = Saturday
                if (dayIdx === 6) {
                    saturdays.push({
                        day: day.textContent.trim(),
                        week: weekIdx,
                        disabled: day.classList.contains('is-unavailable'),
                        ariaLabel: day.getAttribute('aria-label')
                    });
                }
            });
        });
        
        return { saturdays };
    }''')
    
    saturdays = [s for s in result['saturdays'] if not s['disabled']]
    
    print(f"Saturdays found: {len(result['saturdays'])}")
    print(f"Available: {len(saturdays)}")
    
    if saturdays:
        first = saturdays[0]
        day_num = first['day']
        
        print(f"\n🎯 First available Saturday: Day {day_num}")
        
        # Click the Saturday
        page.evaluate(f'''() => {{
            const weeks = [...document.querySelectorAll('.ConsumerCalendar-week')];
            for (const week of weeks) {{
                const days = week.querySelectorAll('.ConsumerCalendar-day');
                if (days[6] && days[6].textContent.trim() === '{day_num}' && !days[6].classList.contains('is-unavailable')) {{
                    days[6].click();
                    return;
                }}
            }}
        }}''')
        
        page.wait_for_timeout(3000)
        
        # Extract times
        times_result = page.evaluate('''() => {
            const allElements = [...document.querySelectorAll('*')];
            const container = allElements.find(el => {
                const text = el.textContent || '';
                return text.includes('4:00 PM') && text.includes('10:00 PM');
            });
            
            if (!container) return { times: [], error: 'Container not found' };
            
            const text = container.textContent;
            const times = text.match(/\b\d{1,2}:\d{2}\s*(AM|PM)\b/g) || [];
            
            const dateBtn = document.querySelector('button[data-testid="reservation-date-button"]');
            const currentDate = dateBtn ? dateBtn.textContent : 'unknown';
            
            return { times, currentDate };
        }''')
        
        print(f"\n📅 Date: {times_result['currentDate']}")
        print(f"\n✅ Available times: {len(times_result['times'])}")
        for t in times_result['times'][:10]:
            print(f"   - {t}")
    else:
        print("\n❌ No available Saturdays")
    
    browser.close()

print("\nDone!")
