#!/usr/bin/env python3
"""Resy availability checker — REST API with token auth.

Auth is required for most restaurants. Set env vars:
  RESY_API_KEY   — Resy API key (from your account or the shared widget key)
  RESY_EMAIL     — your Resy account email
  RESY_PASSWORD  — your Resy account password

Token is cached to ~/openclaw/data/ocas-spot/resy-token.json and reused until expired.
Falls back to unauthenticated browser automation if no credentials are set (works for
some restaurants but not all).

Usage: python resy.py <venue_slug> <date YYYY-MM-DD> [party_size] [city_slug]
"""
import sys, json, os, time
import urllib.request, urllib.parse, urllib.error
from pathlib import Path

TOKEN_PATH = Path.home() / "openclaw/data/ocas-spot/resy-token.json"
TOKEN_TTL = 43200  # 12 hours in seconds


# ---------------------------------------------------------------------------
# Token management
# ---------------------------------------------------------------------------

def _load_cached_token() -> str | None:
    if not TOKEN_PATH.exists():
        return None
    try:
        data = json.loads(TOKEN_PATH.read_text())
        if time.time() < data.get("expires_at", 0):
            return data["token"]
    except Exception:
        pass
    return None


def _save_token(token: str) -> None:
    TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)
    TOKEN_PATH.write_text(json.dumps({
        "token": token,
        "expires_at": time.time() + TOKEN_TTL,
    }))


def _fetch_token(api_key: str, email: str, password: str) -> str:
    """Exchange credentials for a Resy auth token."""
    url = "https://api.resy.com/3/auth/password"
    payload = urllib.parse.urlencode({"email": email, "password": password}).encode()
    req = urllib.request.Request(url, data=payload, method="POST")
    req.add_header("Authorization", f'ResyAPI api_key="{api_key}"')
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    req.add_header("User-Agent", "Mozilla/5.0")
    req.add_header("Origin", "https://resy.com")
    req.add_header("Referer", "https://resy.com/")
    with urllib.request.urlopen(req, timeout=15) as resp:
        data = json.loads(resp.read())
    token = data.get("token")
    if not token:
        raise RuntimeError(f"Auth response missing token: {data}")
    return token


def get_token() -> str | None:
    """Return a valid auth token, or None if no credentials configured."""
    api_key = os.environ.get("RESY_API_KEY")
    email = os.environ.get("RESY_EMAIL")
    password = os.environ.get("RESY_PASSWORD")
    if not (api_key and email and password):
        return None
    cached = _load_cached_token()
    if cached:
        return cached
    token = _fetch_token(api_key, email, password)
    _save_token(token)
    return token


# ---------------------------------------------------------------------------
# Availability check — REST API (authenticated)
# ---------------------------------------------------------------------------

def _check_api(venue_id: int, date: str, party_size: int, token: str, api_key: str) -> dict:
    """Check availability via Resy REST API."""
    params = urllib.parse.urlencode({
        "day": date,
        "party_size": party_size,
        "venue_id": venue_id,
    })
    url = f"https://api.resy.com/4/find?{params}"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f'ResyAPI api_key="{api_key}"')
    req.add_header("X-Resy-Auth-Token", token)
    req.add_header("User-Agent", "Mozilla/5.0")
    req.add_header("Origin", "https://resy.com")
    req.add_header("Referer", "https://resy.com/")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"Resy API error {e.code}: {e.read().decode()[:200]}")
    results = data.get("results", {}).get("venues", [])
    times = []
    for venue in results:
        for slot in venue.get("slots", []):
            t = slot.get("date", {}).get("start", "")
            if t:
                times.append(t[11:16])  # HH:MM from ISO datetime
    return {"available": len(times) > 0, "times": times, "method": "api"}


def _resolve_venue_id(venue_slug: str, city: str, token: str, api_key: str) -> int | None:
    """Resolve a venue slug to a numeric Resy venue ID."""
    params = urllib.parse.urlencode({"query": venue_slug, "geo": {"longitude": 0, "latitude": 0}})
    # Use venue search endpoint
    url = f"https://api.resy.com/3/venue?url_slug={venue_slug}&location={city}"
    req = urllib.request.Request(url)
    req.add_header("Authorization", f'ResyAPI api_key="{api_key}"')
    req.add_header("X-Resy-Auth-Token", token)
    req.add_header("User-Agent", "Mozilla/5.0")
    req.add_header("Origin", "https://resy.com")
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
        return data.get("venue", {}).get("id", {}).get("resy")
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Fallback — browser automation (unauthenticated, works for some restaurants)
# ---------------------------------------------------------------------------

def _check_browser(venue_slug: str, date: str, party_size: int, city: str) -> dict:
    from playwright.sync_api import sync_playwright
    url = (f"https://resy.com/cities/{city}/venues/{venue_slug}"
           f"?date={date}&seats={party_size}")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        )
        page = ctx.new_page()
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
    return {"available": available, "times": result["times"], "method": "browser_unauthenticated"}


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def check_availability(venue_slug: str, date: str, party_size: int = 2,
                       city: str = "san-francisco-ca") -> dict:
    token = get_token()
    api_key = os.environ.get("RESY_API_KEY")

    if token and api_key:
        venue_id = _resolve_venue_id(venue_slug, city, token, api_key)
        if venue_id:
            result = _check_api(venue_id, date, party_size, token, api_key)
            return {"venue": venue_slug, "date": date, "party_size": party_size, **result}
        # Venue ID lookup failed — fall through to browser
        warning = "venue_id_lookup_failed"
    else:
        warning = "no_credentials_set — set RESY_API_KEY, RESY_EMAIL, RESY_PASSWORD for reliable results"

    result = _check_browser(venue_slug, date, party_size, city)
    return {"venue": venue_slug, "date": date, "party_size": party_size,
            "warning": warning, **result}


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: resy.py <venue_slug> <date YYYY-MM-DD> [party_size] [city]")
        sys.exit(1)
    out = check_availability(
        sys.argv[1], sys.argv[2],
        int(sys.argv[3]) if len(sys.argv) > 3 else 2,
        sys.argv[4] if len(sys.argv) > 4 else "san-francisco-ca"
    )
    print(json.dumps(out, indent=2))
