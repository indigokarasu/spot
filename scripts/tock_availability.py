#!/usr/bin/env python3
"""
Tock Availability Checker
Browser automation required due to Cloudflare Turnstile bot detection
"""

import json
import time
import re
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout


def extract_restaurant_info(url):
    """
    Extract restaurant slug and experience ID from Tock URL.
    
    Example URLs:
    - https://www.exploretock.com/lazybearsf
    - https://www.exploretock.com/lazybearsf/experience/330688/reservation
    """
    # Extract slug from path
    match = re.search(r'/([^/]+)/experience/(\d+)', url)
    if match:
        return {
            'slug': match.group(1),
            'experience_id': match.group(2)
        }
    
    # Just the restaurant slug
    match = re.search(r'exploretock\.com/([^/]+)/?$', url)
    if match:
        return {
            'slug': match.group(1),
            'experience_id': None
        }
    
    return None


def check_tock_availability(restaurant_slug, experience_id=None, date=None, party_size=2, headless=False):
    """
    Check Tock availability using Playwright browser automation.
    
    Requires Playwright with stealth plugin to bypass Cloudflare Turnstile.
    
    Args:
        restaurant_slug: Restaurant URL slug (e.g., 'lazybearsf')
        experience_id: Specific experience ID (found in booking URL)
        date: Date string YYYY-MM-DD (optional, will check default view)
        party_size: Number of guests
        headless: Run in headless mode (may trigger bot detection)
    
    Returns:
        Dict with availability info
    """
    result = {
        'platform': 'tock',
        'restaurant': restaurant_slug,
        'date': date,
        'party_size': party_size,
        'available': False,
        'times': [],
        'error': None
    }
    
    with sync_playwright() as p:
        # Launch browser with stealth options
        browser = p.chromium.launch(
            headless=headless,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
            ]
        )
        
        # Create context with realistic viewport and user agent
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='en-US',
            timezone_id='America/Los_Angeles',
        )
        
        # Add stealth script
        context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
        """)
        
        page = context.new_page()
        
        try:
            # Build URL
            if experience_id:
                url = f"https://www.exploretock.com/{restaurant_slug}/experience/{experience_id}/reservation"
            else:
                url = f"https://www.exploretock.com/{restaurant_slug}"
            
            print(f"Navigating to {url}...")
            page.goto(url, wait_until='domcontentloaded', timeout=30000)
            
            # Wait for page to load
            time.sleep(3)
            
            # Check if we hit a Cloudflare challenge
            if 'cloudflare' in page.content().lower() or 'challenge' in page.content().lower():
                result['error'] = 'Cloudflare challenge detected - may require manual intervention'
                return result
            
            # If no experience_id, we need to select an experience first
            if not experience_id:
                # Look for experience buttons/links
                experience_links = page.query_selector_all('[data-testid*="experience"], a[href*="/experience/"]')
                if experience_links:
                    # Click the first available experience
                    experience_links[0].click()
                    time.sleep(2)
                    
                    # Extract experience ID from URL
                    current_url = page.url
                    match = re.search(r'/experience/(\d+)', current_url)
                    if match:
                        result['experience_id'] = match.group(1)
            
            # Set party size if there's a selector
            try:
                # Look for guest count selector
                guest_selectors = [
                    'select[name="guests"]',
                    '[data-testid*="guest"]',
                    'select[id*="guest"]',
                ]
                
                for selector in guest_selectors:
                    guest_select = page.query_selector(selector)
                    if guest_select:
                        guest_select.select_option(str(party_size))
                        time.sleep(1)
                        break
            except Exception as e:
                print(f"Could not set party size: {e}")
            
            # If date specified, navigate to that date
            if date:
                # Look for date input or calendar
                date_selectors = [
                    'input[type="date"]',
                    '[data-testid*="date"]',
                    'input[placeholder*="date" i]',
                ]
                
                for selector in date_selectors:
                    date_input = page.query_selector(selector)
                    if date_input:
                        date_input.fill(date)
                        date_input.press('Enter')
                        time.sleep(2)
                        break
            
            # Wait for calendar to load
            time.sleep(3)
            
            # Extract availability from the page
            # Tock shows available times as buttons or time slots
            availability_data = page.evaluate("""
                () => {
                    const times = [];
                    
                    // Look for time slot buttons
                    const timeButtons = document.querySelectorAll(
                        '[data-testid*="time"], button[class*="time"], div[class*="slot"], button[data-time]'
                    );
                    
                    timeButtons.forEach(btn => {
                        const timeText = btn.textContent.trim();
                        const isDisabled = btn.disabled || btn.getAttribute('disabled');
                        const hasAvailability = !isDisabled && 
                            !btn.classList.contains('unavailable') &&
                            !btn.classList.contains('disabled');
                        
                        if (timeText && hasAvailability) {
                            times.push({
                                time: timeText,
                                available: true
                            });
                        }
                    });
                    
                    // Also check for calendar cells with availability
                    const calendarCells = document.querySelectorAll(
                        '[data-testid*="calendar"] td, .calendar-day, [class*="day-"]'
                    );
                    
                    const availableDates = [];
                    calendarCells.forEach(cell => {
                        const hasAvailability = cell.classList.contains('available') ||
                            cell.querySelector('[class*="available"]') ||
                            !cell.classList.contains('unavailable');
                        
                        if (hasAvailability) {
                            availableDates.push(cell.textContent.trim());
                        }
                    });
                    
                    return {
                        times: times,
                        available_dates: availableDates,
                        page_title: document.title,
                        current_url: window.location.href
                    };
                }
            """)
            
            result['times'] = availability_data.get('times', [])
            result['available'] = len(result['times']) > 0
            result['available_dates'] = availability_data.get('available_dates', [])
            result['page_title'] = availability_data.get('page_title')
            result['current_url'] = availability_data.get('current_url')
            
        except PlaywrightTimeout:
            result['error'] = 'Page load timeout'
        except Exception as e:
            result['error'] = str(e)
        finally:
            context.close()
            browser.close()
    
    return result


def find_first_saturday_tock(restaurant_slug, experience_id=None, start_date=None, party_size=2, max_weeks=12, headless=False):
    """
    Find the first Saturday with availability on Tock.
    
    Note: This requires navigating the calendar multiple times, which may be slow.
    
    Args:
        headless: If False, opens browser window (better bot detection bypass)
    """
    if not start_date:
        target = datetime.now() + timedelta(days=35)
        while target.weekday() != 5:
            target += timedelta(days=1)
        start_date = target.strftime("%Y-%m-%d")
    
    current = datetime.strptime(start_date, "%Y-%m-%d")
    
    # Move to next Saturday
    while current.weekday() != 5:
        current += timedelta(days=1)
    
    print(f"Starting Tock search from {current.strftime('%Y-%m-%d')}...")
    
    for week in range(max_weeks):
        date_str = current.strftime("%Y-%m-%d")
        print(f"  Checking Saturday {date_str}...", end=' ')
        
        result = check_tock_availability(
            restaurant_slug, 
            experience_id=experience_id,
            date=date_str,
            party_size=party_size,
            headless=headless
        )
        
        if result.get('available') and result.get('times'):
            print(f"✓ Available!")
            return result
        
        print("✗ Not available")
        current += timedelta(days=7)
    
    return None


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python tock_availability.py <restaurant_slug> [experience_id] [date] [party_size]")
        print("\nExamples:")
        print("  python tock_availability.py lazybearsf")
        print("  python tock_availability.py lazybearsf 330688")
        print("  python tock_availability.py lazybearsf 330688 2026-05-03 2")
        print("\nNote: Tock requires a headed browser (not headless) to bypass bot detection.")
        sys.exit(1)
    
    restaurant_slug = sys.argv[1]
    experience_id = sys.argv[2] if len(sys.argv) > 2 else None
    
    if len(sys.argv) >= 4:
        date = sys.argv[3]
    else:
        target = datetime.now() + timedelta(days=35)
        while target.weekday() != 5:
            target += timedelta(days=1)
        date = target.strftime("%Y-%m-%d")
    
    party_size = int(sys.argv[4]) if len(sys.argv) > 4 else 2
    
    print(f"Tock Availability Check")
    print(f"Restaurant: {restaurant_slug}")
    print(f"Experience ID: {experience_id or 'Auto-detect'}")
    print(f"Date: {date}")
    print(f"Party size: {party_size}")
    print("-" * 40)
    print("Note: Opening browser window (Tock requires headed mode)...")
    print()
    
    result = check_tock_availability(restaurant_slug, experience_id, date, party_size, headless=False)
    print(json.dumps(result, indent=2))
