#!/usr/bin/env python3
"""
Tock Working Implementation - Handles modal dialogs
"""

from playwright.sync_api import sync_playwright
from datetime import datetime, timedelta

def find_first_saturday_tock(restaurant_slug, start_date, party_size=2, max_weeks=8):
    current = datetime.strptime(start_date, "%Y-%m-%d")
    while current.weekday() != 5:
        current += timedelta(days=1)
    
    print(f"Searching Tock: {restaurant_slug}")
    print(f"Starting from: {current.strftime('%Y-%m-%d')}")
    print("=" * 60)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
        
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        
        context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
        
        page = context.new_page()
        
        for week in range(max_weeks):
            date_str = current.strftime("%Y-%m-%d")
            print(f"\n--- Checking Saturday {date_str} ---")
            
            # Direct URL to experience with date
            # Use April experience (ID: 597492)
            exp_url = f"https://www.exploretock.com/{restaurant_slug}/experience/597492/2026-april-dinner-lazy-bear"
            full_url = f"{exp_url}?date={date_str}&size={party_size}"
            
            print(f"Loading: {full_url}")
            page.goto(full_url, wait_until='domcontentloaded', timeout=30000)
            page.wait_for_timeout(4000)
            
            # Check if there's a modal/dialog blocking
            try:
                # Look for close button on dialog
                close_btn = page.locator('[data-testid="experience-dialog"] button, [aria-label*="Close"]').first
                if close_btn.is_visible():
                    print("Closing modal dialog...")
                    close_btn.click()
                    page.wait_for_timeout(1000)
            except:
                pass
            
            # Extract availability
            result = page.evaluate('''() => {
                // Look for time buttons
                const buttons = Array.from(document.querySelectorAll('button'));
                const timeButtons = buttons
                    .filter(b => {
                        const text = b.textContent.trim();
                        return /\d{1,2}:\d{2}/.test(text) && !b.disabled;
                    })
                    .map(b => b.textContent.trim());
                
                // Look for availability messages
                const bodyText = document.body.innerText.toLowerCase();
                const hasNoAvailability = bodyText.includes('no availability') ||
                                        bodyText.includes('unavailable') ||
                                        bodyText.includes('sold out') ||
                                        bodyText.includes('fully booked');
                
                // Look for calendar cells
                const cells = Array.from(document.querySelectorAll('td, [class*="day"]'));
                const availableDays = cells
                    .filter(c => {
                        const text = c.textContent.trim();
                        const hasNumber = /\d+/.test(text);
                        const isAvailable = !c.classList.contains('unavailable') &&
                                          !c.disabled;
                        return hasNumber && isAvailable;
                    })
                    .map(c => c.textContent.trim());
                
                return {
                    timeButtons,
                    hasNoAvailability,
                    availableDays: availableDays.slice(0, 10)
                };
            }''')
            
            print(f"  Time buttons: {len(result['timeButtons'])}")
            print(f"  No availability message: {result['hasNoAvailability']}")
            print(f"  Available calendar days: {result['availableDays'][:5]}")
            
            if result['timeButtons'] and len(result['timeButtons']) > 0:
                print(f"\n✅ FOUND AVAILABILITY!")
                for t in result['timeButtons'][:5]:
                    print(f"   - {t}")
                
                browser.close()
                return {
                    'date': date_str,
                    'times': result['timeButtons']
                }
            
            current += timedelta(days=7)
        
        browser.close()
    
    return None

if __name__ == "__main__":
    target = datetime.now() + timedelta(days=35)
    while target.weekday() != 5:
        target += timedelta(days=1)
    start = target.strftime("%Y-%m-%d")
    
    result = find_first_saturday_tock('lazybearsf', start, party_size=2, max_weeks=6)
    
    if result:
        print(f"\n🎉 First available Saturday: {result['date']}")
        print(f"   Times: {', '.join(result['times'][:5])}")
    else:
        print(f"\n❌ No Saturday availability found")
