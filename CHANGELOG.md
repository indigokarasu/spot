# Changelog

## [2.0.1] - 2026-04-03

### Fixed
- Resy: switch from browser-only to REST API with token auth for auth-gated restaurants (e.g. Copra)
- Resy: add credential-based token flow (RESY_API_KEY, RESY_EMAIL, RESY_PASSWORD env vars)
- Resy: 12-hour token cache in `~/openclaw/data/ocas-spot/resy-token.json` — portable across machines
- Resy: browser automation retained as fallback for unauthenticated venues; warns when credentials not set

### Changed
- `references/platforms/resy.md` — updated status to ⚠️ Working (auth-dependent), documented env vars, token flow, API endpoints
- SKILL.md platform table — Resy row updated to reflect auth requirement
- Version 2.0.0 → 2.0.1

---

## [2.0.0] - 2026-04-04

### Added
- Watchlist monitoring: `spot.watch.add`, `spot.watch.list`, `spot.watch.remove`, `spot.watch.sweep`
- Background cron sweep every 15 minutes via `spot:watch-sweep`; writes InsightProposals to Vesper on new availability
- Restaurant platform support: SevenRooms (✅ Production), Resy (✅ Production), Tock (⚠️ Working)
- OpenTable session persistence workaround: `spot.opentable.login` saves session for subsequent headless checks
- NLP parsing guidance: party size, date, time window extraction from natural language
- `WatchRecord` schema in storage layout
- Dedicated `## Background tasks` section in SKILL.md per OCAS authoring rules v2.6.0
- `opentable-session.json` to `.gitignore`
- Voyage cooperative read documented in Optional Skill Cooperation

### Changed
- Package directory renamed from `spot` to `ocas-spot` (OCAS spec compliance)
- Platform table updated: SevenRooms ✅, Resy ✅, Tock ⚠️, OpenTable ⚠️ (session required)
- `self_update.source` updated to `indigokarasu/ocas-spot`
- `skill.json` `requires` now lists `npm` and `pip` dependencies explicitly
- `filesystem.write` updated: `ocas-elephas` intake path corrected to `~/openclaw/db/ocas-elephas/intake/`
- `filesystem.read` extended to include `ocas-voyage/itineraries/`
- Version 1.0.0 → 2.0.0

### Removed
- `logs/` directory (debug artifacts — not a valid OCAS support directory)
- `knowledge/` directory (research notes — not a valid OCAS support directory)
- `IMPLEMENTATION_SUMMARY.md` (session research document)
- `README.md` (not in OCAS build template)
- `scripts/__pycache__/` (committed bytecode)
- ~100 research-iteration scripts replaced by 5 clean platform implementations: `acuity.js`, `square.js`, `sevenrooms.py`, `resy.py`, `tock.py`

---

## [1.0.0] - 2026-03-30

### Added
- Initial OCAS skill release: `skill.json`, `SKILL.md`, `references/schemas.md`
- Full system skill structure: responsibility boundary, ontology types, commands, workflow, storage layout, OKRs, initialization
- `references/platforms/` — platform knowledge base (Acuity, Square, OpenTable, new platform guide)
- Commands: `spot.check`, `spot.book`, `spot.list`, `spot.venue.add`, `spot.venue.list`, `spot.platform.probe`, `spot.update`
- Elephas Signal emission for Place and Concept/Event entities
- Vesper InsightProposal emission for upcoming confirmed bookings
- Voyage cooperative read for travel plan association

### Changed
- `knowledge/scheduling/` restructured to `references/platforms/` per OCAS package patterns
