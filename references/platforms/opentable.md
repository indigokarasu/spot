# OpenTable

**Status:** ❌ BLOCKED - Not automatable with current tools
**Method:** N/A - CDN-level bot detection
**Last Tested:** 2026-03-30
**Example Site:** Atelier Crenn (opentable.com)

---

## Block Details

**Detection Layer:** Akamai CDN (before application layer)

**Error Pattern:**
- `net::ERR_HTTP2_PROTOCOL_ERROR`
- TLS handshake fingerprinting
- HTTP/2 connection refused
- Returns gzip-encoded binary instead of HTML

**Root Cause:** 
Akamai's bot management profiles TLS handshakes and HTTP headers to detect automation tools. This happens at the edge, before any application code runs.

---

## What Does NOT Work (Tested and Failed)

### ❌ Standard Playwright
```javascript
// Fails with HTTP/2 protocol error
await page.goto('https://www.opentable.com/r/atelier-crenn');
// ERR_HTTP2_PROTOCOL_ERROR
```

### ❌ Mobile Viewport
```javascript
// Still times out - Akamai detects Playwright's TLS fingerprint
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  userAgent: 'Mozilla/5.0 (iPhone...'
});
```

### ❌ Mobile Subdomain (m.opentable.com)
```javascript
// Same HTTP/2 error
await page.goto('https://m.opentable.com/r/atelier-crenn');
```

### ❌ Disabling HTTP/2
```javascript
// Chrome ignores --disable-http2 for some connections
args: ['--disable-http2', '--disable-quic']
// Still fails
```

### ❌ Stealth Plugins
```javascript
// puppeteer-extra-plugin-stealth not installed
// Even with stealth, TLS fingerprint detection persists
```

### ❌ Direct HTTPS Request
```javascript
// Returns binary/garbage data (still blocked)
https.get('https://www.opentable.com/r/atelier-crenn', ...)
```

---

## Hypothetical Workarounds (Untested)

### ⚠️ Residential Proxy
Route traffic through residential ISP IP (not datacenter):
```javascript
// Would require proxy service like Bright Data, Oxylabs
const browser = await chromium.launch({
  proxy: { server: 'residential-proxy:8080' }
});
```

### ⚠️ Real Browser Debugging
Use your actual Chrome instance via remote debugging:
```bash
# Start Chrome with debug port
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --remote-debugging-port=9222

# Connect Playwright to real browser
const browser = await chromium.connectOverCDP('http://localhost:9222');
```

### ⚠️ Browser-as-a-Service
Use services like Browserless, ScrapingBee, or Playwright Cloud that handle bot detection:
```javascript
// Would require external service account
const browser = await chromium.connect('wss://browserless.io/...');
```

---

## Why This Platform is Different

| Platform | Bot Detection | Bypass Difficulty |
|----------|--------------|-------------------|
| **Acuity** | None | Easy |
| **Square** | Application-level (custom elements) | Medium |
| **OpenTable** | **CDN-level (Akamai)** | **Hard/Impossible** |

**Key insight:** CDN-level blocking happens before Playwright can execute any code. No amount of JavaScript injection, viewport spoofing, or user-agent rotation helps.

---

## Recommendation

**Do not attempt further automation.** OpenTable's bot protection is enterprise-grade and actively maintained. The effort required to bypass (residential proxies, real browser farms) exceeds value for single-restaurant checks.

**Alternative:**
- Use OpenTable mobile app APIs (if accessible)
- Monitor via email alerts if restaurant offers notifications
- Manual checking for high-value reservations

---

## References

- Akamai Bot Manager: https://www.akamai.com/products/bot-manager
- TLS Fingerprinting: https://fingerprintsjs.com/blog/what-is-tls-fingerprinting
- Bot detection bypass difficulty: Very Hard (requires infrastructure investment)
