---
name: ocas-spot
description: >
  Use when checking appointment availability, booking services, monitoring for
  openings, or discovering venues at salons, spas, and restaurants.
  spot.discover finds and compares venues via Yelp before booking. Supports
  Acuity Scheduling, Square Appointments, Resy, Tock, SevenRooms, OpenTable,
  Meevo, Vagaro, Mindbody, Fresha, StyleSeat, Calendly, Yelp Reservations,
  Booksy, GlossGenius, SimplyBook.me, Boulevard, Mangomint, DaySmart,
  ResDiary, and Eat App. Integrates with ocas-vpn for bot block bypass. Trigger phrases: 'book an appointment at',
  'check availability at', 'when can I get a [service]', 'find me a slot at',
  'is [venue] available', 'watch [venue] for openings', 'alert me when [venue]
  has availability', 'monitor [venue]', 'find a restaurant in', 'compare
  salons near', 'discover [type] near'.
metadata:
  author: Indigo Karasu
  email: mx.indigo.karasu@gmail.com
  version: "2.5.1"
  hermes:
    tags: [booking, appointments, discovery]
    category: execution
    cron:
      - name: "spot:watch-sweep"
        schedule: "every 15m"
        command: "spot.watch.sweep"
      - name: "spot:update"
        schedule: "0 0 * * *"
        command: "spot.update"
  openclaw:
    skill_type: system
    visibility: public
    filesystem:
      read:
        - "{agent_root}/commons/data/ocas-spot/"
        - "{agent_root}/commons/journals/ocas-spot/"
        - "{agent_root}/commons/data/ocas-voyage/itineraries/"
      write:
        - "{agent_root}/commons/data/ocas-spot/"
        - "{agent_root}/commons/data/ocas-spot/yelp/"
        - "{agent_root}/commons/journals/ocas-spot/"
        - "{agent_root}/commons/data/ocas-voyage/itineraries/"
    self_update:
      source: "https://github.com/indigokarasu/ocas-spot"
      mechanism: "version-checked tarball from GitHub via gh CLI"
      command: "spot.update"
      requires_binaries: [gh, tar]
    requires:
      bins:
        - "node"
      npm:
        - "playwright"
      credentials:
        - name: "yelp_api_key"
          description: "Yelp Fusion API key for structured business discovery and review data"
          required: false
        - name: "resy_api_key"
          description: "Resy API key for authenticated reservation lookups"
          required: false
        - name: "calendly_api_token"
          description: "Calendly personal access token for API-based availability checks"
          required: false
    cron:
      - name: "spot:watch-sweep"
        schedule: "every 15m"
        command: "spot.watch.sweep"
      - name: "spot:update"
        schedule: "0 0 * * *"
        command: "spot.update"
---

# Spot

Spot automates appointment and reservation availability checks, bookings, and persistent monitoring across service venues. It maintains a registry of known venues, a watchlist for ongoing availability monitoring, and handles the full booking flow.

## Responsibility boundary

Spot owns: availability checks, appointment bookings, venue registry management, booking history, watchlist management, platform detection, and platform knowledge base maintenance.

Spot does not own: general travel planning (Voyage), calendar sync, restaurant reservations on unsupported platforms, or platforms requiring authentication Spot does not hold.

## Ontology types

- **Place** — venues where appointments or reservations are made. Emitted to Elephas on first booking or first watch entry for a new venue.
- **Concept/Event** — confirmed appointments and reservations. Emitted to Elephas after booking confirmation.

## Commands

### Discovery

`spot.discover [type] [location] [--open-now] [--price 1|2|3|4] [--min-rating N]` — find and compare venues using Yelp before adding one to the registry. Fans out in parallel: Yelp API business search, delivery eligibility check (where applicable), and public page verification. Fetches reviews for the top 3 candidates in parallel. Returns a ranked shortlist with decision signals. Flows into `spot.venue.add` → `spot.check` → `spot.book`.

| Signal | Weight |
|--------|--------|
| Rating stability (not just star average) | High |
| Review recency (newest reviews matter more) | High |
| Complaint theme clusters | High |
| Review volume | Medium |
| Price fit | Medium |
| Category match | Medium |
| Delivery/takeout eligibility | Low (if relevant) |

After discovery, user selects from shortlist. Selected venue is auto-populated into `spot.venue.add` using the Yelp alias. If `YELP_API_KEY` is not set, Spot falls back to public Yelp page navigation — same output, slower, less structured.

### Availability and booking

`spot.check [venue] [service] [date_range]` — Check availability at a venue. `venue` may be a registered name or booking URL. `date_range` defaults to next 30 days. Returns available dates and time slots.

