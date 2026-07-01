# en.ke — Chrome Extension

**Sidebar-first browser extension for en.ke: URL shortening, agent memory, and link management.**

## Features

- **URL Shortener** — Create short links (`en.ke/abc123`) from the current page or any URL. Custom slug support with AI suggestions.
- **Agent Memory** — Capture page content (selection or full page) as Markdown for AI agent memory. Right-click any page → "加入enke智能体记忆". Edit and save in the sidebar editor.
- **Memory Search** — Semantic + keyword search across all saved agent memories. Expandable results with source links.
- **Multi-Account** — Cache multiple en.ke accounts locally. Switch between them without re-authentication.
- **Dark/Light Theme** — Auto-detects system `prefers-color-scheme`. Chrome Material Design styling.
- **Multi-Language** — 8 languages: English, 简体中文, Deutsch, Español, Français, 日本語, Русский. Detected from browser language.

## Quick Start

```bash
npm install
npm run build     # → dist/
```

Load in Chrome:
1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` directory

The extension opens as a **side panel** (Chrome 114+). Click the toolbar icon or right-click any page.

## Tech Stack

- **Vue 3** with Composition API + TypeScript
- **Vite** + `@crxjs/vite-plugin` for extension bundling
- **marked** — Markdown preview (lazy loaded)
- **mem-as-a-service** — Backend memory storage & semantic search

## Project Structure

```
src/
├── background/index.ts     # Service worker: context menus, auth, capture
├── popup/
│   ├── App.vue             # Root: routing, i18n, auth state
│   ├── pages/
│   │   ├── HomePage.vue    # Overview with quick action cards
│   │   ├── ShortenPage.vue # URL shortener
│   │   ├── MemoriesPage.vue# Memory search & recall
│   │   ├── HistoryPage.vue # Recent links
│   │   └── LoginPage.vue   # Google sign-in
│   ├── components/
│   │   ├── HeaderBar.vue   # Tab nav, user menu, locale switcher
│   │   └── MarkdownEditor.vue # Edit/preview with toolbar
│   ├── composables/
│   │   ├── useAuth.ts      # Auth state, token refresh
│   │   ├── useStorage.ts   # Multi-account data model
│   │   └── useShorten.ts   # Link shortening logic
│   └── styles/main.css     # Chrome-style design tokens
├── sidepanel/
│   ├── index.html          # Side panel entry
│   └── index.ts            # Mounts same App.vue
├── i18n/
│   ├── index.ts            # useI18n composable
│   └── locales/            # 8 language files
└── utils/
    ├── api.ts              # REST client (axios)
    ├── memory-api.ts       # mem-as-a-service wrapper
    └── types.ts            # Shared TypeScript types
```

## Permissions

| Permission | Purpose |
|------------|---------|
| `activeTab` | Access current page URL |
| `contextMenus` | Right-click "Agent Memory" menu |
| `notifications` | (Reserved) |
| `scripting` | Inject DOM capture scripts |
| `sidePanel` | Sidebar UI |
| `storage` | Auth tokens, settings, multi-account |

## Development

```bash
npm run dev       # Vite dev server with HMR
npm run build     # Production build
npm run type-check # TypeScript check only
```

Load the `dist/` directory as an unpacked extension for testing.
