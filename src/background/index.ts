// ─── Background Service Worker ───────────────────────────────

/// <reference types="chrome" />

import type { ShortenResponse } from '../utils/types';

const API_URL = 'https://api.en.ke';
const SHORT_DOMAIN = 'en.ke';

// ─── Context Menus ─────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  // Remove any stale menus from previous versions
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'shorten-page',
      title: 'Shorten this page with en.ke',
      contexts: ['page'],
    });

    chrome.contextMenus.create({
      id: 'shorten-link',
      title: 'Shorten link with en.ke',
      contexts: ['selection'],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    console.log('en.ke context menu clicked:', { menuItemId: info.menuItemId, tabUrl: tab?.url, selection: info.selectionText });

    if (!tab?.id) {
      console.warn('en.ke context menu: no tab id');
      return;
    }

    let urlToShorten = '';

    if (info.menuItemId === 'shorten-page') {
      urlToShorten = tab.url || '';
    } else if (info.menuItemId === 'shorten-link') {
      const selected = (info.selectionText || '').trim();
      // Try to parse as URL from selection
      if (/^https?:\/\/.+/.test(selected)) {
        urlToShorten = selected;
      } else if (/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(selected)) {
        urlToShorten = 'https://' + selected;
      } else {
        // Selection is not a URL — fall back to the page URL
        urlToShorten = tab.url || '';
      }
    } else {
      // Unknown menu item — might be from an old version
      console.warn('en.ke context menu: unknown menuItemId, trying tab.url');
      urlToShorten = tab.url || '';
    }

    // Skip browser-internal pages
    if (urlToShorten && /^(chrome|chrome-extension|about|edge):\/\//.test(urlToShorten)) {
      console.warn('en.ke context menu: skipping internal page');
      urlToShorten = '';
    }

    if (!urlToShorten) {
      console.warn('en.ke context menu: no URL to shorten');
      return;
    }

    console.log('en.ke context menu: shortening', urlToShorten);
    await shortenAndNotify(urlToShorten, tab.id);
  } catch (e) {
    console.error('en.ke context menu error:', e);
  }
});

// ─── Auth from Web Page (externally_connectable) ───────────
// Two channels:
// 1. onMessageExternal — when web page calls chrome.runtime.sendMessage(extId, ...)
// 2. onMessage — when content script forwards auth via chrome.runtime.sendMessage(...)

