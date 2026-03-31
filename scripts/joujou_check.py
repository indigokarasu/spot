#!/usr/bin/env python3
"""
Tock - Check JouJou SF for first available Saturday (fixed)
"""

from playwright.sync_api import sync_playwright
from datetime import datetime, timedelta

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=['--no-sandbox'])
    context = browser.new_context(
        viewport={'width': 1920, 'height': 1080},
        user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    )
    context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
    
    page = context.new_page()
    
    print("Checking JouJou SF...")
    print("=" * 60)
    
    # Step 1: Get experiences
    page.goto('https://www.exploretock.com/joujousf', 
             wait_until='domcontentloaded', timeout=30000)
    page.wait_for_timeout(3000)
    
    # Get experiences with full href
    experiences = page.evaluate('''() => {
        const links = [...document.querySelectorAll('a[href*="/experience/"]')];
        const unique = [];
        const seen = new Set();
        
        links.forEach(a => {
            const href = a.getAttribute('href');
            if (href && !seen.has(href)) {
                seen.add(href);
                unique.push({
                    text: a.textContent.trim().substring(0, 100),
                    href: href
                });
            }
        });
        
        return unique.slice(0, 5);
    }''')
    
    print(f"Found {len(experiences)} experiences:")
    for i, exp in enumerate(experiences):
        print(f"  {i+1}. {exp['text'][:60]}...")
        print(f"     {exp['href']}")
    
    if not experiences or len(experiences) == 0:
        print("No experiences found")
        browser.close()
        exit(1)
    
    # Use first experience
    exp_path = experiences[0]['href']
    print(f"\nUsing: {exp_path}")
    
    # Step 2: Check Saturdays
    print("\n" + "=" * 60)
    print("Checking Saturdays...")
    print("=" * 60)
    
    # Start from April 4 (first Saturday ~1 month out)
    target = datetime.now() + timedelta(days=35)
    while target.weekday() != 5:
        target += timedelta(days=1)
    
    for week in range(16):  # Check 16 weeks
        date_str = target.strftime("%Y-%m-%d")
        print(f"\n{date_str} (Saturday): ", end='', flush=True)
        
        # Build full URL
        if exp_path.startswith('http'):
            exp_url = exp_path
        else:
            exp_url = f"https://www.exploretock.com{exp_path}"
        
        full_url = f"{exp_url}?date={date_str}&size=2"
        
        try:
            page.goto(full_url, wait_until='domcontentloaded', timeout=30000)
            page.wait_for_timeout(4000)
            
            # Close modal
            try:
                close_btn = page.locator('button[aria-label*="Close"]').first
                if close_btn.is_visible():
                    close_btn.click()
                    page.wait_for_timeout(1000)
            except:
                pass
            
            # Check for times
            result = page.evaluate('''() => {
                const buttons = [...document.querySelectorAll('button')];
                const times = buttons
                    .filter(b => /\\d{1,2}:\\d{2}/.test(b.textContent))
                    .map(b => b.textContent.trim());
                
                const text = document.body.innerText;
                const releaseInfo = text.match(/Reservations for .+? will be released/);
                const fullyBooked = text.includes('fully booked') || text.includes('sold out');
                
                return { times, releaseInfo: releaseInfo ? releaseInfo[0] : null, fullyBooked };
            }''')
            
            if result['times'] and len(result['times']) > 0:
                print(f"✅ AVAILABLE! {len(result['times'])} times")
                print(f"   Times: {', '.join(result['times'][:5])}")
                print(f"\n🎉 First available Saturday: {date_str}")
                browser.close()
                exit(0)
            elif result['releaseInfo']:
                print(f"📅 Not released")
            elif result['fullyBooked']:
                print("❌ Fully booked")
            else:
                print("❌ Not available")
                
        except Exception as e:
            print(f"Error: {e}")
        
        target += timedelta(days=7)
    
    browser.close()

print("\n❌ No Saturday availability found in 16 weeks")