`spot.book [venue] [service] [datetime] [--name NAME] [--email EMAIL] [--phone PHONE]` — Book an appointment. Reads contact defaults from `config.json` if flags omitted. Writes BookingRecord to `bookings.jsonl`. Emits Place + Concept/Event Signals to Elephas and an InsightProposal to Vesper (via journal briefing payload). If the venue location matches an active Voyage itinerary destination (checked via `{agent_root}/commons/data/ocas-voyage/itineraries/`), appends a Travel Context entry to that itinerary record so Voyage surfaces the confirmed booking in plan status.

`spot.list [--upcoming] [--all]` — List bookings from `bookings.jsonl`. Default: next 30 days.

### Watchlist and monitoring

`spot.watch.add [venue] [party_size] [--dates DATE[,DATE]] [--range FROM TO] [--time HH:MM-HH:MM] [--priority high|normal]` — Add a venue to the watchlist. Writes a WatchRecord to `watch.jsonl`. `venue` may be a registered name or URL. If platform is unknown, runs `spot.platform.probe` automatically.

`spot.watch.list` — List all active WatchRecords from `watch.jsonl`.

`spot.watch.remove [watch_id]` — Mark a WatchRecord as inactive (sets `active: false`). Does not delete.

`spot.watch.sweep [--platform PLATFORM]` — Check all active WatchRecords for new availability. For each entry, calls the appropriate platform script. On new availability (times found that were not present at `last_found`), writes an InsightProposal to Vesper (via journal briefing payload) and updates the record. Always updates `last_checked`.

### Venue management

`spot.venue.add [name] [url] [--service NAME:ID] [--staff ID]` — Register a venue. Runs platform detection, writes VenueRecord to `venues.jsonl`.

`spot.venue.list` — List all registered venues with platform, status, and last-checked date.

`spot.platform.probe [url]` — Detect booking platform type. Follows Universal Decision Tree in `references/platforms/README.md`. Returns platform type, confidence, and recommended approach.

### Platform-specific

`spot.opentable.login` — Open a visible browser window for manual OpenTable login. Saves session state to `{agent_root}/commons/data/ocas-spot/opentable-session.json`. Run once; re-run if checks start failing. See `references/platforms/opentable.md`.

### Maintenance

`spot.update` — Pull latest release from GitHub. Preserves `{agent_root}/commons/data/ocas-spot/` and journals.

## NLP parsing

Extract structured parameters from natural language before calling any command:

| Input pattern | Extracted value |
|---|---|
| "for 2", "party of 4", "table for two" | `party_size` |
| "this Saturday", "next weekend", "March 9" | specific date(s) |
| "in May", "next month", "next 30 days" | `date_range` |
| "Saturdays in May", "weekends in June" | date list (Sat/Sun of that month) |
| "dinner", "prime time", "evening" | `time_window: 18:00-22:00` |
| "lunch" | `time_window: 11:30-14:00` |
| "6-9pm", "7:30 to 9" | explicit `time_window` |
| "monitor", "watch", "alert me when", "notify me" | → `spot.watch.add` |
| "book me", "reserve" | → `spot.book` (after check) |
| "check", "is there availability", "any tables" | → `spot.check` |

When `time_window` is extracted, filter returned times to that window before presenting results. Resolve ambiguous date language ("next Saturday") against today's date before calling any script.

## Booking workflow

