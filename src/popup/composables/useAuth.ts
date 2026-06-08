import { ref, type Ref } from 'vue';
import { useStorage } from './useStorage';
import { getMe, refreshTokenApi, setTokenGetter, setRefreshHandler, setLogoutHandler } from '@/utils/api';

export function useAuth() {
  const storage = useStorage();
  const loggingIn: Ref<boolean> = ref(false);
  const error: Ref<string> = ref('');

  // Wire up API layer — these use the singleton userState ref directly
  setTokenGetter(() => {
    const token = storage.getToken();
    return Promise.resolve(token);
  });

  setRefreshHandler(async () => {
    const rt = storage.getRefreshToken();
    if (!rt) return false;
    try {
      const res = await refreshTokenApi(rt);
      const { token, refreshToken } = res.data.data;
      const payload = decodeJwtPayload(token);
      const rtp = decodeJwtPayload(refreshToken);
      storage.setTokens(token, refreshToken, payload.exp || 0, rtp.exp || 0);
      await storage.save();
      return true;
    } catch {
      return false;
    }
  });

  setLogoutHandler(async () => {
    await doLogout();
  });

  async function tryRefreshToken(): Promise<boolean> {
    const rt = storage.getRefreshToken();
    if (!rt) return false;
    try {
      const res = await refreshTokenApi(rt);
      const { token, refreshToken } = res.data.data;
      const payload = decodeJwtPayload(token);
      const rtp = decodeJwtPayload(refreshToken);
      storage.setTokens(token, refreshToken, payload.exp || 0, rtp.exp || 0);
      await storage.save();
      return true;
    } catch {
      return false;
    }
  }

  async function init(): Promise<boolean> {
    await storage.load();
    if (storage.userState.value.isLoggedIn) {
      // Refresh token if expired
      if (!storage.getToken() && storage.getRefreshToken()) {
        const ok = await tryRefreshToken();
        if (!ok) {
          await doLogout();
          return false;
        }
      }
      // Fetch latest plan from API and persist only profile fields
      // (avoids overwriting recentLinks that SW may have added)
      try {
        const res = await getMe();
        console.log('[useAuth] /me raw response:', JSON.stringify(res.data));
        storage.setProfile(res.data);
        console.log('[useAuth] /me plan =', res.data.plan);
        // Persist only plan/role/subscription — not the full state
        const current = await chrome.storage.local.get('enke_user_state');
        const s = (current.enke_user_state || {}) as Record<string, unknown>;
        s.plan = res.data.plan || 'hobby';
        s.role = res.data.role || 'user';
        s.subscription = res.data.subscription || null;
        await chrome.storage.local.set({ enke_user_state: s });
      } catch (e) {
        console.error('Failed to fetch /me, keeping existing state:', e);
      }
      return true;
    }
    return false;
  }

  async function startLogin(): Promise<void> {
    loggingIn.value = true;
    error.value = '';

    try {
      const extId = chrome.runtime.id;
      const loginUrl = `https://www.en.ke/login?source=extension&extid=${extId}`;
      // active: true will focus the tab and close the popup
      // User re-opens popup after login; init() handles the rest
      await chrome.tabs.create({ url: loginUrl, active: true });
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to open login page';
      console.error('Login error:', e);
    } finally {
      loggingIn.value = false;
    }
  }

  async function doLogout(): Promise<void> {
    storage.clearState();
    await chrome.storage.local.clear();
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

  return {
    storage,
    loggingIn,
    error,
    init,
    startLogin,
    doLogout,
  };
}
