# 💧 Spot

> **Appointment booking automation — SevenRooms, Resy, Tock, and OpenTable.**

## Why Spot?

Booking a restaurant reservation shouldn't require opening four different apps. Spot handles SevenRooms, Resy, Tock, and OpenTable through browser automation — no helper scripts, no API keys. Confirmed bookings automatically create Travel Context entries in Voyage.

Skill packages follow the [agentskills.io](https://agentskills.io/specification) open standard and are compatible with OpenClaw, Hermes Agent, Claude, and any agentskills.io-compliant client.

## Quick Start

```
# Book a table
"Book a table for 2 at Quince tonight at 7pm"

# Check availability
"Find me a reservation at Flour + Water this week"
```

Spot auto-initializes on first use.

## What It Does

Spot automates restaurant reservation booking across major platforms through browser automation. It handles the full flow — searching availability, selecting time slots, confirming bookings. On confirmed booking, it creates a Travel Context entry in Voyage.

## Dependencies

- [Voyage](https://github.com/indigokarasu/voyage) — receives Travel Context entries
- SevenRooms, Resy, Tock, OpenTable (via browser automation)

## Changelog

### v2.3.0 — April 12, 2026
- Travel Context integration with Voyage
- All platforms now handled via browser automation

---

*Spot is part of the [OCAS Agent Suite](https://github.com/indigokarasu).*