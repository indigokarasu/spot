#!/usr/bin/env python3
"""
Tock Working Implementation - Correct approach
Uses domcontentloaded, handles SPAs that poll
"""

from playwright.sync_api import sync_playwright
from datetime import datetime, timedelta

def check_tock_saturday(restaurant_slug, start_date, party_size=2, max_weeks=8):
    current = datetime.strptime(start_date, "%Y-%m-%d")
    while current.weekday() != 5:
        current += timedelta(days=1)
    
    print(f"Tock: {restaurant_slug}")
    print(f"Searching from: {current.strftime('%Y-%m-%d')}")
    print("=" * 60)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
        
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
        
        page = context.new_page()
        
        for week in range(max_weeks):
            date_str = current.strftime("%Y-%m-%d")
            print(f"\n{date_str} (Saturday): ", end='')
            
            # Navigate to experience
            exp_url = f"https://www.exploretock.com/{restaurant_slug}/experience/597492/2026-april-dinner-lazy-bear"
            full_url = f"{exp_url}?date={date_str}&size={party_size}"
            
            try:
                # Use domcontentloaded, not networkidle (SPA keeps polling)
                page.goto(full_url, wait_until='domcontentloaded', timeout=30000)
                page.wait_for_timeout(5000)  # Wait for JS to render
                
                # Extract all text and look for times
                result = page.evaluate('''() => {
                    const text = document.body.innerText;
                    
                    // Look for time patterns
                    const timeMatches = text.match(/\d{1,2}:\d{2}\s*(AM|PM)?/gi) || [];
                    
                    // Look for availability indicators
                    const hasTimes = timeMatches.length > 0;
                    const noAvailability = text.toLowerCase().includes('no availability') ||
                                          text.toLowerCase().includes('sold out') ||
                                          text.toLowerCase().includes('unavailable');
                    
                    return {
                        times: [...new Set(timeMatches)].slice(0, 10),  // unique times
                        hasTimes,
                        noAvailability,
                        snippet: text.substring(0, 800)
                    };
                }''')
                
                if result['hasTimes'] and not result['noAvailability']:
                    print(f"✅ Available! Times: {', '.join(result['times'][:5])}")
                    browser.close()
                    return {
                        'date': date_str,
                        'times': result['times']
                    }
                elif result['noAvailability']:
                    print("❌ No availability")
                else:
                    print("⚠️ Page loaded but no times detected")
                    
            except Exception as e:
                print(f"Error: {e}")
            
            current += timedelta(days=7)
        
        browser.close()
    
    return None

if __name__ == "__main__":
    target = datetime.now() + timedelta(days=1)  # Start from tomorrow
    start = target.strftime("%Y-%m-%d")
    
    result = check_tock_saturday('lazybearsf', start, party_size=2, max_weeks=4)
    
    if result:
        print(f"\n🎉 First available Saturday: {result['date']}")
        print(f"   Times: {', '.join(result['times'][:5])}")
    else:
        print(f"\n❌ No Saturday availability found")
