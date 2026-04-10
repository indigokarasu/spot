---
name: ocas-spot
description: >
  Use when checking appointment availability, booking services, monitoring for
  openings, or discovering venues at salons, spas, and restaurants.
  spot.discover finds and compares venues via Yelp before booking. Supports
  Acuity Scheduling, Square Appointments, Resy, Tock, SevenRooms, and
  OpenTable (session required). Trigger phrases: 'book an appointment at',
  'check availability at', 'when can I get a [service]', 'find me a slot at',
  'is [venue] available', 'watch [venue] for openings', 'alert me when [venue]
  has availability', 'monitor [venue]', 'find a restaurant in', 'compare
  salons near', 'discover [type] near'.
metadata:
  author: Indigo Karasu
  email: mx.indigo.karasu@gmail.com
  version: "2.2.2"
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
    self_update:
      source: "https://github.com/indigokarasu/ocas-spot"
      mechanism: "version-checked tarball from GitHub via gh CLI"
      command: "spot.update"
      requires_binaries: [gh, tar, python3]
    requires:
      bins:
        - "node"
        - "python3"
      npm:
        - "playwright"
      pip:
        - "playwright"
      credentials:
        - name: "yelp_api_key"
          description: "Yelp Fusion API key for structured business discovery and review data"
          required: false
        - name: "resy_api_key"
          description: "Resy API key for authenticated reservation lookups"
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

`spot.book [venue] [service] [datetime] [--name NAME] [--email EMAIL] [--phone PHONE]` — Book an appointment. Reads contact defaults from `config.json` if flags omitted. Writes BookingRecord to `bookings.jsonl`. Emits Place + Concept/Event Signals to Elephas and an InsightProposal to Vesper (via journal briefing payload).

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
2. **Availability check** — Call platform-appropriate script from `scripts/`:
   - **Acuity**: `node scripts/acuity.js` — REST API, no auth
   - **Square**: `node scripts/square.js` — Playwright; `hasAttribute('disabled')` on `market-button` (never `isEnabled()`)
   - **SevenRooms**: `python3 scripts/sevenrooms.py` — Playwright, widget UI
   - **Resy**: `python3 scripts/resy.py` — REST API (set RESY_API_KEY/EMAIL/PASSWORD); browser fallback for unauthenticated venues
   - **Tock**: `python3 scripts/tock.py` — Playwright + stealth; URL-based date iteration (never click calendar)
   - **OpenTable**: inline Python using saved session from `opentable-session.json`
3. **Slot selection** — Present available dates/times to user. Wait for confirmation.
4. **Booking** — Execute booking flow. Capture confirmation reference.
5. **Record** — Write BookingRecord to `bookings.jsonl`. Emit Signals to Elephas. Write InsightProposal to Vesper (via journal briefing payload).

## Platform support

| Platform | Method | Status | Notes |
|---|---|---|---|
| Acuity Scheduling | REST API | ✅ Production | Domains: `*.acuityscheduling.com`, `*.as.me` |
| Square Appointments | Browser automation | ⚠️ Working | `market-button` custom elements; `hasAttribute('disabled')` only |
| SevenRooms | Browser automation | ✅ Production | Widget API returns empty; browser required |
| Resy | REST API + browser fallback | ⚠️ Working (auth-dependent) | Set RESY_API_KEY/EMAIL/PASSWORD env vars; browser fallback for open venues |
| Tock | Browser automation + stealth | ⚠️ Working | CF Turnstile on calendar clicks; use URL-based iteration |
| OpenTable | Browser automation + session | ⚠️ Working | Run `spot.opentable.login` once; re-run if session expires |
| Mindbody | — | ❌ Unknown | Not yet tested |
| Fresha | — | ❌ Unknown | Not yet tested |
| Calendly | — | ❌ Unknown | Not yet tested |

See `references/platforms/` for full patterns and pitfalls per platform.

## Watch sweep behavior

During `spot.watch.sweep`:
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
- **Voyage** — Cooperative read: Spot may check `{agent_root}/commons/data/ocas-voyage/itineraries/` to associate a booking with an active travel plan when venue location matches a trip destination.

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
- Platform coverage: maintain ≥ 4 confirmed working platforms
- Booking accuracy: automation result matches manual browser for every supported platform

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

## Support file map

| File | Purpose |
|---|---|
| `references/platforms/README.md` | Universal decision tree; platform index |
| `references/platforms/acuity.md` | Acuity REST API patterns |
| `references/platforms/square.md` | Square browser automation patterns |
| `references/platforms/sevenrooms.md` | SevenRooms browser patterns |
| `references/platforms/resy.md` | Resy browser patterns |
| `references/platforms/tock.md` | Tock stealth + URL iteration |
| `references/platforms/opentable.md` | OpenTable session persistence workaround |
| `references/platforms/NEW_PLATFORM.md` | Onboarding guide for new platforms |
| `references/schemas.md` | Full schema definitions |
| `scripts/acuity.js` | Acuity availability checker (REST API) |
| `scripts/square.js` | Square availability checker (Playwright) |
| `scripts/sevenrooms.py` | SevenRooms availability checker (Playwright) |
| `scripts/resy.py` | Resy availability checker (Playwright) |
| `scripts/tock.py` | Tock availability checker (Playwright + stealth) |

## Update command

`spot.update`: Fetch latest release tarball from `https://github.com/indigokarasu/ocas-spot` via `gh release download`. Verify version is newer than installed. Extract to skill directory. Preserve `{agent_root}/commons/data/ocas-spot/` and journals.
