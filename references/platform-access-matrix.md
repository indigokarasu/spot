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
