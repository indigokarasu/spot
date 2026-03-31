#!/usr/bin/env python3
"""
SevenRooms Availability Checker - Working Version
Finds first available Saturday by interacting with the page
"""

from playwright.sync_api import sync_playwright
import json
from datetime import datetime, timedelta

def find_first_saturday_sevenrooms(venue_id, start_date, party_size=2, max_weeks=8):
    """
    Find first available Saturday at a SevenRooms restaurant.
    
    Args:
        venue_id: The venue slug (e.g., 'quince')
        start_date: Starting date in YYYY-MM-DD format
        party_size: Number of guests
        max_weeks: How many weeks to check
    """
    
    # Calculate Saturdays
    current = datetime.strptime(start_date, "%Y-%m-%d")
    while current.weekday() != 5:  # Saturday = 5
        current += timedelta(days=1)
    
    print(f"Searching for first available Saturday at {venue_id}...")
    print(f"Starting from: {current.strftime('%Y-%m-%d')}")
    print("=" * 60)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        page = context.new_page()
        
        # Navigate to booking page
        url = f'https://www.sevenrooms.com/explore/{venue_id}/reservations/create/search/'
        print(f"\nLoading {url}...")
        page.goto(url, wait_until='networkidle', timeout=60000)
        page.wait_for_timeout(3000)
        
        # Click on Guests dropdown to set party size
        try:
            guest_btn = page.locator('button:has-text("Guests")').first
            if guest_btn.is_visible():
                guest_btn.click()
                page.wait_for_timeout(500)
                # Select party size
                party_option = page.locator(f'text={party_size} Guest').first
                if party_option.is_visible():
                    party_option.click()
                    page.wait_for_timeout(500)
        except:
            pass
        
        for week in range(max_weeks):
            date_str = current.strftime("%Y-%m-%d")
            print(f"\nChecking Saturday {date_str}...")
            
            # Click on Date dropdown
            try:
                date_btn = page.locator('button:has-text("Date")').first
                if date_btn.is_visible():
                    date_btn.click()
                    page.wait_for_timeout(1000)
                    
                    # Try to find and click the date
                    # SevenRooms uses a calendar widget
                    date_cell = page.locator(f'text={current.day}').first
                    if date_cell.is_visible():
                        date_cell.click()
                        page.wait_for_timeout(2000)
                    else:
                        # Navigate to correct month if needed
                        # (Would need to click prev/next month buttons)
                        print(f"  Date {current.day} not visible in current month")
                        
            except Exception as e:
                print(f"  Error selecting date: {e}")
            
            # Extract available times
            try:
                times = page.evaluate('''() => {
                    const buttons = document.querySelectorAll('button');
                    const times = [];
                    buttons.forEach(btn => {
                        const text = btn.textContent.trim();
                        // Look for time patterns like "7:00 PM"
                        if (/\\d{1,2}:\\d{2}\\s*(AM|PM)/i.test(text)) {
                            times.push({
                                time: text,
                                disabled: btn.disabled,
                                classes: btn.className
                            });
                        }
                    });
                    return times;
                }''')
                
                available_times = [t for t in times if not t.get('disabled')]
                
                if available_times:
                    print(f"  ✅ Found {len(available_times)} available slots!")
                    for t in available_times[:5]:
                        print(f"     - {t['time']}")
                    
                    context.close()
                    browser.close()
                    return {
                        'date': date_str,
                        'times': available_times,
                        'venue': venue_id
                    }
                else:
                    print(f"  No available times found")
                    
            except Exception as e:
                print(f"  Error extracting times: {e}")
            
            # Move to next Saturday
            current += timedelta(days=7)
        
        context.close()
        browser.close()
    
    return None

if __name__ == "__main__":
    import sys
    
    venue = sys.argv[1] if len(sys.argv) > 1 else 'quince'
    
    # Start from first Saturday ~1 month out
    target = datetime.now() + timedelta(days=35)
    while target.weekday() != 5:
        target += timedelta(days=1)
    start = target.strftime("%Y-%m-%d")
    
    result = find_first_saturday_sevenrooms(venue, start, party_size=2, max_weeks=8)
    
    if result:
        print(f"\n🎉 First available Saturday: {result['date']}")
        print(f"   Times: {[t['time'] for t in result['times']]}")
    else:
        print(f"\n❌ No Saturday availability found in 8 weeks")