1. **Venue lookup** — Check `venues.jsonl` for a config match. If no match, run `spot.platform.probe` on the provided URL.
2. **Availability check** — Use the platform-appropriate method:
   - **Acuity**: `node scripts/acuity.js` — REST API, no auth
   - **Square**: `node scripts/square.js` — Playwright; `hasAttribute('disabled')` on `market-button` (never `isEnabled()`). Edge cases: (a) wait for `market-loading-indicator` to disappear before reading disabled state — buttons may appear enabled before the page finishes hydrating; (b) if `market-button` lacks the `disabled` attribute but has `aria-disabled="true"`, treat as disabled; (c) shadow DOM: query from the host element, not document root
   - **SevenRooms**: Direct browser automation — navigate the SevenRooms widget UI; see `references/platforms/sevenrooms.md`
   - **Resy**: Direct REST API calls (set RESY_API_KEY/EMAIL/PASSWORD); browser fallback for unauthenticated venues; see `references/platforms/resy.md`
   - **Tock**: Direct browser automation with stealth; URL-based date iteration (never click calendar); see `references/platforms/tock.md`
   - **OpenTable**: Direct browser automation using saved session from `opentable-session.json`; see `references/platforms/opentable.md`
   - **Meevo**: Direct browser automation — Angular SPA, click `div.category-item`, use "Scan next 7 days" for date nav; see `references/platforms/meevo.md`. **KNOWN LIMITATION:** Meevo's Angular SPA may not respond to programmatic clicks on sub-service radio buttons. If the "Next" button doesn't advance after service selection, the venue cannot be fully checked via automation. Report visible service/pricing info and note that availability could not be confirmed.
   - **Vagaro**: Direct browser automation — Bootstrap modals, API-dependent; see `references/platforms/vagaro.md`. **KNOWN LIMITATION:** Vagaro's booking widget may fail to load due to Incapsula blocking or API errors. If the widget doesn't load after 2 attempts, report visible service/pricing info from the `/services` page and note that availability could not be confirmed.
   - **Mindbody**: Direct browser automation — React SPA, stealth scripts, VPN fallback if PerimeterX blocks; see `references/platforms/mindbody.md`
   - **Fresha**: Direct browser automation — React SPA, no public API, VPN fallback if Cloudflare blocks; see `references/platforms/fresha.md`
   - **Calendly**: REST API preferred (`CALENDLY_API_TOKEN` env var); browser fallback for public pages; see `references/platforms/calendly.md`
   - **StyleSeat**: Direct browser automation — React SPA, account required for booking; see `references/platforms/styleseat.md`
   - **Yelp Reservations**: Direct browser automation — navigate to Yelp biz page, find Reserve button, interact with widget; see `references/platforms/yelp-reservations.md`
   - **Booksy**: Direct browser automation — React SPA, consumer-first design; see `references/platforms/booksy.md`
   - **GlossGenius**: Direct browser automation — branded booking pages for independents; see `references/platforms/glossgenius.md`
   - **SimplyBook.me**: Direct browser automation — highly customizable, flexible selectors needed; see `references/platforms/simplybook.md`
   - **Boulevard**: Direct browser automation — premium React SPA, staff-centric; see `references/platforms/boulevard.md`
   - **Mangomint**: Direct browser automation — visual-first React SPA; see `references/platforms/mangomint.md`
   - **DaySmart**: Direct browser automation — salon-specific React SPA; see `references/platforms/daysmart.md`
   - **ResDiary**: Direct browser automation — UK/Europe/Asia focus, 24-hour time format; see `references/platforms/resdiary.md`
   - **Eat App**: Direct browser automation — Middle East focus, multi-language; see `references/platforms/eatapp.md`
3. **Bot detection** — After page load, run `detect_bot_block()`. If blocked, trigger VPN workflow (see VPN Integration section) and retry through VPN before proceeding.
4. **Conflict check (Sands)** — If Sands is present, write a conflict-check request to `{agent_root}/commons/data/ocas-sands/intake/{check_id}.conflict.json` containing the proposed datetime and duration. Wait briefly for Sands' response file. If Sands reports a conflict, surface it to the user and ask for confirmation before proceeding. If Sands is absent or unresponsive within timeout, proceed without conflict check.
5. **Slot selection** — Present available dates/times to user. Wait for confirmation.
6. **Booking** — Execute booking flow using `human_click()` and `human_type()` for all interactions. Capture confirmation reference.
7. **Record** — Write BookingRecord to `bookings.jsonl`. Emit Signals to Elephas. Write InsightProposal to Vesper (via journal briefing payload). Check `{agent_root}/commons/data/ocas-voyage/itineraries/` for active itineraries; if the booked venue's location matches a trip destination, append a Travel Context entry to that itinerary record. If Sands is present, write a calendar event request to `{agent_root}/commons/data/ocas-sands/intake/{event_id}.event.json` containing venue name, address, service type, date/time, confirmation number, and notes. If the Sands write fails, log the error in the journal — do NOT attempt to cancel the external booking (it is already confirmed at the venue platform); the user can manually add the event later.

## Platform support

