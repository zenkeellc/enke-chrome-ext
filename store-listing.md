# en.ke — Chrome Web Store Listing

## Store listing info

- **Name:** en.ke — URL Shortener & QR Codes
- **Short name:** en.ke
- **Description:** Shorten URLs, generate QR codes, and manage links with en.ke — all without leaving your current page.
- **Category:** Productivity
- **Language:** English (en)

---

## Privacy disclosure

### Are you using remote code?

**No.** All JavaScript, HTML, CSS, and other executable code is bundled and shipped within the extension package. The extension does not load, download, or execute any remote code at runtime. External API calls are limited to data exchange only (JSON requests/responses).

### What user data do you plan to collect from users now or in the future?

#### Data collected now

| Data | Purpose | Transmission | Storage |
|------|---------|-------------|---------|
| **URL being shortened** (page URL or user-selected text) | Core functionality — sent to en.ke API to create a short link | Transmitted to `api.en.ke` over HTTPS | Not persisted on any server; stored locally as part of recent-links history |
| **Authentication tokens** (JWT access + refresh tokens) | Identify the user to the en.ke API for rate limiting, plan features, and link ownership | Transmitted to `user.zenkee.com` and `api.en.ke` in HTTP `Authorization` headers | Stored in `chrome.storage.local` (encrypted at rest by Chrome) |
| **User profile** (user ID, username, email) | Display user identity and plan tier in the extension popup | Fetched from `api.en.ke/api/v1/me` and received via login flow from `www.en.ke` | Stored in `chrome.storage.local` |
| **Plan/subscription metadata** (plan name, Stripe subscription status, role) | Enforce feature limits per plan tier | Fetched from `api.en.ke/api/v1/me` | Stored in `chrome.storage.local` |
| **Shortened link results** (slug, short URL, original URL) | Display recent links history in the popup | None — derived from API responses | Stored in `chrome.storage.local` (last 10 links) |

#### Data we do NOT collect

- Browsing history
- Page content
- Cookies or other site data
- Personally identifiable information beyond what the user voluntarily provides during login
- Location / IP address
- Device or browser fingerprint
- Analytics, telemetry, or crash reports

#### Data collected in the future

No additional data collection is planned. If this changes, the privacy disclosure will be updated and users will be notified via the extension's update mechanism.

### Permissions justification

| Permission | Why it's needed |
|-----------|-----------------|
| `activeTab` | To get the current page URL when the user clicks the extension icon or context menu — no background tab access |
| `contextMenus` | To add "Shorten this page" and "Shorten link" right-click menu items |
| `notifications` | To show a brief completion badge ("✓") on the extension icon after shortening |
| `scripting` | To inject a clipboard-copy toast onto the current page after a successful shorten via context menu |
| `storage` | To persist auth tokens, user profile, and recent links history across sessions |
| `host_permissions` to `api.en.ke`, `user.zenkee.com`, `www.en.ke` | To call the en.ke API for shortening/authentication, and to receive login messages from the en.ke website |

### Third-party services

The extension communicates with:
- **en.ke API** (`api.en.ke`) — URL shortening, AI slug suggestions, user profile
- **en.ke Auth** (`user.zenkee.com`) — token refresh
- **en.ke Website** (`www.en.ke`) — login flow (opens in browser tab; auth tokens passed back via `postMessage` or content script)

No data is shared with any other third parties. No analytics, advertising, or tracking services are used.

### Data retention

All user data stored locally (`chrome.storage.local`) is cleared when the user:
- Logs out (clears all stored state)
- Uninstalls the extension (Chrome automatically removes extension storage)

Server-side data (created short links, user account) is managed via the en.ke web application and subject to the en.ke privacy policy.
