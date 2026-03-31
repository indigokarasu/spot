#!/usr/bin/env python3
"""
SevenRooms Availability Checker - Browser Method
Since API returns empty, check via browser automation
"""

from playwright.sync_api import sync_playwright
import json
from datetime import datetime, timedelta

def check_quince_availability():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        
        page = context.new_page()
        
        # Capture network requests
        api_responses = []
        
        def handle_route(route, request):
            if 'availability' in request.url or 'sevenrooms' in request.url:
                api_responses.append({
                    'url': request.url,
                    'method': request.method
                })
            route.continue_()
        
        page.route("**/*", handle_route)
        
        print("Navigating to Quince booking page...")
        page.goto('https://www.sevenrooms.com/explore/quince/reservations/create/search/', 
                  wait_until='networkidle', timeout=60000)
        
        # Wait for calendar to load
        page.wait_for_timeout(5000)
        
        # Check what's on the page
        page_info = page.evaluate('''() => {
            // Look for calendar cells
            const cells = document.querySelectorAll('td, [class*="day"], [class*="calendar"]');
            const buttons = document.querySelectorAll('button');
            
            return {
                title: document.title,
                calendarCells: cells.length,
                buttons: [...buttons].map(b => ({
                    text: b.textContent.trim(),
                    disabled: b.disabled,
                    classes: b.className
                })).filter(b => b.text.length > 0).slice(0, 20),
                bodyText: document.body.innerText.substring(0, 1000)
            };
        }''')
        
        print(f"\nPage Title: {page_info['title']}")
        print(f"Calendar cells found: {page_info['calendarCells']}")
        print(f"\nNetwork requests captured: {len(api_responses)}")
        for req in api_responses[:5]:
            print(f"  - {req['method']} {req['url'][:100]}...")
        
        print(f"\nButtons on page:")
        for btn in page_info['buttons'][:10]:
            print(f"  - '{btn['text']}' (disabled: {btn['disabled']}, classes: {btn['classes'][:50]})")
        
        context.close()
        browser.close()
        
        return page_info

if __name__ == "__main__":
    check_quince_availability()
