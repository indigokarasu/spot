#!/usr/bin/env python3
"""
JouJou - Check if times appear after date click, maybe need to scroll
"""

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(
        viewport={'width': 390, 'height': 844}  # Mobile height
    )
    context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
    
    page = context.new_page()
    
    print("JouJou - Time Slot Detection")
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
    
    # First check: what day is currently selected and times shown?
    print("Current state before clicking...")
    current = page.evaluate('''() => {
        const dateBtn = document.querySelector('button[data-testid="reservation-date-button"]');
        const currentDate = dateBtn ? dateBtn.textContent : 'unknown';
        
        // Look for time slots
        const allElements = [...document.querySelectorAll('button, div, span, a')];
        const times = allElements
            .filter(el => /\\d{1,2}:\\d{2}/.test(el.textContent))
            .map(el => el.textContent.trim())
            .filter((v, i, a) => a.indexOf(v) === i);  // unique
        
        return { currentDate, times: times.slice(0, 30) };
    }''')
    
    print(f"Current date: {current['currentDate']}")
    print(f"Times currently visible: {len(current['times'])}")
    if current['times']:
        print(f"Times: {current['times'][:10]}")
    
    # Open calendar
    page.evaluate('''() => {
        const btn = document.querySelector('button[data-testid="reservation-date-button"]');
        if (btn) btn.click();
    }''')
    page.wait_for_timeout(2000)
    
    # Click Saturday 7
    print("\nClicking Saturday 7...")
    page.evaluate('''() => {
        const days = [...document.querySelectorAll('.ConsumerCalendar-day')];
        const sat = days.find(d => d.textContent.trim() === '7');
        if (sat) sat.click();
    }''')
    page.wait_for_timeout(4000)
    
    # Check times again
    after = page.evaluate('''() => {
        const dateBtn = document.querySelector('button[data-testid="reservation-date-button"]');
        const selectedDate = dateBtn ? dateBtn.textContent : 'unknown';
        
        const allElements = [...document.querySelectorAll('button, div, span, a')];
        const times = allElements
            .filter(el => /\\d{1,2}:\\d{2}/.test(el.textContent))
            .map(el => el.textContent.trim())
            .filter((v, i, a) => a.indexOf(v) === i);
        
        return { selectedDate, times: times.slice(0, 30) };
    }''')
    
    print(f"\nAfter click:")
    print(f"Selected date: {after['selectedDate']}")
    print(f"Times visible: {len(after['times'])}")
    if after['times']:
        print(f"Times: {after['times'][:10]}")
    else:
        print("⚠️ No times - checking body text...")
        text = page.evaluate('() => document.body.innerText.substring(0, 1500)')
        print(text[:500])
    
    browser.close()

print("\nDone!")
