---
name: ocas-spot
description: Use when checking appointment availability or booking services at salons, spas, restaurants, and other service venues. Supports Acuity Scheduling and Square Appointments. Trigger phrases: "book an appointment at", "check availability at", "when can I get a [service]", "find me a slot at", "is [venue] available".
---

# Spot

Spot automates appointment availability checks and bookings across service venues. It maintains a registry of known venues with their platform configs and handles the full booking flow: availability check, slot selection, booking execution, and confirmation recording.

## Responsibility boundary

Spot owns: availability checks, appointment bookings, venue registry management, booking history, and platform knowledge base maintenance.

Spot does not own: general travel planning (Voyage), calendar sync or management, restaurant reservations that don't have a supported booking page, or platforms requiring authentication it doesn't hold.

## Ontology types

- **Place** — venues where appointments are booked (salons, spas, restaurants). Emitted to Elephas on first booking at a new venue.
- **Concept/Event** — confirmed appointments and reservations. Emitted to Elephas after booking confirmation.

## Commands

`spot.check [venue] [service] [date_range]` — Check availability at a venue for a service. `venue` may be a registered name or a booking URL. `date_range` defaults to the next 30 days. Returns available dates and time slots per platform's detection method.

`spot.book [venue] [service] [datetime] [--name NAME] [--email EMAIL] [--phone PHONE]` — Book an appointment at the specified datetime. Reads contact defaults from `config.json` if flags are omitted. Writes a BookingRecord to `bookings.jsonl` on confirmation. Emits Place + Concept/Event Signals to Elephas and an InsightProposal to Vesper intake.

`spot.list [--upcoming] [--all]` — List bookings from `bookings.jsonl`. Default: next 30 days. `--all` includes past bookings.

`spot.venue.add [name] [url] [--service NAME:ID] [--staff ID]` — Register a venue. Runs platform detection on `url`, extracts config params, writes a VenueRecord to `venues.jsonl`. Use `--service` to pre-register known service IDs. Repeat `--service` for multiple services.

`spot.venue.list` — List all registered venues with platform, status, and last-checked date.

`spot.platform.probe [url]` — Detect booking platform type for a URL. Follows the Universal Decision Tree in `references/platforms/README.md`. Returns platform type, confidence, and recommended automation approach. Does not book or modify any data.

`spot.update` — Pull latest release from GitHub. Preserves `~/openclaw/data/ocas-spot/` and journals.

## Booking workflow

1. **Venue lookup** — Check `venues.jsonl` for a config match by name or URL. If no match, run `spot.platform.probe` on the provided URL.
2. **Availability check** — Call platform-appropriate approach:
   - **Acuity**: Direct REST API (no browser required). Calls `/api/scheduling/v1/availability/month` then `/times`.
   - **Square**: Playwright browser automation. Uses `hasAttribute('disabled')` on `market-button` elements — never `isEnabled()` which returns wrong results for custom elements.
3. **Slot selection** — Present available dates/times to user. Wait for confirmation.
4. **Booking** — Execute booking flow through platform. Capture confirmation reference.
5. **Record** — Write BookingRecord to `bookings.jsonl`. Emit Signals to Elephas. Write InsightProposal to Vesper intake.

## Platform support

| Platform | Method | Status | Notes |
|---|---|---|---|
| Acuity Scheduling | REST API | ✅ Production | Domains: `*.acuityscheduling.com`, `*.as.me` |
| Square Appointments | Browser automation | ⚠️ Working | Custom `market-*` elements; verify against manual browser |
| OpenTable | Browser automation | ❌ Blocked | Akamai CDN bot detection |
| Mindbody | — | ❌ Unknown | Not yet tested |
| Fresha | — | ❌ Unknown | Not yet tested |
| Calendly | — | ❌ Unknown | Not yet tested |

See `references/platforms/` for full patterns, working code, and pitfalls per platform.

## Optional skill cooperation

