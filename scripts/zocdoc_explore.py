#!/usr/bin/env python3
"""
ZocDoc - Find hypnotherapist with Friday slot in April
"""

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox', '--disable-gpu', '--disable-software-rasterizer'])
    context = browser.new_context(
        viewport={'width': 1280, 'height': 800},
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    )
    context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
    
    page = context.new_page()
    
    print("ZocDoc - Find Hypnotherapist")
    print("=" * 60)
    print("Looking for hypnotherapist with Friday slots in April...\n")
    
    # Navigate to ZocDoc hypnotherapist search - try with location
    url = 'https://www.zocdoc.com/hypnotherapist/san-francisco-ca'
    page.goto(url, wait_until='networkidle', timeout=60000)
    page.wait_for_timeout(5000)
    
    # Extract page structure
    result = page.evaluate('''() => {
        const buttons = [...document.querySelectorAll('button')].map(b => ({
            text: b.textContent.trim(),
            className: b.className
        }));
        
        const inputs = [...document.querySelectorAll('input')].map(i => ({
            placeholder: i.placeholder,
            type: i.type,
            name: i.name
        }));
        
        const headings = [...document.querySelectorAll('h1, h2, h3')].map(h => h.textContent.trim());
        
        const bodyText = document.body.innerText;
        
        return { buttons: buttons.slice(0, 30), inputs: inputs.slice(0, 10), headings, bodyText: bodyText.slice(0, 1000) };
    }''')
    
    print("\nHeadings:")
    for h in result['headings']:
        print(f"  - {h}")
    
    print("\nBody text snippet:")
    print(result['bodyText'])
    
    print("\nInputs:")
    for i in result['inputs']:
        print(f"  - placeholder: {i['placeholder']}, type: {i['type']}")
    
    print("\nButtons (first 30):")
    for b in result['buttons']:
        if b['text']:
            print(f"  - {b['text'][:60]}")
    
    browser.close()

print("\nDone!")
