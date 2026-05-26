---
name: ocas-spot
description: 'Use when checking appointment availability, booking services, monitoring
  for openings, or discovering venues at salons, spas, and restaurants. spot.discover
  finds and compares venues via Yelp before booking. Supports Acuity Scheduling, Square
  Appointments, Resy, Tock, SevenRooms, OpenTable, Meevo, Vagaro, Mindbody, Fresha,
  StyleSeat, Calendly, Yelp Reservations, Booksy, GlossGenius, SimplyBook.me, Boulevard,
  Mangomint, DaySmart, ResDiary, and Eat App. Integrates with ocas-vpn for bot block
  bypass. NOT for general travel planning (use ocas-voyage), calendar sync (use ocas-sands),
  restaurant reservations on unsupported platforms. Trigger phrases: ''book an appointment
  at'', ''check availability at'', ''when can I get a [service]'', ''find me a slot at'',
  ''is [venue] available'', ''watch [venue] for openings'', ''alert me when [venue]
  has availability'', ''monitor [venue]'', ''find a restaurant in'', ''compare salons
  near'', ''discover [type] near''.'
license: MIT
source: https://github.com/indigokarasu/ocas-spot
includes:
  - references/**
  - scripts/**

metadata:
  author: Indigo Karasu
  version: 2.6.0
---

# Spot

Spot automates appointment and reservation availability checks, bookings, and persistent monitoring across service venues. It maintains a registry of known venues, a watchlist for ongoing availability monitoring, and handles the full booking flow.

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

Spot owns: availability checks, appointment bookings, venue registry management, booking history, watchlist management, platform detection, and platform knowledge base maintenance.

Spot does not own: general travel planning (Voyage), calendar sync, restaurant reservations on unsupported platforms, or platforms requiring authentication Spot does not hold.

## Ontology types

- **Place** — venues where appointments or reservations are made. Emitted to Elephas on first booking or first watch entry for a new venue.
- **Concept/Event** — confirmed appointments and reservations. Emitted to Elephas after booking confirmation.

## Commands

### Discovery

`spot.discover [type] [location] [--open-now] [--price 1|2|3|4] [--min-rating N]` — find and compare venues using Yelp before adding one to the registry. Fans out in parallel: Yelp API business search, delivery eligibility check (where applicable), and public page verification. Fetches reviews for the top 3 candidates in parallel. Returns a ranked shortlist with decision signals. Flows into `spot.venue.add` → `spot.check` → `spot.book`.

After discovery, user selects from shortlist. Selected venue is auto-populated into `spot.venue.add` using the Yelp alias. If `YELP_API_KEY` is not set, Spot falls back to public Yelp page navigation — same output, slower, less structured.

### Availability and booking

`spot.check [venue] [service] [date_range]` — Check availability at a venue. `venue` may be a registered name or booking URL. `date_range` defaults to next 30 days. Returns available dates and time slots.

`spot.book [venue] [service] [datetime] [--name NAME] [--email EMAIL] [--phone PHONE]` — Book an appointment. Reads contact defaults from `config.json` if flags omitted. Writes BookingRecord to `bookings.jsonl`. Emits Place + Concept/Event Signals to Elephas and an InsightProposal to Vesper (via journal briefing payload). If the venue location matches an active Voyage itinerary destination (checked via `{agent_root}/commons/data/ocas-voyage/itineraries/`), appends a Travel Context entry to that itinerary record.

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

## Watch sweep behavior

1. Load all active WatchRecords from `watch.jsonl`.
2. For each record, call the platform script with venue, dates/range, and party_size.
3. Filter results to the record's `time_window` if set.
4. Compare found times against `last_found`. If new times exist, write an InsightProposal to Vesper (via journal briefing payload) and update `last_found` + `last_checked`.
5. Always update `last_checked`, even when no availability found.
6. Write a journal entry: Observation type if no new availability; Action type if InsightProposal written.

## Optional skill cooperation

- **Elephas** — Spot emits Place and Concept/Event Signals to journal payload fields after confirmed bookings and on first watch-add for a new venue.
- **Vesper** — Spot writes InsightProposals to journal payload fields when watch-sweep finds new availability and after confirmed bookings.
- **Sands** — Before booking: conflict-check request to `{agent_root}/commons/data/ocas-sands/intake/{check_id}.conflict.json`. After booking: event creation request to `{agent_root}/commons/data/ocas-sands/intake/{event_id}.event.json`. External venue confirmation is authoritative — never roll back on Sands failure.
- **Voyage** — On confirmed booking, checks `{agent_root}/commons/data/ocas-voyage/itineraries/` for matching destinations. Appends Travel Context entry if matched.
- **ocas-vpn** — Called when bot detection blocks access. Provides non-US exit IPs. See `references/vpn-integration.md`.

## Journal outputs

Every `spot.check`, `spot.book`, `spot.watch.add`, and `spot.watch.sweep` run writes a journal to `{agent_root}/commons/journals/ocas-spot/YYYY-MM-DD/{run_id}.json`.

- **Observation Journal** — `spot.check`, `spot.watch.sweep` with no new availability
- **Action Journal** — `spot.book`, `spot.watch.sweep` when an InsightProposal is written

See `references/journal-schema.md` for the full journal JSON schema.

## Storage layout

See `references/storage-layout.md` for the full directory tree and record schemas (VenueRecord, BookingRecord, WatchRecord).

## Background tasks

During `spot.init`, cron registration for spot jobs is handled via `cronjob(action='create', ...)`. No heartbeat registry needed. See `references/self-update.md` for the cron registration pattern.

## OKRs

See `references/okrs.md` for all targets (journal coverage, sweep latency, platform coverage, booking accuracy, bot block recovery, onboarding time, schedule adherence).

## Recovery Behavior

When Spot encounters failures — bot blocks, VPN disconnects, platform timeouts, or data corruption — it follows these principles:

1. **Idempotency** — All recovery actions are idempotent.
2. **Graceful degradation** — If a platform is unreachable, log the failure, mark the record, and continue. Partial results are never discarded.
3. **VPN reconnection** — If `tun0` drops mid-sweep, pause, reconnect via `ocas-vpn`, and resume from the last completed entry.
4. **Data repair** — Quarantine corrupt JSONL lines to `.quarantine/` and reconstruct last valid state from journal outputs.
5. **Audit continuity** — Every recovery action is recorded in `intents.jsonl` and `evidence.jsonl`.

## Initialization

`spot.init`:

1. Create data and journals directories if not present.
2. Write `config.json` with defaults: `{ "timezone": "America/Los_Angeles", "name": null, "email": null, "phone": null }`
3. Register cron and heartbeat (see Background Tasks above).
4. **Yelp setup** (optional, run once): `spot.discover` works without `YELP_API_KEY` (page mode). For API mode, create a free key at `https://www.yelp.com/developers/v3/manage_app` and add to env config.

## VirtualPerson Integration

For bot-blocked platforms (Tock, OpenTable, Mindbody, Fresha), VirtualPerson provides a headed Chrome environment that's harder to detect than headless Chromium. Patched files for VPN Gate integration are at `references/virtualperson-patches/`. See `ocas-vpn` skill for VPN setup. Connect via CDP: `p.chromium.connect_over_cdp("http://127.0.0.1:9222")`.

## Gotchas

- **OpenTable requires Firefox** — Akamai blocks Chromium-based browsers for OpenTable. The skill must use Firefox for any OpenTable booking attempt.
- **Bot blocks require VPN fallback** — CF Turnstile, PerimeterX, and Incapsula blocks are common on Tock, Mindbody, Fresha, and Vagaro. The VPN fallback via `ocas-vpn` resolves ~80% of blocks; if VPN is unavailable, the booking will fail.
- **Square buttons use `aria-disabled`, not `isEnabled()`** — The `disabled` attribute on `market-button` and shadow DOM queries from the host element are the correct approach for Square Appointments.
- **External booking confirmation is authoritative** — If Sands reports a conflict after a successful venue booking, the external confirmation stands. Sands write failure never cancels an already-confirmed booking.
- **20+ platforms, each with unique selectors** — Each booking platform has its own edge cases documented in `references/platforms/<platform>.md`. Always read the per-platform doc before attempting a new platform.
- **SevenRooms public widget API** — Availability checks use the public widget API (no auth). Booking requires browser automation via Playwright on the customer widget page. There is no customer-facing REST API; `api.sevenrooms.com` is merchant-only.

## Platform notes

Spot uses `cronjob` for appointment monitoring. On platforms without `cronjob`, the user triggers checks manually. Yelp API calls and browser automation are platform-independent.

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
| `references/platform-access-matrix.md` | Before checking which platforms are accessible from current IP |
|| `scripts/acuity.js` | When checking Acuity Scheduling availability (REST API) |
|| `scripts/square.js` | When checking Square Appointments availability (Playwright) |
|| `scripts/sevenrooms.py` | When checking SevenRooms availability (public widget API, no auth) or booking (browser automation via Playwright) |
|| `references/sevenrooms-api-notes.md` | SevenRooms API research notes — endpoint reference, response fields, community repos |

## Self-update

Run `spot.update` to pull the latest release. See `references/self-update.md` for the full procedure.
