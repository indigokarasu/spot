#!/usr/bin/env python3
"""
Resy Availability Checker
Browser automation required - Resy API requires authentication
"""

import requests
import json
import re
import time
from datetime import datetime, timedelta
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout


def extract_venue_id_from_url(url):
    """
    Extract venue ID from Resy URL.
    
    Example URLs:
    - https://resy.com/cities/san-francisco-ca/venues/7-adams
    - https://resy.com/cities/san-francisco-ca/venues/7-adams?date=2026-03-30&seats=2
    """
    # Extract venue slug from path
    match = re.search(r'/venues/([^/?]+)', url)
    if match:
        venue_slug = match.group(1)
        return venue_slug
    
    # Try to extract from query params
    parsed = urlparse(url)
    params = parse_qs(parsed.query)
    
    if 'venue_id' in params:
        return params['venue_id'][0]
    
    return None


def check_resy_availability(venue_slug, date, party_size=2, headless=True):
    """
    Check availability for a Resy venue using browser automation.
    
    Args:
        venue_slug: The venue URL slug (e.g., '7-adams')
        date: Date string in YYYY-MM-DD format  
        party_size: Number of guests
        headless: Run in headless mode (default True)
    
    Returns:
        Dict with availability info
    """
    result = {
        'platform': 'resy',
        'venue': venue_slug,
        'date': date,
        'party_size': party_size,
        'available': False,
        'times': [],
        'error': None
    }
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=headless)
        
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale='en-US',
            timezone_id='America/Los_Angeles',
        )
        
        page = context.new_page()
        
        try:
            # Build URL with date and party size pre-filled
            url = f"https://resy.com/cities/san-francisco-ca/venues/{venue_slug}?date={date}&seats={party_size}"
            
            print(f"Navigating to {url}...")
            page.goto(url, wait_until='domcontentloaded', timeout=30000)
            
            # Wait for page to load
            time.sleep(3)
            
            # Check for availability
            availability_data = page.evaluate("""
                () => {
                    const times = [];
                    
                    // Look for time slot buttons
                    const timeButtons = document.querySelectorAll(
                        '[data-testid*="time"], button[class*="time"], [class*="slot"], button[data-time], .ReservationButton'
                    );
                    
                    timeButtons.forEach(btn => {
                        const timeText = btn.textContent.trim();
                        const isDisabled = btn.disabled || btn.getAttribute('disabled') || 
                            btn.classList.contains('unavailable') ||
                            btn.classList.contains('disabled');
                        
                        if (timeText && !isDisabled) {
                            times.push({
                                time: timeText,
                                available: true
                            });
                        }
                    });
                    
                    // Also look for Resy-specific selectors
                    const resySlots = document.querySelectorAll('[class*="ReservationPage"] button, [class*="available"]');
                    resySlots.forEach(slot => {
                        const text = slot.textContent.trim();
                        if (text && /\\d{1,2}:\\d{2}/.test(text)) {
                            const isDisabled = slot.disabled || 
                                slot.classList.contains('unavailable') ||
                                slot.getAttribute('disabled');
                            
                            if (!isDisabled && !times.find(t => t.time === text)) {
                                times.push({
                                    time: text,
                                    available: true
                                });
                            }
                        }
                    });
                    
                    return {
                        times: times,
                        page_title: document.title,
                        current_url: window.location.href
                    };
                }
            """)
            
            result['times'] = availability_data.get('times', [])
            result['available'] = len(result['times']) > 0
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


def find_first_saturday_resy(venue_slug, start_date, party_size=2, max_weeks=12, headless=True):
    """
    Find the first Saturday with availability.
    """
    current = datetime.strptime(start_date, "%Y-%m-%d")
    
    # Move to next Saturday (weekday 5)
    while current.weekday() != 5:
        current += timedelta(days=1)
    
    print(f"Starting search from {current.strftime('%Y-%m-%d')}...")
    
    for week in range(max_weeks):
        date_str = current.strftime("%Y-%m-%d")
        print(f"  Checking Saturday {date_str}...", end=' ')
        
        result = check_resy_availability(venue_slug, date_str, party_size, headless)
        
        if result.get('available') and result.get('times'):
            print(f"✓ Available!")
            return result
        
        print("✗ Not available")
        current += timedelta(days=7)
    
    return None


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python resy_availability.py <venue_slug> [date] [party_size]")
        print("\nExamples:")
        print("  python resy_availability.py 7-adams")
        print("  python resy_availability.py 7-adams 2026-05-03 2")
        sys.exit(1)
    
    venue_slug = sys.argv[1]
    
    # Default to first Saturday ~1 month out
    if len(sys.argv) >= 3:
        date = sys.argv[2]
    else:
        target = datetime.now() + timedelta(days=35)
        while target.weekday() != 5:
            target += timedelta(days=1)
        date = target.strftime("%Y-%m-%d")
    
    party_size = int(sys.argv[3]) if len(sys.argv) > 3 else 2
    
    print(f"Resy Availability Check")
    print(f"Venue: {venue_slug}")
    print(f"Date: {date}")
    print(f"Party size: {party_size}")
    print("-" * 40)
    
    result = check_resy_availability(venue_slug, date, party_size)
    print(json.dumps(result, indent=2))