interface AuthMessage {
  type: 'enke-auth-success';
  token: string;
  refreshToken: string;
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

function isAuthMessage(msg: unknown): msg is AuthMessage {
  const m = msg as Record<string, unknown>;
  return typeof m === 'object' && m !== null
    && m.type === 'enke-auth-success'
    && typeof m.token === 'string'
    && m.token.length > 0;
}

// From web page (externally_connectable)
chrome.runtime.onMessageExternal.addListener(
  (message: AuthMessage, sender, sendResponse) => {
    if (!sender.url?.startsWith('https://www.en.ke/')) return false;

    if (isAuthMessage(message)) {
      handleAuthSuccess(message).then(() => sendResponse({ success: true }));
      return true;
    }
    return false;
  }
);

// From content script (internal)
chrome.runtime.onMessage.addListener(
  (message, _sender, sendResponse) => {
    if (isAuthMessage(message)) {
      handleAuthSuccess(message).then(() => sendResponse({ success: true }));
      return true;
    }
    return false;
  }
);

async function handleAuthSuccess(msg: AuthMessage): Promise<void> {
  // Decode JWT to get exp
  let tokenExp = 0;
  let refreshTokenExp = 0;
  try {
    const tp = decodeJwtPayload(msg.token);
    const rp = decodeJwtPayload(msg.refreshToken);
    tokenExp = tp.exp || 0;
    refreshTokenExp = rp.exp || 0;
  } catch {
    // Use defaults
  }

  // Load existing state or create new
  const stored = await chrome.storage.local.get('enke_user_state');
  const state = stored.enke_user_state || {
    isLoggedIn: false,
    user: null,
    plan: 'hobby',
    role: 'user',
    subscription: null,
    slugMinLength: 8,
    tokens: { token: '', refreshToken: '', tokenExp: 0, refreshTokenExp: 0 },
    recentLinks: [],
  };

  state.isLoggedIn = true;
  state.tokens = {
    token: msg.token,
    refreshToken: msg.refreshToken,
    tokenExp,
    refreshTokenExp,
  };
  if (msg.user) {
    state.user = msg.user;
  }

  // Ensure recentLinks is always an array (fix corrupted data from older versions)
  if (!Array.isArray(state.recentLinks)) {
    state.recentLinks = [];
  }

  await chrome.storage.local.set({ enke_user_state: state });
  console.log('en.ke: Auth success, user logged in (plan will be fetched by popup)');
}

// ─── Shorten Helper ────────────────────────────────────────

async function shortenAndNotify(url: string, tabId: number): Promise<void> {
  try {
    const stored = await chrome.storage.local.get('enke_user_state');
    const state = stored.enke_user_state;
    const token = state?.tokens?.token || '';

    console.log('en.ke shortenAndNotify: token present =', !!token);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_URL}/api/v1/links`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url, keep_days: 30 }),
    });

    console.log('en.ke shortenAndNotify: API status =', res.status);

    if (!res.ok) {
      const body = await res.text();
      console.error('en.ke API error body:', body);
      chrome.action.setBadgeText({ text: '!' });
      chrome.action.setBadgeBackgroundColor({ color: '#f87171' });
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);
      return;
    }

    const data = await res.json() as ShortenResponse;
    console.log('en.ke API response data:', JSON.stringify(data));

    const link = data?.link;
    if (!link?.slug) {
      console.error('en.ke API response missing link.slug');
      chrome.action.setBadgeText({ text: '!' });
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);
      return;
    }

    const shortUrl = `https://${SHORT_DOMAIN}/${link.slug}`;
    console.log('en.ke short URL:', shortUrl);

    // Copy to clipboard + toast via content script injection
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: (text: string) => {
          // Copy to clipboard
          navigator.clipboard.writeText(text).catch(() => {});
          // Show toast
          const toast = document.createElement('div');
          toast.textContent = `Copied: ${text}`;
          toast.style.cssText = [
            'position:fixed;bottom:24px;right:24px;z-index:2147483647',
            'padding:12px 20px;background:#0e0e18;color:#00e5ff',
            'border:1px solid rgba(0,229,255,0.3);border-radius:10px',
            'font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;font-weight:600',
            'box-shadow:0 4px 24px rgba(0,0,0,0.4),0 0 12px rgba(0,229,255,0.1)',
            'animation:enke-fade-in 0.25s ease-out',
          ].join(';');
          // Append keyframes
          const style = document.createElement('style');
          style.textContent = '@keyframes enke-fade-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}';
          document.head.appendChild(style);
          document.body.appendChild(toast);
          setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s';
            setTimeout(() => toast.remove(), 300);
          }, 2500);
        },
        args: [shortUrl],
      });
    } catch (e) {
      console.warn('en.ke: clipboard injection failed:', e);
    }

    // Badge on extension icon
    chrome.action.setBadgeText({ text: '✓' });
    chrome.action.setBadgeBackgroundColor({ color: '#00e5ff' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);

    // Save to recent links
    if (state) {
      const recent = {
        slug: link.slug,
        shortUrl,
        originalUrl: url,
        createdAt: Date.now(),
      };
      const links = Array.isArray(state.recentLinks) ? state.recentLinks : [];
      const filtered = links.filter((l: { slug: string }) => l.slug !== recent.slug);
      filtered.unshift(recent);
      state.recentLinks = filtered.slice(0, 10);
      await chrome.storage.local.set({ enke_user_state: state });
      console.log('en.ke: saved to recent links, count =', state.recentLinks.length);
    } else {
      console.warn('en.ke: state is null, not saving recent link');
    }
  } catch (e) {
    console.error('en.ke shortenAndNotify error:', e);
    chrome.action.setBadgeText({ text: '!' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);
  }
}

function decodeJwtPayload(token: string): { exp?: number; [key: string]: unknown } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return {};
    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return {};
  }
}

export {};
