---
warning: 'FALSE TRIGGER RISK: Has had 100% false trigger rate on interactive loads. Loaded in VPN and order-status sessions where user did not request appointment booking. Do not load when user asks about VPN, orders, or general web tasks. Added automatically on 2026-10-19.'
name: ocas-spot
license: MIT
description: 'Use when checking appointment availability, booking services, monitoring for openings, or discovering venues at salons, spas, and restaurants. spot.discover finds and compares venues via Yelp before booking. Supports Acuity Scheduling, Square Appointments, Resy, Tock, SevenRooms, OpenTable, Meevo, Vagaro, Mindbody, Fresha, StyleSeat, Calendly, Yelp Reservations, Booksy, GlossGenius, SimplyBook.me, Boulevard, Mangomint, DaySmart, ResDiary, and Eat App. VPN handling for bot blocks is documented in references/vpn-integration.md inside THIS skill; there is no separate VPN skill. NOT for general travel planning (use ocas-voyage), calendar sync (use ocas-sands), restaurant reservations on unsupported platforms, VPN/proxy setup, or captcha troubleshooting. Trigger phrases: ''book an appointment at'', ''check availability at'', ''when can I get a [service]'', ''find me a slot at'', ''is [venue] available'', ''watch [venue] for openings'', ''monitor [venue]'', ''find a restaurant in''.'
source: https://github.com/<agent-handle>/ocas-spot
includes:
  - references/**
  - scripts**
triggers:
  - appointment availability
  - book an appointment
  - check availability
  - watch for openings
  - find a slot
  - discover venues
  - salon booking
  - restaurant reservation
metadata:
  author: Indigo Karasu
  version: "2.7.0"
  hermes:
    category: productivity
    tags:
      - appointments
      - reservations
      - availability-monitoring
      - booking
      - OCAS-core
    config:
      - key: YELP_API_KEY
        description: Yelp Fusion API key for spot.discover (optional; falls back to page mode)
        default: ""
      - key: CALENDLY_API_TOKEN
        description: Calendly API token for Calendly availability checks
        default: ""
      - key: RESY_API_KEY
        description: Resy API key for Resy availability checks
        default: ""
      - key: RESY_EMAIL
        description: Resy account email for authenticated booking
        default: ""
      - key: RESY_PASSWORD
        description: Resy account password for authenticated booking
        default: ""
---
# Spot

Spot automates appointment and reservation availability checks, bookings, and persistent monitoring across service venues. It maintains a registry of known venues, a watchlist for ongoing availability monitoring, and handles the full booking flow. This automation exists because manual booking monitoring is time-consuming and error-prone, especially across 20+ different platforms.


**Support files:** `references/support-file-map.md` indexes the bundled files not covered inline in this skill — check it before working from assumptions about what is (not) available.

## When to Use

- Checking appointment or reservation availability at salons, spas, or restaurants
- Booking appointments or reservations at supported venues
- Monitoring venues for newly opened slots ("watch" use cases)
- Discovering and comparing new venues via Yelp before booking

## When NOT to Use

- General travel planning — use `ocas-voyage`
- Calendar sync or conflict checking — use `ocas-sands`
- Restaurant reservations on platforms Spot does not support
- Platforms requiring authentication Spot does not hold
- General web scraping unrelated to appointment booking

## Responsibility boundary

Owns: availability checks, bookings, venue registry, watchlist, platform detection. Does not own: travel planning (Voyage), calendar sync, unsupported platforms.

## Ontology types

Place = venue (on first booking/watch). Concept/Event = confirmed booking.

## Example

Input: `spot.check "Square Barber" haircut "next week"`
Output: dates [Mon 10/20, Wed 10/22], slots [9:00, 10:30, 14:00]; Observation journal entry.

## Commands

### Discovery

`spot.discover [type] [location] [--open-now] [--price 1|2|3|4] [--min-rating N]` — find and compare venues using Yelp before adding one to the registry. Fans out in parallel: Yelp API business search, delivery eligibility check (where applicable), and public page verification. Fetches reviews for the top 3 candidates in parallel. Returns a ranked shortlist with decision signals. Flows into `spot.venue.add` → `spot.check` → `spot.book`.

After discovery, user selects from shortlist. Selected venue is auto-populated into `spot.venue.add` using the Yelp alias. If `YELP_API_KEY` is not set, Spot falls back to public Yelp page navigation — same output, slower, less structured.

### Availability and booking

`spot.check [venue] [service] [date_range]` — Check availability at a venue. `venue` may be a registered name or booking URL. `date_range` defaults to next 30 days. Returns available dates and time slots.

`spot.book [venue] [service] [datetime] [--name NAME] [--email EMAIL] [--phone PHONE]` — Book an appointment. Reads contact defaults from `config.json` if flags omitted. Writes BookingRecord to `bookings.jsonl`. Emits Place + Concept/Event Signals via journal payload and an InsightProposal to Vesper (via journal briefing payload). If the venue location matches an active Voyage itinerary destination (checked via `{agent_root}/commons/data/ocas-voyage/itineraries/`), appends a Travel Context entry to that itinerary record.

`spot.list [--upcoming] [--all]` — List bookings from `bookings.jsonl`. Default: next 30 days.

### Watchlist and monitoring

`spot.watch.add [venue] [party_size] [--dates DATE[,DATE]] [--range FROM TO] [--time HH:MM-HH:MM] [--priority high|normal]` — Add a venue to the watchlist. Writes a WatchRecord to `watch.jsonl`. `venue` may be a registered name or URL. If platform is unknown, runs `spot.platform.probe` automatically.

`spot.watch.list` — List all active WatchRecords from `watch.jsonl`.

`spot.watch.remove [watch_id]` — Mark a WatchRecord as inactive (sets `active: false`). Does not delete.

`spot.watch.sweep [--platform PLATFORM]` — Check all active WatchRecords for new availability. On new availability, writes an InsightProposal to Vesper and updates the record. Always updates `last_checked`.

### Venue management

`spot.venue.add [name] [url] [--service NAME:ID] [--staff ID]` — Register a venue. Runs platform detection, writes VenueRecord to `venues.jsonl`.

`spot.venue.list` — List all registered venues with platform, status, and last-checked date.

`spot.platform.probe [url]` — Detect booking platform type. Follows Universal Decision Tree in `references/platforms/README.md`. Returns platform type, confidence, and recommended approach.

### Platform-specific

`spot.opentable.login` — Open a visible browser window for manual OpenTable login. Saves session state to `{agent_root}/commons/data/ocas-spot/opentable-session.json`. Run once; re-run if checks start failing. See `references/platforms/opentable.md`.

### Maintenance

`spot.update` — Pull latest release from GitHub. Preserves `{agent_root}/commons/data/ocas-spot/` and journals. See `references/self-update.md` for the update procedure.

## NLP parsing

See `references/nlp-parsing.md` for the full parameter extraction table. Extract structured parameters from natural language before calling any command. When `time_window` is extracted, filter returned times to that window before presenting results. Resolve ambiguous date language ("next Saturday") against today's date before calling any script.

## Booking workflow

See `references/booking-workflow.md` for the full 7-step booking procedure.

## Platform support

Spot supports 20+ booking platforms across three architectural patterns:

| Pattern | Platforms | Auth |
|---------|-----------|------|
| **REST API** | Acuity Scheduling, Calendly | None / API token |
| **Public Widget API** | SevenRooms (availability) | None |
| **Browser Automation** | Square Appointments, Resy, Tock, OpenTable, Meevo, Vagaro, Mindbody, Fresha, StyleSeat, Booksy, GlossGenius, SimplyBook.me, Boulevard, Mangomint, DaySmart, Yelp Reservations, ResDiary, Eat App, SevenRooms (booking) | Session / none |

**Status key:** ✅ Production · ⚠️ Working (known limitations) · 🆕 New (untested) · ❌ Blocked (bot detection)

Full platform directory and decision tree: `references/platforms/README.md`
Bot block status and bypasses: `references/platform-access-matrix.md`
Key platform quirks: `references/platform-notes.md`

## Cron sweep pattern

See `references/cron-sweep-pattern.md` for the cron-specific sweep flow including browser lifecycle management.

## Watch sweep behavior

- [ ] Load all active WatchRecords from `watch.jsonl`.
- [ ] For each record, call the platform script with venue, dates/range, and party_size. For Square, use the stealth browser flow below.
- [ ] Filter results to the record's `time_window` if set.
- [ ] Compare found times against `last_found`. If new times exist, write an InsightProposal to Vesper (via journal briefing payload) and update `last_found` + `last_checked`.
- [ ] Always update `last_checked`, even when no availability found.
- [ ] Write an **Action** journal entry when availability changed (new or different times found). Write an **Observation** journal entry when no change detected.
- [ ] Journal format: flat JSON with `run_id`, `timestamp`, `type` (Action|Observation), `results[]` array containing one entry per venue checked, each with `watch_id`, `venue`, `platform`, `status`, and change details. See `references/journal-schema.md` for the canonical schema.

## Optional skill cooperation

- **Chronicle** — emits Place/Concept/Event Signals after bookings and first watch-add for a new venue.
- **Vesper** — writes InsightProposals on new availability; emits appointment-confirmation briefs to `ocas-vesper` intake.
- **Sands** — conflict-check before booking (`intake/{check_id}.conflict.json`); event creation after (`intake/{event_id}.event.json`). External confirmation authoritative.
- **Voyage** — appends Travel Context entry if booking matches an itinerary destination.
- **VPN (in-skill)** — bot-block handling in `references/vpn-integration.md`. No `ocas-vpn`/`util-vpn` skill exists; do not call `skill_view` for them.

## Journal outputs

Every `spot.check`, `spot.book`, `spot.watch.add`, and `spot.watch.sweep` run writes a journal to `{agent_root}/commons/journals/ocas-spot/YYYY-MM-DD/{run_id}.json`.

- **Observation Journal** — `spot.check`, `spot.watch.sweep` with no new availability
- **Action Journal** — `spot.book`, `spot.watch.sweep` when an InsightProposal is written

See `references/journal-schema.md` for the full journal JSON schema.

## Storage layout

See `references/storage-layout.md` for the full directory tree and record schemas (VenueRecord, BookingRecord, WatchRecord).

## Background tasks

Cron registration via `cronjob(action='create', ...)` during `spot.init`. See `references/self-update.md`.

## OKRs

See `references/okrs.md` for all targets (journal coverage, sweep latency, platform coverage, booking accuracy, bot block recovery, onboarding time, schedule adherence).

## Error Handling

| Failure | Symptom | Handling |
|---|---|---|
| Bot block (CF Turnstile/PerimeterX) | HTTP 403 or challenge page | Retry via VPN fallback; if VPN unavailable, mark record blocked and skip |
| VPN disconnect mid-sweep | `tun0` down, requests fail | Pause sweep, reconnect via `ocas-vpn`, resume from last completed entry |
| Platform timeout | No response within 30s | Log failure, mark record, continue to next venue; retry next sweep |
| Corrupt JSONL data | Parse error on read | Quarantine corrupt lines to `.quarantine/`, reconstruct from last valid state |
| Missing Playwright module | `MODULE_NOT_FOUND` on square.js | Install playwright or use stealth browser flow instead |
| OpenTable Akamai block | Chromium rejected | Switch to Firefox for OpenTable booking attempts |
| Sands conflict after booking | Conflict report post-confirmation | External booking stands; Sands failure never cancels confirmed booking |
| Unknown platform | `spot.platform.probe` returns low confidence | Fall back to browser automation or prompt user for manual entry |
| Yelp API unavailable | No `YELP_API_KEY` or rate limit | Fall back to public Yelp page navigation (slower, less structured) |
| Stealth browser spawn race | `[Errno 111] Connect call failed` | Re-spawn instance and retry; not a persistent failure |

## Recovery Behavior

See `references/recovery-behavior.md` for the full recovery principles (idempotency, graceful degradation, VPN reconnection, data repair, audit continuity).

## Initialization

`spot.init`:

1. Create data and journals directories if not present.
2. Write `config.json` with defaults: `{ "timezone": "America/Los_Angeles", "name": null, "email": null, "phone": null }`
3. Register cron and heartbeat (see Background Tasks above).
4. **Yelp setup** (optional, run once): `spot.discover` works without `YELP_API_KEY` (page mode). For API mode, create a free key at `https://www.yelp.com/developers/v3/manage_app` and add to env config.

## VirtualPerson Integration

See `references/virtualperson-integration.md` for VirtualPerson headed-Chrome setup and CDP connection.

## Gotchas

- **OpenTable requires Firefox** — Akamai blocks Chromium-based browsers for OpenTable. The skill must use Firefox for any OpenTable booking attempt.
- **Bot blocks require VPN fallback** — CF Turnstile, PerimeterX, and Incapsula blocks are common on Tock, Mindbody, Fresha, and Vagaro. The VPN fallback via `ocas-vpn` resolves ~80% of blocks; if VPN is unavailable, the booking will fail.
- **Square: use stealth browser, not Playwright or built-in browser** — Square Appointments automation uses the MCP stealth browser (`mcp_stealth_browser_*` tools). The built-in `browser_navigate` fails with `ERR_INSUFFICIENT_RESOURCES` on Square pages. The full verified flow is in `references/stealth-browser-square-flow-20260608.md`. Key: `execute_script` works for `window.location.href` only — use `query_elements` + `click_element` for all DOM interaction.
- **Stealth browser instance may need re-spawn** — First `navigate` call on a fresh instance can fail with `[Errno 111] Connect call failed`. Re-spawn a new instance and retry. This is a race condition, not a persistent failure.
- **Square `disabled` attribute on dates** — The `disabled` attribute on `market-button[data-testid^='date-']` elements is the correct availability check. `query_elements` returns `attributes.disabled` — if present, the date is unavailable. For **past** dates this is expected. For **future** dates this means the booking window hasn't reached that date yet (venue only books ~1 week out) OR the date is fully booked. Preserve `last_found` and re-check in a few days.
- **Square calendar viewport behavior** — The date strip extends beyond the 1920px viewport (x positions range from negative for past dates to >1500 for future dates). No scrolling needed — all dates are in the DOM and queryable via `query_elements` even if partially off-screen. The calendar shows ~3 weeks at a time (past days as disabled, current week, future weeks up to the booking window — beyond which dates are also disabled). Use `data-testid^='date-'` to get all dates; check `disabled` attribute and `data-testid` value (N vs N-selected) to identify the target date.
- **Square time slot state** — `market-button[data-testid='time-slot']` elements render for all available slots. Unlike dates, time slots do NOT use the `disabled` attribute to indicate unavailability — if a slot is listed, it's bookable. If a date is clicked and no time-slot elements appear, the date has zero availability (outside window or fully booked).
- **Square OneTrust cookie banner** — Always check for and dismiss the cookie banner first step after navigation. Use `click_element(selector="#accept-recommended-btn-handler")` (CSS ID selector is faster than text_match). Without dismissing it, subsequent clicks may not register on overlapping elements.
- **Meevo and Vagaro are effectively unautomated** — Despite HTTP access working, both platforms have persistent automation failures (Meevo: Angular change detection, 50+ consecutive failures; Vagaro: JS handler failures, 60+ consecutive failures). Skip these in watch sweeps rather than wasting cycles. Re-attempt only if platform behavior changes.
- **External booking confirmation is authoritative** — If Sands reports a conflict after a successful venue booking, the external confirmation stands. Sands write failure never cancels an already-confirmed booking.
- **20+ platforms, each with unique selectors** — Each booking platform has its own edge cases documented in `references/platforms/<platform>.md`. Always read the per-platform doc before attempting a new platform.
- **SevenRooms public widget API** — Availability checks use the public widget API (no auth). Booking requires browser automation via Playwright on the customer widget page. There is no customer-facing REST API; `api.sevenrooms.com` is merchant-only.
- **Journal path is NOT profile-scoped** — Journals always go to `<hermes-home>/commons/journals/ocas-spot/YYYY-MM-DD/{run_id}.json`, NOT under `profiles/indigo/`. Writing journals to the profile-scoped path means other profiles and the Vesper aggregator won't find them.

## Platform notes

Uses `cronjob` for monitoring; manual trigger on platforms without it.

## Support File Map

| File | When to read |
|---|---|
| `references/nlp-parsing.md` | Before parsing natural language input — parameter extraction table |
| `references/booking-workflow.md` | Before executing any booking — full 7-step procedure |
| `references/platform-notes.md` | Before browser automation — key platform quirks and selectors |
| `references/self-update.md` | When running `spot.update` — update procedure |
| `references/journal-schema.md` | When writing journal entries — full JSON schema example |
| `references/storage-layout.md` | When creating or inspecting data files — directory tree and record schemas |
| `references/okrs.md` | During OKR evaluation — all targets |
| `references/stealth-config.md` | Before any browser automation — shared stealth config |
| `references/platforms/README.md` | Before probing or booking on any platform — decision tree, index, and per-platform patterns |
| `references/platforms/NEW_PLATFORM.md` | When onboarding a new booking platform |
| `references/schemas.md` | Before creating VenueRecord, BookingRecord, or WatchRecord |
| `references/vpn-integration.md` | When bot detection blocks access and VPN fallback is needed |
| `references/virtualperson-integration.md` | When VirtualPerson headed Chrome is available for bot-blocked platforms |
| `references/platform-access-matrix.md` | Before checking which platforms are accessible — HTTP access AND automation status (two tables) |
| `scripts/acuity.js` | When checking Acuity Scheduling availability (REST API) |
| `scripts/square.js` | When checking Square Appointments availability (Playwright) |
| `scripts/sevenrooms.py` | When checking SevenRooms availability (public widget API) or booking (browser automation) |
| `scripts/reservation_toolkit.py` | When running VPN, Resy, OpenTable, Tock, or Yelp operations |
| `references/sevenrooms-api-notes.md` | When researching SevenRooms endpoints — API reference and response fields |
| `references/stealth-browser-square-flow-20260608.md` | When automating Square via stealth browser — primary reference for Square automation |
| `references/cron-sweep-pattern.md` | Before running watch sweeps via cron — browser lifecycle and sequencing |
| `references/watch-sweep-behavior.md` | Before designing or modifying sweep logic — behavioral spec for edge cases |

## Self-update

Run `spot.update` to pull the latest release. See `references/self-update.md` for the full procedure.