| Platform | Method | Status | Notes |
|---|---|---|---|
| Acuity Scheduling | REST API | ✅ Production | Domains: `*.acuityscheduling.com`, `*.as.me` |
| Square Appointments | Browser automation | ⚠️ Working | `market-button` custom elements; `hasAttribute('disabled')` only |
| SevenRooms | Browser automation | ✅ Production | Widget API returns empty; browser required |
| Resy | REST API + browser fallback | ⚠️ Working (auth-dependent) | Set RESY_API_KEY/EMAIL/PASSWORD env vars; browser fallback for open venues |
| Tock | Browser automation + stealth | ✅ Working | CF Turnstile bypassed via session warming + VPN. Use `TockWarm` class. |
| OpenTable | Firefox browser automation | ✅ Working | Akamai blocks Chromium. Must use Firefox. `OpenTableFirefox` class. |
| Yelp | Fusion API + browser | ⚠️ Partial | Web blocked (IP-range). Use Fusion API for business data. Free API key needed. |
| Vagaro | Browser automation | ⚠️ Partial | API-dependent; may fail in headless environments |
| Mindbody | Browser automation | ⚠️ Working | React SPA; PerimeterX bot detection on some deployments; VPN fallback |
| Fresha | Browser automation | ⚠️ Working | React SPA; no public API; Cloudflare on some deployments |
| Calendly | REST API + browser fallback | ✅ Working | API preferred (`CALENDLY_API_TOKEN`); browser fallback for public pages |
| StyleSeat | Browser automation | ⚠️ Working | React SPA; account required for booking |
| Yelp | API + browser | ✅ Working | Discovery and comparison; `YELP_API_KEY` optional |
| Yelp Reservations | Browser automation | 🆕 New | Widget on Yelp biz pages; React SPA |
| Booksy | Browser automation | 🆕 New | Consumer-first React SPA; popular with independents |
| GlossGenius | Browser automation | 🆕 New | Branded pages for independent professionals |
| SimplyBook.me | Browser automation | 🆕 New | Highly customizable; multi-language; global |
| Boulevard | Browser automation | 🆕 New | Premium React SPA; staff-centric; upscale salons |
| Mangomint | Browser automation | 🆕 New | Visual-first React SPA; Instagram-style |
| DaySmart Salon | Browser automation | 🆕 New | Salon-specific React SPA |
| ResDiary | Browser automation | 🆕 New | UK/Europe/Asia focus; 24-hour time format |
| Eat App | Browser automation | 🆕 New | Middle East focus; multi-language; growing US |

See `references/platforms/` for full patterns and pitfalls per platform.

## Stealth Browser Configuration

All browser-based platform scripts MUST use the shared stealth configuration from `references/stealth-config.md`. This ensures consistent anti-detection behavior across all platforms.

Key requirements:
- Use `create_stealth_browser()` for all Playwright browser instances
- Use `human_type()` and `human_click()` for all interactions
- Use `detect_bot_block()` after page loads to detect CAPTCHA/bot challenges
- Rotate user agents and viewports per session
- Add random delays between actions (500ms-2000ms)

## VPN Integration & Bot Block Handling

Many booking platforms employ bot detection (Cloudflare, PerimeterX, Akamai, DataDome) that can block automated access. Spot integrates with `ocas-vpn` to route traffic through non-US exit nodes when bot blocks are detected.

### Bot Detection Triggers

Auto-detect bot blocks using `detect_bot_block()` from stealth config. Trigger VPN routing when:
- Page loads but booking widget never renders (blank page after 10+ seconds)
- CAPTCHA challenge appears (reCAPTCHA, hCaptcha, CF Turnstile)
- "Access denied" / "Please verify you are human" / "Bot detected" message
- HTTP 403/429 responses from the booking platform
- Availability data returns empty when manual browser check shows availability
- TLS fingerprint or headless browser detection triggers a block

### Automated VPN Workflow

```
1. Attempt booking page load (normal connection)
   ↓
2. Run detect_bot_block() after page load
   ├─ No block → Proceed normally
   └─ Block detected ↓
3. Check VPN status: ip addr show tun0
   ├─ VPN already connected → Kill and reconnect (fresh IP)
   └─ VPN not connected ↓
4. Connect VPN via ocas-vpn skill:
   a. Fetch best non-US server from VPN Gate API
   b. Save config to /root/vpn_gate.ovpn
   c. openvpn --config /root/vpn_gate.ovpn --daemon
   d. Wait for tun0, verify non-US exit IP
   ↓
5. Retry booking page load through VPN
   ↓
6. Still blocked?
   ├─ Yes → Try different VPN server (different country)
   │        Rotate through: Japan → Germany → UK → Netherlands → Canada
   └─ No → Proceed with availability check / booking
```

### VPN Server Rotation

Maintain a pool of VPN Gate servers for rotation. When one server fails:
1. Kill current VPN connection
2. Fetch next best server from VPN Gate API (different country preferred)
3. Reconnect and retry
4. Track failed servers in `{agent_root}/commons/data/ocas-spot/vpn-failures.jsonl`

### Platform-Specific Bot Detection & VPN Profiles

