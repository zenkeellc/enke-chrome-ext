import { ref, type Ref } from 'vue';
import { useStorage } from './useStorage';
import { getMe, refreshTokenApi, setTokenGetter, setRefreshHandler, setLogoutHandler } from '@/utils/api';

export function useAuth() {
  const storage = useStorage();
  const loggingIn: Ref<boolean> = ref(false);
  const error: Ref<string> = ref('');
  const addAccountMode: Ref<boolean> = ref(false);

  // Wire up API layer
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

  // ── Token ────────────────────────────────────────────────────

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

  // ── Init ─────────────────────────────────────────────────────

  async function init(): Promise<boolean> {
    await storage.loadWithCache();

    if (!storage.userState.value.isLoggedIn) {
      return false;
    }

    // Local token validity check
    const token = storage.getToken();
    if (!token) {
      const rt = storage.getRefreshToken();
      if (rt) {
        const ok = await tryRefreshToken();
        if (!ok) {
          await doLogout();
          return false;
        }
      } else {
        await doLogout();
        return false;
      }
    }

    refreshProfileInBackground();
    return true;
  }

  // ── Profile refresh (non-blocking) ──────────────────────────

  let profileRefreshPromise: Promise<void> | null = null;

  function refreshProfileInBackground(): void {
    if (profileRefreshPromise) return;
    profileRefreshPromise = (async () => {
      try {
        const res = await getMe();
        storage.setProfile(res.data);
        await storage.save();
      } catch (e) {
        console.error('Background /me fetch failed:', e);
      } finally {
        profileRefreshPromise = null;
      }
    })();
  }

  // ── Login / Logout ──────────────────────────────────────────

  async function startLogin(opts?: { addAccount?: boolean }): Promise<void> {
    loggingIn.value = true;
    error.value = '';
    addAccountMode.value = !!opts?.addAccount;

    try {
      const extId = chrome.runtime.id;
      // When adding account, don't prompt for account selection — Google shows the picker
      const loginUrl = `https://www.en.ke/login?source=extension&extid=${extId}`;
      await chrome.tabs.create({ url: loginUrl, active: true });
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to open login page';
      console.error('Login error:', e);
    } finally {
      loggingIn.value = false;
    }
  }

  async function doLogout(): Promise<void> {
    const email = storage.getActiveEmail();
    if (email) {
      await storage.removeAccount(email);
    }
  }

  // ── Account switching ───────────────────────────────────────

  async function switchToAccount(email: string): Promise<void> {
    await storage.switchAccount(email);
    // Refresh profile for the new active account
    refreshProfileInBackground();
  }

  // ── Helpers ─────────────────────────────────────────────────

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
    addAccountMode,
    init,
    startLogin,
    doLogout,
    switchToAccount,
  };
}
