#!/usr/bin/env python3
"""Tock availability checker — URL-based iteration bypasses Cloudflare calendar detection.
Usage: python tock.py <restaurant_slug> <experience_id> <date YYYY-MM-DD> [party_size]

Critical: Never click the calendar. JavaScript clicks trigger Cloudflare bot detection.
URL-based date iteration (loading new URLs) works because it's just page loads.
"""
import sys, json
from playwright.sync_api import sync_playwright


def check_availability(slug: str, experience_id: str, date: str,
                       party_size: int = 2) -> dict:
    base = f"https://www.exploretock.com/{slug}/experience/{experience_id}"
    url = f"{base}?cameFrom=search_modal&date={date}&showExclusives=true&size={party_size}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--no-sandbox"])
        ctx = browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )
        # Stealth: mask webdriver property — prevents Cloudflare triggering on page load
        ctx.add_init_script(
            "Object.defineProperty(navigator, 'webdriver', {get: () => undefined})"
        )
        page = ctx.new_page()
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(4000)

        # Close blocking modal if present — Playwright locator is safe, doesn't trigger CF
        try:
            close_btn = page.locator('button[aria-label*="Close"]').first
            if close_btn.is_visible():
                close_btn.click()
                page.wait_for_timeout(1500)
        except Exception:
            pass

        # Extract times from container element
        result = page.evaluate("""() => {
            const allElements = [...document.querySelectorAll('*')];
            const container = allElements.find(el => {
                const t = el.textContent || '';
                return t.includes('4:00 PM') || t.includes('5:00 PM') || t.includes('6:00 PM');
            });
            if (!container) return { times: [], hasAvailability: false };
            const times = (container.textContent.match(/\\d{1,2}:\\d{2}\\s*(AM|PM)/g) || []);
            return { times, hasAvailability: times.length > 0 };
        }""")

        browser.close()
        return {
            "venue": slug,
            "experience_id": experience_id,
            "date": date,
            "party_size": party_size,
            "available": result["hasAvailability"],
            "times": result["times"],
        }


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: tock.py <slug> <experience_id> <date YYYY-MM-DD> [party_size]")
        sys.exit(1)
    result = check_availability(
        sys.argv[1], sys.argv[2], sys.argv[3],
        int(sys.argv[4]) if len(sys.argv) > 4 else 2
    )
    print(json.dumps(result, indent=2))
