#!/usr/bin/env python3
"""Tock Mobile Site Test - Simpler UI may work better"""
from playwright.sync_api import sync_playwright
from datetime import datetime, timedelta

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    
    # Mobile viewport and iPhone user agent
    context = browser.new_context(
        viewport={'width': 390, 'height': 844},
        user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
    )
    
    # Stealth
    context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
    
    page = context.new_page()
    
    print("Checking Lazy Bear on Tock (Mobile)...")
    print("=" * 60)
    
    # April experience
    url = 'https://www.exploretock.com/lazybearsf/experience/597492/2026-april-dinner-lazy-bear?date=2026-04-05&size=2'
    
    page.goto(url, wait_until='networkidle', timeout=60000)
    page.wait_for_timeout(5000)
    
    print(f"URL: {page.url}")
    print(f"Title: {page.title()}")
    
    # Get page structure
    info = page.evaluate('''() => {
        const buttons = [...document.querySelectorAll('button, [role="button"]')];
        const timeButtons = buttons.filter(b => /\\d{1,2}:\\d{2}/.test(b.textContent));
        
        return {
            totalButtons: buttons.length,
            timeButtons: timeButtons.map(b => ({
                text: b.textContent.trim(),
                disabled: b.disabled || b.getAttribute('disabled')
            })).slice(0, 10),
            bodyText: document.body.innerText.substring(0, 1500)
        };
    }''')
    
    print(f"\nTotal buttons: {info['totalButtons']}")
    print(f"Time buttons: {len(info['timeButtons'])}")
    
    if info['timeButtons']:
        print("\nAvailable times:")
        for btn in info['timeButtons']:
            status = "✅" if not btn['disabled'] else "❌"
            print(f"  {status} {btn['text']}")
    
    browser.close()
    print("\nDone!")
