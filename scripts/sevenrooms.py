#!/usr/bin/env python3
"""SevenRooms availability checker — browser automation required.
Usage: python sevenrooms.py <venue_id> <date YYYY-MM-DD> [party_size]
"""
import sys, json
from playwright.sync_api import sync_playwright


def check_availability(venue_id: str, date: str, party_size: int = 2) -> dict:
    url = f"https://www.sevenrooms.com/explore/{venue_id}/reservations/create/search/"
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )
        page = ctx.new_page()
        page.goto(url, wait_until="networkidle", timeout=60000)
        page.wait_for_timeout(5000)

        # Set party size
        try:
            page.locator('button:has-text("Guests")').first.click()
            page.wait_for_timeout(500)
            page.locator(f"text={party_size} Guest").first.click()
        except Exception:
            pass

        # Navigate to date
        try:
            page.locator('button:has-text("Date")').first.click()
            page.wait_for_timeout(1000)
            from datetime import datetime
            dt = datetime.strptime(date, "%Y-%m-%d")
            page.locator(f"td:has-text('{dt.day}')").first.click()
            page.wait_for_timeout(2000)
        except Exception:
            pass

        # Extract available time slots
        times = page.evaluate("""() => {
            const buttons = document.querySelectorAll('button');
            return [...buttons]
                .filter(b => /\\d{1,2}:\\d{2}/.test(b.textContent) && !b.hasAttribute('disabled'))
                .map(b => b.textContent.trim());
        }""")

        browser.close()
        return {
            "venue": venue_id,
            "date": date,
            "party_size": party_size,
            "available": len(times) > 0,
            "times": times,
        }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: sevenrooms.py <venue_id> <date YYYY-MM-DD> [party_size]")
        sys.exit(1)
    result = check_availability(
        sys.argv[1], sys.argv[2],
        int(sys.argv[3]) if len(sys.argv) > 3 else 2
    )
    print(json.dumps(result, indent=2))
