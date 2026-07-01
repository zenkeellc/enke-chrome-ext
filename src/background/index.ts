// ─── Background Service Worker ───────────────────────────────

/// <reference types="chrome" />

import type { ShortenResponse } from '../utils/types';
import { remember } from '../utils/memory-api';

const API_URL = 'https://api.en.ke';
const SHORT_DOMAIN = 'en.ke';
const MEM_API_URL = 'https://mem-api.en.ke';

// Return shape from the injected capture function (must match)
interface CapturedResult {
  markdown: string;
  title: string;
  url: string;
  hasImages: boolean;
  imageCount: number;
  textLength: number;
}

// ── Injected capture+convert function ─────────────────────────
// Self-contained: captures DOM, extracts content, converts HTML→Markdown.
// All DOM/Window access happens in page context where those globals exist.
// Defined inline so esbuild doesn't pull in any DOM-using dependencies.

function captureAndConvert(): CapturedResult {
  // ── HTML→Markdown mini-converter (runs in page context) ──
  var pageBaseUrl = window.location.href;

  // Resolve relative URLs against the page's base URL
  function absUrl(raw: string): string {
    if (!raw) return '';
    // Already absolute
    if (/^https?:\/\//i.test(raw) || raw.indexOf('//') === 0) return raw;
    // Fragment-only (anchor)
    if (raw.charAt(0) === '#') return pageBaseUrl + raw;
    // Skip javascript:/mailto:/tel: etc
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return raw;
    try { return new URL(raw, pageBaseUrl).href; } catch (e) { return raw; }
  }

  function nodeToMd(node: Node): string {
    if (node.nodeType === 3) return node.textContent || ''; // TEXT_NODE
    if (node.nodeType !== 1) return ''; // not ELEMENT_NODE
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const kids = Array.from(el.childNodes).map(nodeToMd).join('');
    switch (tag) {
      case 'h1': return '\n\n# ' + kids + '\n\n';
      case 'h2': return '\n\n## ' + kids + '\n\n';
      case 'h3': return '\n\n### ' + kids + '\n\n';
      case 'h4': return '\n\n#### ' + kids + '\n\n';
      case 'h5': return '\n\n##### ' + kids + '\n\n';
      case 'h6': return '\n\n###### ' + kids + '\n\n';
      case 'p': return '\n\n' + kids + '\n\n';
      case 'br': return '\n';
      case 'hr': return '\n\n---\n\n';
      case 'strong': case 'b': return '**' + kids + '**';
      case 'em': case 'i': return '*' + kids + '*';
      case 'code': return kids.indexOf('\n') >= 0 ? '\n```\n' + kids + '\n```\n' : '`' + kids + '`';
      case 'pre': return '\n```\n' + (el.textContent || '') + '\n```\n';
      case 'a': { var h = absUrl(el.getAttribute('href') || ''); return h ? '[' + kids + '](' + h + ')' : kids; }
      case 'img': { var s = absUrl(el.getAttribute('src') || ''); var a = el.getAttribute('alt') || ''; return s ? '![' + a + '](' + s + ')' : ''; }
      case 'ul': return '\n' + kids + '\n';
      case 'ol': return '\n' + kids + '\n';
      case 'li': return '- ' + kids + '\n';
      case 'blockquote': return '\n> ' + kids.replace(/\n/g, '\n> ') + '\n';
      // ── Table support ──────────────────
      case 'table': {
        var rows = el.querySelectorAll('tr');
        if (rows.length === 0) return '';
        var mdRows: string[] = [];
        var hasHeader = el.querySelector('thead, th') != null;
        var colCount = 0;
        for (var ri = 0; ri < rows.length; ri++) {
          var cells = rows[ri].querySelectorAll('th, td');
          var mdCells: string[] = [];
          for (var ci = 0; ci < cells.length; ci++) {
            mdCells.push((' ' + (cells[ci].textContent || '').replace(/\n/g, ' ').replace(/\|/g, '\\|').trim() + ' '));
          }
          if (cells.length > colCount) colCount = cells.length;
          mdRows.push('|' + mdCells.join('|') + '|');
          // Add separator after header row
          if (ri === 0 && hasHeader && cells.length > 0) {
            var sep: string[] = [];
            for (var si = 0; si < cells.length; si++) sep.push(' --- ');
            mdRows.push('|' + sep.join('|') + '|');
          }
        }
        return '\n\n' + mdRows.join('\n') + '\n\n';
      }
      case 'thead': case 'tbody': case 'tfoot': case 'tr': case 'th': case 'td':
        return ''; // handled entirely by <table> via querySelectorAll
      // ── Block containers ───────────────
      case 'div': case 'section': case 'article': case 'main': case 'header': case 'footer': case 'nav': case 'aside': return '\n' + kids + '\n';
      case 'span': case 'label': case 'small': case 'sub': case 'sup': return kids;
      case 'style': case 'script': case 'head': case 'meta': case 'link': return '';
      default: return kids;
    }
  }

  // ── DOM capture ──────────────────────────────────────────
  let html = '';
  let sourceElement = 'body';
  let imageCount = 0;

  // 1) Check for user text selection
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
    const range = sel.getRangeAt(0);
    const container = document.createElement('div');
    container.appendChild(range.cloneContents());
    html = container.innerHTML;
    imageCount = container.querySelectorAll('img').length;
    sourceElement = 'selection';
  }

  // 2) No selection — extract the page's main content area
  if (!html) {
    var target = null as Element | null;

    function textLen(el: Element): number {
      return ((el as HTMLElement).innerText || '').trim().length;
    }

    function isNoise(el: Element): boolean {
      var tag = el.tagName.toLowerCase();
      var cls = ((el as HTMLElement).className?.toString?.() || '').toLowerCase();
      var id = (el.id || '').toLowerCase();
      var combined = tag + ' ' + cls + ' ' + id;
      return /nav|footer|sidebar|header|menu|comment|advert|widget|related|social|share|banner/.test(combined);
    }

    // 2a) Try semantic selectors in priority order
    var selectors = ['article', 'main', '[role="main"]', '.post-content', '.article-content', '.entry-content', '#content', '.markdown-body', '.prose'];
    for (var i = 0; i < selectors.length; i++) {
      var el = document.querySelector(selectors[i]);
      if (el && textLen(el) > 80) {
        target = el;
        sourceElement = selectors[i].replace(/[^a-z\[\]="'._-]/gi, '') || selectors[i];
        break;
      }
    }

    // 2b) Fallback: find the largest text-heavy block, penalizing noise
    if (!target) {
      var candidates = document.querySelectorAll('div, section');
      var best: Element | null = null;
      var bestScore = 0;
      for (var j = 0; j < candidates.length; j++) {
        var c = candidates[j];
        var len = textLen(c);
        var score = isNoise(c) ? len * 0.1 : len;
        if (score > bestScore) { bestScore = score; best = c; }
      }
      if (best) { target = best; sourceElement = 'largest-block'; }
    }

    html = target ? (target as Element).innerHTML : document.body.innerHTML;
  }

  // Count images
  if (sourceElement !== 'selection') {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    imageCount = temp.querySelectorAll('img').length;
  }

  // ── Convert HTML→Markdown ─────────────────────────────────
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  const markdown = Array.from(wrap.childNodes).map(nodeToMd).join('')
    .replace(/\n{3,}/g, '\n\n')  // Collapse 3+ newlines
    .trim();

  // Text length from markdown (rough)
  const textLen = markdown.replace(/[#*`\[\]()!_\-~>\|\s]/g, '').length;

  return {
    markdown,
    title: document.title || '',
    url: window.location.href,
    hasImages: imageCount > 0,
    imageCount,
    textLength: textLen,
  };
}

// ─── Context Menus ─────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  // Set side panel to a comfortable default width
  chrome.sidePanel.setOptions({
    enabled: true,
  }).catch(() => {});

  chrome.sidePanel.setPanelBehavior({
    openPanelOnActionClick: true,
  }).catch(() => {});

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

    chrome.contextMenus.create({
      id: 'remember-selection',
      title: '加入enke智能体记忆',
      contexts: ['selection', 'page'],
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
    } else if (info.menuItemId === 'remember-selection') {
      await rememberSelection(tab.id, tab.windowId);
      return;
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

  const email = msg.user?.email || 'unknown';
  const newState = {
    isLoggedIn: true,
    user: msg.user || null,
    plan: 'hobby' as string,
    role: 'user' as string,
    subscription: null,
    slugMinLength: 8,
    tokens: {
      token: msg.token,
      refreshToken: msg.refreshToken,
      tokenExp,
      refreshTokenExp,
    },
    recentLinks: [] as Array<{ slug: string; shortUrl: string; originalUrl: string; createdAt: number }>,
  };

  // Multi-account: merge into existing accounts map
  const stored = await chrome.storage.local.get('enke_accounts');
  const accounts = (stored.enke_accounts || {}) as Record<string, typeof newState>;

  // Preserve existing recentLinks and plan if this account already exists
  if (accounts[email]) {
    accounts[email] = {
      ...newState,
      recentLinks: accounts[email].recentLinks || [],
      plan: accounts[email].plan || 'hobby',
    };
  } else {
    accounts[email] = newState;
  }

  // Also migrate old single-account format if present
  const oldStored = await chrome.storage.local.get('enke_user_state');
  if (oldStored.enke_user_state?.user?.email && !accounts[oldStored.enke_user_state.user.email]) {
    const oldEmail = oldStored.enke_user_state.user.email;
    accounts[oldEmail] = { ...oldStored.enke_user_state, recentLinks: oldStored.enke_user_state.recentLinks || [] };
    await chrome.storage.local.remove('enke_user_state');
  }

  // Write to both session and local
  await Promise.all([
    chrome.storage.session.set({ enke_accounts: accounts, enke_active_account: email }),
    chrome.storage.local.set({ enke_accounts: accounts, enke_active_account: email }),
  ]);

  console.log('en.ke: Auth success, user logged in:', email);
}

// ─── Shorten Helper ────────────────────────────────────────

async function shortenAndNotify(url: string, tabId: number): Promise<void> {
  try {
    const result = await chrome.storage.local.get(['enke_accounts', 'enke_active_account']);
    const accounts = (result.enke_accounts || {}) as Record<string, any>;
    const activeEmail = (result.enke_active_account || '') as string;
    const state = activeEmail ? accounts[activeEmail] : null;
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
      accounts[activeEmail] = state;
      await chrome.storage.local.set({ enke_accounts: accounts });
      await chrome.storage.session.set({ enke_accounts: accounts }).catch(() => {});
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

// ─── Memory Helpers ─────────────────────────────────────────

async function rememberSelection(tabId: number, windowId?: number): Promise<void> {
  // Step 1: Open sidebar IMMEDIATELY (must happen before any await to preserve user gesture)
  const openSidebarPromise = windowId != null
    ? chrome.sidePanel.open({ windowId }).catch((e) => console.warn('en.ke: sidePanel.open failed:', e))
    : Promise.resolve();

  // Step 2: Capture content asynchronously (sidebar is already opening)
  try {
    // Check login state from multi-account storage
    const acctResult = await chrome.storage.local.get(['enke_accounts', 'enke_active_account']);
    const accts = (acctResult.enke_accounts || {}) as Record<string, any>;
    const activeEmail = (acctResult.enke_active_account || '') as string;
    const acctState = activeEmail ? accts[activeEmail] : null;
    const isLoggedIn = !!(acctState?.isLoggedIn && acctState?.tokens?.token);

    // Inject capture+convert script into the active tab
    const results = await chrome.scripting.executeScript({
      target: { tabId },
      func: captureAndConvert,
    });

    // Ensure sidebar has opened (wait for it)
    await openSidebarPromise;

    const captured = results[0]?.result as CapturedResult | undefined;
    if (!captured || !captured.markdown || captured.textLength === 0) {
      await showToast(tabId, 'No content captured.');
      return;
    }

    // Store captured content in session storage for the side panel to pick up
    await chrome.storage.session.set({
      pending_capture: {
        markdown: captured.markdown,
        url: captured.url,
        title: captured.title,
        hasImages: captured.hasImages,
        imageCount: captured.imageCount,
        capturedAt: Date.now(),
      },
    });

    const msg = isLoggedIn
      ? '已暂存，在侧边栏编辑后保存'
      : '已暂存 — 请在侧边栏登录后保存';

    await showToast(tabId, msg);
  } catch (e) {
    console.error('en.ke rememberSelection error:', e);
    await openSidebarPromise;
    try { await showToast(tabId, '捕获失败，请重试'); } catch { /* ignore */ }
  }
}

/** Generic toast injection into a tab. */
async function showToast(tabId: number, message: string): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (text: string) => {
      const toast = document.createElement('div');
      toast.textContent = text;
      toast.style.cssText = [
        'position:fixed;bottom:24px;right:24px;z-index:2147483647',
        'padding:12px 20px;background:#0e0e18;color:#00e5ff',
        'border:1px solid rgba(0,229,255,0.3);border-radius:10px',
        'font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:13px;font-weight:600',
        'box-shadow:0 4px 24px rgba(0,0,0,0.4),0 0 12px rgba(0,229,255,0.1)',
        'animation:enke-fade-in 0.25s ease-out',
      ].join(';');
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
    args: [message],
  });
}

// ─── Message Handler: popup requests page capture ───────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && typeof message === 'object' && (message as Record<string, unknown>).type === 'capture-page') {
    handleCapturePage().then(sendResponse).catch((e) => sendResponse({ error: String(e) }));
    return true; // async
  }
  return false; // not handled here; other listeners process auth
});

async function handleCapturePage(): Promise<{ success: boolean; markdown?: string; error?: string }> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return { success: false, error: 'No active tab' };

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: captureAndConvert,
    });

    const captured = results[0]?.result as CapturedResult | undefined;
    if (!captured || !captured.markdown) {
      return { success: false, error: 'No content captured' };
    }

    return { success: true, markdown: captured.markdown };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Capture failed' };
  }
}

// ─── JWT Decode ─────────────────────────────────────────────

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
