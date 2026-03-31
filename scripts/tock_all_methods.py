#!/usr/bin/env python3
"""
Tock - Try all past successful methods systematically
"""

from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
from datetime import datetime

def try_method(name, setup_fn, extract_fn):
    """Try a specific method and report results"""
    print(f"\n{'='*60}")
    print(f"METHOD: {name}")
    print('='*60)
    
    try:
        with sync_playwright() as p:
            browser, page = setup_fn(p)
            
            # Load Tock April 5
            url = 'https://www.exploretock.com/lazybearsf/experience/597492/2026-april-dinner-lazy-bear?date=2026-04-05&size=2'
            page.goto(url, wait_until='domcontentloaded', timeout=30000)
            page.wait_for_timeout(5000)
            
            print(f"Page loaded: {page.url}")
            print(f"Title: {page.title()}")
            
            # Try extraction
            result = extract_fn(page)
            
            browser.close()
            return result
            
    except Exception as e:
        print(f"ERROR: {e}")
        return None


# Method 1: Standard headless
def setup_standard(p):
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    return browser, page

def extract_standard(page):
    return page.evaluate('''() => {
        const buttons = [...document.querySelectorAll('button')];
        return {
            timeButtons: buttons.filter(b => /\d{1,2}:\d{2}/.test(b.textContent)).map(b => b.textContent.trim()),
            totalButtons: buttons.length
        };
    }''')


# Method 2: Accessibility selectors
def setup_a11y(p):
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    )
    page = context.new_page()
    return browser, page

def extract_a11y(page):
    # Try accessibility selectors like Square
    return page.evaluate('''() => {
        // Look for role=button, aria-label
        const elements = [...document.querySelectorAll('[role="button"], button, [aria-label*="time"], [aria-label*="PM"], [aria-label*="AM"]')];
        return {
            byRole: elements.filter(el => /\d{1,2}:\d{2}/.test(el.textContent || el.getAttribute('aria-label') || '')).map(el => ({
                text: (el.textContent || el.getAttribute('aria-label') || '').trim(),
                role: el.getAttribute('role'),
                ariaLabel: el.getAttribute('aria-label')
            })).slice(0, 10)
        };
    }''')


# Method 3: Mobile viewport
def setup_mobile(p):
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(
        viewport={'width': 390, 'height': 844},
        user_agent='Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
    )
    page = context.new_page()
    return browser, page

def extract_mobile(page):
    # Mobile might have simpler DOM
    return page.evaluate('''() => {
        const allElements = [...document.querySelectorAll('*')];
        return {
            withTimes: allElements.filter(el => /\d{1,2}:\d{2}/.test(el.textContent)).map(el => ({
                tag: el.tagName,
                text: el.textContent.trim().substring(0, 50),
                clickable: el.onclick !== null || el.tagName === 'BUTTON' || el.tagName === 'A'
            })).slice(0, 15)
        };
    }''')


# Method 4: Network intercept (like Square)
def setup_network(p):
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1920, 'height': 1080})
    page = context.new_page()
    
    # Capture network requests
    page.on('response', lambda response: print(f"  [NET] {response.url[:80]}...") if 'tock' in response.url or 'api' in response.url else None)
    
    return browser, page

def extract_network(page):
    # Just wait and see network traffic
    page.wait_for_timeout(10000)  # Wait longer to see polling
    return {"message": "Check console output for network requests"}


# Method 5: Headed browser (not headless)
def setup_headed(p):
    browser = p.chromium.launch(headless=False)  # Visible window
    context = browser.new_context(viewport={'width': 1280, 'height': 720})
    page = context.new_page()
    return browser, page

def extract_headed(page):
    # Take screenshot
    page.screenshot(path='/workspace/openclaw/data/tock_headed.png')
    return {"screenshot": "/workspace/openclaw/data/tock_headed.png"}


if __name__ == "__main__":
    print("Testing Tock with all past successful methods...")
    
    # Method 1: Standard
    r1 = try_method("Standard Headless", setup_standard, extract_standard)
    print(f"Result: {r1}")
    
    # Method 2: A11y
    r2 = try_method("Accessibility Selectors", setup_a11y, extract_a11y)
    print(f"Result: {r2}")
    
    # Method 3: Mobile
    r3 = try_method("Mobile Viewport", setup_mobile, extract_mobile)
    print(f"Result: {r3}")
    
    # Method 4: Network
    r4 = try_method("Network Intercept", setup_network, extract_network)
    print(f"Result: {r4}")
    
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    print("All methods attempted. Check outputs above.")
