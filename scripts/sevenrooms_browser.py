#!/usr/bin/env python3
"""Check SevenRooms availability using browser automation"""
import sys
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright

def check_sevenrooms_browser(venue_id, date, party_size=2):
    """Use browser automation to check SevenRooms"""
    result = {
        'venue': venue_id,
        'date': date,
        'party_size': party_size,
        'available': False,
        'times': []
    }
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        )
        page = context.new_page()
        
        try:
            # Navigate to the booking page
            url = f"https://www.sevenrooms.com/explore/{venue_id}/reservations/create/search/"
            print(f"Navigating to {url}")
            page.goto(url, wait_until='domcontentloaded', timeout=30000)
            
            # Wait for content to load
            page.wait_for_timeout(5000)
            
            # Extract info
            info = page.evaluate('''() => {
                return {
                    title: document.title,
                    url: window.location.href,
                    bodyText: document.body.innerText.substring(0, 500),
                    hasCalendar: document.querySelector('[class*="calendar"]') !== null,
                    hasTimes: document.querySelector('[class*="time"]') !== null,
                    buttons: [...document.querySelectorAll('button')].map(b => b.textContent.trim()).slice(0, 10)
                };
            }''')
            
            print(f"Title: {info['title']}")
            print(f"URL: {info['url']}")
            print(f"Has calendar: {info['hasCalendar']}")
            print(f"Has times: {info['hasTimes']}")
            print(f"Sample buttons: {info['buttons']}")
            
            result['page_info'] = info
            
        except Exception as e:
            print(f"Error: {e}")
        finally:
            context.close()
            browser.close()
    
    return result

if __name__ == "__main__":
    # Check Quince
    result = check_sevenrooms_browser('quince', '2026-04-05', 2)
    print(json.dumps(result, indent=2))
