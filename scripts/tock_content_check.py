#!/usr/bin/env python3
"""
Tock - Check what's actually rendered after modal closes
"""

from playwright.sync_api import sync_playwright
from datetime import datetime

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    )
    context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
    
    page = context.new_page()
    
    # Load April 5
    url = 'https://www.exploretock.com/lazybearsf/experience/597492/2026-april-dinner-lazy-bear?date=2026-04-05&size=2'
    print(f"Loading: {url}")
    page.goto(url, wait_until='networkidle', timeout=60000)
    page.wait_for_timeout(5000)
    
    print(f"\nTitle: {page.title()}")
    print(f"URL: {page.url}")
    
    # Try to close any modal
    try:
        # Look for close button or click outside
        close_btn = page.locator('button[aria-label*="Close"], [data-testid*="close"]').first
        if close_btn.is_visible():
            print("\nClosing modal...")
            close_btn.click()
            page.wait_for_timeout(2000)
    except:
        pass
    
    # Now get all content
    content = page.evaluate('''() => {
        // Get everything
        const allText = document.body.innerText;
        
        // Look for buttons with specific patterns
        const allButtons = Array.from(document.querySelectorAll('*'));
        const interactiveElements = allButtons
            .filter(el => {
                const text = el.textContent?.trim() || '';
                return text.length > 0 && text.length < 100;
            })
            .map(el => ({
                tag: el.tagName,
                text: el.textContent.trim().substring(0, 60),
                role: el.getAttribute('role'),
                clickable: el.tagName === 'BUTTON' || el.tagName === 'A' || el.onclick !== null
            }))
            .filter(el => el.clickable)
            .slice(0, 50);
        
        return {
            textPreview: allText.substring(0, 2000),
            interactiveElements
        };
    }''')
    
    print(f"\n--- Page Text Preview ---")
    print(content['textPreview'])
    
    print(f"\n--- Interactive Elements ---")
    for el in content['interactiveElements'][:20]:
        print(f"[{el['tag']}] '{el['text']}' (role: {el['role']})")
    
    browser.close()
