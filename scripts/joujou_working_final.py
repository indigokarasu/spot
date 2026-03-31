#!/usr/bin/env python3
"""
Tock - Working implementation: JavaScript click + ConsumerCalendar selectors
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
    
    print("JouJou - Finding First Available Saturday")
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
    
    # Open calendar via JavaScript
    print("Opening calendar...")
    page.evaluate('''() => {
        const btn = document.querySelector('button[data-testid="reservation-date-button"]');
        if (btn) btn.click();
    }''')
    page.wait_for_timeout(3000)
    
    # Extract calendar using ConsumerCalendar classes
    calendar = page.evaluate('''() => {
        const days = [...document.querySelectorAll('.ConsumerCalendar-day')];
        return days.map(d => ({
            day: d.textContent.trim(),
            disabled: d.classList.contains('is-unavailable') || d.disabled,
            isSaturday: d.classList.contains('is-sat') || d.getAttribute('aria-label')?.includes('Saturday'),
            ariaLabel: d.getAttribute('aria-label') || ''
        })).filter(d => /^\\d+$/.test(d.day));
    }''')
    
    print(f"Calendar days: {len(calendar)}")
    
    # Find first available Saturday
    saturday = None
    for day in calendar:
        sat_marker = " (SAT)" if day.get('isSaturday') else ""
        status = "✓" if not day['disabled'] else "✗"
        print(f"  {status} Day {day['day']}{sat_marker}")
        if day.get('isSaturday') and not day['disabled'] and not saturday:
            saturday = day
    
    if saturday:
        day_num = saturday['day']
        print(f"\n🎯 Clicking Saturday {day_num}...")
        
        # Click the Saturday via JavaScript
        page.evaluate(f'''() => {{
            const days = [...document.querySelectorAll('.ConsumerCalendar-day')];
            const sat = days.find(d => d.textContent.trim() === '{day_num}');
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
        
        print(f"\nTimes found: {len(times)}")
        print(f"Available: {len(available_times)}")
        
        if available_times:
            print(f"\n✅ AVAILABLE TIMES for Saturday {day_num}:")
            for t in available_times[:10]:
                print(f"   - {t['time']}")
            print(f"\n🎉 First available Saturday: Day {day_num}")
        else:
            print("\n⚠️ No available times for this Saturday")
    else:
        print("\n❌ No available Saturday found")
    
    browser.close()

print("\nDone!")