| Platform | Bot Detection | VPN Recommended | Preferred Exit | Notes |
|---|---|---|---|---|
| Tock | Cloudflare Turnstile | ✅ Yes | Japan | URL-based iteration avoids most triggers; VPN for persistent blocks |
| OpenTable | Akamai CDN | ✅ Yes | Japan | Session-based workaround preferred; VPN if session expires |
| Mindbody | PerimeterX (HUMAN) | ✅ Yes | Japan/EU | Some deployments block headless; VPN + stealth scripts |
| Fresha | Cloudflare | ✅ Yes | Japan | "Checking your browser" page; VPN to non-US exit |
| Boulevard | Cloudflare | ⚠️ Maybe | Japan | Premium platform; may block aggressive automation |
| Resy | None known | ❌ No | — | API-based; no VPN needed |
| Acuity | None known | ❌ No | — | REST API; no VPN needed |
| Square | None known | ❌ No | — | Browser automation works without VPN |
| SevenRooms | None known | ❌ No | — | Browser automation works without VPN |
| Calendly | None known | ❌ No | — | API-based; no VPN needed |
| Vagaro | API-level | ⚠️ Maybe | Japan | API errors may be IP-based; VPN can help |
| Meevo | None known | ❌ No | — | Browser automation works without VPN |
| StyleSeat | Basic | ⚠️ Maybe | Japan | Slow down interactions; VPN if blocked |
| Yelp Reservations | Cloudflare | ⚠️ Maybe | Japan | Standard Yelp bot detection |
| Booksy | Cloudflare | ⚠️ Maybe | Japan | Consumer-facing; may have basic bot detection |
| GlossGenius | Minimal | ❌ No | — | Generally accessible |
| SimplyBook.me | Minimal | ❌ No | — | Generally accessible |
| Mangomint | Minimal | ❌ No | — | Generally accessible |
| DaySmart | Minimal | ❌ No | — | Generally accessible |
| ResDiary | Minimal | ❌ No | — | UK/Europe focus; VPN rarely needed |
| Eat App | Minimal | ❌ No | — | Middle East focus; VPN rarely needed |

### VPN Auto-Reconnection

VPN tunnels do not survive gateway/agent restarts. Spot automatically checks VPN health before watch sweeps and booking runs:

```bash
# VPN health check (runs automatically before each booking/vpn operation)
vpn_health_check() {
    # Check if tun0 exists and has an IP
    if ! ip addr show tun0 2>/dev/null | grep -q 'inet '; then
        echo "VPN down, reconnecting..."
        # Fetch fresh server list
        curl -s "https://www.vpngate.net/api/iphone/" | \
            python3 -c "
import csv, base64, sys, json
reader = csv.DictReader(sys.stdin)
servers = [r for r in reader if r.get('CountryShort') != 'US' and r.get('OpenVPN_ConfigData_Base64')]
best = sorted(servers, key=lambda s: int(s.get('Score', 0)), reverse=True)[0]
config = base64.b64decode(best['OpenVPN_ConfigData_Base64']).decode()
with open('/root/vpn_gate.ovpn', 'w') as f:
    f.write(config)
print(f\"Selected: {best['CountryLong']} (Score: {best['Score']})\")
"
        # Kill any existing openvpn
        pkill -f openvpn 2>/dev/null
        sleep 2
        # Connect
        openvpn --config /root/vpn_gate.ovpn --daemon --log /root/openvpn.log
        sleep 5
        # Verify
        ip addr show tun0
    fi
    # Verify exit IP is non-US
    curl -s --max-time 10 https://ipinfo.io/json
}
```

### Browser Routing Through VPN

When VPN is active (tun0 interface up), all system traffic including browser automation routes through the VPN automatically. No special Playwright configuration needed — system routing (`0.0.0.0/1` + `128.0.0.0/1` via tun0) handles it.

**VPN config cipher fix:** When downloading VPN Gate configs, many servers only support `AES-128-CBC`. OpenVPN 2.5+ defaults to GCM ciphers and will fail with `OPTIONS ERROR: failed to negotiate cipher`. Before connecting, patch the config:
```python
config = base64.b64decode(server['OpenVPN_ConfigData_Base64']).decode()
if 'data-ciphers' not in config:
    lines = config.split('\n')
    for i, line in enumerate(lines):
        if line.startswith('cipher '):
            lines.insert(i+1, 'data-ciphers AES-128-CBC:AES-256-GCM:AES-128-GCM')
            break
    config = '\n'.join(lines)
```

For per-browser VPN routing (when multiple browsers need different exit nodes), use Playwright's `proxy` parameter:
```python
context = browser.new_context(
    proxy={'server': 'socks5://10.8.0.1:1080'}  # WireGuard/SOCKS proxy
)
```

## VirtualPerson Integration

For platforms that remain blocked after VPN (Tock, Yelp, OpenTable), VirtualPerson provides a real Chrome browser on a virtual display, routed through VPN. See `references/virtualperson-integration.md` for full setup.

**Patched files** are in `references/virtualperson-patches/`:
- `docker-compose.yml`, `launch-chrome.sh`, `entrypoint.sh` — VPN Gate variants
- `vpn-socks5-bridge.sh` — SOCKS5 proxy on host routing through tun0
- `DEPLOY.md` — Full deployment guide

**Quick connect from ocas-spot:**
```python
browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
```

## Platform Access Matrix (Tested May 2026, VPN Gate Japan)

