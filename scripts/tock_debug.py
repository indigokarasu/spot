#!/usr/bin/env python3
"""Debug Tock page structure to find experiences and availability"""
from playwright.sync_api import sync_playwright

def debug_tock(restaurant_slug):
    url = f"https://www.exploretock.com/{restaurant_slug}"
    
    print(f"Debugging Tock: {restaurant_slug}")
    print(f"URL: {url}")
    print("=" * 60)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        
        # Stealth script
        context.add_init_script('''
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        ''')
        
        page = context.new_page()
        
        page.goto(url, wait_until='networkidle', timeout=60000)
        page.wait_for_timeout(5000)
        
        # Get full page info
        info = page.evaluate('''() => {
            // Look for experiences
            const experiences = [...document.querySelectorAll('a[href*="/experience/"], [class*="experience"], [class*="Experience"]')];
            
            // Look for buttons
            const buttons = [...document.querySelectorAll('button')];
            
            // Look for time slots
            const timeSlots = buttons.filter(b => {
                const text = b.textContent.trim();
                return /\d{1,2}:\d{2}/.test(text);
            });
            
            // Look for calendar
            const calendar = document.querySelector('[class*="calendar"], [class*="Calendar"]');
            
            return {
                title: document.title,
                url: window.location.href,
                experiences: experiences.map(e => ({
                    text: e.textContent.trim().substring(0, 100),
                    href: e.href || ''
                })).slice(0, 10),
                totalButtons: buttons.length,
                buttonTexts: buttons.map(b => b.textContent.trim()).filter(t => t.length > 0).slice(0, 20),
                timeSlots: timeSlots.map(s => s.textContent.trim()).slice(0, 10),
                hasCalendar: !!calendar,
                bodyText: document.body.innerText.substring(0, 1500)
            };
        }''')
        
        print(f"\nTitle: {info['title']}")
        print(f"URL: {info['url']}")
        print(f"\nExperiences found: {len(info['experiences'])}")
        for exp in info['experiences'][:5]:
            print(f"  - {exp['text'][:50]}...")
            if exp['href']:
                print(f"    Link: {exp['href']}")
        
        print(f"\nTotal buttons: {info['totalButtons']}")
        print(f"\nButton texts:")
        for btn in info['buttonTexts']:
            print(f"  - '{btn}'")
        
        print(f"\nTime slots found: {len(info['timeSlots'])}")
        if info['timeSlots']:
            for t in info['timeSlots']:
                print(f"  - {t}")
        
        print(f"\nHas calendar: {info['hasCalendar']}")
        
        context.close()
        browser.close()

if __name__ == "__main__":
    debug_tock('lazybearsf')
