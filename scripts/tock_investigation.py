#!/usr/bin/env python3
"""
Tock Investigation - Systematic approach to understand the page structure
"""

from playwright.sync_api import sync_playwright
from datetime import datetime

def investigate_tock():
    """Investigate Tock page structure step by step"""
    
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
        
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            user_agent='Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        )
        
        # Stealth
        context.add_init_script('Object.defineProperty(navigator, "webdriver", {get: () => undefined})')
        
        page = context.new_page()
        
        print("=== TOCK INVESTIGATION ===")
        print("Restaurant: Lazy Bear")
        print()
        
        # Step 1: Main restaurant page
        print("STEP 1: Main Restaurant Page")
        print("-" * 60)
        page.goto('https://www.exploretock.com/lazybearsf', 
                  wait_until='domcontentloaded', timeout=30000)
        page.wait_for_timeout(3000)
        
        main_page = page.evaluate('''() => {
            return {
                title: document.title,
                url: window.location.href,
                // Look for experience cards
                experienceLinks: Array.from(document.querySelectorAll('a[href*="/experience/"]'))
                    .map(a => ({
                        text: a.textContent.trim().substring(0, 100),
                        href: a.href
                    }))
                    .filter(e => e.text.length > 0)
                    .slice(0, 5)
            };
        }''')
        
        print(f"Title: {main_page['title']}")
        print(f"URL: {main_page['url']}")
        print(f"\nExperiences found: {len(main_page['experienceLinks'])}")
        for exp in main_page['experienceLinks']:
            print(f"  - {exp['text']}")
            print(f"    {exp['href']}")
        
        # Step 2: Click first experience
        if main_page['experienceLinks'] and len(main_page['experienceLinks']) > 0:
            exp_url = main_page['experienceLinks'][0]['href']
            print()
            print("STEP 2: Experience Page")
            print("-" * 60)
            
            # Add date parameter
            exp_with_date = f"{exp_url}?date=2026-04-05&size=2"
            page.goto(exp_with_date, wait_until='domcontentloaded', timeout=30000)
            page.wait_for_timeout(4000)
            
            exp_page = page.evaluate('''() => {
                return {
                    title: document.title,
                    url: window.location.href,
                    // Get ALL buttons
                    allButtons: Array.from(document.querySelectorAll('button, [role="button"], a, div[onclick], span[onclick]'))
                        .map(el => ({
                            tag: el.tagName,
                            text: el.textContent.trim().substring(0, 80),
                            ariaLabel: el.getAttribute('aria-label'),
                            role: el.getAttribute('role'),
                            classes: el.className.substring(0, 100),
                            hasTime: /\\d{1,2}:\\d{2}/.test(el.textContent)
                        }))
                        .filter(el => el.text.length > 0)
                        .slice(0, 30),
                    // Look for calendar
                    calendarExists: !!document.querySelector('[class*="calendar"], [class*="Calendar"], table'),
                    // Body text to see what's rendered
                    bodySnippet: document.body.innerText.substring(0, 2000)
                };
            }''')
            
            print(f"Title: {exp_page['title']}")
            print(f"URL: {exp_page['url']}")
            print(f"Calendar exists: {exp_page['calendarExists']}")
            
            print(f"\nInteractive elements:")
            for btn in exp_page['allButtons']:
                time_marker = "⏰" if btn['hasTime'] else ""
                print(f"  {time_marker} [{btn['tag']}] '{btn['text']}'")
                if btn['ariaLabel']:
                    print(f"       aria: {btn['ariaLabel']}")
            
            # Check if we see "no availability" message
            if 'no availability' in exp_page['bodySnippet'].lower() or \
               'unavailable' in exp_page['bodySnippet'].lower():
                print("\n⚠️ Page shows NO AVAILABILITY message")
            
            # Step 3: Try to click a date if calendar exists
            if exp_page['calendarExists']:
                print()
                print("STEP 3: Calendar Interaction")
                print("-" * 60)
                
                # Look for date 5 (April 5)
                date_cell = page.locator('text=5').first
                if date_cell.is_visible():
                    print("Clicking date '5'...")
                    date_cell.click()
                    page.wait_for_timeout(3000)
                    
                    # Check for times after click
                    after_click = page.evaluate('''() => {
                        const buttons = Array.from(document.querySelectorAll('button'));
                        return {
                            timeButtons: buttons
                                .filter(b => /\\d{1,2}:\\d{2}/.test(b.textContent))
                                .map(b => b.textContent.trim()),
                            allButtons: buttons.map(b => b.textContent.trim().substring(0, 50)).slice(0, 10)
                        };
                    }''')
                    
                    print(f"Time buttons after click: {after_click['timeButtons']}")
        
        browser.close()
        print()
        print("=== INVESTIGATION COMPLETE ===")

if __name__ == "__main__":
    investigate_tock()