| Platform | Status | HTTP | Block Type | Bypass |
|----------|--------|------|------------|--------|
| Fresha | ✅ OK | 200 | — | VPN sufficient |
| Booksy | ✅ OK | 200 | — | VPN sufficient |
| Mindbody | ✅ OK | 200 | — | VPN sufficient |
| ResDiary | ✅ OK | 200 | — | VPN sufficient |
| Eat App | ✅ OK | 200 | — | VPN sufficient |
| StyleSeat | ✅ OK | 200 | — | VPN sufficient |
| Boulevard | ✅ OK | 200 | — | VPN sufficient |
| Vagaro | ✅ OK | 404 | — | VPN sufficient |
| SimplyBook.me | ✅ OK | 404 | — | VPN sufficient |
| Tock | ❌ BLOCKED | 403 | CF Turnstile | Needs VirtualPerson |
| Yelp | ❌ BLOCKED | 403 | IP-range block | Needs residential proxy |
| OpenTable | ❌ BLOCKED | 000 | Akamai TLS fingerprint | Needs VirtualPerson |

**Key insight:** Cloudflare Turnstile and Akamai blocks are fingerprint-based, not IP-based. VPN alone is insufficient — need a real browser (VirtualPerson) or residential proxy.

## Watch sweep behavior
1. Load all active WatchRecords from `watch.jsonl`.
2. For each record, call the platform script with venue, dates/range, and party_size.
3. Filter results to the record's `time_window` if set.
4. Compare found times against `last_found`. If new times exist:
   - Write InsightProposal to the `briefing` payload field in the journal entry:
     ```json
     {
       "proposal_id": "prop_{hash}",
       "proposal_type": "anomaly_alert",
       "description": "[SPOT] New availability: {venue_name} on {date} — {times}",
       "confidence_score": 1.0,
       "suggested_follow_up": "Book via spot.book or visit {booking_url}",
       "created_at": "{ISO8601}"
     }
     ```
   - Update `last_found` and `last_checked` on the WatchRecord.
5. Always update `last_checked`, even when no availability found.
6. Write a journal entry: Observation type if no new availability; Action type if InsightProposal written.

## Optional skill cooperation

- **Elephas** — Spot emits Place and Concept/Event Signals to journal payload fields (see interfaces specification) after confirmed bookings and on first watch-add for a new venue. Format: `{signal_id}.signal.json`.
- **Vesper** — Spot writes InsightProposals to journal payload fields (see interfaces specification) when watch-sweep finds new availability and after confirmed bookings. Vesper surfaces these in briefings.
- **Sands** — Cooperative read+write: Before booking, Spot writes a conflict-check request to `{agent_root}/commons/data/ocas-sands/intake/{check_id}.conflict.json` with the proposed datetime and duration; Sands responds with a conflict/no-conflict result. After confirmed booking, Spot writes an event creation request to `{agent_root}/commons/data/ocas-sands/intake/{event_id}.event.json` containing venue name, address, service type, date/time, confirmation number, and notes. The booking is not rolled back if Sands writes fail — external venue confirmation is authoritative.
- **Voyage** — Cooperative read+write: On confirmed booking, Spot checks `{agent_root}/commons/data/ocas-voyage/itineraries/` for active itineraries. If the booked venue's location matches a trip destination, Spot appends a Travel Context entry to that itinerary record so Voyage surfaces the confirmed booking in plan status and reservation checklist.
- **ocas-vpn** — Spot calls ocas-vpn when bot detection blocks access to a booking platform. VPN provides non-US exit IPs to bypass IP-based blocks. See VPN Integration section above for trigger conditions and workflow.

## Journal outputs

Every `spot.check`, `spot.book`, `spot.watch.add`, and `spot.watch.sweep` run writes a journal to `{agent_root}/commons/journals/ocas-spot/YYYY-MM-DD/{run_id}.json`.

- **Observation Journal** — `spot.check`, `spot.watch.sweep` with no new availability
- **Action Journal** — `spot.book`, `spot.watch.sweep` when an InsightProposal is written

```json
{
  "journal_spec_version": "1.3",
  "run_identity": {
    "run_id": "spot-20260404-abc123",
    "journal_type": "Observation",
    "skill": "ocas-spot",
    "skill_version": "2.0.0",
    "started_at": "2026-04-04T10:00:00-07:00",
    "completed_at": "2026-04-04T10:00:15-07:00"
  },
  "command": "spot.watch.sweep",
  "records_checked": 3,
  "new_availability_found": 0,
  "proposals_written": 0
}
```

## Storage layout

