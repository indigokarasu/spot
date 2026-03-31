# Changelog

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