- **Elephas** — Spot emits Place and Concept/Event Signals to `~/openclaw/data/ocas-elephas/intake/` after confirmed bookings. Format: `{signal_id}.signal.json`.
- **Vesper** — Spot writes an InsightProposal to `~/openclaw/data/ocas-vesper/intake/` for upcoming confirmed bookings, enabling inclusion in daily briefings.
- **Voyage** — Cooperative read: Spot may check `~/openclaw/data/ocas-voyage/itineraries/` to associate a booking with an active travel plan when the venue location matches a trip destination.

## Journal outputs

Every `spot.check` and `spot.book` run writes a journal to `~/openclaw/journals/ocas-spot/YYYY-MM-DD/{run_id}.json`.

```json
{
  "journal_spec_version": "1.3",
  "run_identity": {
    "run_id": "spot-20260330-abc123",
    "journal_type": "run",
    "skill": "ocas-spot",
    "skill_version": "1.0.0",
    "started_at": "2026-03-30T10:00:00-07:00",
    "completed_at": "2026-03-30T10:00:15-07:00"
  },
  "command": "spot.check",
  "venue": "Shade Nail Spa",
  "platform": "square",
  "result": "availability_found",
  "slots_found": 5
}
```

## Storage layout

```
~/openclaw/data/ocas-spot/
  config.json           — defaults (timezone, name, email, phone)
  venues.jsonl          — registered venues with platform configs
  bookings.jsonl        — booking history (past and upcoming)

~/openclaw/journals/ocas-spot/
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
  "services": [
    { "name": "Peppermint Pedi", "service_id": "XA4S2WKU7HYBHTWNKCPBIBDJ" }
  ],
  "added_at": "2026-03-30T00:00:00Z",
  "last_checked": "2026-03-30T10:00:00Z"
}
```

### BookingRecord

```json
{
  "booking_id": "bk_20260330_abc123",
  "venue_id": "venue_shade_nail_spa",
  "venue_name": "Shade Nail Spa",
  "service": "Peppermint Pedi",
  "datetime": "2026-04-07T10:30:00-07:00",
  "status": "confirmed",
  "confirmation_ref": "ABC-123",
  "booked_at": "2026-03-30T10:00:00Z",
  "signal_emitted": true
}
```

## OKRs

**Universal:**
- Every run produces a journal entry
- No silent failures — all errors recorded in journal with `result: error`
- Venue configs stored persistently; never re-probed if a config already exists

**Skill-specific:**
- Platform coverage: grow from 2 to 5+ confirmed working platforms
- Availability accuracy: automation result matches manual browser for every supported platform
- Booking success rate tracked in journals; failures surfaced in Vesper briefings

## Initialization

`spot.init`:

1. Create `~/openclaw/data/ocas-spot/` and `~/openclaw/journals/ocas-spot/` if not present.
2. Write `config.json` with defaults:
   ```json
   { "timezone": "America/Los_Angeles", "name": null, "email": null, "phone": null }
   ```
3. Append to `~/.openclaw/workspace/HEARTBEAT.md` if not already present:
   `spot:check-upcoming: spot.list --upcoming`

## Support file map

| File | Purpose |
|---|---|
| `references/schemas.md` | VenueRecord, BookingRecord, PlatformConfig schemas |
| `references/platforms/README.md` | Universal decision tree; platform directory |
| `references/platforms/acuity.md` | Acuity REST API patterns (production ready) |
| `references/platforms/square.md` | Square browser automation patterns (working) |
| `references/platforms/opentable.md` | OpenTable findings (blocked) |
| `references/platforms/NEW_PLATFORM.md` | Step-by-step guide for onboarding new platforms |
| `scripts/` | Platform automation scripts (working implementations) |

## Update command

`spot.update`: Fetch latest release tarball from `https://github.com/indigokarasu/spot` via `gh release download`. Verify version is newer than installed. Extract to skill directory. Preserve `~/openclaw/data/ocas-spot/` and `~/openclaw/journals/ocas-spot/`.
