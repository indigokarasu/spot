#!/usr/bin/env python3
"""
Tock Availability Checker - Complete Implementation
Uses patterns from Square: accessibility selectors, semantic HTML, visual detection
"""

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
from datetime import datetime, timedelta
import json


def find_first_saturday_tock(restaurant_slug, start_date, party_size=2, max_weeks=8):
    """
    Find first available Saturday at Tock restaurant.
    """
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
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='en-US',
            timezone_id='America/Los_Angeles'
        )
        
        # Stealth: mask automation
        context.add_init_script('''
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            window.chrome = { runtime: {} };
        ''')
        
        page = context.new_page()
        
        # Step 1: Go to restaurant page
        url = f"https://www.exploretock.com/{restaurant_slug}"
        print(f"\nStep 1: Loading {url}")
        page.goto(url, wait_until='networkidle', timeout=60000)
        page.wait_for_timeout(3000)
        
        # Step 2: Find and click experience
        print("Step 2: Finding experiences...")
        
        experience_data = page.evaluate('''() => {
            // Look for experience links
            const links = [...document.querySelectorAll('a[href*="/experience/"]')];
            const experiences = links
                .filter(l => l.textContent.includes('2026') || l.textContent.includes('Dinner'))
                .map(l => ({
                    text: l.textContent.trim().substring(0, 80),
                    href: l.href
                }));
            return experiences;
        }''')
        
        if not experience_data or len(experience_data) == 0:
            print("No experiences found")
            browser.close()
            return None
        
        print(f"Found {len(experience_data)} experiences")
        for exp in experience_data[:3]:
            print(f"  - {exp['text']}")
        
        # Use first experience
        exp_url = experience_data[0]['href']
        print(f"\nStep 3: Navigating to experience: {exp_url}")
        
        # Step 3: Go to experience with party size
        for week in range(max_weeks):
            date_str = current.strftime("%Y-%m-%d")
            print(f"\n--- Checking Saturday {date_str} ---")
            
            # Navigate to experience with date/party
            exp_with_params = f"{exp_url}?date={date_str}&size={party_size}"
            print(f"  Navigating: {exp_with_params}")
            
            try:
                page.goto(exp_with_params, wait_until='domcontentloaded', timeout=30000)
                page.wait_for_timeout(4000)
            except PlaywrightTimeout:
                print(f"  ⚠️ Timeout, trying again...")
                page.goto(exp_with_params, wait_until='domcontentloaded', timeout=30000)
                page.wait_for_timeout(4000)
            
            # Step 4: Extract availability using multiple patterns
            print("Step 4: Checking availability...")
            
            availability = page.evaluate('''() => {
                const results = {
                    times: [],
                    calendarDays: [],
                    buttons: []
                };
                
                // Pattern 1: Time slot buttons
                const buttons = [...document.querySelectorAll('button')];
                buttons.forEach(btn => {
                    const text = btn.textContent.trim();
                    const disabled = btn.disabled || 
                                     btn.getAttribute('disabled') ||
                                     btn.classList.contains('unavailable') ||
                                     btn.classList.contains('disabled');
                    
                    // Look for time patterns
                    if (/\d{1,2}:\d{2}/.test(text) && !disabled) {
                        results.times.push({
                            time: text,
                            disabled: false
                        });
                    }
                    
                    results.buttons.push({
                        text: text.substring(0, 50),
                        disabled: disabled
                    });
                });
                
                // Pattern 2: Calendar cells
                const cells = document.querySelectorAll('td, [class*="day"]');
                cells.forEach(cell => {
                    const text = cell.textContent.trim();
                    const isAvailable = !cell.classList.contains('unavailable') &&
                                      !cell.classList.contains('disabled') &&
                                      cell.textContent.length > 0;
                    if (/\d+/.test(text)) {
                        results.calendarDays.push({
                            day: text,
                            available: isAvailable
                        });
                    }
                });
                
                // Pattern 3: Check for "no availability" message
                const bodyText = document.body.innerText.toLowerCase();
                results.hasNoAvailability = bodyText.includes('no availability') ||
                                           bodyText.includes('unavailable') ||
                                           bodyText.includes('sold out');
                
                return results;
            }''')
            
            print(f"  Calendar days found: {len(availability['calendarDays'])}")
            print(f"  Time buttons found: {len(availability['times'])}")
            print(f"  Has 'no availability': {availability.get('hasNoAvailability', False)}")
            
            if availability['times'] and len(availability['times']) > 0:
                print(f"\n✅ AVAILABLE! Found {len(availability['times'])} slots")
                for t in availability['times'][:5]:
                    print(f"   - {t['time']}")
                
                browser.close()
                return {
                    'date': date_str,
                    'times': availability['times'],
                    'experience': experience_data[0]['text']
                }
            
            # Move to next Saturday
            current += timedelta(days=7)
        
        browser.close()
    
    return None


if __name__ == "__main__":
    # Find first Saturday ~1 month out
    target = datetime.now() + timedelta(days=35)
    while target.weekday() != 5:
        target += timedelta(days=1)
    start = target.strftime("%Y-%m-%d")
    
    result = find_first_saturday_tock('lazybearsf', start, party_size=2, max_weeks=8)
    
    if result:
        print(f"\n🎉 First available Saturday: {result['date']}")
        print(f"   Experience: {result['experience']}")
        print(f"   Times: {', '.join([t['time'] for t in result['times'][:5]])}")
    else:
        print("\n❌ No Saturday availability found")
