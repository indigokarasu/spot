#!/usr/bin/env python3
"""
JouJou - Find Saturday by checking which dates are in the weekend
"""

from playwright.sync_api import sync_playwright
from datetime import datetime

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(
        viewport={'width': 390, 'height': 844},
        user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
    )
    context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
    
    page = context.new_page()
    
    print("JouJou - Finding Saturday")
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
    
    # Get calendar with week info
    result = page.evaluate('''() => {
        const weeks = [...document.querySelectorAll('.ConsumerCalendar-week')];
        const allDays = [];
        
        weeks.forEach((week, weekIdx) => {
            const days = week.querySelectorAll('.ConsumerCalendar-day');
            days.forEach((day, dayIdx) => {
                allDays.push({
                    day: day.textContent.trim(),
                    week: weekIdx,
                    position: dayIdx,
                    disabled: day.classList.contains('is-unavailable'),
                    className: day.className,
                    ariaLabel: day.getAttribute('aria-label') || ''
                });
            });
        });
        
        return { weeks: weeks.length, days: allDays };
    }''')
    
    print(f"Weeks: {result['weeks']}")
    print(f"Days: {len(result['days'])}")
    
    # Days 0-6: Sun, Mon, Tue, Wed, Thu, Fri, Sat
    # Find Saturdays (position 6)
    saturdays = [d for d in result['days'] if d.get('position') == 6]
    available_saturdays = [s for s in saturdays if not s.get('disabled')]
    
    print(f"\nSaturdays found: {len(saturdays)}")
    for sat in saturdays:
        status = "✓" if not sat['disabled'] else "✗"
        print(f"  {status} Day {sat['day']} (week {sat['week']})")
    
    print(f"\nAvailable Saturdays: {len(available_saturdays)}")
    
    if available_saturdays:
        first_sat = available_saturdays[0]
        day_num = first_sat['day']
        
        print(f"\n🎯 Clicking Saturday {day_num}...")
        
        # Click via JavaScript
        page.evaluate(f'''() => {{
            const days = [...document.querySelectorAll('.ConsumerCalendar-day')];
            const sat = days.find(d => d.textContent.trim() === '{day_num}' && !d.classList.contains('is-unavailable'));
            if (sat) sat.click();
        }}''')
        page.wait_for_timeout(3000)
        
        # Extract times
        times = page.evaluate('''() => {
            return [...document.querySelectorAll('button')]
                .filter(b => /\\d{1,2}:\\d{2}/.test(b.textContent))
                .map(b => ({
                    time: b.textContent.trim(),
                    disabled: b.disabled
                }));
        }''')
        
        available_times = [t for t in times if not t['disabled']]
        
        if available_times:
            print(f"\n✅ AVAILABLE TIMES for Saturday {day_num}:")
            for t in available_times[:10]:
                print(f"   - {t['time']}")
            print(f"\n🎉 First available Saturday: Day {day_num}")
        else:
            print(f"\n⚠️ No times for Saturday {day_num}")
    else:
        print("\n❌ No available Saturdays")
    
    browser.close()

print("\nDone!")