```
{agent_root}/commons/data/ocas-spot/
  config.json               — defaults (timezone, name, email, phone)
  venues.jsonl              — registered venues with platform configs
  bookings.jsonl            — booking history (past and upcoming)
  watch.jsonl               — watchlist records (active and inactive)
  intents.jsonl             — audit trail of booking intents (requested actions and outcomes)
  evidence.jsonl            — audit evidence (screenshots, API responses, hashes for integrity)
  opentable-session.json    — OpenTable session state (not in repo, gitignored)
  yelp/
    alias-cache.md          — name+location → Yelp alias/ID (avoids redundant lookups)
    shortlists.md           — saved discovery sessions with accepted/rejected reasons
    request-log.md          — redacted endpoint logs (path, safe params, status, timestamp)

{agent_root}/commons/journals/ocas-spot/
  YYYY-MM-DD/
    {run_id}.json
```

### VenueRecord

```json
{
  "venue_id": "venue_shade_nail_spa",
  "name": "Shade Nail Spa",
  "platform": "square",
  "booking_url": "https://app.squareup.com/appointments/book/L6SV5MCXN00CB/start",
  "services": [{ "name": "Peppermint Pedi", "service_id": "XA4S2WKU7HYBHTWNKCPBIBDJ" }],
  "added_at": "2026-04-04T00:00:00Z",
  "last_checked": "2026-04-04T10:00:00Z"
}
```

### BookingRecord

```json
{
  "booking_id": "bk_20260404_abc123",
  "venue_id": "venue_shade_nail_spa",
  "venue_name": "Shade Nail Spa",
  "service": "Peppermint Pedi",
  "datetime": "2026-04-07T10:30:00-07:00",
  "status": "confirmed",
  "confirmation_ref": "ABC-123",
  "booked_at": "2026-04-04T10:00:00Z",
  "signal_emitted": true
}
```

### WatchRecord

```json
{
  "watch_id": "watch_abc123",
  "venue_id": "venue_lazy_bear",
  "venue_name": "Lazy Bear",
  "platform": "tock",
  "party_size": 2,
  "dates": ["2026-05-03", "2026-05-10"],
  "date_range": { "from": "2026-04-01", "to": "2026-06-30" },
  "time_window": { "start": "18:00", "end": "22:00" },
  "priority": "high",
  "active": true,
  "added_at": "2026-04-04T10:00:00Z",
  "last_checked": null,
  "last_found": null
}
```

## Background tasks

During `spot.init`, register the following cron job (check first to ensure idempotence):

```bash
# Check platform scheduling registry for existing tasks
# Task declared in SKILL.md frontmatter metadata.{platform}.cron
  --session isolated --message "spot.watch.sweep" \
  --light-context --tz America/Los_Angeles
```

During `spot.init`, also append to `{agent_root}/HEARTBEAT.md` if not already present (check before appending to ensure idempotence):
```
spot:check-upcoming: spot.list --upcoming
```

## OKRs

**Universal:**
- Every run produces a journal entry
- No silent failures — all errors recorded with `result: error`

**Skill-specific:**
- Watch sweep latency: new availability surfaced to Vesper within 15 minutes of opening
- Platform coverage: maintain ≥ 15 confirmed working platforms (currently: Acuity, Square, SevenRooms, Resy, Tock, OpenTable, Meevo, Calendly, Mindbody, Fresha, StyleSeat, Yelp Reservations, Booksy, GlossGenius, SimplyBook.me, Boulevard, Mangomint, DaySmart, ResDiary, Eat App)
- Booking accuracy: automation result matches manual browser for every supported platform
- Bot block recovery: VPN fallback resolves ≥ 80% of bot-blocked booking attempts
- New platform onboarding: ≤ 2 hours from first research to working reference doc
- Schedule adherence: watch sweeps execute within 2 minutes of their scheduled interval; missed or delayed sweeps logged with root-cause and recovered within one cycle
- Data integrity: every booking, watch, and intent record is immutable once written (append-only JSONL); evidence hashes verified on read; orphan or corrupt entries flagged in journal outputs

## Recovery Behavior

When Spot encounters failures — bot blocks, VPN disconnects, platform timeouts, or data corruption — it follows the recovery procedures defined in `references/spec-ocas-recovery.md`. Key principles:

1. **Idempotency** — All recovery actions are idempotent. Re-running a recovery step produces the same outcome as running it once.
2. **Graceful degradation** — If a platform is unreachable, Spot logs the failure, marks the record, and continues to the next platform/watch entry. Partial results are never discarded.
3. **VPN reconnection** — If `tun0` drops mid-sweep, Spot pauses the current sweep, reconnects via `ocas-vpn`, and resumes from the last completed entry (not from the beginning).
4. **Data repair** — On detecting corrupt or truncated JSONL lines, Spot quarantines the bad line to `.quarantine/` and reconstructs the last valid state from journal outputs.
5. **Audit continuity** — Every recovery action is recorded in `intents.jsonl` (what was attempted) and `evidence.jsonl` (what was observed), preserving a complete audit trail even during failure scenarios.

