#!/usr/bin/env python3
"""
Tock - Try headed mode with virtual display (tockstalk approach)
tockstalk uses "frameless mode" = headed but no iframe
"""

from playwright.sync_api import sync_playwright
from datetime import datetime

# This requires Xvfb to be running or use xvfb-run
with sync_playwright() as p:
    # Launch with headed=True - this is the key difference
    # Use xvfb-run to provide a virtual display
    browser = p.chromium.launch(
        headless=False,  # HEADED MODE - key for bypassing Turnstile
        args=['--no-sandbox', '--disable-setuid-sandbox']
    )
    
    context = browser.new_context(
        viewport={'width': 1280, 'height': 720},
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    )
    
    # Minimal stealth
    context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
    
    page = context.new_page()
    
    print("Loading Tock in HEADED mode (with virtual display)...")
    print("=" * 60)
    
    # Load experience for April 5
    url = 'https://www.exploretock.com/lazybearsf/experience/597492/2026-april-dinner-lazy-bear?date=2026-04-05&size=2'
    
    try:
        page.goto(url, wait_until='domcontentloaded', timeout=30000)
        page.wait_for_timeout(5000)
        
        print(f"URL: {page.url}")
        print(f"Title: {page.title()}")
        
        # Take screenshot to see what's there
        page.screenshot(path='/workspace/openclaw/data/tock_headed.png', full_page=True)
        print("Screenshot saved: /workspace/openclaw/data/tock_headed.png")
        
        # Now try to interact - first close any modal
        try:
            # Look for close button
            close_selectors = [
                'button[aria-label*="Close"]',
                '[data-testid*="close"]',
                'button:has-text("Close")',
                '[aria-label="Close" i]'
            ]
            
            for selector in close_selectors:
                try:
                    btn = page.locator(selector).first
                    if btn.is_visible():
                        print(f"\nClicking close button: {selector}")
                        btn.click()
                        page.wait_for_timeout(2000)
                        break
                except:
                    continue
        except Exception as e:
            print(f"Modal handling: {e}")
        
        # Check what's on the page now
        result = page.evaluate('''() => {
            const buttons = [...document.querySelectorAll('button')];
            const timeButtons = buttons
                .filter(b => /\\d{1,2}:\\d{2}/.test(b.textContent))
                .map(b => b.textContent.trim());
            
            const calendarCells = [...document.querySelectorAll('td, [class*="day"]')]
                .map(c => c.textContent.trim())
                .filter(t => /^\\d+$/.test(t));
            
            return {
                timeButtons,
                calendarCells: calendarCells.slice(0, 31),
                bodySnippet: document.body.innerText.substring(0, 1000)
            };
        }''')
        
        print(f"\nTime buttons found: {len(result['timeButtons'])}")
        if result['timeButtons']:
            print("Times:", result['timeButtons'])
        
        print(f"\nCalendar days: {result['calendarCells']}")
        
        if not result['timeButtons']:
            print("\n--- Body Text (first 1000 chars) ---")
            print(result['bodySnippet'])
        
    except Exception as e:
        print(f"Error: {e}")
    
    browser.close()
    print("\nDone!")
