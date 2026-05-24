---
name: ocas-spot
description: 'Use when checking appointment availability, booking services, monitoring
  for openings, or discovering venues at salons, spas, and restaurants. spot.discover
  finds and compares venues via Yelp before booking. Supports Acuity Scheduling, Square
  Appointments, Resy, Tock, SevenRooms, OpenTable, Meevo, Vagaro, Mindbody, Fresha,
  StyleSeat, Calendly, Yelp Reservations, Booksy, GlossGenius, SimplyBook.me, Boulevard,
  Mangomint, DaySmart, ResDiary, and Eat App. Integrates with ocas-vpn for bot block
  bypass. Trigger phrases: ''book an appointment at'', ''check availability at'',
  ''when can I get a [service]'', ''find me a slot at'', ''is [venue] available'',
  ''watch [venue] for openings'', ''alert me when [venue] has availability'', ''monitor
  [venue]'', ''find a restaurant in'', ''compare salons near'', ''discover [type]
  near''.

'
license: MIT
metadata:
  author: Indigo Karasu
  version: 2.5.1
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
2. **Availability check** — Use the platform-appropriate method (see Platform Support below). Each platform's script, selectors, edge cases, and known limitations are documented in `references/platforms/<platform>.md`.
3. **Bot detection** — After page load, run `detect_bot_block()`. If blocked, trigger VPN workflow and retry.
4. **Conflict check (Sands)** — If Sands is present, write a conflict-check request to `{agent_root}/commons/data/ocas-sands/intake/{check_id}.conflict.json`. If Sands reports a conflict, surface it and ask for confirmation. If Sands is absent or unresponsive, proceed.
5. **Slot selection** — Present available dates/times to user. Wait for confirmation.
6. **Booking** — Execute booking flow using `human_click()` and `human_type()` for all interactions. Capture confirmation reference.
7. **Record** — Write BookingRecord to `bookings.jsonl`. Emit Signals to Elephas. Write InsightProposal to Vesper. If Voyage itinerary matches, append Travel Context. If Sands is present, write calendar event request. Sands write failure does NOT cancel the external booking.

## Platform spot supports 20+ booking platforms across two categories:

- **REST API** (preferred): Acuity Scheduling, Resy, Calendly
- **Browser automation**: Square Appointments, SevenRooms, Tock, OpenTable, Meevo, Vagaro, Mindbody, Fresha, StyleSeat, Yelp Reservations, Booksy, GlossGenius, SimplyBook.me, Boulevard, Mangomint, DaySmart, ResDiary, Eat App

Each platform's method, status, edge cases, selectors, and known limitations are documented in `references/platforms/<platform>.md`. See `references/platforms/README.md` for the universal decision tree and platform index.

**Key platform notes:**
- **Square**: `hasAttribute('disabled')` on `market-button` (never `isEnabled()`); check `aria-disabled`; shadow DOM queries from host element
- **OpenTable**: Akamai blocks Chromium — must use Firefox
- **Tock**: CF Turnstile bypassed via session warming + VPN; use `TockWarm` class
- **Meevo**: Angular SPA — sub-service radio buttons may not respond to programmatic clicks (report visible info, note limitation)
- **Vagaro**: May fail due to Incapsula blocking; fall back to `/services` page info
- **Mindbody/Fresha**: React SPA; VPN fallback for PerimeterX/Cloudflare blocks

All browser-based scripts use the shared stealth configuration from `references/stealth-config.md` (`create_stealth_browser()`, `human_type()`, `human_click()`, `detect_bot_block()`, UA rotation, random delays).

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
  intents.jsonl             — audit trail of booking intents
  evidence.jsonl            — audit evidence (screenshots, API responses, hashes)
  opentable-session.json    — OpenTable session state (gitignored)
  yelp/
    alias-cache.md          — name+location → Yelp alias/ID
    shortlists.md           — saved discovery sessions
    request-log.md          — redacted endpoint logs

{agent_root}/commons/journals/ocas-spot/
  YYYY-MM-DD/
    {run_id}.json
```

### Record schemas

Full schema definitions with field types and validation rules: `references/schemas.md`.

**VenueRecord** — `venue_id`, `name`, `platform`, `booking_url`, `services[]`, `added_at`, `last_checked`

**BookingRecord** — `booking_id`, `venue_id`, `venue_name`, `service`, `datetime`, `status`, `confirmation_ref`, `booked_at`, `signal_emitted`

**WatchRecord** — `watch_id`, `venue_id`, `venue_name`, `platform`, `party_size`, `dates[]`, `date_range`, `time_window`, `priority`, `active`, `added_at`, `last_checked`, `last_found`

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

- Every run produces a journal entry
- No silent failures — all errors recorded with `result: error`
- Watch sweep latency: new availability surfaced to Vesper within 15 minutes of opening
- Platform coverage: maintain ≥ 15 confirmed working platforms (currently 20)
- Booking accuracy: automation result matches manual browser for every supported platform
- Bot block recovery: VPN fallback resolves ≥ 80% of bot-blocked booking attempts
- New platform onboarding: ≤ 2 hours from first research to working reference doc
- Schedule adherence: watch sweeps execute within 2 minutes of scheduled interval; missed/delayed sweeps logged with root-cause and recovered within one cycle
- Data integrity: every booking, watch, and intent record is immutable once written (append-only JSONL); evidence hashes verified on read; orphan or corrupt entries flagged in journal outputs

## Recovery Behavior

When Spot encounters failures — bot blocks, VPN disconnects, platform timeouts, or data corruption — it follows the recovery procedures defined in `references/spec-ocas-recovery.md`. Key principles:

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

## Support file map

| File | Purpose |
|---|---|
| `references/stealth-config.md` | Shared stealth browser config |
| `references/platforms/README.md` | Universal decision tree; platform index |
| `references/platforms/NEW_PLATFORM.md` | Onboarding guide for new platforms |
| `references/platforms/<platform>.md` | Per-platform patterns (all 20+ platforms) |
| `references/schemas.md` | Full schema definitions |
| `references/vpn-integration.md` | VPN integration details |
| `references/virtualperson-integration.md` | VirtualPerson integration details |
| `references/platform-access-matrix.md` | Platform access matrix |
| `references/spec-ocas-recovery.md` | Recovery decision tree and escalation |
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
