#!/usr/bin/env python3
"""Resy availability checker — browser automation (direct API returns 419).
Usage: python resy.py <venue_slug> <date YYYY-MM-DD> [party_size] [city_slug]
"""
import sys, json
from playwright.sync_api import sync_playwright


def check_availability(venue_slug: str, date: str, party_size: int = 2,
                       city: str = "san-francisco-ca") -> dict:
    url = (f"https://resy.com/cities/{city}/venues/{venue_slug}"
           f"?date={date}&seats={party_size}")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )
        page = ctx.new_page()
        # SPA — use domcontentloaded, then wait for render
        page.goto(url, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_timeout(3000)

        result = page.evaluate("""() => {
            const text = document.body.innerText;
            const noTables = text.includes("don't currently have any tables");
            const times = [...document.querySelectorAll('button')]
                .filter(b => /\\d{1,2}:\\d{2}/.test(b.textContent))
                .map(b => b.textContent.trim());
            return { noTables, times };
        }""")

        browser.close()
        available = not result["noTables"] and len(result["times"]) > 0
        return {
            "venue": venue_slug,
            "date": date,
            "party_size": party_size,
            "available": available,
            "times": result["times"],
        }


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: resy.py <venue_slug> <date YYYY-MM-DD> [party_size] [city]")
        sys.exit(1)
    result = check_availability(
        sys.argv[1], sys.argv[2],
        int(sys.argv[3]) if len(sys.argv) > 3 else 2,
        sys.argv[4] if len(sys.argv) > 4 else "san-francisco-ca"
    )
    print(json.dumps(result, indent=2))
