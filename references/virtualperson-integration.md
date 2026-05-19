# VirtualPerson + VPN Gate — Integration Notes

## What is VirtualPerson?

[VirtualPerson](https://github.com/0xyg3n/VirtualPerson) is a Docker-based setup that runs a real Google Chrome browser on a virtual display (Xvfb), routed through a VPN, with VNC monitoring. It's designed for AI agent persona management.

## Why use it for ocas-spot?

Three platforms remain blocked even with VPN Gate:
- **Tock** — Cloudflare Turnstile (fingerprint-based, not IP-based)
- **OpenTable** — Akamai CDN (TLS/HTTP2 fingerprint)
- **Yelp** — IP-range block on VPN Gate

VirtualPerson's real Chrome browser bypasses fingerprint-based detection because:
1. Real Chrome binary (not headless Chromium)
2. Virtual display (Xvfb) makes it look like a headed browser
3. Proper TLS fingerprints from the real browser engine
4. JavaScript execution for CF Turnstile challenges

## Patched Files

The `virtualperson-patches/` directory contains patched versions of VirtualPerson files that use our VPN Gate tunnel instead of Mullvad:

- `docker-compose.yml` — Routes through host's SOCKS5 bridge (VPN Gate)
- `launch-chrome.sh` — Chrome proxy points to VPN Gate
- `entrypoint.sh` — Same proxy fix in fallback path
- `vpn-socks5-bridge.sh` — SOCKS5 proxy on host routing through tun0
- `DEPLOY.md` — Full deployment guide

## Architecture

```
Host Server
├── VPN Gate (OpenVPN) → tun0 (Japan exit)
├── SOCKS5 bridge (microsocks) → 127.0.0.1:1080 via tun0
└── Docker Container (VirtualPerson)
    ├── Xvfb :99 (virtual display 1920x1080)
    ├── Chrome → CDP :9222 → proxy → host SOCKS5 → tun0 → VPN exit
    ├── x11vnc :5900 (VNC for monitoring)
    └── Hermes Agent gateway
```

## Quick Deploy

```bash
# 1. Start VPN Gate
openvpn --config /root/vpn_gate.ovpn --daemon
sleep 5

# 2. Start SOCKS5 bridge on host
./virtualperson-patches/vpn-socks5-bridge.sh start

# 3. Copy patched files to VirtualPerson dir
cp virtualperson-patches/docker-compose.yml <VP_DIR>/
cp virtualperson-patches/launch-chrome.sh <VP_DIR>/
cp virtualperson-patches/entrypoint.sh <VP_DIR>/

# 4. Deploy
cd <VP_DIR>
docker compose up -d

# 5. Verify
docker exec hermes curl -sf http://127.0.0.1:9222/json/version
```

## Connecting from ocas-spot

```python
from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    # Connect to VirtualPerson's Chrome via CDP
    browser = p.chromium.connect_over_cdp("http://127.0.0.1:9222")
    page = browser.new_page()
    page.goto("https://www.exploretock.com/restaurant-name")
    # ... booking automation ...
```

## VPN Rotation

When a VPN server gets blocked:
```bash
pkill -f openvpn; sleep 2
# Download new server config (see vpn-gate-quick-ref.md)
openvpn --config /root/vpn_gate.ovpn --daemon
./virtualperson-patches/vpn-socks5-bridge.sh restart
```
