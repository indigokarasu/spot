#!/usr/bin/env python3
"""Check Resy for first available Saturday"""
from playwright.sync_api import sync_playwright
from datetime import datetime, timedelta

def find_first_saturday_resy(venue_slug, start_date, party_size=2, max_weeks=8):
    current = datetime.strptime(start_date, "%Y-%m-%d")
    while current.weekday() != 5:
        current += timedelta(days=1)
    
    print(f"Searching for first available Saturday at {venue_slug}...")
    print(f"Starting from: {current.strftime('%Y-%m-%d')}")
    print("=" * 60)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = context.new_page()
        
        for week in range(max_weeks):
            date_str = current.strftime("%Y-%m-%d")
            print(f"\nChecking Saturday {date_str}...")
            
            url = f"https://resy.com/cities/san-francisco-ca/venues/{venue_slug}?date={date_str}&seats={party_size}"
            page.goto(url, wait_until='domcontentloaded', timeout=30000)
            page.wait_for_timeout(3000)
            
            # Extract times
            times = page.evaluate('''() => {
                const buttons = document.querySelectorAll('button');
                const times = [];
                buttons.forEach(btn => {
                    const text = btn.textContent.trim();
                    if (/\\d{1,2}:\\d{2}/.test(text) && !btn.disabled) {
                        times.push(text);
                    }
                });
                return times;
            }''')
            
            if times:
                print(f"  ✅ Found {len(times)} available times!")
                for t in times[:5]:
                    print(f"     - {t}")
                context.close()
                browser.close()
                return {'date': date_str, 'times': times}
            else:
                print(f"  Not available")
            
            current += timedelta(days=7)
        
        context.close()
        browser.close()
    
    return None

if __name__ == "__main__":
    target = datetime.now() + timedelta(days=35)
    while target.weekday() != 5:
        target += timedelta(days=1)
    start = target.strftime("%Y-%m-%d")
    
    result = find_first_saturday_resy('7-adams', start, party_size=2, max_weeks=8)
    
    if result:
        print(f"\n🎉 First available Saturday: {result['date']}")
        print(f"   Times: {result['times'][:10]}")
    else:
        print(f"\n❌ No Saturday availability found")
