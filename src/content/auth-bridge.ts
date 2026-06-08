// ─── Auth Bridge Content Script ───────────────────────────────
// Injected on www.en.ke pages. Two jobs:
// 1. Listen for postMessage from the login page
// 2. Poll localStorage for pending auth data (fallback when
//    chrome.runtime.sendMessage is not available from the web page)

const AUTH_KEY = 'enke_ext_auth_pending';

// ── Check for pending auth on load ──────────────────────────

function checkPendingAuth(): void {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return;

  try {
    const data = JSON.parse(raw) as {
      token: string;
      refreshToken: string;
      user: { id: number; username: string; email: string };
      ts: number;
    };

    // Only accept data less than 5 minutes old
    if (Date.now() - data.ts > 300_000) {
      localStorage.removeItem(AUTH_KEY);
      return;
    }

    // Forward to service worker
    chrome.runtime.sendMessage({
      type: 'enke-auth-success',
      token: data.token,
      refreshToken: data.refreshToken,
      user: data.user,
    }).then(() => {
      console.log('[enke-ext] Content script forwarded auth to SW');
    }).catch((err: Error) => {
      console.error('[enke-ext] Content script failed to forward auth:', err);
    });

    // Clean up
    localStorage.removeItem(AUTH_KEY);
  } catch {
    localStorage.removeItem(AUTH_KEY);
  }
}

// ── Listen for postMessage from the web page ────────────────

window.addEventListener('message', (event: MessageEvent) => {
  // Only accept messages from same origin
  if (event.origin !== window.location.origin) return;

  const msg = event.data as { type?: string; token?: string };
  if (msg?.type === 'enke-auth-success' && msg?.token) {
    chrome.runtime.sendMessage({
      type: 'enke-auth-success',
      token: msg.token,
      refreshToken: (event.data as Record<string, string>).refreshToken || '',
      user: (event.data as Record<string, unknown>).user,
    }).catch((err: Error) => {
      console.error('[enke-ext] postMessage forward failed:', err);
    });
  }
});

// ── Run on load ─────────────────────────────────────────────

checkPendingAuth();
