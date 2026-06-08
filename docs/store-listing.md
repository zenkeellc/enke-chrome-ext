# Chrome Web Store Listing

## Basic Info

| Field | Value |
|-------|-------|
| **Name** | en.ke — URL Shortener & QR Codes |
| **Short name** | en.ke |
| **Category** | Productivity |
| **Language** | English (United States) |
| **Version** | 1.0.0 |

## Description (Detailed)

```
en.ke is the browser companion for the en.ke link management platform. Shorten URLs, generate beautiful QR codes, and manage your links without leaving your current page.

══════ FEATURES ══════

✧ ONE-CLICK SHORTENING
  Click the extension icon to instantly shorten your current page URL. Paste any URL, customize the slug, or let our AI suggest one for you.

✧ BEAUTIFUL QR CODES
  Every short link comes with a styled QR code ready to download as PNG. Perfect for presentations, social media, or print materials.

✧ RIGHT-CLICK CONTEXT MENU
  Right-click any page or selected link to shorten it instantly. The short URL is automatically copied to your clipboard with a visual confirmation toast.

✧ LINK HISTORY
  Your most recent short links are always visible in the popup. Click to open, copy, or jump to your full dashboard on en.ke.

✧ PLAN-AWARE
  Custom back-half lengths adjust to your plan (4–8 characters). Slug availability is checked in real-time as you type.

✧ ENTERPRISE-GRADE SECURITY
  Google Sign-In via your en.ke account. All API calls are authenticated with JWT tokens. No browsing data is collected beyond what you explicitly shorten.

══════ PERMISSIONS ══════

• "activeTab" — To read the current page URL for shortening
• "contextMenus" — To provide right-click "Shorten" commands
• "notifications" — To notify you when a link is created via context menu
• "scripting" — To show a toast notification and copy the short URL to your clipboard
• "storage" — To save your login session and recent links locally

This extension connects only to en.ke (api.en.ke, www.en.ke) and the en.ke authentication server (user.zenkee.com). No third-party tracking or analytics are included.
```

## Short Description (132 chars max)

```
Shorten URLs and generate QR codes with en.ke. Right-click to shorten, AI-powered slugs, plan-aware customization.
```

## Screenshots

⚠️ **Manual step** — you need to take these yourself:

1. **Popup — Shorten page** (1280×800): Open popup on a webpage, URL filled, slug visible
2. **Popup — Result** (1280×800): After shortening, showing QR code + short URL
3. **Context menu** (1280×800): Right-click on a page, showing the en.ke menu items

## Promo Images

Generated in `docs/store-assets/`:

| Size | File |
|------|------|
| Small tile (440×280) | `promo-small.png` |
| Large tile (920×680) | `promo-large.png` |
| Marquee (1400×560) | Use `promo-large.png` or create custom |

## Privacy Policy

✅ Live at: `https://www.en.ke/privacy` (Browser Extension section added)

## OAuth Credentials

See `docs/oauth-setup.md` for step-by-step guide.

Once credentials are ready:
```bash
cp .env.publish.example .env.publish
# Fill in CLIENT_ID, CLIENT_SECRET, REFRESH_TOKEN, EXTENSION_ID
./publish.sh
```

## Final Pre-Submission Checklist

- [✅] Privacy policy live + covers extension
- [✅] Promo images generated
- [✅] Store description written
- [✅] Manifest with `minimum_chrome_version`
- [✅] All permissions justified
- [✅] `publish.sh` script ready
- [ ] **Take 3 screenshots** (popup shorten, popup result, context menu)
- [ ] **Set up OAuth credentials** (see `docs/oauth-setup.md`)
- [ ] **First upload**: zip `dist/` manually to CWS dashboard to get Extension ID
- [ ] Fill Extension ID in `.env.publish`
- [ ] Run `./publish.sh` for subsequent updates