See `references/spec-ocas-recovery.md` for the full recovery decision tree, timeout values, and escalation procedures.

## Initialization

`spot.init`:

1. Create `{agent_root}/commons/data/ocas-spot/` and `{agent_root}/commons/journals/ocas-spot/` if not present.
2. Write `config.json` with defaults if not present:
   ```json
   { "timezone": "America/Los_Angeles", "name": null, "email": null, "phone": null }
   ```
3. Register cron and heartbeat (see Background Tasks above).
4. **Yelp setup** (run once; optional):
   - Check environment: `echo $YELP_API_KEY`
   - If empty: note that `spot.discover` works in page mode without a key
   - To enable full API mode: create a free Yelp developer app at `https://www.yelp.com/developers/v3/manage_app`
   - Store key: add `YELP_API_KEY=<key>` to platform environment config
   - Create Yelp storage dirs: `mkdir -p {agent_root}/commons/data/ocas-spot/yelp/`

## VirtualPerson Integration

For bot-blocked platforms (Tock, OpenTable, Mindbody, Fresha), VirtualPerson provides a headed Chrome environment that's harder to detect than headless Chromium. Patched files for VPN Gate integration are at `references/virtualperson-patches/`. See `ocas-vpn` skill for VPN setup. Connect via CDP: `p.chromium.connect_over_cdp("http://127.0.0.1:9222")`.

## Support file map

| File | Purpose |
|---|---|
| `references/stealth-config.md` | Shared stealth browser config (import in all Playwright scripts) |
| `references/platforms/README.md` | Universal decision tree; platform index |
| `references/platforms/NEW_PLATFORM.md` | Onboarding guide for new platforms |
| `references/platforms/acuity.md` | Acuity REST API patterns |
| `references/platforms/square.md` | Square browser automation patterns |
| `references/platforms/sevenrooms.md` | SevenRooms browser patterns |
| `references/platforms/resy.md` | Resy REST API + browser patterns |
| `references/platforms/tock.md` | Tock stealth + URL iteration |
| `references/platforms/opentable.md` | OpenTable session persistence workaround |
| `references/platforms/meevo.md` | Meevo Angular SPA patterns |
| `references/platforms/vagaro.md` | Vagaro API-dependent patterns |
| `references/platforms/mindbody.md` | Mindbody React SPA + VPN fallback |
| `references/platforms/fresha.md` | Fresha React SPA + VPN fallback |
| `references/platforms/calendly.md` | Calendly REST API + browser fallback |
| `references/platforms/styleseat.md` | StyleSeat React SPA patterns |
| `references/platforms/yelp-reservations.md` | Yelp Reservations widget automation |
| `references/platforms/booksy.md` | Booksy React SPA patterns |
| `references/platforms/glossgenius.md` | GlossGenius branded booking pages |
| `references/platforms/simplybook.md` | SimplyBook.me customizable SPA |
| `references/platforms/boulevard.md` | Boulevard premium React SPA |
| `references/platforms/mangomint.md` | Mangomint visual-first SPA |
| `references/platforms/daysmart.md` | DaySmart salon-specific SPA |
| `references/platforms/resdiary.md` | ResDiary UK/Europe/Asia focus |
| `references/platforms/eatapp.md` | Eat App Middle East focus |
| `references/schemas.md` | Full schema definitions |
| `scripts/acuity.js` | Acuity availability checker (REST API) |
| `scripts/square.js` | Square availability checker (Playwright) |

## Self-update

`spot.update` pulls the latest package from the `source:` URL in this file's frontmatter. Runs silently — no output unless the version changed or an error occurred.

1. Read `source:` from frontmatter → extract `{owner}/{repo}` from URL
2. Read local version from SKILL.md frontmatter `metadata.version`
3. Fetch remote version from SKILL.md frontmatter: `gh api "repos/{owner}/{repo}/contents/SKILL.md" --jq '.content' | base64 -d | grep 'version:' | head -1 | sed 's/.*"\(.*\)".*/\1/'`
4. If remote version equals local version → stop silently
5. Download and install:
   ```bash
   TMPDIR=$(mktemp -d)
   gh api "repos/{owner}/{repo}/tarball/main" > "$TMPDIR/archive.tar.gz"
   mkdir "$TMPDIR/extracted"
   tar xzf "$TMPDIR/archive.tar.gz" -C "$TMPDIR/extracted" --strip-components=1
   cp -R "$TMPDIR/extracted/"* ./
   rm -rf "$TMPDIR"
   ```
6. On failure → retry once. If second attempt fails, report the error and stop.
7. Output exactly: `I updated Spot from version {old} to {new}`
